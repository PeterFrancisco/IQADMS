using System.Data;
using IQADMS.API.Data;
using IQADMS.API.DTOs.Admin;
using Microsoft.EntityFrameworkCore;

namespace IQADMS.API.Services;

public class SystemStorageService
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    public SystemStorageService(ApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    public async Task<SystemStorageResponse> GetSnapshotAsync()
    {
        var uploadsRoot = Path.Combine(_env.ContentRootPath, "Uploads");
        var documentsBytes = MeasureDirectoryBytes(Path.Combine(uploadsRoot, "documents"));
        var profilesBytes = MeasureDirectoryBytes(Path.Combine(uploadsRoot, "profiles"));
        var tasksBytes = MeasureDirectoryBytes(Path.Combine(uploadsRoot, "tasks"));
        var totalBytes = documentsBytes + profilesBytes + tasksBytes;
        var fileCount = CountFiles(uploadsRoot);

        var disk = GetDiskInfo(uploadsRoot);
        var dbName = GetDatabaseName();
        var dbSize = await GetDatabaseSizeBytesAsync();

        return new SystemStorageResponse
        {
            Uploads = new UploadStorageSection
            {
                TotalBytes = totalBytes,
                DocumentsBytes = documentsBytes,
                ProfilesBytes = profilesBytes,
                TasksBytes = tasksBytes,
                FileCount = fileCount,
                MaxBytes = SubmissionService.MaxStorageBytes,
                UploadsPath = uploadsRoot
            },
            Database = new DatabaseStorageSection
            {
                Name = dbName,
                SizeBytes = dbSize
            },
            Disk = disk
        };
    }

    private static long MeasureDirectoryBytes(string path)
    {
        if (!Directory.Exists(path)) return 0;

        long bytes = 0;
        foreach (var file in Directory.EnumerateFiles(path, "*", SearchOption.AllDirectories))
        {
            try
            {
                bytes += new FileInfo(file).Length;
            }
            catch
            {
                // skip unreadable files
            }
        }

        return bytes;
    }

    private static int CountFiles(string root)
    {
        if (!Directory.Exists(root)) return 0;

        try
        {
            return Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories).Count();
        }
        catch
        {
            return 0;
        }
    }

    private static DiskStorageSection GetDiskInfo(string pathForDrive)
    {
        try
        {
            var full = Path.GetFullPath(pathForDrive);
            var root = Path.GetPathRoot(full);
            if (string.IsNullOrEmpty(root))
                return new DiskStorageSection();

            var drive = new DriveInfo(root);
            if (!drive.IsReady)
                return new DiskStorageSection { MountRoot = root };

            var total = drive.TotalSize;
            var free = drive.AvailableFreeSpace;
            var used = total - free;
            var usedPercent = total <= 0 ? 0 : (int)Math.Round(100.0 * used / total, MidpointRounding.AwayFromZero);

            return new DiskStorageSection
            {
                TotalBytes = total,
                FreeBytes = free,
                UsedBytes = used,
                UsedPercent = usedPercent,
                MountRoot = root
            };
        }
        catch
        {
            return new DiskStorageSection();
        }
    }

    private string GetDatabaseName()
    {
        var conn = _context.Database.GetConnectionString() ?? string.Empty;
        const string key = "Database=";
        var idx = conn.IndexOf(key, StringComparison.OrdinalIgnoreCase);
        if (idx < 0) return "iqadms";

        var start = idx + key.Length;
        var end = conn.IndexOf(';', start);
        return end < 0 ? conn[start..].Trim() : conn[start..end].Trim();
    }

    private async Task<long> GetDatabaseSizeBytesAsync()
    {
        try
        {
            await using var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT pg_database_size(current_database())";
            var result = await cmd.ExecuteScalarAsync();
            return result == null || result == DBNull.Value ? 0 : Convert.ToInt64(result);
        }
        catch
        {
            return 0;
        }
    }
}
