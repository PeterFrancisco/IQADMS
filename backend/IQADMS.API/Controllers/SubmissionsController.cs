using IQADMS.API.DTOs.Submissions;
using IQADMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubmissionsController : ControllerBase
{
    private readonly SubmissionService _service;

    public SubmissionsController(SubmissionService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(result);
    }

    [HttpGet("folders")]
    public async Task<IActionResult> GetFolders()
    {
        var result = await _service.GetFoldersAsync();
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSubmissionRequest request)
    {
        try
        {
            await _service.CreateAsync(request, GetUserId());
            return Ok(new { message = "Submission recorded successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("upload")]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> Upload(
        IFormFile file,
        [FromForm] Guid departmentId,
        [FromForm] Guid? accreditationActivityId,
        [FromForm] Guid? requiredDocumentId)
    {
        try
        {
            var result = await _service.UploadFileAsync(
                file,
                departmentId,
                accreditationActivityId,
                requiredDocumentId,
                GetUserId());

            return Ok(new
            {
                message = $"File saved to folder \"{result.AutoFolderPath}\".",
                submission = result
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("activity/{activityId}")]
    public async Task<IActionResult> GetByActivity(Guid activityId)
    {
        var result = await _service.GetByActivityAsync(activityId);
        return Ok(result);
    }

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.Parse(claim!);
    }
}
