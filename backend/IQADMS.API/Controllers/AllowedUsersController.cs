using IQADMS.API.DTOs.AllowedUsers;
using IQADMS.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AllowedUsersController : ControllerBase
{
    private readonly AllowedUserService _service;

    public AllowedUsersController(AllowedUserService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAllowedUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new
            {
                message = "Email is required."
            });
        }

        await _service.AddAsync(request);

        return Ok(new
        {
            message = "Allowed email added successfully."
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);

        return Ok(new
        {
            message = "Allowed user removed."
        });
    }
}