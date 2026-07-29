using IQADMS.API.Data;
using IQADMS.API.DTOs.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Security.Claims;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    public AnalyticsController(ApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthly([FromQuery] int? year, [FromQuery] int? month)
    {
        var now = DateTime.UtcNow;
        var y = year ?? now.Year;
        var m = month ?? now.Month;
        if (m is < 1 or > 12)
            return BadRequest(new { message = "Month must be 1–12." });

        if (!await IsAdminAsync())
            return Forbid();

        var start = new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1);

        var taskBase = _context.WorkspaceTasks.AsNoTracking().Where(t => !t.IsDeleted);

        var today = DateOnly.FromDateTime(now);

        var openTasks = await taskBase
            .Where(t => t.Status != "Completed" && t.Status != "Done" && t.Status != "Cancelled")
            .ToListAsync();

        var completedInPeriod = await taskBase
            .Include(t => t.AssignedToUser)
            .Include(t => t.Project)
            .Where(t => (t.Status == "Completed" || t.Status == "Done")
                        && t.CompletedAt >= start && t.CompletedAt < end)
            .OrderByDescending(t => t.CompletedAt)
            .ToListAsync();

        var submittedInPeriod = await taskBase
            .Where(t => t.SubmittedAt >= start && t.SubmittedAt < end)
            .CountAsync();

        var tasksCompletedByDay = completedInPeriod
            .Where(t => t.CompletedAt.HasValue)
            .GroupBy(t => t.CompletedAt!.Value.Date)
            .Select(g => new DailyCountPoint
            {
                Date = g.Key.ToString("yyyy-MM-dd"),
                Count = g.Count()
            })
            .OrderBy(p => p.Date)
            .ToList();

        DocumentMonitoringSnapshot? docMonitoring;
        var documentsUploaded = new List<DocumentUploadRow>();
        var documentsByDay = new List<DailyCountPoint>();

        var libraryQuery = _context.Submissions.AsNoTracking()
            .Where(s => !s.IsDeleted && s.DeletedAt == null && s.StoredRelativePath != null);

        var uploadedInPeriod = await libraryQuery
            .Include(s => s.UploadedByUser)
            .Where(s => s.CreatedAt >= start && s.CreatedAt < end)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        documentsUploaded = uploadedInPeriod.Select(s => new DocumentUploadRow
        {
            Id = s.Id,
            FileName = s.FileName,
            FolderPath = string.IsNullOrWhiteSpace(s.AutoFolderPath) ? null : s.AutoFolderPath,
            UploadedByName = s.UploadedByUser?.DisplayName ?? s.UploadedByUser?.Username,
            UploadedAt = s.CreatedAt
        }).ToList();

        documentsByDay = uploadedInPeriod
            .GroupBy(s => s.CreatedAt.Date)
            .Select(g => new DailyCountPoint { Date = g.Key.ToString("yyyy-MM-dd"), Count = g.Count() })
            .OrderBy(p => p.Date)
            .ToList();

        var totalLibrary = await libraryQuery.CountAsync();
        var trashed = await _context.Submissions.AsNoTracking()
            .CountAsync(s => !s.IsDeleted && s.DeletedAt != null && s.StoredRelativePath != null);

        long bytes = 0;
        var uploadRoot = Path.Combine(_env.ContentRootPath, "Uploads");
        var withPaths = await libraryQuery
            .Where(s => s.StoredRelativePath != null)
            .Select(s => s.StoredRelativePath!)
            .ToListAsync();

        foreach (var rel in withPaths)
        {
            var full = Path.Combine(uploadRoot, rel.Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(full))
            {
                try { bytes += new FileInfo(full).Length; }
                catch { /* ignore */ }
            }
        }

        docMonitoring = new DocumentMonitoringSnapshot
        {
            TotalLibraryFiles = totalLibrary,
            UploadedThisPeriod = documentsUploaded.Count,
            StorageBytesUsed = bytes,
            TrashedFiles = trashed
        };

        var activityItems = new List<AnalyticsActivityItem>();

        var taskLogs = await _context.TaskActivityLogs.AsNoTracking()
            .Include(a => a.Task).ThenInclude(t => t!.Project)
            .Include(a => a.ActorUser)
            .Where(a => a.CreatedAt >= start && a.CreatedAt < end && a.Task != null && !a.Task.IsDeleted)
            .OrderByDescending(a => a.CreatedAt)
            .Take(80)
            .ToListAsync();

        foreach (var log in taskLogs)
        {
            activityItems.Add(new AnalyticsActivityItem
            {
                Id = log.Id,
                Category = "task",
                Title = log.Task!.Title,
                Detail = $"{log.Action}: {log.Detail}",
                ActorName = log.ActorUser?.DisplayName ?? log.ActorUser?.Username,
                ProjectTitle = log.Task.Project?.Title,
                OccurredAt = log.CreatedAt
            });
        }

        foreach (var doc in documentsUploaded.Take(40))
        {
            activityItems.Add(new AnalyticsActivityItem
            {
                Id = doc.Id,
                Category = "document",
                Title = doc.FileName,
                Detail = doc.FolderPath != null ? $"Uploaded to {doc.FolderPath}" : "Document uploaded",
                ActorName = doc.UploadedByName,
                OccurredAt = doc.UploadedAt
            });
        }

        activityItems = activityItems
            .OrderByDescending(a => a.OccurredAt)
            .Take(60)
            .ToList();

        var completedAllTime = await taskBase.CountAsync(t =>
            t.Status == "Completed" || t.Status == "Done");

        var response = new MonthlyAnalyticsResponse
        {
            Year = y,
            Month = m,
            PeriodLabel = start.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
            RangeStartUtc = start,
            RangeEndUtc = end,
            Kpis = new AnalyticsKpiSummary
            {
                TasksCompleted = completedInPeriod.Count,
                TasksSubmitted = submittedInPeriod,
                DocumentsUploaded = documentsUploaded.Count,
                ActivityEvents = activityItems.Count,
                OpenTasksNow = openTasks.Count,
                TasksInProgressNow = openTasks.Count(t => t.Status == "In Progress"),
                TasksAwaitingReviewNow = openTasks.Count(t => t.Status == "Submitted")
            },
            TaskMonitoring = new TaskMonitoringSnapshot
            {
                TotalOpen = openTasks.Count,
                InProgress = openTasks.Count(t => t.Status == "In Progress"),
                Submitted = openTasks.Count(t => t.Status == "Submitted"),
                Returned = openTasks.Count(t => t.Status == "Returned"),
                CompletedAllTime = completedAllTime,
                OverdueOpen = openTasks.Count(t =>
                    t.DueDate != null && t.DueDate < today && t.Status != "Submitted")
            },
            DocumentMonitoring = docMonitoring,
            TasksCompletedByDay = tasksCompletedByDay,
            DocumentsUploadedByDay = documentsByDay,
            RecentActivity = activityItems,
            TasksCompletedInPeriod = completedInPeriod.Select(t => new CompletedTaskRow
            {
                Id = t.Id,
                Title = t.Title,
                AssigneeName = t.AssignedToUser?.DisplayName ?? t.AssignedToUser?.Username,
                ProjectTitle = t.Project?.Title,
                CompletedAt = t.CompletedAt
            }).ToList(),
            DocumentsUploadedInPeriod = documentsUploaded
        };

        return Ok(response);
    }

    private async Task<bool> IsAdminAsync() =>
        await _context.Users.AnyAsync(u => u.Id == GetUserId() && u.IsAdmin && u.IsActive);

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.Parse(claim!);
    }
}
