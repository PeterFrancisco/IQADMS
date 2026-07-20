using IQADMS.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MonitoringController : ControllerBase
{
    private readonly SubmissionMonitoringService _service;

    public MonitoringController(SubmissionMonitoringService service)
    {
        _service = service;
    }

    [HttpGet("activity/{activityId}")]
    public async Task<IActionResult> Get(Guid activityId)
    {
        var result = await _service.GetDepartmentProgressAsync(activityId);

        return Ok(result);
    }
}
