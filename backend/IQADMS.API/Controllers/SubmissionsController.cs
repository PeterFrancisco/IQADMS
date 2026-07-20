using IQADMS.API.DTOs.Submissions;
using IQADMS.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubmissionsController : ControllerBase
{
    private readonly SubmissionService _service;

    public SubmissionsController(SubmissionService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSubmissionRequest request)
    {
        await _service.CreateAsync(request);

        return Ok(new
        {
            message = "Submission uploaded successfully."
        });
    }

    [HttpGet("activity/{activityId}")]
    public async Task<IActionResult> GetByActivity(Guid activityId)
    {
        var result = await _service.GetByActivityAsync(activityId);

        return Ok(result);
    }
}