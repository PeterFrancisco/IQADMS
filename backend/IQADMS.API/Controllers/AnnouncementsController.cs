using IQADMS.API.Data;
using IQADMS.API.DTOs.Announcements;
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
public class AnnouncementsController : ControllerBase
{
    private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "Orientation",
        "Meeting",
        "PACUCOA Visit",
        "General"
    };

    private readonly ApplicationDbContext _context;
    private readonly NotificationService _notifications;

    public AnnouncementsController(ApplicationDbContext context, NotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool upcomingOnly = false)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var query = _context.PqadAnnouncements
            .Where(a => !a.IsDeleted)
            .Include(a => a.CreatedByUser)
            .AsQueryable();

        if (upcomingOnly)
        {
            query = query.Where(a => a.EndDate != null
                ? a.EndDate >= today
                : a.StartDate >= today);
        }

        var items = await query
            .OrderBy(a => a.StartDate)
            .ThenBy(a => a.Title)
            .Select(a => Map(a))
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var item = await _context.PqadAnnouncements
            .Include(a => a.CreatedByUser)
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);

        if (item == null) return NotFound();
        return Ok(Map(item));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAnnouncementRequest request)
    {
        if (!await IsAdmin()) return Forbid();

        var validation = ValidateRequest(request);
        if (validation != null) return validation;

        var entity = new PqadAnnouncement
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Category = NormalizeCategory(request.Category),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Location = request.Location?.Trim(),
            CreatedByUserId = GetUserId()
        };

        _context.PqadAnnouncements.Add(entity);
        await _context.SaveChangesAsync();

        await _context.Entry(entity).Reference(e => e.CreatedByUser).LoadAsync();

        var authorEmail = entity.CreatedByUser?.Email ?? "A team member";
        await _notifications.NotifyAnnouncementPublishedAsync(
            entity.Id,
            entity.Category,
            entity.Title,
            entity.Description,
            entity.CreatedByUserId,
            authorEmail);

        return Ok(Map(entity));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, UpdateAnnouncementRequest request)
    {
        if (!await IsAdmin()) return Forbid();

        var entity = await _context.PqadAnnouncements
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);

        if (entity == null) return NotFound();

        var validation = ValidateRequest(request);
        if (validation != null) return validation;

        entity.Title = request.Title.Trim();
        entity.Description = request.Description?.Trim();
        entity.Category = NormalizeCategory(request.Category);
        entity.StartDate = request.StartDate;
        entity.EndDate = request.EndDate;
        entity.Location = request.Location?.Trim();
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _context.Entry(entity).Reference(e => e.CreatedByUser).LoadAsync();

        return Ok(Map(entity));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!await IsAdmin()) return Forbid();

        var entity = await _context.PqadAnnouncements.FindAsync(id);
        if (entity == null || entity.IsDeleted) return NotFound();

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static AnnouncementResponse Map(PqadAnnouncement a)
    {
        return new AnnouncementResponse
        {
            Id = a.Id,
            Title = a.Title,
            Description = a.Description,
            Category = a.Category,
            StartDate = a.StartDate,
            EndDate = a.EndDate,
            Location = a.Location,
            CreatedByName = a.CreatedByUser?.DisplayName,
            CreatedAt = a.CreatedAt
        };
    }

    private static string NormalizeCategory(string category)
    {
        var trimmed = category?.Trim() ?? "General";
        return AllowedCategories.Contains(trimmed) ? trimmed : "General";
    }

    private IActionResult? ValidateRequest(CreateAnnouncementRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Title is required." });

        if (request.EndDate.HasValue && request.EndDate < request.StartDate)
            return BadRequest(new { message = "End date cannot be before start date." });

        return null;
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
