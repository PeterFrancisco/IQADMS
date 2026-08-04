using System.Text.Json;
using IQADMS.API.Data;
using IQADMS.API.DTOs.Projects;
using IQADMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private static readonly JsonSerializerOptions WorkflowJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly ApplicationDbContext _context;

    public ProjectsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var projects = await _context.Projects
            .Where(p => !p.IsDeleted)
            .Include(p => p.Members).ThenInclude(m => m.User)
            .Include(p => p.Departments).ThenInclude(d => d.Department)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var taskStats = await _context.WorkspaceTasks
            .Where(t => !t.IsDeleted && t.ProjectId != null)
            .GroupBy(t => t.ProjectId)
            .Select(g => new
            {
                ProjectId = g.Key,
                Total = g.Count(),
                Open = g.Count(t => t.Status != "Completed" && t.Status != "Cancelled" && t.Status != "Done"),
                ProgressDone = g.Count(t =>
                    t.Status == "Submitted" || t.Status == "Completed" || t.Status == "Done")
            })
            .ToListAsync();

        var statsMap = taskStats.ToDictionary(x => x.ProjectId!.Value);

        var result = projects.Select(p =>
        {
            statsMap.TryGetValue(p.Id, out var stats);
            return MapProject(
                p,
                stats?.Total ?? 0,
                stats?.Open ?? 0,
                stats?.ProgressDone ?? 0);
        });

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var project = await _context.Projects
            .Where(p => p.Id == id && !p.IsDeleted)
            .Include(p => p.Members).ThenInclude(m => m.User)
            .Include(p => p.Departments).ThenInclude(d => d.Department)
            .FirstOrDefaultAsync();

        if (project == null) return NotFound();

        var total = await _context.WorkspaceTasks.CountAsync(t => !t.IsDeleted && t.ProjectId == id);
        var open = await _context.WorkspaceTasks.CountAsync(t =>
            !t.IsDeleted && t.ProjectId == id &&
            t.Status != "Completed" && t.Status != "Cancelled" && t.Status != "Done");
        var progressDone = await _context.WorkspaceTasks.CountAsync(t =>
            !t.IsDeleted && t.ProjectId == id &&
            (t.Status == "Submitted" || t.Status == "Completed" || t.Status == "Done"));

        return Ok(MapProject(project, total, open, progressDone));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateProjectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Project title is required." });

        var userId = GetUserId();
        var workflowJson = SerializeWorkflow(request.TaskWorkflow);

        var project = new Project
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            Notes = request.Notes?.Trim(),
            TaskWorkflowJson = workflowJson,
            Status = "Active",
            Priority = "Medium",
            CreatedByUserId = userId
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        await CreateWorkflowTasks(project.Id, userId, request.TaskWorkflow);

        await _context.Entry(project).Collection(p => p.Members).Query().Include(m => m.User).LoadAsync();
        await _context.Entry(project).Collection(p => p.Departments).Query().Include(d => d.Department).LoadAsync();

        var total = await _context.WorkspaceTasks.CountAsync(t => !t.IsDeleted && t.ProjectId == project.Id);
        var open = await _context.WorkspaceTasks.CountAsync(t =>
            !t.IsDeleted && t.ProjectId == project.Id &&
            t.Status != "Completed" && t.Status != "Cancelled" && t.Status != "Done");

        return Ok(MapProject(project, total, open, 0));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, UpdateProjectRequest request)
    {
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        if (project == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Title))
            project.Title = request.Title.Trim();

        if (request.Description != null)
            project.Description = request.Description.Trim();

        project.StartDate = request.StartDate;
        project.DueDate = request.DueDate;
        project.Notes = request.Notes?.Trim();
        project.TaskWorkflowJson = SerializeWorkflow(request.TaskWorkflow);
        project.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _context.Entry(project).Collection(p => p.Members).Query().Include(m => m.User).LoadAsync();
        await _context.Entry(project).Collection(p => p.Departments).Query().Include(d => d.Department).LoadAsync();

        var total = await _context.WorkspaceTasks.CountAsync(t => !t.IsDeleted && t.ProjectId == id);
        var open = await _context.WorkspaceTasks.CountAsync(t =>
            !t.IsDeleted && t.ProjectId == id &&
            t.Status != "Completed" && t.Status != "Cancelled" && t.Status != "Done");

        var progressDone = await _context.WorkspaceTasks.CountAsync(t =>
            !t.IsDeleted && t.ProjectId == id &&
            (t.Status == "Submitted" || t.Status == "Completed" || t.Status == "Done"));

        return Ok(MapProject(project, total, open, progressDone));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null || project.IsDeleted) return NotFound();

        project.IsDeleted = true;
        project.UpdatedAt = DateTime.UtcNow;

        var linkedTasks = await _context.WorkspaceTasks
            .Where(t => t.ProjectId == id && !t.IsDeleted)
            .ToListAsync();
        foreach (var task in linkedTasks)
        {
            task.ProjectId = null;
            task.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task CreateWorkflowTasks(Guid projectId, Guid userId, List<ProjectWorkflowStepDto> workflow)
    {
        if (workflow == null || workflow.Count == 0) return;

        var order = 0;
        foreach (var step in workflow)
        {
            var title = step.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title)) continue;

            order++;
            _context.WorkspaceTasks.Add(new WorkspaceTask
            {
                Title = title,
                ProjectId = projectId,
                CreatedByUserId = userId,
                AssignedToUserId = userId,
                Status = order == 1 ? "To Do" : "Waiting",
                WorkflowOrder = order,
                Priority = "Medium"
            });
        }

        if (order > 0)
            await _context.SaveChangesAsync();
    }

    private static string? SerializeWorkflow(List<ProjectWorkflowStepDto>? workflow)
    {
        if (workflow == null || workflow.Count == 0) return null;

        var cleaned = workflow
            .Select(s => new ProjectWorkflowStepDto { Title = s.Title?.Trim() ?? string.Empty })
            .Where(s => !string.IsNullOrWhiteSpace(s.Title))
            .ToList();

        return cleaned.Count == 0
            ? null
            : JsonSerializer.Serialize(cleaned, WorkflowJsonOptions);
    }

    private static List<ProjectWorkflowStepDto> ParseWorkflow(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<ProjectWorkflowStepDto>();

        try
        {
            return JsonSerializer.Deserialize<List<ProjectWorkflowStepDto>>(json, WorkflowJsonOptions)
                   ?? new List<ProjectWorkflowStepDto>();
        }
        catch
        {
            return new List<ProjectWorkflowStepDto>();
        }
    }

    private static ProjectResponse MapProject(Project p, int taskCount, int openTaskCount, int progressDone)
    {
        var progressPercent = taskCount == 0
            ? 0
            : (int)Math.Round(100.0 * progressDone / taskCount, MidpointRounding.AwayFromZero);

        return new ProjectResponse
        {
            Id = p.Id,
            Title = p.Title,
            Description = p.Description,
            StartDate = p.StartDate,
            DueDate = p.DueDate,
            Notes = p.Notes,
            TaskWorkflowJson = p.TaskWorkflowJson,
            TaskWorkflow = ParseWorkflow(p.TaskWorkflowJson),
            TaskCount = taskCount,
            OpenTaskCount = openTaskCount,
            TaskProgressDone = progressDone,
            TaskProgressPercent = progressPercent,
            CreatedAt = p.CreatedAt,
            Members = p.Members.Select(m => new ProjectMemberDto
            {
                UserId = m.UserId,
                Username = m.User.Username,
                DisplayName = m.User.DisplayName
            }).ToList(),
            Departments = p.Departments.Select(d => new ProjectDepartmentDto
            {
                DepartmentId = d.DepartmentId,
                Name = d.Department.Name,
                Code = d.Department.Code
            }).ToList()
        };
    }

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.Parse(claim!);
    }
}
