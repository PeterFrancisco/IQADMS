using BCrypt.Net;
using IQADMS.API.Data;
using IQADMS.API.DTOs.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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

        return Ok(new { presence = user.PresenceStatus });
    }

    [HttpPost("me/heartbeat")]
    public async Task<IActionResult> Heartbeat()
    {
        var userId = GetUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound();

        user.LastActiveAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { presence = NormalizePresence(user.PresenceStatus) });
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

        await _context.SaveChangesAsync();

        return Ok(new { message = "Profile updated successfully." });
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
                ProfilePictureUrl = u.ProfilePictureUrl
            })
            .ToListAsync();

        foreach (var member in members)
            member.Presence = NormalizePresence(member.Presence);

        return Ok(members);
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
        Presence = NormalizePresence(user.PresenceStatus),
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

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        return Guid.Parse(claim!);
    }
}