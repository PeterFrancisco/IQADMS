using IQADMS.API.Data;
using IQADMS.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IQADMS.API.DTOs.AllowedUsers;
using Microsoft.AspNetCore.Authorization;
using IQADMS.API.DTOs.Admin;
using IQADMS.API.Services;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly EmailService _emailService;
    private readonly IConfiguration _config;

    public AdminController(
        ApplicationDbContext context,
        EmailService emailService,
        IConfiguration config)
    {
        _context = context;
        _emailService = emailService;
        _config = config;
    }

    // GET: api/Admin/account-requests
    [HttpGet("account-requests")]
    public async Task<IActionResult> GetAccountRequests()
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var requests = await _context.AccountRequests
            .OrderByDescending(x => x.RequestedAt)
            .ToListAsync();

        return Ok(requests);
    }

    // POST: api/Admin/account-requests/{id}/approve
    [HttpPost("account-requests/{id}/approve")]
    public async Task<IActionResult> ApproveRequest(Guid id)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var request = await _context.AccountRequests.FindAsync(id);

        if (request == null)
            return NotFound();

        request.Status = "Approved";
        request.ReviewedAt = DateTime.UtcNow;

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var exists = await _context.AllowedUsers
            .AnyAsync(x => x.Email.ToLower() == normalizedEmail);

        if (!exists)
        {
            _context.AllowedUsers.Add(new AllowedUser
            {
                Email = normalizedEmail,
                IsRegistered = false
            });
        }

        await _context.SaveChangesAsync();

        var alreadyRegistered = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == normalizedEmail && u.IsActive && !u.IsDeleted);

        if (!alreadyRegistered)
        {
            var allowedRow = await _context.AllowedUsers
                .FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail);
            if (allowedRow != null)
                await SendInviteForAllowedUserAsync(allowedRow, request.FullName);
        }

        return Ok(new { message = "Request approved." });
    }

    // POST: api/Admin/account-requests/{id}/reject
    [HttpPost("account-requests/{id}/reject")]
    public async Task<IActionResult> RejectRequest(Guid id)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var request = await _context.AccountRequests.FindAsync(id);

        if (request == null)
            return NotFound();

        request.Status = "Rejected";
        request.ReviewedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Request rejected." });
    }

    // POST: api/Admin/allowed-users
    [HttpPost("allowed-users")]
    public async Task<IActionResult> CreateAllowedUser(CreateAllowedUserRequest request)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email is required." });

        var email = request.Email.Trim().ToLower();

        var exists = await _context.AllowedUsers
            .AnyAsync(x => x.Email == email);

        if (exists)
            return BadRequest(new { message = "Email is already in the allowed list." });

        _context.AllowedUsers.Add(new AllowedUser
        {
            Email = email,
            IsRegistered = false,
            IsAdmin = request.IsAdmin
        });

        await _context.SaveChangesAsync();

        var allowed = await _context.AllowedUsers
            .FirstAsync(x => x.Email == email);

        var (inviteSent, inviteError) = await SendInviteForAllowedUserAsync(allowed);

        return Ok(new
        {
            message = inviteSent
                ? "Allowed user added and invitation email sent."
                : "Allowed user added, but the invitation email could not be sent.",
            inviteEmailSent = inviteSent,
            inviteEmailError = inviteError
        });
    }

    // POST: api/Admin/allowed-users/{id}/resend-invite
    [HttpPost("allowed-users/{id}/resend-invite")]
    public async Task<IActionResult> ResendInvite(Guid id)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var allowed = await _context.AllowedUsers.FindAsync(id);
        if (allowed == null)
            return NotFound(new { message = "Allowed email not found." });

        if (allowed.IsRegistered)
            return BadRequest(new { message = "This email is already registered." });

        var (sent, error) = await SendInviteForAllowedUserAsync(allowed);

        return Ok(new
        {
            message = sent ? "Invitation email sent." : "Invitation email could not be sent.",
            inviteEmailSent = sent,
            inviteEmailError = error,
            lastInviteSentAt = allowed.LastInviteSentAt,
            lastInviteError = allowed.LastInviteError
        });
    }

    // POST: api/Admin/allowed-users/resend-pending-invites
    [HttpPost("allowed-users/resend-pending-invites")]
    public async Task<IActionResult> ResendAllPendingInvites()
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var pending = await _context.AllowedUsers
            .Where(x => !x.IsRegistered)
            .OrderBy(x => x.Email)
            .ToListAsync();

        if (pending.Count == 0)
            return Ok(new { message = "No pending emails to invite.", sent = 0, failed = 0, results = Array.Empty<object>() });

        var results = new List<object>();
        var sentCount = 0;
        var failedCount = 0;

        foreach (var allowed in pending)
        {
            var (sent, error) = await SendInviteForAllowedUserAsync(allowed);
            if (sent)
                sentCount++;
            else
                failedCount++;

            results.Add(new
            {
                allowed.Id,
                allowed.Email,
                inviteEmailSent = sent,
                inviteEmailError = error,
                allowed.LastInviteSentAt,
                allowed.LastInviteError
            });
        }

        return Ok(new
        {
            message = $"Sent {sentCount} invite(s), {failedCount} failed.",
            sent = sentCount,
            failed = failedCount,
            results
        });
    }

    // GET: api/Admin/allowed-users
    [HttpGet("allowed-users")]
    public async Task<IActionResult> GetAllowedUsers()
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var users = await _context.AllowedUsers
            .OrderBy(x => x.Email)
            .Select(x => new
            {
                x.Id,
                x.Email,
                x.IsRegistered,
                x.IsAdmin,
                x.LastInviteSentAt,
                x.LastInviteError
            })
            .ToListAsync();

        return Ok(users);
    }

    // GET: api/Admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var users = await _context.Users
            .Where(u => !u.IsDeleted)
            .OrderBy(u => u.Username)
            .Select(u => new AdminUserResponse
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                DisplayName = u.DisplayName,
                Position = u.Position,
                Age = u.Age,
                IsAdmin = u.IsAdmin,
                IsActive = u.IsActive
            })
            .ToListAsync();

        return Ok(users);
    }

    // DELETE: api/Admin/users/{id}
    [HttpDelete("users/{id}")]
    public async Task<IActionResult> RemoveUser(Guid id)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var currentUserId = GetCurrentUserId();

        if (id == currentUserId)
            return BadRequest(new { message = "You cannot remove your own account." });

        var user = await _context.Users.FindAsync(id);

        if (user == null || user.IsDeleted)
            return NotFound();

        // Soft-delete: keeps history (submissions, tasks) but blocks login
        user.IsActive = false;
        user.IsDeleted = true;
        user.UpdatedAt = DateTime.UtcNow;

        // Remove from allowed list so they can't re-register
        var allowed = await _context.AllowedUsers
            .FirstOrDefaultAsync(x => x.Email.ToLower() == user.Email.ToLower());

        if (allowed != null)
            _context.AllowedUsers.Remove(allowed);

        // Unassign their tasks (if you have WorkspaceTasks)
        var tasks = await _context.WorkspaceTasks
            .Where(t => t.AssignedToUserId == id)
            .ToListAsync();

        foreach (var task in tasks)
            task.AssignedToUserId = null;

        await _context.SaveChangesAsync();

        return Ok(new { message = "User removed successfully." });
    }

    // DELETE: api/Admin/allowed-users/{id}
    [HttpDelete("allowed-users/{id}")]
    public async Task<IActionResult> RemoveAllowedUser(Guid id)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var allowed = await _context.AllowedUsers.FindAsync(id);

        if (allowed == null)
            return NotFound();

        if (allowed.IsRegistered)
            return BadRequest(new { message = "This email is already registered. Remove the user account instead." });

        _context.AllowedUsers.Remove(allowed);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Allowed email removed." });
    }

    [HttpGet("feedback")]
    public async Task<IActionResult> GetFeedback([FromQuery] int limit = 50)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        limit = Math.Clamp(limit, 1, 200);

        var items = await _context.UserFeedbacks
            .Where(f => !f.IsDeleted)
            .Include(f => f.User)
            .OrderByDescending(f => f.CreatedAt)
            .Take(limit)
            .Select(f => new AdminFeedbackResponse
            {
                Id = f.Id,
                Type = f.Type,
                Message = f.Message,
                Username = f.User.Username,
                DisplayName = f.User.DisplayName,
                CreatedAt = f.CreatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    // GET: api/Admin/smtp-settings (no secrets — verify pqad config)
    [HttpGet("smtp-settings")]
    public async Task<IActionResult> GetSmtpSettings()
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        return Ok(_emailService.GetSmtpConfigSummary());
    }

    // POST: api/Admin/test-smtp?to=optional@email.com
    [HttpPost("test-smtp")]
    public async Task<IActionResult> TestSmtp([FromQuery] string? to = null)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var (sent, error) = await _emailService.TrySendTestEmailAsync(to);
        if (!sent)
            return BadRequest(new { message = error, inviteEmailSent = false, inviteEmailError = error });

        return Ok(new { message = "Test email sent.", inviteEmailSent = true });
    }

    // POST: api/Admin/test-registration-invite?to=optional@email.com
    [HttpPost("test-registration-invite")]
    public async Task<IActionResult> TestRegistrationInvite([FromQuery] string? to = null)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var smtp = _config.GetSection("SmtpSettings");
        var adminEmail = smtp["AdminEmail"]?.Trim();
        var recipient = (to ?? adminEmail)?.Trim();
        if (string.IsNullOrWhiteSpace(recipient))
            return BadRequest(new { message = "Pass ?to=email or set SmtpSettings:AdminEmail." });

        var invitedBy = await GetCurrentUserInviteLabelAsync();
        var (sent, error) = await _emailService.TrySendRegistrationInviteAsync(
            recipient,
            invitedBy,
            "Sample invite");

        if (!sent)
            return BadRequest(new { message = error, inviteEmailSent = false, inviteEmailError = error });

        var links = _emailService.GetInviteLinkPreview();
        return Ok(new
        {
            message = $"Sample registration invite sent to {recipient}.",
            inviteEmailSent = true,
            links
        });
    }

    // PUT: api/Admin/users/{id}/admin
    [HttpPut("users/{id}/admin")]
    public async Task<IActionResult> SetUserAdmin(Guid id, SetUserAdminRequest request)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (user == null)
            return NotFound();

        user.IsAdmin = request.IsAdmin;
        user.UpdatedAt = DateTime.UtcNow;

        var allowed = await _context.AllowedUsers
            .FirstOrDefaultAsync(a => a.Email.ToLower() == user.Email.ToLower());
        if (allowed != null)
        {
            allowed.IsAdmin = request.IsAdmin;
            allowed.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = request.IsAdmin ? "Administrator access granted." : "Administrator access removed.",
            userId = user.Id,
            isAdmin = user.IsAdmin
        });
    }

    [HttpGet("password-reset-requests")]
    public async Task<IActionResult> GetPasswordResetRequests()
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var items = await _context.PasswordResetRequests
            .Where(r => !r.IsDeleted && r.Status == "Pending")
            .Include(r => r.User)
            .OrderByDescending(r => r.RequestedAt)
            .Select(r => new
            {
                r.Id,
                r.Email,
                r.RequestedAt,
                Username = r.User.Username,
                DisplayName = r.User.DisplayName
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("password-reset-requests/{id}/approve")]
    public async Task<IActionResult> ApprovePasswordReset(Guid id)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var req = await _context.PasswordResetRequests
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

        if (req == null)
            return NotFound();

        if (req.Status != "Pending")
            return BadRequest(new { message = "This request was already processed." });

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');

        req.Status = "Approved";
        req.ResetToken = token;
        req.TokenExpiresAt = DateTime.UtcNow.AddHours(24);
        req.ReviewedAt = DateTime.UtcNow;
        req.ReviewedByUserId = GetCurrentUserId();
        req.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var resetUrl = _emailService.BuildResetPasswordUrl(token);
        var (sent, error) = await _emailService.TrySendPasswordResetEmailAsync(req.Email, resetUrl);

        if (!sent)
            return BadRequest(new { message = error ?? "Could not send reset email.", resetUrl });

        return Ok(new { message = $"Password reset link emailed to {req.Email}." });
    }

    [HttpPost("password-reset-requests/{id}/reject")]
    public async Task<IActionResult> RejectPasswordReset(Guid id)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var req = await _context.PasswordResetRequests.FindAsync(id);
        if (req == null || req.IsDeleted)
            return NotFound();

        req.Status = "Rejected";
        req.ReviewedAt = DateTime.UtcNow;
        req.ReviewedByUserId = GetCurrentUserId();
        req.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Password reset request rejected." });
    }

    // --- Helper methods (paste at bottom of class) ---

    private Guid GetCurrentUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        return Guid.Parse(claim!);
    }

    private async Task<bool> IsCurrentUserAdmin()
    {
        var user = await _context.Users.FindAsync(GetCurrentUserId());
        return user != null && user.IsAdmin;
    }

    private async Task<string?> GetCurrentUserInviteLabelAsync()
    {
        var user = await _context.Users.FindAsync(GetCurrentUserId());
        if (user == null)
            return null;

        if (!string.IsNullOrWhiteSpace(user.DisplayName))
            return user.DisplayName.Trim();

        if (!string.IsNullOrWhiteSpace(user.Username))
            return user.Username.Trim();

        return null;
    }

    private async Task<(bool Sent, string? Error)> SendInviteForAllowedUserAsync(
        AllowedUser allowed,
        string? recipientDisplayName = null)
    {
        if (allowed.IsRegistered)
            return (false, "This email is already registered.");

        var invitedBy = await GetCurrentUserInviteLabelAsync();
        var (sent, error) = await _emailService.TrySendRegistrationInviteAsync(
            allowed.Email,
            invitedBy,
            recipientDisplayName);

        allowed.LastInviteSentAt = DateTime.UtcNow;
        allowed.LastInviteError = sent ? null : error;
        allowed.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return (sent, error);
    }
}