using IQADMS.API.Data;
using IQADMS.API.DTOs.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DashboardController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("deadlines")]
    public async Task<IActionResult> GetDeadlines([FromQuery] string range = "month", [FromQuery] bool overdueOnly = false)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var end = range switch
        {
            "week" => today.AddDays(7),
            "month" => today.AddDays(30),
            _ => today.AddYears(2)
        };

        var items = new List<DeadlineItemResponse>();

        var openTasks = await _context.WorkspaceTasks
            .Where(t => !t.IsDeleted && t.DueDate != null && !IsClosedStatus(t.Status))
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .ToListAsync();

        foreach (var t in openTasks)
        {
            var due = t.DueDate!.Value;
            var overdue = due < today;
            if (overdueOnly && !overdue) continue;
            if (!overdue && due > end) continue;

            items.Add(new DeadlineItemResponse
            {
                ItemType = "task",
                Id = t.Id,
                Title = t.Title,
                DueDate = due,
                Status = t.Status,
                ProjectId = t.ProjectId,
                ProjectTitle = t.Project?.Title,
                AssignedToName = t.AssignedToUser?.DisplayName,
                IsOverdue = overdue,
                DaysUntilDue = DaysBetween(today, due)
            });
        }

        var projects = await _context.Projects
            .Where(p => !p.IsDeleted && p.DueDate != null && p.Status != "Completed" && p.Status != "Cancelled")
            .ToListAsync();

        foreach (var p in projects)
        {
            var due = p.DueDate!.Value;
            var overdue = due < today;
            if (overdueOnly && !overdue) continue;
            if (!overdue && due > end) continue;

            items.Add(new DeadlineItemResponse
            {
                ItemType = "project",
                Id = p.Id,
                Title = p.Title,
                DueDate = due,
                Status = p.Status,
                ProjectId = p.Id,
                ProjectTitle = p.Title,
                IsOverdue = overdue,
                DaysUntilDue = DaysBetween(today, due)
            });
        }

        var activities = await _context.AccreditationActivities
            .Where(a => !a.IsDeleted && a.Status != "Completed" && a.Status != "Closed")
            .ToListAsync();

        foreach (var a in activities)
        {
            var due = a.Deadline;
            var overdue = due < today;
            if (overdueOnly && !overdue) continue;
            if (!overdue && due > end) continue;

            items.Add(new DeadlineItemResponse
            {
                ItemType = "accreditation",
                Id = a.Id,
                Title = a.Name,
                DueDate = due,
                Status = a.Status,
                IsOverdue = overdue,
                DaysUntilDue = DaysBetween(today, due)
            });
        }

        var ordered = items
            .OrderBy(i => i.IsOverdue ? 0 : 1)
            .ThenBy(i => i.DueDate)
            .ThenBy(i => i.Title)
            .ToList();

        return Ok(ordered);
    }

    [HttpGet("recent-activity")]
    public async Task<IActionResult> GetRecentActivity([FromQuery] int limit = 40, [FromQuery] Guid? projectId = null)
    {
        limit = Math.Clamp(limit, 1, 100);

        var query = _context.TaskActivityLogs
            .AsNoTracking()
            .Include(a => a.Task)
            .ThenInclude(t => t!.Project)
            .Include(a => a.ActorUser)
            .Where(a => a.Task != null && !a.Task.IsDeleted);

        if (projectId.HasValue)
            query = query.Where(a => a.Task!.ProjectId == projectId);

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new RecentActivityItemResponse
            {
                Id = a.Id,
                TaskId = a.TaskId,
                TaskTitle = a.Task!.Title,
                ProjectId = a.Task.ProjectId,
                ProjectTitle = a.Task.Project != null ? a.Task.Project.Title : null,
                Action = a.Action,
                Detail = a.Detail,
                ActorName = a.ActorUser != null ? a.ActorUser.DisplayName : null,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return Ok(logs);
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics()
    {
        var userId = GetUserId();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var tasks = await _context.WorkspaceTasks
            .Where(t => !t.IsDeleted)
            .Include(t => t.Project)
            .ToListAsync();

        var open = tasks.Where(t => !IsClosedStatus(t.Status)).ToList();
        var completed = tasks.Where(t => IsCompletedStatus(t.Status)).ToList();
        var overdue = open.Where(t => t.DueDate != null && t.DueDate < today).ToList();

        var byStatus = tasks
            .GroupBy(t => t.Status)
            .Select(g => new TaskStatusCountResponse { Status = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToList();

        var projectGroups = tasks
            .GroupBy(t => new { t.ProjectId, Title = t.Project?.Title ?? "No project" })
            .Select(g => new ProjectTaskSummaryResponse
            {
                ProjectId = g.Key.ProjectId,
                ProjectTitle = g.Key.Title,
                TotalTasks = g.Count(),
                OpenTasks = g.Count(t => !IsClosedStatus(t.Status)),
                OverdueTasks = g.Count(t =>
                    t.DueDate != null && t.DueDate < today && !IsClosedStatus(t.Status))
            })
            .OrderByDescending(p => p.OpenTasks)
            .ToList();

        var activeProjects = await _context.Projects.CountAsync(p =>
            !p.IsDeleted && p.Status != "Completed" && p.Status != "Cancelled");

        var response = new DashboardStatisticsResponse
        {
            TotalTasks = tasks.Count,
            OpenTasks = open.Count,
            CompletedTasks = completed.Count,
            OverdueTasks = overdue.Count,
            MyOpenAssigned = open.Count(t => t.AssignedToUserId == userId),
            ActiveProjects = activeProjects,
            TasksByStatus = byStatus,
            ByProject = projectGroups
        };

        return Ok(response);
    }

    private static int DaysBetween(DateOnly from, DateOnly to) =>
        to.DayNumber - from.DayNumber;

    private static bool IsCompletedStatus(string status) =>
        status is "Completed" or "Done";

    private static bool IsClosedStatus(string status) =>
        status is "Completed" or "Done" or "Cancelled";

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.Parse(claim!);
    }
}
