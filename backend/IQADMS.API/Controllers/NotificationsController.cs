using IQADMS.API.Data;
using IQADMS.API.DTOs.Notifications;
using IQADMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly NotificationService _notifications;

    public NotificationsController(ApplicationDbContext context, NotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool unreadOnly = false)
    {
        var userId = GetUserId();
        await _notifications.SyncDueRemindersAsync(userId);
        await _notifications.SyncAdminAccountRequestAlertsAsync(userId);

        var query = _context.UserNotifications
            .Where(n => n.UserId == userId && !n.IsDeleted);

        if (unreadOnly)
            query = query.Where(n => !n.IsRead);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(100)
            .Select(n => new NotificationResponse
            {
                Id = n.Id,
                Category = n.Category,
                Title = n.Title,
                Body = n.Body,
                LinkPath = n.LinkPath,
                RelatedTaskId = n.RelatedTaskId,
                RelatedProjectId = n.RelatedProjectId,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetUserId();
        await _notifications.SyncDueRemindersAsync(userId);
        await _notifications.SyncAdminAccountRequestAlertsAsync(userId);

        var count = await _context.UserNotifications.CountAsync(n =>
            n.UserId == userId && !n.IsDeleted && !n.IsRead);

        return Ok(new UnreadCountResponse { Count = count });
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var userId = GetUserId();
        var notification = await _context.UserNotifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId && !n.IsDeleted);

        if (notification == null) return NotFound();

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = GetUserId();
        var unread = await _context.UserNotifications
            .Where(n => n.UserId == userId && !n.IsDeleted && !n.IsRead)
            .ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = now;
        }

        await _context.SaveChangesAsync();
        return Ok(new { updated = unread.Count });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Dismiss(Guid id)
    {
        var userId = GetUserId();
        var notification = await _context.UserNotifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId && !n.IsDeleted);

        if (notification == null) return NotFound();

        notification.IsDeleted = true;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.Parse(claim!);
    }
}
