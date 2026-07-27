using IQADMS.API.DTOs.Departments;
using IQADMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using IQADMS.API.Data;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly DepartmentService _service;
    private readonly ApplicationDbContext _context;

    public DepartmentsController(DepartmentService service, ApplicationDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var departments = await _service.GetOverviewAsync();
        return Ok(departments);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var detail = await _service.GetDetailAsync(id);
        if (detail == null) return NotFound();
        return Ok(detail);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateContacts(Guid id, UpdateDepartmentRequest request)
    {
        if (!await IsCurrentUserAdmin())
            return Forbid();

        var updated = await _service.UpdateContactsAsync(id, request);
        if (updated == null) return NotFound();

        return Ok(updated);
    }

    private async Task<bool> IsCurrentUserAdmin()
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
