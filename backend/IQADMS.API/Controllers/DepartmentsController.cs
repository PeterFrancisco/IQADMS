using IQADMS.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DepartmentsController : ControllerBase
{
    private readonly DepartmentService _service;

    public DepartmentsController(DepartmentService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var departments = await _service.GetAllAsync();

        return Ok(departments);
    }
}