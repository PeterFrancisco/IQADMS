using IQADMS.API.Data;
using IQADMS.API.DTOs.Submissions;
using IQADMS.API.Models;
using Microsoft.EntityFrameworkCore;

namespace IQADMS.API.Services;

public class SubmissionService
{
    private readonly ApplicationDbContext _context;

    public SubmissionService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task CreateAsync(CreateSubmissionRequest request)
    {
        // Validate activity
        var activityExists = await _context.AccreditationActivities
            .AnyAsync(a => a.Id == request.AccreditationActivityId);

        if (!activityExists)
            throw new Exception("Accreditation activity not found.");

        // Validate required document
        var documentExists = await _context.RequiredDocuments
            .AnyAsync(d => d.Id == request.RequiredDocumentId);

        if (!documentExists)
            throw new Exception("Required document not found.");

        // Validate department
        var departmentExists = await _context.Departments
            .AnyAsync(d => d.Id == request.DepartmentId);

        if (!departmentExists)
            throw new Exception("Department not found.");

        // Check existing submission (same activity + document + department)
        var existing = await _context.Submissions
            .Where(s => s.AccreditationActivityId == request.AccreditationActivityId
                     && s.RequiredDocumentId == request.RequiredDocumentId
                     && s.DepartmentId == request.DepartmentId)
            .OrderByDescending(s => s.Version)
            .FirstOrDefaultAsync();

        var nextVersion = existing?.Version + 1 ?? 1;

        // For now, use the first user as uploader (temporary)
        var uploader = await _context.Users.FirstOrDefaultAsync();

        if (uploader == null)
            throw new Exception("No registered user found.");

        var submission = new Submission
        {
            AccreditationActivityId = request.AccreditationActivityId,
            RequiredDocumentId = request.RequiredDocumentId,
            DepartmentId = request.DepartmentId,
            UploadedByUserId = uploader.Id,
            FileName = request.FileName,
            GoogleDriveLink = request.GoogleDriveLink,
            GoogleDriveFileId = string.Empty,
            Version = nextVersion,
            Status = "Submitted",
            SubmittedAt = DateTime.UtcNow
        };

        _context.Submissions.Add(submission);

        await _context.SaveChangesAsync();
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
            .Include(s => s.UploadedByUser)
            .Where(s => !s.IsDeleted)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new DocumentListResponse
            {
                Id = s.Id,
                FileName = s.FileName,
                UploadedBy = s.UploadedByUser.DisplayName,
                Activity = s.AccreditationActivity.Name,
                Document = s.RequiredDocument.Title,
                Status = s.Status,
                SubmittedAt = s.SubmittedAt,
                GoogleDriveLink = s.GoogleDriveLink
            })
            .ToListAsync();
    }
}