using IQADMS.API.Data;
using IQADMS.API.DTOs.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ReportsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("tasks")]
    public async Task<IActionResult> GetTaskReport(
        [FromQuery] Guid? projectId,
        [FromQuery] Guid? relatedDepartmentId,
        [FromQuery] string? status,
        [FromQuery] DateOnly? dueFrom,
        [FromQuery] DateOnly? dueTo,
        [FromQuery] bool includeCompleted = true)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var query = _context.WorkspaceTasks
            .Where(t => !t.IsDeleted)
            .Include(t => t.AssignedToUser)
            .Include(t => t.Project)
            .Include(t => t.RelatedDepartment)
            .AsQueryable();

        if (projectId.HasValue)
            query = query.Where(t => t.ProjectId == projectId);

        if (relatedDepartmentId.HasValue)
            query = query.Where(t => t.RelatedDepartmentId == relatedDepartmentId);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(t => t.Status == status.Trim());

        if (dueFrom.HasValue)
            query = query.Where(t => t.DueDate != null && t.DueDate >= dueFrom);

        if (dueTo.HasValue)
            query = query.Where(t => t.DueDate != null && t.DueDate <= dueTo);

        if (!includeCompleted)
            query = query.Where(t => t.Status != "Completed" && t.Status != "Done" && t.Status != "Cancelled");

        var tasks = await query
            .OrderBy(t => t.DueDate)
            .ThenBy(t => t.Title)
            .ToListAsync();

        var rows = tasks.Select(t => new TaskReportRowResponse
        {
            Id = t.Id,
            Title = t.Title,
            Status = t.Status,
            Notes = t.Notes,
            DueDate = t.DueDate,
            AssigneeName = t.AssignedToUser?.DisplayName,
            ProjectTitle = t.Project?.Title,
            RelatedDepartmentOrOrg = t.RelatedDepartmentOrOrg ?? t.RelatedDepartment?.Name,
            CompletedAt = t.CompletedAt,
            CreatedAt = t.CreatedAt
        }).ToList();

        var open = rows.Count(r => r.Status != "Completed" && r.Status != "Done" && r.Status != "Cancelled");
        var completed = rows.Count(r => r.Status is "Completed" or "Done");
        var overdue = rows.Count(r =>
            r.DueDate.HasValue && r.DueDate < today &&
            r.Status != "Completed" && r.Status != "Done" && r.Status != "Cancelled");

        return Ok(new ReportsSummaryResponse
        {
            TotalRows = rows.Count,
            OpenCount = open,
            CompletedCount = completed,
            OverdueCount = overdue,
            Rows = rows
        });
    }
}
