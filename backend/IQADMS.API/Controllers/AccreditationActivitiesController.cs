using IQADMS.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IQADMS.API.Models;

namespace IQADMS.API.Controllers;

public class CreateActivityRequest
{
    public string Name { get; set; } = "";
    public int Year { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly Deadline { get; set; }
    public string GoogleDriveFolderLink { get; set; } = "";
    public string Status { get; set; } = "Planning";
    public string Description { get; set; } = "";
}

[ApiController]
[Route("api/[controller]")]
public class AccreditationActivitiesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AccreditationActivitiesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivities()
    {
        var activities = await _context.AccreditationActivities
            .Where(a => !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(activities);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateActivityRequest request)
    {
        var activity = new AccreditationActivity
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Year = request.Year,
            StartDate = request.StartDate,
            Deadline = request.Deadline,
            GoogleDriveFolderLink = request.GoogleDriveFolderLink,
            Status = request.Status,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        _context.AccreditationActivities.Add(activity);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetActivities), activity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateActivityRequest request)
    {
        var activity = await _context.AccreditationActivities.FindAsync(id);

        if (activity == null || activity.IsDeleted)
            return NotFound();

        activity.Name = request.Name;
        activity.Year = request.Year;
        activity.StartDate = request.StartDate;
        activity.Deadline = request.Deadline;
        activity.GoogleDriveFolderLink = request.GoogleDriveFolderLink;
        activity.Status = request.Status;
        activity.Description = request.Description;
        activity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(activity);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var activity = await _context.AccreditationActivities.FindAsync(id);

        if (activity == null || activity.IsDeleted)
            return NotFound();

        activity.IsDeleted = true;
        activity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }
}