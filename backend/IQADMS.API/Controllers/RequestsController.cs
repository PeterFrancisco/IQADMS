using IQADMS.API.Data;
using IQADMS.API.DTOs.Requests;
using IQADMS.API.Models;
using IQADMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RequestsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly NotificationService _notifications;

    public RequestsController(ApplicationDbContext context, NotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var userId = GetUserId();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
        if (user == null) return NotFound();

        var emailLower = user.Email.ToLower();

        var onAllowList = await _context.AllowedUsers
            .AnyAsync(a => a.Email.ToLower() == emailLower);

        var latestRequest = await _context.AccountRequests
            .Where(r => r.Email.ToLower() == emailLower)
            .OrderByDescending(r => r.RequestedAt)
            .Select(r => new AccountRequestStatusDto
            {
                Id = r.Id,
                Status = r.Status,
                RequestedAt = r.RequestedAt,
                ReviewedAt = r.ReviewedAt
            })
            .FirstOrDefaultAsync();

        var pendingForAdmin = 0;
        var pendingExtensions = 0;
        if (user.IsAdmin)
        {
            pendingForAdmin = await _context.AccountRequests.CountAsync(r => r.Status == "Pending");
            pendingExtensions = await _context.TaskExtensionRequests.CountAsync(r => r.Status == "Pending");
        }

        return Ok(new MyRequestsOverviewResponse
        {
            Email = user.Email,
            IsOnAllowList = onAllowList,
            IsRegistered = true,
            LatestAccountRequest = latestRequest,
            PendingAccountRequestsForAdmin = pendingForAdmin,
            PendingExtensionRequestsForAdmin = pendingExtensions
        });
    }

    [HttpGet("extensions/mine")]
    public async Task<IActionResult> GetMyExtensions()
    {
        var userId = GetUserId();
        var list = await QueryExtensionResponses()
            .Where(r => r.RequestedByUserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(50)
            .ToListAsync();

        return Ok(list.Select(MapExtension).ToList());
    }

    [HttpGet("extensions/pending")]
    public async Task<IActionResult> GetPendingExtensions()
    {
        if (!await IsAdmin()) return Forbid();

        var list = await QueryExtensionResponses()
            .Where(r => r.Status == "Pending")
            .OrderBy(r => r.RequestedDueDate)
            .ToListAsync();

        return Ok(list.Select(MapExtension).ToList());
    }

    [HttpPost("extensions")]
    public async Task<IActionResult> CreateExtension(CreateExtensionRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(new { message = "Reason is required." });

        var userId = GetUserId();
        var task = await _context.WorkspaceTasks
            .FirstOrDefaultAsync(t => t.Id == request.TaskId && !t.IsDeleted);

        if (task == null) return NotFound(new { message = "Task not found." });

        if (task.AssignedToUserId != userId && task.CreatedByUserId != userId)
            return Forbid();

        if (task.Status is "Completed" or "Done" or "Cancelled")
            return BadRequest(new { message = "Cannot extend a closed task." });

        var hasPending = await _context.TaskExtensionRequests.AnyAsync(r =>
            r.TaskId == request.TaskId && r.Status == "Pending");

        if (hasPending)
            return BadRequest(new { message = "This task already has a pending extension request." });

        if (task.DueDate.HasValue && request.RequestedDueDate <= task.DueDate)
            return BadRequest(new { message = "Requested date must be after the current due date." });

        var entity = new TaskExtensionRequest
        {
            TaskId = request.TaskId,
            RequestedByUserId = userId,
            RequestedDueDate = request.RequestedDueDate,
            Reason = request.Reason.Trim()
        };

        _context.TaskExtensionRequests.Add(entity);
        await _context.SaveChangesAsync();

        await NotifyAdminsExtensionAsync(entity.Id, task.Title);

        return Ok(new { message = "Extension request submitted.", id = entity.Id });
    }

    [HttpPost("extensions/{id}/approve")]
    public async Task<IActionResult> ApproveExtension(Guid id, ReviewExtensionRequestDto? body)
    {
        if (!await IsAdmin()) return Forbid();

        var ext = await _context.TaskExtensionRequests
            .Include(r => r.Task)
            .Include(r => r.RequestedByUser)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (ext == null) return NotFound();
        if (ext.Status != "Pending")
            return BadRequest(new { message = "Request is no longer pending." });

        var reviewerId = GetUserId();
        ext.Status = "Approved";
        ext.ReviewedByUserId = reviewerId;
        ext.ReviewedAt = DateTime.UtcNow;
        ext.ReviewNote = body?.ReviewNote?.Trim();

        ext.Task.DueDate = ext.RequestedDueDate;
        ext.Task.UpdatedAt = DateTime.UtcNow;

        _context.TaskActivityLogs.Add(new TaskActivityLog
        {
            TaskId = ext.TaskId,
            ActorUserId = reviewerId,
            Action = "due extended",
            Detail = $"Due date set to {ext.RequestedDueDate:yyyy-MM-dd} (approved extension)"
        });

        await _context.SaveChangesAsync();

        await _notifications.NotifyAsync(
            ext.RequestedByUserId,
            "task",
            "Extension approved",
            $"Your deadline extension for \"{ext.Task.Title}\" was approved.",
            $"/my-tasks?task={ext.TaskId}",
            ext.TaskId,
            ext.Task.ProjectId,
            $"extension-approved-{ext.Id}");

        return Ok(new { message = "Extension approved." });
    }

    [HttpPost("extensions/{id}/reject")]
    public async Task<IActionResult> RejectExtension(Guid id, ReviewExtensionRequestDto? body)
    {
        if (!await IsAdmin()) return Forbid();

        var ext = await _context.TaskExtensionRequests
            .Include(r => r.Task)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (ext == null) return NotFound();
        if (ext.Status != "Pending")
            return BadRequest(new { message = "Request is no longer pending." });

        ext.Status = "Rejected";
        ext.ReviewedByUserId = GetUserId();
        ext.ReviewedAt = DateTime.UtcNow;
        ext.ReviewNote = body?.ReviewNote?.Trim();

        await _context.SaveChangesAsync();

        await _notifications.NotifyAsync(
            ext.RequestedByUserId,
            "task",
            "Extension declined",
            $"Your deadline extension for \"{ext.Task.Title}\" was not approved.",
            $"/my-tasks?task={ext.TaskId}",
            ext.TaskId,
            ext.Task.ProjectId,
            $"extension-rejected-{ext.Id}");

        return Ok(new { message = "Extension rejected." });
    }

    [HttpGet("documents")]
    public async Task<IActionResult> GetDocumentRequests([FromQuery] string? status)
    {
        var query = _context.DocumentRequests
            .Where(d => !d.IsDeleted)
            .Include(d => d.RelatedDepartment)
            .Include(d => d.Project)
            .Include(d => d.RequestedByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(d => d.Status == status.Trim());

        var list = await query
            .OrderByDescending(d => d.CreatedAt)
            .Take(100)
            .ToListAsync();

        return Ok(list.Select(MapDocument).ToList());
    }

    [HttpPost("documents")]
    public async Task<IActionResult> CreateDocumentRequest(CreateDocumentRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Title is required." });

        if (!await _context.Departments.AnyAsync(d => d.Id == request.RelatedDepartmentId && !d.IsDeleted))
            return BadRequest(new { message = "Department not found." });

        if (request.ProjectId.HasValue &&
            !await _context.Projects.AnyAsync(p => p.Id == request.ProjectId && !p.IsDeleted))
            return BadRequest(new { message = "Project not found." });

        var userId = GetUserId();

        var doc = new DocumentRequest
        {
            RelatedDepartmentId = request.RelatedDepartmentId,
            ProjectId = request.ProjectId,
            RequestedByUserId = userId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            DueDate = request.DueDate
        };

        _context.DocumentRequests.Add(doc);
        await _context.SaveChangesAsync();

        await NotifyAdminsDocumentRequestAsync(doc.Id, doc.Title);

        return Ok(new { message = "Document request recorded.", id = doc.Id });
    }

    [HttpPut("documents/{id}")]
    public async Task<IActionResult> UpdateDocumentRequest(Guid id, UpdateDocumentRequestDto request)
    {
        var doc = await _context.DocumentRequests
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (doc == null) return NotFound();

        var userId = GetUserId();
        var isAdmin = await IsAdmin();
        if (!isAdmin && doc.RequestedByUserId != userId)
            return Forbid();

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var status = request.Status.Trim();
            if (status is not ("Pending" or "In Progress" or "Fulfilled" or "Cancelled"))
                return BadRequest(new { message = "Invalid status." });
            doc.Status = status;
        }

        if (request.FulfillmentNotes != null)
            doc.FulfillmentNotes = request.FulfillmentNotes.Trim();

        if (request.FulfillmentLink != null)
            doc.FulfillmentLink = request.FulfillmentLink.Trim();

        doc.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Document request updated." });
    }

    private async Task NotifyAdminsDocumentRequestAsync(Guid requestId, string title)
    {
        var adminIds = await _context.Users
            .Where(u => u.IsAdmin && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var adminId in adminIds)
        {
            await _notifications.NotifyAsync(
                adminId,
                "admin",
                "Document request",
                $"New document request: \"{title}\".",
                "/requests",
                dedupKey: $"document-request-{requestId}");
        }
    }

    private static DocumentRequestResponse MapDocument(DocumentRequest d)
    {
        return new DocumentRequestResponse
        {
            Id = d.Id,
            Title = d.Title,
            Description = d.Description,
            DueDate = d.DueDate,
            Status = d.Status,
            DepartmentName = d.RelatedDepartment.Name,
            ProjectTitle = d.Project?.Title,
            RequestedByName = d.RequestedByUser.DisplayName,
            FulfillmentNotes = d.FulfillmentNotes,
            FulfillmentLink = d.FulfillmentLink,
            CreatedAt = d.CreatedAt
        };
    }

    private IQueryable<TaskExtensionRequest> QueryExtensionResponses()
    {
        return _context.TaskExtensionRequests
            .Include(r => r.Task)
            .Include(r => r.RequestedByUser);
    }

    private static ExtensionRequestResponse MapExtension(TaskExtensionRequest r)
    {
        return new ExtensionRequestResponse
        {
            Id = r.Id,
            TaskId = r.TaskId,
            TaskTitle = r.Task.Title,
            CurrentDueDate = r.Task.DueDate,
            RequestedDueDate = r.RequestedDueDate,
            Reason = r.Reason,
            Status = r.Status,
            RequestedByName = r.RequestedByUser.DisplayName,
            CreatedAt = r.CreatedAt,
            ReviewedAt = r.ReviewedAt,
            ReviewNote = r.ReviewNote
        };
    }

    private async Task NotifyAdminsExtensionAsync(Guid extensionId, string taskTitle)
    {
        var adminIds = await _context.Users
            .Where(u => u.IsAdmin && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var adminId in adminIds)
        {
            await _notifications.NotifyAsync(
                adminId,
                "admin",
                "Deadline extension request",
                $"Extension requested for task \"{taskTitle}\".",
                "/requests",
                dedupKey: $"extension-request-{extensionId}");
        }
    }

    private async Task<bool> IsAdmin()
    {
        var userId = GetUserId();
        return await _context.Users.AnyAsync(u => u.Id == userId && u.IsAdmin && u.IsActive);
    }

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.Parse(claim!);
    }
}
