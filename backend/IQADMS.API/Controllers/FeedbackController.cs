using IQADMS.API.Data;
using IQADMS.API.DTOs.Requests;
using IQADMS.API.Models;
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

    public FeedbackController(ApplicationDbContext context)
    {
        _context = context;
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

        _context.UserFeedbacks.Add(new UserFeedback
        {
            UserId = userId,
            Type = type,
            Message = request.Message.Trim()
        });

        await _context.SaveChangesAsync();

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
