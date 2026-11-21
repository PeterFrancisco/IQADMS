using IQADMS.API.Data;
using IQADMS.API.DTOs.Auth;
using IQADMS.API.Services;
using IQADMS.API.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IQADMS.API.Models;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly AllowedUserService _allowedUserService;
    private readonly EmailService _emailService;
    private readonly ApplicationDbContext _context;
    private readonly NotificationService _notifications;
    private readonly IConfiguration _configuration;

    public AuthController(
        AuthService authService,
        AllowedUserService allowedUserService,
        EmailService emailService,
        ApplicationDbContext context,
        NotificationService notifications,
        IConfiguration configuration)
    {
        _authService = authService;
        _allowedUserService = allowedUserService;
        _emailService = emailService;
        _context = context;
        _notifications = notifications;
        _configuration = configuration;
    }
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request);
            AuthSessionCookies.SetSessionCookies(HttpContext, result.Token, rememberMe: true, _configuration);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            AuthSessionCookies.SetSessionCookies(HttpContext, result.Token, request.RememberMe, _configuration);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("check-email")]
    public async Task<IActionResult> CheckEmail([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email is required." });

        var normalized = email.Trim().ToLowerInvariant();

        var allowed = await _allowedUserService.IsEmailAllowedAsync(normalized);

        var alreadyRegistered = await _context.Users
            .AnyAsync(x => x.Email.ToLower() == normalized);

        return Ok(new
        {
            allowed,
            alreadyRegistered
        });
    }

    [HttpPost("request-access")]
    public async Task<IActionResult> RequestAccess(AccessRequestDto request)
    {
        var accountRequest = new AccountRequest
        {
            FullName = request.FullName,
            Email = request.Email,
            Department = request.Department,
            Position = request.Position,
            Reason = request.Reason
        };

        _context.AccountRequests.Add(accountRequest);
        await _context.SaveChangesAsync();

        await _notifications.NotifyAdminsOfAccountRequestAsync(
            accountRequest.Id,
            request.FullName,
            request.Email);

        await _emailService.SendAccessRequestAsync(
            request.FullName,
            request.Email,
            request.Department,
            request.Position,
            request.Reason);

        return Ok(new
        {
            message = "Request submitted successfully. The administrator has been informed."
        });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.EmailOrUsername))
            return BadRequest(new { message = "Email or username is required." });

        var key = request.EmailOrUsername.Trim().ToLowerInvariant();
        var user = await _context.Users
            .FirstOrDefaultAsync(u =>
                u.IsActive && !u.IsDeleted &&
                (u.Email.ToLower() == key || u.Username!.ToLower() == key));

        if (user == null)
        {
            return Ok(new
            {
                message = "If an account exists, administrators were notified to review your reset request."
            });
        }

        var hasPending = await _context.PasswordResetRequests
            .AnyAsync(r => r.UserId == user.Id && r.Status == "Pending" && !r.IsDeleted);

        if (!hasPending)
        {
            _context.PasswordResetRequests.Add(new PasswordResetRequest
            {
                UserId = user.Id,
                Email = user.Email,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }

        await _notifications.NotifyAllAdminsAsync(
            "security",
            "Password reset requested",
            $"{user.DisplayName ?? user.Username} ({user.Email}) requested a password reset.",
            "/settings?tab=password-resets",
            dedupKey: $"pwd-reset-{user.Id}-{DateTime.UtcNow:yyyyMMdd}");

        await _emailService.TrySendPasswordResetRequestToAdminAsync(
            user.Email,
            user.DisplayName,
            user.Username);

        return Ok(new
        {
            message = "Your request was sent to an administrator. You will receive email when it is approved."
        });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        try
        {
            await _authService.ResetPasswordWithTokenAsync(request);
            return Ok(new { message = "Password updated. You can sign in now." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Issue a new JWT from a current or recently expired token (see Jwt:RefreshGraceMinutes).</summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshSession([FromBody] RefreshSessionRequest? body)
    {
        var auth = Request.Headers.Authorization.ToString();
        string bearer;
        if (!string.IsNullOrWhiteSpace(auth)
            && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            bearer = auth["Bearer ".Length..].Trim();
        }
        else if (Request.Cookies.TryGetValue(AuthSessionCookies.SessionName, out var cookieToken)
                 && !string.IsNullOrWhiteSpace(cookieToken))
        {
            bearer = cookieToken;
        }
        else
        {
            return Unauthorized(new { message = "Missing session token." });
        }
        var remember = body?.RememberMe ?? true;
        var result = await _authService.RefreshSessionAsync(bearer, remember);
        if (result == null)
            return Unauthorized(new { message = "Session could not be renewed. Sign in again." });

        AuthSessionCookies.SetSessionCookies(HttpContext, result.Token, remember, _configuration);
        return Ok(result);
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        AuthSessionCookies.ClearSessionCookies(Response);
        return Ok(new { message = "Signed out." });
    }
}