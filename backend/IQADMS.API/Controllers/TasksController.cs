using IQADMS.API.Data;
using IQADMS.API.DTOs.Profile;
using IQADMS.API.Services;
using IQADMS.API.DTOs.Tasks;
using IQADMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly NotificationService _notifications;

    public TasksController(ApplicationDbContext context, IWebHostEnvironment env, NotificationService notifications)
    {
        _context = context;
        _env = env;
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<IActionResult> GetTasks([FromQuery] Guid? projectId, [FromQuery] Guid? relatedDepartmentId)
    {
        var query = _context.WorkspaceTasks
            .Where(t => !t.IsDeleted)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .Include(t => t.Project)
            .Include(t => t.RelatedDepartment)
            .Include(t => t.Attachments)
            .Include(t => t.Comments)
            .AsQueryable();

        if (projectId.HasValue)
            query = query.Where(t => t.ProjectId == projectId);

        if (relatedDepartmentId.HasValue)
            query = query.Where(t => t.RelatedDepartmentId == relatedDepartmentId);

        var tasks = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return Ok(tasks.Select(MapTask).ToList());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTask(Guid id)
    {
        var task = await LoadTaskGraph(id);
        if (task == null) return NotFound();
        return Ok(MapTask(task));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask(CreateTaskRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Task title is required." });

        if (request.ProjectId.HasValue &&
            !await _context.Projects.AnyAsync(p => p.Id == request.ProjectId && !p.IsDeleted))
            return BadRequest(new { message = "Project not found." });

        if (request.RelatedDepartmentId.HasValue &&
            !await _context.Departments.AnyAsync(d => d.Id == request.RelatedDepartmentId))
            return BadRequest(new { message = "Department not found." });

        var status = NormalizeStatus(string.IsNullOrWhiteSpace(request.Status) ? "To Do" : request.Status);
        var userId = GetUserId();

        var task = new WorkspaceTask
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Status = status,
            Priority = string.IsNullOrWhiteSpace(request.Priority) ? "Medium" : request.Priority.Trim(),
            DueDate = request.DueDate,
            ProjectId = request.ProjectId,
            RelatedDepartmentId = request.RelatedDepartmentId,
            CreatedByUserId = userId,
            UploadGoogleDriveLink = request.UploadGoogleDriveLink,
            AssignedToUserId = request.AssignedToUserId ?? userId
        };

        _context.WorkspaceTasks.Add(task);
        await _context.SaveChangesAsync();

        await LogActivity(task.Id, userId, "created", $"Task \"{task.Title}\" created");

        if (task.AssignedToUserId.HasValue && task.AssignedToUserId != userId)
        {
            await _notifications.NotifyAsync(
                task.AssignedToUserId.Value,
                "task",
                "Task assigned to you",
                $"You were assigned \"{task.Title}\".",
                "/my-tasks",
                task.Id,
                task.ProjectId,
                $"task-assigned-{task.Id}-{task.AssignedToUserId}");
        }

        return Ok(await MapTaskById(task.Id));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(Guid id, UpdateTaskRequest request)
    {
        var task = await _context.WorkspaceTasks
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (task == null)
            return NotFound();

        var userId = GetUserId();
        var changes = new List<string>();

        if (!string.IsNullOrWhiteSpace(request.Title) && request.Title.Trim() != task.Title)
        {
            task.Title = request.Title.Trim();
            changes.Add("title updated");
        }

        if (request.Description != null && request.Description != task.Description)
        {
            task.Description = request.Description.Trim();
            changes.Add("description updated");
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var newStatus = NormalizeStatus(request.Status);
            if (newStatus != task.Status)
            {
                changes.Add($"status: {task.Status} → {newStatus}");
                task.Status = newStatus;
                if (IsCompletedStatus(newStatus))
                    task.CompletedAt = DateTime.UtcNow;
                else if (task.CompletedAt.HasValue)
                    task.CompletedAt = null;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Priority) && request.Priority != task.Priority)
        {
            changes.Add($"priority: {task.Priority} → {request.Priority}");
            task.Priority = request.Priority.Trim();
        }

        if (request.SetDueDate)
        {
            if (task.DueDate != request.DueDate)
            {
                changes.Add("due date updated");
                task.DueDate = request.DueDate;
            }
        }

        if (request.SetProject)
        {
            if (request.ProjectId.HasValue &&
                !await _context.Projects.AnyAsync(p => p.Id == request.ProjectId && !p.IsDeleted))
                return BadRequest(new { message = "Project not found." });

            if (task.ProjectId != request.ProjectId)
            {
                changes.Add("project updated");
                task.ProjectId = request.ProjectId;
            }
        }

        if (request.SetRelatedDepartment)
        {
            if (request.RelatedDepartmentId.HasValue &&
                !await _context.Departments.AnyAsync(d => d.Id == request.RelatedDepartmentId))
                return BadRequest(new { message = "Department not found." });

            if (task.RelatedDepartmentId != request.RelatedDepartmentId)
            {
                changes.Add("related department updated");
                task.RelatedDepartmentId = request.RelatedDepartmentId;
            }
        }

        if (request.SetAssignee)
        {
            if (request.AssignedToUserId.HasValue)
            {
                var userExists = await _context.Users
                    .AnyAsync(u => u.Id == request.AssignedToUserId && u.IsActive);

                if (!userExists)
                    return BadRequest(new { message = "Assigned user not found." });

                if (task.AssignedToUserId != request.AssignedToUserId)
                {
                    changes.Add("assignee updated");
                    task.AssignedToUserId = request.AssignedToUserId;
                    await _notifications.NotifyAsync(
                        request.AssignedToUserId.Value,
                        "task",
                        "Task assigned to you",
                        $"You were assigned \"{task.Title}\".",
                        "/my-tasks",
                        task.Id,
                        task.ProjectId,
                        $"task-assigned-{task.Id}-{request.AssignedToUserId}");
                }
            }
            else if (task.AssignedToUserId != null)
            {
                var previousAssignee = task.AssignedToUserId.Value;
                changes.Add("assignee cleared");
                task.AssignedToUserId = null;
                if (previousAssignee != userId)
                {
                    await _notifications.NotifyAsync(
                        previousAssignee,
                        "task",
                        "Removed from task",
                        $"You were unassigned from \"{task.Title}\".",
                        "/my-tasks",
                        task.Id,
                        task.ProjectId,
                        $"task-unassigned-{task.Id}-{previousAssignee}");
                }
            }
        }

        if (request.UploadGoogleDriveLink != null)
            task.UploadGoogleDriveLink = request.UploadGoogleDriveLink;

        if (request.DeliverableGoogleDriveLink != null)
        {
            task.DeliverableGoogleDriveLink = request.DeliverableGoogleDriveLink;
            if (!IsCompletedStatus(task.Status))
            {
                task.Status = "Completed";
                task.CompletedAt = DateTime.UtcNow;
                changes.Add("marked completed via deliverable");
            }
        }

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (changes.Count > 0)
            await LogActivity(task.Id, userId, "updated", string.Join("; ", changes));

        return Ok(await MapTaskById(task.Id));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(Guid id)
    {
        var task = await _context.WorkspaceTasks.FindAsync(id);

        if (task == null || task.IsDeleted)
            return NotFound();

        task.IsDeleted = true;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id}/comments")]
    public async Task<IActionResult> GetComments(Guid id)
    {
        if (!await _context.WorkspaceTasks.AnyAsync(t => t.Id == id && !t.IsDeleted))
            return NotFound();

        var comments = await _context.TaskComments
            .Where(c => c.TaskId == id)
            .Include(c => c.AuthorUser)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new TaskCommentResponse
            {
                Id = c.Id,
                Body = c.Body,
                AuthorName = c.AuthorUser.DisplayName,
                AuthorUsername = c.AuthorUser.Username,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(Guid id, CreateTaskCommentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Body))
            return BadRequest(new { message = "Comment cannot be empty." });

        var task = await _context.WorkspaceTasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (task == null) return NotFound();

        var userId = GetUserId();
        var comment = new TaskComment
        {
            TaskId = id,
            AuthorUserId = userId,
            Body = request.Body.Trim()
        };

        _context.TaskComments.Add(comment);
        await _context.SaveChangesAsync();
        await LogActivity(id, userId, "commented", request.Body.Trim().Length > 120
            ? request.Body.Trim()[..120] + "…"
            : request.Body.Trim());

        var recipients = new HashSet<Guid>();
        if (task.AssignedToUserId.HasValue && task.AssignedToUserId != userId)
            recipients.Add(task.AssignedToUserId.Value);
        if (task.CreatedByUserId != userId)
            recipients.Add(task.CreatedByUserId);

        foreach (var recipientId in recipients)
        {
            await _notifications.NotifyAsync(
                recipientId,
                "task",
                "New comment on task",
                $"Comment on \"{task.Title}\".",
                "/my-tasks",
                task.Id,
                task.ProjectId);
        }

        await _context.Entry(comment).Reference(c => c.AuthorUser).LoadAsync();

        return Ok(new TaskCommentResponse
        {
            Id = comment.Id,
            Body = comment.Body,
            AuthorName = comment.AuthorUser.DisplayName,
            AuthorUsername = comment.AuthorUser.Username,
            CreatedAt = comment.CreatedAt
        });
    }

    [HttpGet("{id}/activity")]
    public async Task<IActionResult> GetActivity(Guid id)
    {
        if (!await _context.WorkspaceTasks.AnyAsync(t => t.Id == id && !t.IsDeleted))
            return NotFound();

        var logs = await _context.TaskActivityLogs
            .Where(a => a.TaskId == id)
            .Include(a => a.ActorUser)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new TaskActivityResponse
            {
                Id = a.Id,
                Action = a.Action,
                Detail = a.Detail,
                ActorName = a.ActorUser != null ? a.ActorUser.DisplayName : null,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return Ok(logs);
    }

    [HttpPost("{id}/attachment")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> UploadAttachment(Guid id, IFormFile file)
    {
        var task = await _context.WorkspaceTasks.FindAsync(id);
        if (task == null || task.IsDeleted) return NotFound();

        var userId = GetUserId();
        if (task.CreatedByUserId != userId && task.AssignedToUserId != userId)
            return Forbid();

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var uploadsDir = Path.Combine(_env.ContentRootPath, "Uploads", "tasks");
        Directory.CreateDirectory(uploadsDir);

        var storedName = $"{id}_{Guid.NewGuid():N}_{Path.GetFileName(file.FileName)}";
        var fullPath = Path.Combine(uploadsDir, storedName);

        using (var stream = new FileStream(fullPath, FileMode.Create))
            await file.CopyToAsync(stream);

        task.AttachmentFileName = file.FileName;
        task.AttachmentFilePath = fullPath;
        task.UpdatedAt = DateTime.UtcNow;

        _context.TaskAttachments.Add(new TaskAttachment
        {
            TaskId = id,
            FileName = file.FileName,
            StoredFileName = storedName,
            UploadedByUserId = userId
        });

        await _context.SaveChangesAsync();
        await LogActivity(id, userId, "attachment", file.FileName);

        return Ok(new { message = "Attachment uploaded.", fileName = file.FileName });
    }

    [HttpPut("{id}/deliverable")]
    public async Task<IActionResult> SubmitDeliverable(Guid id, [FromBody] SubmitDeliverableRequest request)
    {
        var task = await _context.WorkspaceTasks.FindAsync(id);
        if (task == null || task.IsDeleted) return NotFound();

        var userId = GetUserId();
        if (task.AssignedToUserId != userId && task.CreatedByUserId != userId)
            return Forbid();

        task.DeliverableGoogleDriveLink = request.DeliverableGoogleDriveLink;
        task.Status = "Completed";
        task.CompletedAt = DateTime.UtcNow;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await LogActivity(id, userId, "completed", "Deliverable submitted");

        return Ok(new { message = "Task marked as completed." });
    }

    [HttpGet("user/{username}/history")]
    public async Task<IActionResult> GetWorkHistory(string username)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username && u.IsActive);
        if (user == null) return NotFound();

        var history = await _context.WorkspaceTasks
            .Where(t => !t.IsDeleted && t.AssignedToUserId == user.Id &&
                        (t.Status == "Done" || t.Status == "Completed"))
            .Include(t => t.CreatedByUser)
            .OrderByDescending(t => t.CompletedAt)
            .Select(t => new WorkHistoryItemResponse
            {
                TaskId = t.Id,
                Title = t.Title,
                Status = t.Status,
                CompletedAt = t.CompletedAt,
                DeliverableGoogleDriveLink = t.DeliverableGoogleDriveLink,
                CreatedByName = t.CreatedByUser.DisplayName
            })
            .ToListAsync();

        return Ok(history);
    }

    private async Task<WorkspaceTask?> LoadTaskGraph(Guid id)
    {
        return await _context.WorkspaceTasks
            .Where(t => t.Id == id && !t.IsDeleted)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .Include(t => t.Project)
            .Include(t => t.RelatedDepartment)
            .Include(t => t.Attachments)
            .Include(t => t.Comments)
            .FirstOrDefaultAsync();
    }

    private async Task<TaskResponse> MapTaskById(Guid id)
    {
        var task = await LoadTaskGraph(id);
        return MapTask(task!);
    }

    private static TaskResponse MapTask(WorkspaceTask t)
    {
        string? legacyUrl = null;
        if (!string.IsNullOrEmpty(t.AttachmentFilePath))
            legacyUrl = $"/uploads/tasks/{Path.GetFileName(t.AttachmentFilePath)}";

        return new TaskResponse
        {
            Id = t.Id,
            Title = t.Title,
            Description = t.Description,
            Status = t.Status,
            Priority = t.Priority,
            DueDate = t.DueDate,
            ProjectId = t.ProjectId,
            ProjectTitle = t.Project?.Title,
            RelatedDepartmentId = t.RelatedDepartmentId,
            RelatedDepartmentName = t.RelatedDepartment?.Name,
            AssignedToUserId = t.AssignedToUserId,
            AssignedToName = t.AssignedToUser?.DisplayName,
            AssignedToUsername = t.AssignedToUser?.Username,
            CreatedByUserId = t.CreatedByUserId,
            CreatedByName = t.CreatedByUser?.DisplayName,
            AttachmentFileName = t.AttachmentFileName,
            AttachmentDownloadUrl = legacyUrl,
            UploadGoogleDriveLink = t.UploadGoogleDriveLink,
            DeliverableGoogleDriveLink = t.DeliverableGoogleDriveLink,
            CompletedAt = t.CompletedAt,
            CreatedAt = t.CreatedAt,
            CommentCount = t.Comments?.Count ?? 0,
            Attachments = (t.Attachments ?? new List<TaskAttachment>()).Select(a => new TaskAttachmentDto
            {
                Id = a.Id,
                FileName = a.FileName,
                DownloadUrl = $"/uploads/tasks/{a.StoredFileName}",
                CreatedAt = a.CreatedAt
            }).ToList()
        };
    }

    private async Task LogActivity(Guid taskId, Guid actorUserId, string action, string? detail)
    {
        _context.TaskActivityLogs.Add(new TaskActivityLog
        {
            TaskId = taskId,
            ActorUserId = actorUserId,
            Action = action,
            Detail = detail
        });
        await _context.SaveChangesAsync();
    }

    private static string NormalizeStatus(string status)
    {
        return status.Trim() switch
        {
            "Planning" => "To Do",
            "Done" => "Completed",
            "Review" => "Waiting",
            _ => status.Trim()
        };
    }

    private static bool IsCompletedStatus(string status) =>
        status is "Completed" or "Done";

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.Parse(claim!);
    }
}
