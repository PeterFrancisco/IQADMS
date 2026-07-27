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
                Open = g.Count(t => t.Status != "Completed" && t.Status != "Cancelled" && t.Status != "Done")
            })
            .ToListAsync();

        var statsMap = taskStats.ToDictionary(x => x.ProjectId!.Value);

        var result = projects.Select(p =>
        {
            statsMap.TryGetValue(p.Id, out var stats);
            return MapProject(p, stats?.Total ?? 0, stats?.Open ?? 0);
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

        return Ok(MapProject(project, total, open));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateProjectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Project title is required." });

        var project = new Project
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Planning" : request.Status.Trim(),
            Priority = string.IsNullOrWhiteSpace(request.Priority) ? "Medium" : request.Priority.Trim(),
            CreatedByUserId = GetUserId()
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        await SyncMembersAndDepartments(project.Id, request.MemberUserIds, request.DepartmentIds);
        await _context.Entry(project).Collection(p => p.Members).Query().Include(m => m.User).LoadAsync();
        await _context.Entry(project).Collection(p => p.Departments).Query().Include(d => d.Department).LoadAsync();

        return Ok(MapProject(project, 0, 0));
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

        if (!string.IsNullOrWhiteSpace(request.Status))
            project.Status = request.Status.Trim();

        if (!string.IsNullOrWhiteSpace(request.Priority))
            project.Priority = request.Priority.Trim();

        project.UpdatedAt = DateTime.UtcNow;

        await SyncMembersAndDepartments(id, request.MemberUserIds, request.DepartmentIds);
        await _context.SaveChangesAsync();

        await _context.Entry(project).Collection(p => p.Members).Query().Include(m => m.User).LoadAsync();
        await _context.Entry(project).Collection(p => p.Departments).Query().Include(d => d.Department).LoadAsync();

        var total = await _context.WorkspaceTasks.CountAsync(t => !t.IsDeleted && t.ProjectId == id);
        var open = await _context.WorkspaceTasks.CountAsync(t =>
            !t.IsDeleted && t.ProjectId == id &&
            t.Status != "Completed" && t.Status != "Cancelled" && t.Status != "Done");

        return Ok(MapProject(project, total, open));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null || project.IsDeleted) return NotFound();

        project.IsDeleted = true;
        project.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task SyncMembersAndDepartments(Guid projectId, List<Guid> memberIds, List<Guid> departmentIds)
    {
        var existingMembers = await _context.ProjectMembers.Where(m => m.ProjectId == projectId).ToListAsync();
        _context.ProjectMembers.RemoveRange(existingMembers);

        var distinctMembers = memberIds.Distinct().ToList();
        foreach (var userId in distinctMembers)
        {
            if (await _context.Users.AnyAsync(u => u.Id == userId && u.IsActive))
            {
                _context.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = userId });
            }
        }

        var existingDepts = await _context.ProjectDepartments.Where(d => d.ProjectId == projectId).ToListAsync();
        _context.ProjectDepartments.RemoveRange(existingDepts);

        foreach (var deptId in departmentIds.Distinct())
        {
            if (await _context.Departments.AnyAsync(d => d.Id == deptId))
            {
                _context.ProjectDepartments.Add(new ProjectDepartment { ProjectId = projectId, DepartmentId = deptId });
            }
        }

        await _context.SaveChangesAsync();
    }

    private static ProjectResponse MapProject(Project p, int taskCount, int openTaskCount)
    {
        return new ProjectResponse
        {
            Id = p.Id,
            Title = p.Title,
            Description = p.Description,
            StartDate = p.StartDate,
            DueDate = p.DueDate,
            Status = p.Status,
            Priority = p.Priority,
            TaskCount = taskCount,
            OpenTaskCount = openTaskCount,
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
