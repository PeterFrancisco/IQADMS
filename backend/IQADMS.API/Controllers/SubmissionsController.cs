using IQADMS.API.Data;
using IQADMS.API.DTOs.Submissions;
using IQADMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO.Compression;
using System.Security.Claims;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubmissionsController : ControllerBase
{
    private readonly SubmissionService _service;
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    public SubmissionsController(
        SubmissionService service,
        ApplicationDbContext context,
        IWebHostEnvironment env)
    {
        _service = service;
        _context = context;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        if (!await IsAdminAsync())
            return Forbid();

        var result = await _service.GetAllAsync();
        return Ok(result);
    }

    [HttpGet("folders")]
    public async Task<IActionResult> GetFolders()
    {
        if (!await IsAdminAsync())
            return Forbid();

        var result = await _service.GetLibraryFoldersAsync();
        return Ok(result);
    }

    [HttpGet("storage-stats")]
    public async Task<IActionResult> GetStorageStats()
    {
        if (!await IsAdminAsync())
            return Forbid();

        return Ok(await _service.GetStorageStatsAsync());
    }

    [HttpPost("folders")]
    public async Task<IActionResult> CreateFolder(CreateDocumentFolderRequest request)
    {
        if (!await IsAdminAsync())
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Folder name is required." });

        try
        {
            await _service.CreateFolderAsync(request.Name, request.ParentPath);
            return Ok(new { message = "Folder created." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("folders/rename")]
    public async Task<IActionResult> RenameFolder(RenameDocumentFolderRequest request)
    {
        if (!await IsAdminAsync())
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.OldPath) || string.IsNullOrWhiteSpace(request.NewPath))
            return BadRequest(new { message = "Old and new folder paths are required." });

        try
        {
            await _service.RenameFolderAsync(request.OldPath, request.NewPath);
            return Ok(new { message = "Folder renamed." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = "Could not rename folder. A folder with that name may already exist." });
        }
    }

    [HttpGet("folders/export")]
    public async Task<IActionResult> ExportFolder([FromQuery] string path)
    {
        if (!await IsAdminAsync())
            return Forbid();

        if (string.IsNullOrWhiteSpace(path))
            return BadRequest(new { message = "Folder path is required." });

        var folderPhysical = Path.Combine(
            _env.ContentRootPath,
            "Uploads",
            "documents",
            path.Replace('/', Path.DirectorySeparatorChar));

        if (!Directory.Exists(folderPhysical))
            return NotFound(new { message = "Folder not found or empty." });

        await using var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            foreach (var file in Directory.GetFiles(folderPhysical, "*", SearchOption.AllDirectories))
            {
                var entryName = Path.GetRelativePath(folderPhysical, file).Replace('\\', '/');
                var entry = archive.CreateEntry(entryName, CompressionLevel.Fastest);
                await using var entryStream = entry.Open();
                await using var fileStream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.Read);
                await fileStream.CopyToAsync(entryStream);
            }
        }

        ms.Position = 0;
        var safeName = path.Replace('/', '_') + ".zip";
        return File(ms.ToArray(), "application/zip", safeName);
    }

    [HttpGet("trash")]
    public async Task<IActionResult> GetTrash()
    {
        if (!await IsAdminAsync())
            return Forbid();

        return Ok(await _service.GetTrashAsync());
    }

    [HttpDelete("library/files/{id:guid}")]
    public async Task<IActionResult> TrashFile(Guid id)
    {
        if (!await IsAdminAsync())
            return Forbid();

        try
        {
            await _service.TrashFileAsync(id);
            return Ok(new { message = "File moved to trash." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("folders")]
    public async Task<IActionResult> TrashFolder([FromQuery] string path)
    {
        if (!await IsAdminAsync())
            return Forbid();

        if (string.IsNullOrWhiteSpace(path))
            return BadRequest(new { message = "Folder path is required." });

        try
        {
            await _service.TrashFolderAsync(path);
            return Ok(new { message = "Folder and its files moved to trash." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("trash/{id:guid}/restore")]
    public async Task<IActionResult> RestoreFile(Guid id)
    {
        if (!await IsAdminAsync())
            return Forbid();

        try
        {
            await _service.RestoreFileAsync(id);
            return Ok(new { message = "File restored." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("trash/folders/restore")]
    public async Task<IActionResult> RestoreFolder([FromQuery] string path)
    {
        if (!await IsAdminAsync())
            return Forbid();

        if (string.IsNullOrWhiteSpace(path))
            return BadRequest(new { message = "Folder path is required." });

        try
        {
            await _service.RestoreFolderAsync(path);
            return Ok(new { message = "Folder restored." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("trash/{id:guid}")]
    public async Task<IActionResult> PermanentDeleteFile(Guid id)
    {
        if (!await IsAdminAsync())
            return Forbid();

        try
        {
            await _service.PermanentDeleteFileAsync(id);
            return Ok(new { message = "File permanently deleted." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSubmissionRequest request)
    {
        if (!await IsAdminAsync())
            return Forbid();

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
    [RequestSizeLimit(SubmissionService.MaxFileBytes)]
    public async Task<IActionResult> Upload(
        IFormFile file,
        [FromForm] string? folderPath)
    {
        if (!await IsAdminAsync())
            return Forbid();

        try
        {
            var targetFolder = string.IsNullOrWhiteSpace(folderPath) ? "General" : folderPath.Trim();
            var result = await _service.UploadToFolderAsync(file, targetFolder, GetUserId());

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
        if (!await IsAdminAsync())
            return Forbid();

        var result = await _service.GetByActivityAsync(activityId);
        return Ok(result);
    }

    private async Task<bool> IsAdminAsync()
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
