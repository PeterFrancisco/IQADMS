using IQADMS.API.Data;
using IQADMS.API.DTOs.Tasks;
using IQADMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using IQADMS.API.DTOs.Profile;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    private readonly IWebHostEnvironment _env;

    public TasksController(ApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetTasks()
    {
        var tasks = await _context.WorkspaceTasks
            .Where(t => !t.IsDeleted)
            .Include(t => t.AssignedToUser)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TaskResponse
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                AssignedToUserId = t.AssignedToUserId,
                AssignedToName = t.AssignedToUser != null ? t.AssignedToUser.DisplayName : null,
                AssignedToUsername = t.AssignedToUser != null ? t.AssignedToUser.Username : null,
                CreatedByUserId = t.CreatedByUserId,
                AttachmentFileName = t.AttachmentFileName,
                AttachmentDownloadUrl = t.AttachmentFilePath != null
                    ? $"/uploads/tasks/{Path.GetFileName(t.AttachmentFilePath)}"
                    : null,
                UploadGoogleDriveLink = t.UploadGoogleDriveLink,
                DeliverableGoogleDriveLink = t.DeliverableGoogleDriveLink,
                CompletedAt = t.CompletedAt,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync();

        return Ok(tasks);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask(CreateTaskRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Task title is required." });

        var task = new WorkspaceTask
        {
            Title = request.Title.Trim(),
            Status = "Planning",
            CreatedByUserId = GetUserId(),
            UploadGoogleDriveLink = request.UploadGoogleDriveLink,
            AssignedToUserId = request.AssignedToUserId ?? GetUserId()
        };

        _context.WorkspaceTasks.Add(task);
        await _context.SaveChangesAsync();

        return Ok(new TaskResponse
        {
            Id = task.Id,
            Title = task.Title,
            Status = task.Status,
            CreatedAt = task.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(Guid id, UpdateTaskRequest request)
    {
        var task = await _context.WorkspaceTasks
            .Include(t => t.AssignedToUser)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);

        if (task == null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Title))
            task.Title = request.Title.Trim();

        if (!string.IsNullOrWhiteSpace(request.Status))
            task.Status = request.Status;

        if (request.SetAssignee)
        {
            if (request.AssignedToUserId.HasValue)
            {
                var userExists = await _context.Users
                    .AnyAsync(u => u.Id == request.AssignedToUserId && u.IsActive);

                if (!userExists)
                    return BadRequest(new { message = "Assigned user not found." });

                task.AssignedToUserId = request.AssignedToUserId;
            }
            else
            {
                task.AssignedToUserId = null;
            }
        }

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _context.Entry(task).Reference(t => t.AssignedToUser).LoadAsync();

        return Ok(new TaskResponse
        {
            Id = task.Id,
            Title = task.Title,
            Status = task.Status,
            AssignedToUserId = task.AssignedToUserId,
            AssignedToName = task.AssignedToUser?.DisplayName,
            AssignedToUsername = task.AssignedToUser?.Username,
            CreatedAt = task.CreatedAt
        });
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

    // POST: api/Tasks/{id}/attachment
    [HttpPost("{id}/attachment")]
    [RequestSizeLimit(20_000_000)] // 20 MB
    public async Task<IActionResult> UploadAttachment(Guid id, IFormFile file)
    {
        var task = await _context.WorkspaceTasks.FindAsync(id);
        if (task == null || task.IsDeleted) return NotFound();

        var userId = GetUserId();
        if (task.CreatedByUserId != userId)
            return Forbid();

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var uploadsDir = Path.Combine(_env.ContentRootPath, "Uploads", "tasks");
        Directory.CreateDirectory(uploadsDir);

        var safeName = $"{id}_{Path.GetFileName(file.FileName)}";
        var fullPath = Path.Combine(uploadsDir, safeName);

        using (var stream = new FileStream(fullPath, FileMode.Create))
            await file.CopyToAsync(stream);

        task.AttachmentFileName = file.FileName;
        task.AttachmentFilePath = fullPath;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Attachment uploaded.", fileName = file.FileName });
    }

    // PUT: api/Tasks/{id}/deliverable — assignee submits finished work link
    [HttpPut("{id}/deliverable")]
    public async Task<IActionResult> SubmitDeliverable(Guid id, [FromBody] SubmitDeliverableRequest request)
    {
        var task = await _context.WorkspaceTasks.FindAsync(id);
        if (task == null || task.IsDeleted) return NotFound();

        var userId = GetUserId();
        if (task.AssignedToUserId != userId && task.CreatedByUserId != userId)
            return Forbid();

        task.DeliverableGoogleDriveLink = request.DeliverableGoogleDriveLink;
        task.Status = "Done";
        task.CompletedAt = DateTime.UtcNow;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Task marked as done." });
    }

    // GET: api/Tasks/user/{username}/history — work history for profile
    [HttpGet("user/{username}/history")]
    public async Task<IActionResult> GetWorkHistory(string username)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username && u.IsActive);
        if (user == null) return NotFound();

        var history = await _context.WorkspaceTasks
            .Where(t => !t.IsDeleted && t.AssignedToUserId == user.Id && t.Status == "Done")
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

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.Parse(claim!);
    }
}
