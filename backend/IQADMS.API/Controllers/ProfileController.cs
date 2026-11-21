using BCrypt.Net;
using IQADMS.API.Data;
using IQADMS.API.DTOs.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    public ProfileController(ApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();

        var user = await _context.Users.FindAsync(userId);

        if (user == null)
            return NotFound();

        return Ok(MapProfile(user));
    }

    [HttpGet("me/preferences")]
    public async Task<IActionResult> GetPreferences()
    {
        var userId = GetUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound();

        return Ok(ParsePreferences(user.PreferencesJson));
    }

    [HttpPut("me/preferences")]
    public async Task<IActionResult> UpdatePreferences(UserPreferencesDto request)
    {
        var userId = GetUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound();

        var normalized = NormalizePreferences(request);
        user.PreferencesJson = JsonSerializer.Serialize(normalized);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(normalized);
    }

    [HttpPut("me/presence")]
    public async Task<IActionResult> UpdatePresence(UpdatePresenceRequest request)
    {
        var userId = GetUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound();

        user.PresenceStatus = NormalizePresence(request.Presence);
        user.LastActiveAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { presence = user.PresenceStatus, lastActiveAt = user.LastActiveAt });
    }

    [HttpPost("me/heartbeat")]
    public async Task<IActionResult> Heartbeat()
    {
        var userId = GetUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound();

        user.PresenceStatus = "online";
        user.LastActiveAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { presence = user.PresenceStatus, lastActiveAt = user.LastActiveAt });
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = GetUserId();

        var user = await _context.Users.FindAsync(userId);

        if (user == null)
            return NotFound();

        user.DisplayName = request.DisplayName;
        user.Position = request.Position;
        user.Age = request.Age;
        user.Bio = request.Bio;

        user.LinkedInUrl = request.LinkedInUrl;
        user.GitHubUrl = request.GitHubUrl;
        user.InstagramUrl = request.InstagramUrl;
        user.FacebookUrl = request.FacebookUrl;
        user.TwitterUrl = request.TwitterUrl;
        user.WebsiteUrl = request.WebsiteUrl;

        user.FacebookDisplayName = request.FacebookDisplayName;
        user.InstagramDisplayName = request.InstagramDisplayName;
        user.TwitterDisplayName = request.TwitterDisplayName;
        user.LinkedInDisplayName = request.LinkedInDisplayName;
        user.GitHubDisplayName = request.GitHubDisplayName;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Profile updated successfully." });
    }

    [HttpPost("me/change-email")]
    public async Task<IActionResult> ChangeEmail(ChangeEmailRequest request)
    {
        var userId = GetUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null || user.IsDeleted)
            return NotFound();

        var newEmail = (request.NewEmail ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(newEmail))
            return BadRequest(new { message = "Email is required." });

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Current password is incorrect." });

        var taken = await _context.Users.AnyAsync(u =>
            u.Id != userId && !u.IsDeleted && u.Email.ToLower() == newEmail.ToLower());
        if (taken)
            return BadRequest(new { message = "That email is already in use." });

        user.Email = newEmail;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Email updated successfully." });
    }

    [HttpDelete("me")]
    public async Task<IActionResult> DeleteAccount(DeleteAccountRequest request)
    {
        var userId = GetUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null || user.IsDeleted)
            return NotFound();

        if (!string.Equals(request.ConfirmText?.Trim(), "DELETE", StringComparison.Ordinal))
            return BadRequest(new { message = "Type DELETE to confirm account removal." });

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Current password is incorrect." });

        user.IsDeleted = true;
        user.IsActive = false;
        user.PresenceStatus = "offline";
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Your account has been deleted." });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var userId = GetUserId();

        var user = await _context.Users.FindAsync(userId);

        if (user == null)
            return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Current password is incorrect." });

        if (request.NewPassword != request.ConfirmPassword)
            return BadRequest(new { message = "New passwords do not match." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Password changed successfully." });
    }

    [HttpPost("me/avatar")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var userId = GetUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound();

        var uploadsDir = Path.Combine(_env.ContentRootPath, "Uploads", "profiles");
        Directory.CreateDirectory(uploadsDir);

        var extension = Path.GetExtension(file.FileName);
        var safeName = $"{userId}{extension}";
        var fullPath = Path.Combine(uploadsDir, safeName);

        using (var stream = new FileStream(fullPath, FileMode.Create))
            await file.CopyToAsync(stream);

        user.ProfilePictureUrl = $"/uploads/profiles/{safeName}";
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { profilePictureUrl = user.ProfilePictureUrl });
    }

    // GET: api/Profile/members
    [HttpGet("members")]
    public async Task<IActionResult> GetMembers()
    {
        var members = await _context.Users
            .Where(u => u.IsActive && !u.IsDeleted)
            .OrderBy(u => u.DisplayName)
            .Select(u => new MemberSummaryResponse
            {
                Id = u.Id,
                Username = u.Username,
                DisplayName = u.DisplayName == null || u.DisplayName == "" ? u.Username : u.DisplayName,
                Email = u.Email,
                Position = u.Position,
                Bio = u.Bio,
                Presence = u.PresenceStatus,
                LastActiveAt = u.LastActiveAt,
                ProfilePictureUrl = u.ProfilePictureUrl
            })
            .ToListAsync();

        foreach (var member in members)
            member.Presence = NormalizePresence(member.Presence);

        return Ok(members);
    }

    [HttpGet("{username}/announcements")]
    public async Task<IActionResult> GetMemberAnnouncements(string username)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == username && u.IsActive);

        if (user == null)
            return NotFound();

        var items = await _context.PqadAnnouncements
            .Where(a => !a.IsDeleted && a.CreatedByUserId == user.Id)
            .OrderByDescending(a => a.CreatedAt)
            .Take(25)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Description,
                a.Category,
                startDate = a.StartDate,
                endDate = a.EndDate,
                a.Location,
                createdAt = a.CreatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    // GET: api/Profile/{username}
    [HttpGet("{username}")]
    public async Task<IActionResult> GetMemberProfile(string username)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == username && u.IsActive);

        if (user == null)
            return NotFound();

        return Ok(MapProfile(user));
    }

    private static ProfileResponse MapProfile(Models.User user) => new()
    {
        IsAdmin = user.IsAdmin,
        DisplayName = user.DisplayName,
        Username = user.Username ?? string.Empty,
        Email = user.Email,
        Position = user.Position,
        Age = user.Age,
        Bio = user.Bio,
        ProfilePictureUrl = user.ProfilePictureUrl,
        LinkedInUrl = user.LinkedInUrl,
        GitHubUrl = user.GitHubUrl,
        InstagramUrl = user.InstagramUrl,
        FacebookUrl = user.FacebookUrl,
        TwitterUrl = user.TwitterUrl,
        WebsiteUrl = user.WebsiteUrl,
        FacebookDisplayName = user.FacebookDisplayName,
        InstagramDisplayName = user.InstagramDisplayName,
        TwitterDisplayName = user.TwitterDisplayName,
        LinkedInDisplayName = user.LinkedInDisplayName,
        GitHubDisplayName = user.GitHubDisplayName,
        Presence = NormalizePresence(user.PresenceStatus),
        LastActiveAt = user.LastActiveAt,
        IsAdmin = user.IsAdmin
    };

    private static string NormalizePresence(string? presence)
    {
        var value = (presence ?? string.Empty).Trim().ToLowerInvariant();
        return value switch
        {
            "online" => "online",
            "away" => "away",
            "dnd" => "dnd",
            _ => "offline"
        };
    }

    private static readonly HashSet<string> ValidThemes = new(StringComparer.OrdinalIgnoreCase)
        { "original", "light", "dark" };

    private static readonly HashSet<string> ValidAccents = new(StringComparer.OrdinalIgnoreCase)
        { "maroon", "slate", "ocean", "forest" };

    private static readonly HashSet<string> ValidFontSizes = new(StringComparer.OrdinalIgnoreCase)
        { "small", "medium", "large" };

    private static UserPreferencesDto ParsePreferences(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new UserPreferencesDto();

        try
        {
            var parsed = JsonSerializer.Deserialize<UserPreferencesDto>(json);
            return parsed == null ? new UserPreferencesDto() : NormalizePreferences(parsed);
        }
        catch
        {
            return new UserPreferencesDto();
        }
    }

    private static UserPreferencesDto NormalizePreferences(UserPreferencesDto prefs)
    {
        var theme = (prefs.Theme ?? "original").Trim().ToLowerInvariant();
        var accent = (prefs.Accent ?? "maroon").Trim().ToLowerInvariant();
        var fontSize = (prefs.FontSize ?? "medium").Trim().ToLowerInvariant();

        return new UserPreferencesDto
        {
            Theme = ValidThemes.Contains(theme) ? theme : "original",
            Accent = ValidAccents.Contains(accent) ? accent : "maroon",
            FontSize = ValidFontSizes.Contains(fontSize) ? fontSize : "medium",
            NotificationsMuted = prefs.NotificationsMuted,
            NotificationVolume = Math.Clamp(prefs.NotificationVolume, 0, 100)
        };
    }

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        return Guid.Parse(claim!);
    }
}