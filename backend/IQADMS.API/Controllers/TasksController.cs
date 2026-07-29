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
    private readonly EmailService _email;
    private readonly ILogger<TasksController> _logger;

    public TasksController(
        ApplicationDbContext context,
        IWebHostEnvironment env,
        NotificationService notifications,
        EmailService email,
        ILogger<TasksController> logger)
    {
        _context = context;
        _env = env;
        _notifications = notifications;
        _email = email;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetTasks([FromQuery] Guid? projectId, [FromQuery] Guid? relatedDepartmentId)
    {
        var userId = GetUserId();
        var isAdmin = await IsAdminAsync(userId);

        var query = _context.WorkspaceTasks
            .Where(t => !t.IsDeleted)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .Include(t => t.Project)
            .Include(t => t.RelatedDepartment)
            .Include(t => t.Attachments)
            .Include(t => t.Comments)
            .AsQueryable();

        if (!isAdmin)
            query = query.Where(t => t.AssignedToUserId == userId);

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

        var userId = GetUserId();
        var isAdmin = await IsAdminAsync(userId);
        if (!isAdmin && task.AssignedToUserId != userId)
            return Forbid();

        return Ok(MapTask(task));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask(CreateTaskRequest request)
    {
        var userId = GetUserId();
        if (!await IsAdminAsync(userId))
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Task title is required." });

        if (!request.ProjectId.HasValue)
            return BadRequest(new { message = "A project is required for every task. Open Tasks from a project or choose a project when creating." });

        if (!await _context.Projects.AnyAsync(p => p.Id == request.ProjectId && !p.IsDeleted))
            return BadRequest(new { message = "Project not found." });

        if (request.RelatedDepartmentId.HasValue &&
            !await _context.Departments.AnyAsync(d => d.Id == request.RelatedDepartmentId))
            return BadRequest(new { message = "Department not found." });

        var status = NormalizeStatus(string.IsNullOrWhiteSpace(request.Status) ? "To Do" : request.Status);
        if (status is "Completed" or "Submitted")
            status = "To Do";

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

        string? taskEmailError = null;

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

            var (sent, err) = await SendTaskAssignedEmailsAsync(task.Id, userId, task.AssignedToUserId.Value);
            taskEmailError = err;
            if (sent)
            {
                var assigneeEmail = await _context.Users.AsNoTracking()
                    .Where(u => u.Id == task.AssignedToUserId)
                    .Select(u => u.Email)
                    .FirstOrDefaultAsync();
                if (!string.IsNullOrWhiteSpace(assigneeEmail))
                    Response.Headers["X-IQADMS-Task-Email-To"] = assigneeEmail.Trim();
            }
        }

        var mapped = await MapTaskById(task.Id);
        if (taskEmailError != null)
            Response.Headers["X-IQADMS-Task-Email-Error"] = taskEmailError;

        return Ok(mapped);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(Guid id, UpdateTaskRequest request)
    {
        var task = await _context.WorkspaceTasks
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (task == null)
            return NotFound();

        var userId = GetUserId();
        var isAdmin = await IsAdminAsync(userId);
        var isAssignee = task.AssignedToUserId == userId;

        if (!isAdmin && !isAssignee)
            return Forbid();

        if (!isAdmin)
        {
            if (request.Title != null || request.Description != null || request.Priority != null
                || request.SetDueDate || request.SetProject || request.SetRelatedDepartment
                || request.SetAssignee || request.UploadGoogleDriveLink != null
                || request.DeliverableGoogleDriveLink != null)
                return Forbid();

            if (string.IsNullOrWhiteSpace(request.Status))
                return BadRequest(new { message = "Status is required." });

            return await ApplyMemberStatusChange(task, userId, NormalizeStatus(request.Status));
        }

        var changes = new List<string>();
        string? taskEmailError = null;

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
                var oldStatus = task.Status;
                task.Status = newStatus;
                if (IsCompletedStatus(newStatus))
                    task.CompletedAt = DateTime.UtcNow;
                else
                {
                    task.CompletedAt = null;
                    if (newStatus != "Submitted")
                        task.SubmittedAt = null;
                }

                if (newStatus == "Submitted")
                    task.SubmittedAt = DateTime.UtcNow;

                await NotifyOnAdminStatusChange(task, oldStatus, newStatus);
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

                    var (sent, err) = await SendTaskAssignedEmailsAsync(task.Id, userId, request.AssignedToUserId.Value);
                    taskEmailError = err;
                    if (sent)
                    {
                        var assigneeEmail = await _context.Users.AsNoTracking()
                            .Where(u => u.Id == request.AssignedToUserId)
                            .Select(u => u.Email)
                            .FirstOrDefaultAsync();
                        if (!string.IsNullOrWhiteSpace(assigneeEmail))
                            Response.Headers["X-IQADMS-Task-Email-To"] = assigneeEmail.Trim();
                    }
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
            task.DeliverableGoogleDriveLink = request.DeliverableGoogleDriveLink;

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (changes.Count > 0)
            await LogActivity(task.Id, userId, "updated", string.Join("; ", changes));

        if (taskEmailError != null)
            Response.Headers["X-IQADMS-Task-Email-Error"] = taskEmailError;

        return Ok(await MapTaskById(task.Id));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(Guid id)
    {
        var userId = GetUserId();
        if (!await IsAdminAsync(userId))
            return Forbid();

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

        var userId = GetUserId();
        if (!await IsAdminAsync(userId))
            return Forbid();

        var task = await _context.WorkspaceTasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (task == null) return NotFound();

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
        if (task.AssignedToUserId != userId && !await IsAdminAsync(userId))
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

        var isAdmin = await IsAdminAsync(userId);
        if (task.AssignedToUserId.HasValue)
        {
            if (!isAdmin && task.AssignedToUserId == userId)
            {
                var (sent, err) = await SendTaskAttachmentUploadedToAdminsAsync(id, userId, file.FileName);
                if (!sent && err != null)
                    Response.Headers["X-IQADMS-Task-Email-Error"] = err;
                else if (sent)
                    Response.Headers["X-IQADMS-Task-Email-Sent"] = "admins";
            }
            else if (isAdmin && task.AssignedToUserId != userId)
            {
                var (sent, err) = await SendTaskReferenceFileToAssigneeAsync(id, userId, file.FileName);
                if (!sent && err != null)
                    Response.Headers["X-IQADMS-Task-Email-Error"] = err;
                else if (sent)
                {
                    var to = await _context.Users.AsNoTracking()
                        .Where(u => u.Id == task.AssignedToUserId)
                        .Select(u => u.Email)
                        .FirstOrDefaultAsync();
                    if (!string.IsNullOrWhiteSpace(to))
                        Response.Headers["X-IQADMS-Task-Email-To"] = to.Trim();
                }
            }
        }

        return Ok(new { message = "Attachment uploaded.", fileName = file.FileName });
    }

    [HttpPut("{id}/deliverable")]
    public async Task<IActionResult> SubmitDeliverable(Guid id, [FromBody] SubmitDeliverableRequest request)
    {
        var task = await _context.WorkspaceTasks.FindAsync(id);
        if (task == null || task.IsDeleted) return NotFound();

        var userId = GetUserId();
        if (task.AssignedToUserId != userId && !await IsAdminAsync(userId))
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.DeliverableGoogleDriveLink))
            return BadRequest(new { message = "Google Drive link is required to submit." });

        if (task.Status != "In Progress")
            return BadRequest(new { message = "Task must be In Progress before submitting a deliverable." });

        var previous = task.Status;
        task.DeliverableGoogleDriveLink = request.DeliverableGoogleDriveLink.Trim();
        task.Status = "Submitted";
        task.SubmittedAt = DateTime.UtcNow;
        task.CompletedAt = null;
        task.AdminReviewRemark = null;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await LogActivity(id, userId, "submitted", "Deliverable submitted for review");

        if (previous == "In Progress")
        {
            await _notifications.NotifyAllAdminsAsync(
                "task",
                "Task submitted for review",
                $"\"{task.Title}\" was submitted by the assignee.",
                $"/my-tasks?task={task.Id}",
                task.Id,
                task.ProjectId,
                dedupKey: $"task-submitted-{task.Id}-{task.SubmittedAt:O}");

            var (sentCount, submitErr) = await SendTaskSubmittedEmailsWithResultAsync(task.Id, userId);
            if (submitErr != null && sentCount == 0)
                Response.Headers["X-IQADMS-Task-Email-Error"] = submitErr;
            else if (sentCount > 0)
                Response.Headers["X-IQADMS-Task-Email-Sent"] = $"admins:{sentCount}";
        }

        return Ok(await MapTaskById(id));
    }

    [HttpPost("{id}/return")]
    public async Task<IActionResult> ReturnTask(Guid id, [FromBody] TaskAdminRemarkRequest request)
    {
        var userId = GetUserId();
        if (!await IsAdminAsync(userId))
            return Forbid();

        var task = await _context.WorkspaceTasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (task == null) return NotFound();

        if (task.Status != "Submitted")
            return BadRequest(new { message = "Only submitted tasks can be returned for revision." });

        if (string.IsNullOrWhiteSpace(request.Remark))
            return BadRequest(new { message = "Remark is required when returning a task." });

        task.AdminReviewRemark = request.Remark.Trim();
        task.Status = "Returned";
        task.SubmittedAt = null;
        task.CompletedAt = null;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await LogActivity(id, userId, "returned", request.Remark.Trim());

        if (task.AssignedToUserId.HasValue)
        {
            var assignee = await _context.Users.FindAsync(task.AssignedToUserId.Value);
            var notice = FormatReviewNotice(assignee, task.Title, request.Remark.Trim(), returned: true);
            await _notifications.NotifyAsync(
                task.AssignedToUserId.Value,
                "task",
                "Task returned — incomplete",
                notice,
                $"/my-tasks?task={task.Id}",
                task.Id);
        }

        return Ok(await MapTaskById(id));
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteTask(Guid id, [FromBody] TaskAdminRemarkRequest? request)
    {
        var userId = GetUserId();
        if (!await IsAdminAsync(userId))
            return Forbid();

        var task = await _context.WorkspaceTasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (task == null) return NotFound();

        if (task.Status != "Submitted")
            return BadRequest(new { message = "Only submitted tasks can be marked completed." });

        var approvalNote = string.IsNullOrWhiteSpace(request?.Remark)
            ? "Good work! This task has been approved and marked complete."
            : request!.Remark.Trim();
        task.AdminReviewRemark = approvalNote;

        task.Status = "Completed";
        task.CompletedAt = DateTime.UtcNow;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await LogActivity(id, userId, "completed", approvalNote);

        if (task.AssignedToUserId.HasValue)
        {
            var assignee = await _context.Users.FindAsync(task.AssignedToUserId.Value);
            var notice = FormatReviewNotice(assignee, task.Title, approvalNote, returned: false);
            await _notifications.NotifyAsync(
                task.AssignedToUserId.Value,
                "task",
                "Task approved — completed",
                notice,
                $"/my-tasks?task={task.Id}",
                task.Id);
        }

        return Ok(await MapTaskById(id));
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
            SubmittedAt = t.SubmittedAt,
            AdminReviewRemark = t.AdminReviewRemark,
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

    private async Task<bool> IsAdminAsync(Guid userId) =>
        await _context.Users.AnyAsync(u => u.Id == userId && u.IsAdmin && u.IsActive);

    private async Task<IActionResult> ApplyMemberStatusChange(WorkspaceTask task, Guid userId, string newStatus)
    {
        var oldStatus = task.Status;
        if (oldStatus == newStatus)
            return Ok(await MapTaskById(task.Id));

        if (newStatus == "In Progress" && oldStatus is "To Do" or "Planning" or "Returned")
        {
            task.Status = newStatus;
            task.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            await LogActivity(task.Id, userId, "updated", $"status: {oldStatus} → {newStatus}");
            if (oldStatus is "To Do" or "Planning")
            {
                await _notifications.NotifyAllAdminsAsync(
                    "task",
                    "Task in progress",
                    $"\"{task.Title}\" moved to In Progress.",
                    $"/my-tasks?task={task.Id}",
                    task.Id,
                    task.ProjectId,
                    dedupKey: $"task-inprogress-{task.Id}-{DateTime.UtcNow:yyyyMMddHHmm}");
            }
            return Ok(await MapTaskById(task.Id));
        }

        return BadRequest(new { message = "Members can move tasks from To Do or Returned to In Progress, then submit via the deliverable link." });
    }

    private static string FormatReviewNotice(User? assignee, string taskTitle, string adminMessage, bool returned)
    {
        var name = assignee?.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            name = assignee?.Username?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            name = "there";

        var intro = returned
            ? $"Hi {name}, your task \"{taskTitle}\" is incomplete or needs more work. It has been returned to you — not completed."
            : $"Hi {name}, good job finishing \"{taskTitle}\"!";

        return $"{intro}\n\n{adminMessage.Trim()}";
    }

    private async Task NotifyOnAdminStatusChange(WorkspaceTask task, string oldStatus, string newStatus)
    {
        if (oldStatus is "To Do" or "Planning" && newStatus == "In Progress")
        {
            await _notifications.NotifyAllAdminsAsync(
                "task",
                "Task in progress",
                $"\"{task.Title}\" is now In Progress.",
                $"/my-tasks?task={task.Id}",
                task.Id,
                task.ProjectId);
        }
    }

    private async Task<(bool Sent, string? Error)> SendTaskAssignedEmailsAsync(Guid taskId, Guid actorUserId, Guid assigneeUserId)
    {
        var task = await _context.WorkspaceTasks
            .AsNoTracking()
            .Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.Id == taskId && !t.IsDeleted);
        if (task == null)
            return (false, "Task not found.");

        var users = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == actorUserId || u.Id == assigneeUserId)
            .ToListAsync();
        var actor = users.FirstOrDefault(u => u.Id == actorUserId);
        var assignee = users.FirstOrDefault(u => u.Id == assigneeUserId);
        if (actor == null || assignee == null || !assignee.IsActive)
            return (false, "Assignee not found or inactive.");

        var actorName = _email.FormatEmailActorName(actor);
        var assigneeGreeting = EmailService.FormatPersonName(assignee.DisplayName, assignee.Username, assignee.Email);
        if (string.IsNullOrWhiteSpace(assigneeGreeting) || assigneeGreeting == assignee.Username)
            assigneeGreeting = EmailService.DeriveGreetingNameFromEmail(assignee.Email) ?? "there";

        var link = _email.BuildTaskLink(task.Id, task.ProjectId);
        var regardsName = actor.IsAdmin ? null : actorName;
        var result = await _email.TrySendTaskAssignedEmailAsync(
            assignee.Email,
            assigneeGreeting,
            actorName,
            task.Title,
            task.Description,
            task.Project?.Title,
            task.DueDate,
            link,
            regardsName);

        if (!result.Sent)
            _logger.LogWarning(
                "Task assign email failed for task {TaskId} to {Email}: {Error}",
                taskId,
                assignee.Email,
                result.Error);

        return result;
    }

    private async Task SendTaskSubmittedEmailsAsync(Guid taskId, Guid submitterUserId)
    {
        _ = await SendTaskSubmittedEmailsWithResultAsync(taskId, submitterUserId);
    }

    private async Task<(int SentCount, string? LastError)> SendTaskSubmittedEmailsWithResultAsync(
        Guid taskId,
        Guid submitterUserId)
    {
        var task = await _context.WorkspaceTasks
            .AsNoTracking()
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .FirstOrDefaultAsync(t => t.Id == taskId && !t.IsDeleted);
        if (task == null)
            return (0, "Task not found.");

        var submitter = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == submitterUserId);
        var submitterName = submitter == null
            ? "Assignee"
            : EmailService.FormatPersonName(submitter.DisplayName, submitter.Username, submitter.Email);

        var assigneeName = task.AssignedToUser == null
            ? "the assignee"
            : EmailService.FormatPersonName(
                task.AssignedToUser.DisplayName,
                task.AssignedToUser.Username,
                task.AssignedToUser.Email);

        var link = _email.BuildTaskLink(task.Id, task.ProjectId);

        var admins = await _context.Users
            .AsNoTracking()
            .Where(u => u.IsAdmin && u.IsActive)
            .ToListAsync();

        var sentCount = 0;
        string? lastError = null;

        foreach (var admin in admins)
        {
            var adminGreeting = EmailService.FormatPersonName(admin.DisplayName, admin.Username, admin.Email);
            if (string.IsNullOrWhiteSpace(adminGreeting) || adminGreeting == admin.Username)
                adminGreeting = EmailService.DeriveGreetingNameFromEmail(admin.Email) ?? "there";

            var (sent, err) = await _email.TrySendTaskSubmittedEmailAsync(
                admin.Email,
                adminGreeting,
                assigneeName,
                submitterName,
                task.Title,
                task.Project?.Title,
                link);
            if (sent)
                sentCount++;
            else
                lastError = err;
        }

        return (sentCount, lastError);
    }

    private async Task<(bool Sent, string? Error)> SendTaskAttachmentUploadedToAdminsAsync(
        Guid taskId,
        Guid uploaderUserId,
        string fileName)
    {
        var task = await _context.WorkspaceTasks.AsNoTracking()
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .FirstOrDefaultAsync(t => t.Id == taskId && !t.IsDeleted);
        if (task == null)
            return (false, "Task not found.");

        var uploader = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == uploaderUserId);
        var uploaderName = uploader == null
            ? "Assignee"
            : _email.FormatEmailActorName(uploader);

        var link = _email.BuildTaskLink(task.Id, task.ProjectId);
        var admins = await _context.Users.AsNoTracking().Where(u => u.IsAdmin && u.IsActive).ToListAsync();

        var anySent = false;
        string? lastError = null;
        foreach (var admin in admins)
        {
            var greeting = EmailService.DeriveGreetingNameFromEmail(admin.Email) ?? "there";
            var (sent, err) = await _email.TrySendTaskAttachmentEmailAsync(
                admin.Email,
                greeting,
                uploaderName,
                task.Title,
                fileName,
                task.Project?.Title,
                link,
                notifyAdmins: true);
            if (sent) anySent = true;
            else lastError = err;
        }

        return (anySent, lastError);
    }

    private async Task<(bool Sent, string? Error)> SendTaskReferenceFileToAssigneeAsync(
        Guid taskId,
        Guid adminUserId,
        string fileName)
    {
        var task = await _context.WorkspaceTasks.AsNoTracking()
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .FirstOrDefaultAsync(t => t.Id == taskId && !t.IsDeleted);
        if (task?.AssignedToUser == null || !task.AssignedToUser.IsActive)
            return (false, "Task has no active assignee.");

        var admin = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == adminUserId);
        var actorName = admin == null ? _email.PublicSenderName : _email.FormatEmailActorName(admin);
        var greeting = EmailService.DeriveGreetingNameFromEmail(task.AssignedToUser.Email)
            ?? task.AssignedToUser.DisplayName
            ?? "there";
        var link = _email.BuildTaskLink(task.Id, task.ProjectId);

        return await _email.TrySendTaskAttachmentEmailAsync(
            task.AssignedToUser.Email,
            greeting,
            actorName,
            task.Title,
            fileName,
            task.Project?.Title,
            link,
            notifyAdmins: false);
    }

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.Parse(claim!);
    }
}
