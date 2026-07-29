using IQADMS.API.Data;
using IQADMS.API.DTOs.Submissions;
using IQADMS.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;

namespace IQADMS.API.Services;

public class SubmissionService
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    public SubmissionService(ApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    public async Task CreateAsync(CreateSubmissionRequest request, Guid uploadedByUserId)
    {
        var department = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == request.DepartmentId && !d.IsDeleted)
            ?? throw new InvalidOperationException("Department not found.");

        var activity = await _context.AccreditationActivities
            .FirstOrDefaultAsync(a => a.Id == request.AccreditationActivityId && !a.IsDeleted)
            ?? throw new InvalidOperationException("Accreditation activity not found.");

        var requiredDoc = await _context.RequiredDocuments
            .FirstOrDefaultAsync(d => d.Id == request.RequiredDocumentId)
            ?? throw new InvalidOperationException("Required document not found.");

        var autoFolder = DocumentFolderClassifier.Classify(
            request.FileName,
            requiredDoc.Title,
            department.Code,
            department.Name);

        await SaveSubmissionAsync(
            activity.Id,
            requiredDoc.Id,
            department.Id,
            uploadedByUserId,
            request.FileName,
            request.GoogleDriveLink,
            autoFolder,
            storedRelativePath: null);
    }

    public async Task<DocumentListResponse> UploadFileAsync(
        IFormFile file,
        Guid departmentId,
        Guid? accreditationActivityId,
        Guid? requiredDocumentId,
        Guid uploadedByUserId)
    {
        if (file == null || file.Length == 0)
            throw new InvalidOperationException("No file uploaded.");

        var department = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == departmentId && !d.IsDeleted)
            ?? throw new InvalidOperationException("Department not found.");

        var activity = accreditationActivityId.HasValue
            ? await _context.AccreditationActivities
                .FirstOrDefaultAsync(a => a.Id == accreditationActivityId && !a.IsDeleted)
            : await _context.AccreditationActivities
                .Where(a => !a.IsDeleted)
                .OrderByDescending(a => a.Year)
                .FirstOrDefaultAsync();

        if (activity == null)
            throw new InvalidOperationException("No accreditation activity found.");

        var requiredDocs = await _context.RequiredDocuments
            .Where(d => d.AccreditationActivityId == activity.Id)
            .Select(d => new { d.Id, d.Title })
            .ToListAsync();

        Guid reqDocId;
        if (requiredDocumentId.HasValue)
        {
            reqDocId = requiredDocumentId.Value;
        }
        else
        {
            var matched = DocumentFolderClassifier.MatchRequiredDocumentId(
                file.FileName,
                requiredDocs.Select(d => (d.Id, d.Title)));

            reqDocId = matched ?? requiredDocs.FirstOrDefault()?.Id
                ?? throw new InvalidOperationException("No required document template found for this activity.");
        }

        var requiredDoc = requiredDocs.FirstOrDefault(d => d.Id == reqDocId);
        var requiredTitle = requiredDoc?.Title;

        var autoFolder = DocumentFolderClassifier.Classify(
            file.FileName,
            requiredTitle,
            department.Code,
            department.Name);

        var safeName = $"{Guid.NewGuid():N}_{Path.GetFileName(file.FileName)}";
        var folderPhysical = Path.Combine(_env.ContentRootPath, "Uploads", "documents", autoFolder.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(folderPhysical);

        var fullPath = Path.Combine(folderPhysical, safeName);
        await using (var stream = new FileStream(fullPath, FileMode.Create))
            await file.CopyToAsync(stream);

        var relativePath = Path.Combine("documents", autoFolder.Replace('/', Path.DirectorySeparatorChar), safeName)
            .Replace('\\', '/');

        var submission = await SaveSubmissionAsync(
            activity.Id,
            reqDocId,
            department.Id,
            uploadedByUserId,
            file.FileName,
            googleDriveLink: string.Empty,
            autoFolder,
            relativePath);

        return submission;
    }

    public async Task<List<DocumentFolderResponse>> GetFoldersAsync()
    {
        var docs = await GetAllAsync();
        return docs
            .GroupBy(d => d.AutoFolderPath)
            .OrderBy(g => g.Key)
            .Select(g => new DocumentFolderResponse
            {
                FolderPath = g.Key,
                FileCount = g.Count(),
                Files = g.ToList()
            })
            .ToList();
    }

    private async Task<DocumentListResponse> SaveSubmissionAsync(
        Guid activityId,
        Guid requiredDocumentId,
        Guid departmentId,
        Guid uploadedByUserId,
        string fileName,
        string googleDriveLink,
        string autoFolder,
        string? storedRelativePath)
    {
        var existing = await _context.Submissions
            .Where(s => s.AccreditationActivityId == activityId
                        && s.RequiredDocumentId == requiredDocumentId
                        && s.DepartmentId == departmentId)
            .OrderByDescending(s => s.Version)
            .FirstOrDefaultAsync();

        var nextVersion = existing?.Version + 1 ?? 1;

        var submission = new Submission
        {
            AccreditationActivityId = activityId,
            RequiredDocumentId = requiredDocumentId,
            DepartmentId = departmentId,
            UploadedByUserId = uploadedByUserId,
            FileName = fileName,
            GoogleDriveLink = googleDriveLink,
            GoogleDriveFileId = string.Empty,
            Version = nextVersion,
            Status = "Submitted",
            AutoFolderPath = autoFolder,
            StoredRelativePath = storedRelativePath,
            SubmittedAt = DateTime.UtcNow
        };

        _context.Submissions.Add(submission);
        await _context.SaveChangesAsync();

        return await MapDocumentList(submission.Id);
    }

    private async Task<DocumentListResponse> MapDocumentList(Guid submissionId)
    {
        return await _context.Submissions
            .Include(s => s.AccreditationActivity)
            .Include(s => s.RequiredDocument)
            .Include(s => s.Department)
            .Include(s => s.UploadedByUser)
            .Where(s => s.Id == submissionId)
            .Select(s => new DocumentListResponse
            {
                Id = s.Id,
                FileName = s.FileName,
                UploadedBy = s.UploadedByUser.DisplayName,
                Department = s.Department.Name,
                Activity = s.AccreditationActivity.Name,
                Document = s.RequiredDocument.Title,
                AutoFolderPath = s.AutoFolderPath,
                Status = s.Status,
                SubmittedAt = s.SubmittedAt,
                GoogleDriveLink = string.IsNullOrEmpty(s.GoogleDriveLink) ? null : s.GoogleDriveLink,
                DownloadUrl = s.StoredRelativePath != null ? $"/uploads/{s.StoredRelativePath}" : null
            })
            .FirstAsync();
    }

    public async Task<List<SubmissionResponse>> GetByActivityAsync(Guid activityId)
    {
        return await _context.Submissions
            .Include(s => s.Department)
            .Include(s => s.RequiredDocument)
            .Where(s => s.AccreditationActivityId == activityId)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new SubmissionResponse
            {
                Id = s.Id,
                Department = s.Department.Name,
                Document = s.RequiredDocument.Title,
                FileName = s.FileName,
                Version = s.Version,
                Status = s.Status,
                SubmittedAt = s.SubmittedAt
            })
            .ToListAsync();
    }

    public async Task<List<DocumentListResponse>> GetAllAsync()
    {
        return await _context.Submissions
            .Include(s => s.AccreditationActivity)
            .Include(s => s.RequiredDocument)
            .Include(s => s.Department)
            .Include(s => s.UploadedByUser)
            .Where(s => !s.IsDeleted)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new DocumentListResponse
            {
                Id = s.Id,
                FileName = s.FileName,
                UploadedBy = s.UploadedByUser.DisplayName,
                Department = s.Department.Name,
                Activity = s.AccreditationActivity.Name,
                Document = s.RequiredDocument.Title,
                AutoFolderPath = s.AutoFolderPath ?? "",
                Status = s.Status,
                SubmittedAt = s.SubmittedAt,
                GoogleDriveLink = string.IsNullOrEmpty(s.GoogleDriveLink) ? null : s.GoogleDriveLink,
                DownloadUrl = s.StoredRelativePath != null ? $"/uploads/{s.StoredRelativePath}" : null
            })
            .ToListAsync();
    }

    public const long MaxFileBytes = 100 * 1024 * 1024;
    public const long MaxStorageBytes = 32L * 1024 * 1024 * 1024;
    public const int MaxFileCount = 20_000;

    public async Task<object> GetStorageStatsAsync()
    {
        var (bytes, count) = await MeasureStorageAsync();
        var dbCount = await _context.Submissions.CountAsync(s => !s.IsDeleted && s.StoredRelativePath != null);

        return new
        {
            usedBytes = bytes,
            maxBytes = MaxStorageBytes,
            fileCount = Math.Max(count, dbCount),
            maxFileCount = MaxFileCount,
            maxUploadBytes = MaxFileBytes
        };
    }

    private async Task<(long Bytes, int Count)> MeasureStorageAsync()
    {
        var uploadsRoot = Path.Combine(_env.ContentRootPath, "Uploads");
        long bytes = 0;
        var count = 0;

        if (Directory.Exists(uploadsRoot))
        {
            foreach (var file in Directory.EnumerateFiles(uploadsRoot, "*", SearchOption.AllDirectories))
            {
                count++;
                try
                {
                    bytes += new FileInfo(file).Length;
                }
                catch
                {
                    // skip
                }
            }
        }

        await Task.CompletedTask;
        return (bytes, count);
    }

    public async Task<DocumentListResponse> UploadToFolderAsync(IFormFile file, string folderPath, Guid uploadedByUserId)
    {
        if (file == null || file.Length == 0)
            throw new InvalidOperationException("No file uploaded.");

        if (file.Length > MaxFileBytes)
            throw new InvalidOperationException($"File exceeds the {MaxFileBytes / (1024 * 1024)} MB upload limit.");

        var (used, _) = await MeasureStorageAsync();
        if (used + file.Length > MaxStorageBytes)
            throw new InvalidOperationException("Storage limit reached (32 GB). Delete files or contact support.");

        var dbFiles = await _context.Submissions.CountAsync(s => !s.IsDeleted && s.StoredRelativePath != null);
        if (dbFiles >= MaxFileCount)
            throw new InvalidOperationException("Maximum file count reached.");

        folderPath = SanitizeFolderPath(folderPath);
        await EnsureFolderRegisteredAsync(folderPath);

        var department = await _context.Departments.Where(d => !d.IsDeleted).OrderBy(d => d.Name).FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("No department configured. Add at least one department in the database.");

        var activity = await _context.AccreditationActivities.Where(a => !a.IsDeleted)
            .OrderByDescending(a => a.Year)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("No accreditation activity found.");

        var requiredDoc = await _context.RequiredDocuments
            .Where(d => d.AccreditationActivityId == activity.Id)
            .OrderBy(d => d.Title)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("No required document template found.");

        var safeName = $"{Guid.NewGuid():N}_{Path.GetFileName(file.FileName)}";
        var folderPhysical = Path.Combine(_env.ContentRootPath, "Uploads", "documents", folderPath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(folderPhysical);

        var fullPath = Path.Combine(folderPhysical, safeName);
        await using (var stream = new FileStream(fullPath, FileMode.Create))
            await file.CopyToAsync(stream);

        var relativePath = Path.Combine("documents", folderPath.Replace('/', Path.DirectorySeparatorChar), safeName)
            .Replace('\\', '/');

        return await SaveSubmissionAsync(
            activity.Id,
            requiredDoc.Id,
            department.Id,
            uploadedByUserId,
            file.FileName,
            googleDriveLink: string.Empty,
            folderPath,
            relativePath);
    }

    public async Task CreateFolderAsync(string name, string? parentPath)
    {
        var path = string.IsNullOrWhiteSpace(parentPath)
            ? SanitizeFolderPath(name)
            : SanitizeFolderPath($"{parentPath.Trim().Trim('/')}/{name.Trim()}");

        await EnsureFolderRegisteredAsync(path);

        var physical = Path.Combine(_env.ContentRootPath, "Uploads", "documents", path.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(physical);
    }

    public async Task RenameFolderAsync(string oldPath, string newPath)
    {
        oldPath = SanitizeFolderPath(oldPath);
        newPath = SanitizeFolderPath(newPath);

        var oldPhysical = Path.Combine(_env.ContentRootPath, "Uploads", "documents", oldPath.Replace('/', Path.DirectorySeparatorChar));
        var newPhysical = Path.Combine(_env.ContentRootPath, "Uploads", "documents", newPath.Replace('/', Path.DirectorySeparatorChar));

        if (Directory.Exists(oldPhysical))
        {
            Directory.CreateDirectory(Path.GetDirectoryName(newPhysical)!);
            if (Directory.Exists(newPhysical))
                throw new InvalidOperationException("A folder with that name already exists.");
            Directory.Move(oldPhysical, newPhysical);
        }

        var submissions = await _context.Submissions
            .Where(s => !s.IsDeleted && s.AutoFolderPath == oldPath)
            .ToListAsync();

        foreach (var s in submissions)
        {
            s.AutoFolderPath = newPath;
            if (s.StoredRelativePath != null && s.StoredRelativePath.Contains(oldPath))
                s.StoredRelativePath = s.StoredRelativePath.Replace(oldPath, newPath);
            s.UpdatedAt = DateTime.UtcNow;
        }

        var folderRow = await _context.DocumentLibraryFolders
            .FirstOrDefaultAsync(f => f.Path == oldPath && !f.IsDeleted);
        if (folderRow != null)
            folderRow.Path = newPath;

        await EnsureFolderRegisteredAsync(newPath);
        await _context.SaveChangesAsync();
    }

    public async Task<List<DocumentFolderResponse>> GetLibraryFoldersAsync()
    {
        await EnsureFolderRegisteredAsync("General");

        var registered = await _context.DocumentLibraryFolders
            .Where(f => !f.IsDeleted)
            .Select(f => f.Path)
            .ToListAsync();

        var fromFiles = await _context.Submissions
            .Where(s => !s.IsDeleted)
            .Select(s => s.AutoFolderPath ?? "General")
            .Distinct()
            .ToListAsync();

        var allPaths = registered.Union(fromFiles).Distinct().OrderBy(p => p).ToList();
        var docs = await GetAllAsync();

        return allPaths.Select(path => new DocumentFolderResponse
        {
            FolderPath = path,
            FileCount = docs.Count(d => d.AutoFolderPath == path),
            Files = docs.Where(d => d.AutoFolderPath == path).ToList()
        }).ToList();
    }

    private async Task EnsureFolderRegisteredAsync(string path)
    {
        path = SanitizeFolderPath(path);
        var exists = await _context.DocumentLibraryFolders.AnyAsync(f => f.Path == path && !f.IsDeleted);
        if (!exists)
        {
            _context.DocumentLibraryFolders.Add(new DocumentLibraryFolder { Path = path });
            await _context.SaveChangesAsync();
        }
    }

    private static string SanitizeFolderPath(string path)
    {
        path = path.Replace('\\', '/').Trim().Trim('/');
        if (string.IsNullOrWhiteSpace(path))
            return "General";

        var parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(p => string.Join("_", p.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries)))
            .Where(p => !string.IsNullOrWhiteSpace(p));

        var joined = string.Join("/", parts);
        return string.IsNullOrWhiteSpace(joined) ? "General" : joined;
    }
}
