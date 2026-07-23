using IQADMS.API.Data;
using IQADMS.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IQADMS.API.DTOs.AllowedUsers;
using Microsoft.AspNetCore.Authorization;
using IQADMS.API.DTOs.Admin;
using System.Security.Claims;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AdminController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Admin/account-requests
    [HttpGet("account-requests")]
    public async Task<IActionResult> GetAccountRequests()
    {
        var requests = await _context.AccountRequests
            .OrderByDescending(x => x.RequestedAt)
            .ToListAsync();

        return Ok(requests);
    }

    // POST: api/Admin/account-requests/{id}/approve
    [HttpPost("account-requests/{id}/approve")]
    public async Task<IActionResult> ApproveRequest(Guid id)
    {
        var request = await _context.AccountRequests.FindAsync(id);

        if (request == null)
            return NotFound();

        request.Status = "Approved";
        request.ReviewedAt = DateTime.UtcNow;

        var exists = await _context.AllowedUsers
            .AnyAsync(x => x.Email == request.Email);

        if (!exists)
        {
            _context.AllowedUsers.Add(new AllowedUser
            {
                Email = request.Email,
                IsRegistered = false
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Request approved." });
    }

    // POST: api/Admin/account-requests/{id}/reject
    [HttpPost("account-requests/{id}/reject")]
    public async Task<IActionResult> RejectRequest(Guid id)
    {
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

        return Ok(new
        {
            message = "Allowed user added successfully."
        });
    }

    // GET: api/Admin/allowed-users
    [HttpGet("allowed-users")]
    public async Task<IActionResult> GetAllowedUsers()
    {
        var users = await _context.AllowedUsers
            .OrderBy(x => x.Email)
            .Select(x => new
            {
                x.Id,
                x.Email,
                x.IsRegistered,
                x.IsAdmin
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
}