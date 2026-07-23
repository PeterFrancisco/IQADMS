using IQADMS.API.Data;
using IQADMS.API.DTOs.Auth;
using IQADMS.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IQADMS.API.Models;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly AllowedUserService _allowedUserService;
    private readonly EmailService _emailService;
    private readonly ApplicationDbContext _context;

    public AuthController(
        AuthService authService,
        AllowedUserService allowedUserService,
        EmailService emailService,
        ApplicationDbContext context)
    {
        _authService = authService;
        _allowedUserService = allowedUserService;
        _emailService = emailService;
        _context = context;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        return Ok(result);
    }

    [HttpGet("check-email")]
    public async Task<IActionResult> CheckEmail([FromQuery] string email)
    {
        var allowed = await _allowedUserService.IsEmailAllowedAsync(email);

        var alreadyRegistered = await _context.Users
            .AnyAsync(x => x.Email == email);

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
}