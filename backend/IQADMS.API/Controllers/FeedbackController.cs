using IQADMS.API.Data;
using IQADMS.API.DTOs.Requests;
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
public class FeedbackController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly EmailService _email;
    private readonly ILogger<FeedbackController> _logger;

    public FeedbackController(
        ApplicationDbContext context,
        EmailService email,
        ILogger<FeedbackController> logger)
    {
        _context = context;
        _email = email;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Submit(SubmitFeedbackDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { message = "Message is required." });

        var type = request.Type?.Trim().ToLowerInvariant() switch
        {
            "bug" => "bug",
            _ => "feedback"
        };

        var userId = GetUserId();
        var message = request.Message.Trim();

        _context.UserFeedbacks.Add(new UserFeedback
        {
            UserId = userId,
            Type = type,
            Message = message
        });

        await _context.SaveChangesAsync();

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user != null)
        {
            var reporterName = EmailService.FormatPersonName(user.DisplayName, user.Username, user.Email);
            var reporterUsername = user.Username ?? user.Email;
            var (sent, err) = await _email.TrySendFeedbackReportAsync(
                reporterName,
                user.Email,
                reporterUsername,
                type,
                message);

            if (!sent)
                _logger.LogWarning("Feedback saved but email not sent for user {UserId}: {Error}", userId, err);
        }

        return Ok(new { message = "Thank you — your report was received." });
    }

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.Parse(claim!);
    }
}
