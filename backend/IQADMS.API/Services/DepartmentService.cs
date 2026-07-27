using IQADMS.API.Data;
using IQADMS.API.DTOs.Departments;
using Microsoft.EntityFrameworkCore;

namespace IQADMS.API.Services;

public class DepartmentService
{
    private readonly ApplicationDbContext _context;

    public DepartmentService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<DepartmentResponse>> GetAllAsync()
    {
        return await _context.Departments
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentResponse
            {
                Id = d.Id,
                Code = d.Code,
                Name = d.Name
            })
            .ToListAsync();
    }

    public async Task<List<DepartmentOverviewResponse>> GetOverviewAsync()
    {
        var departments = await _context.Departments
            .Where(d => !d.IsDeleted)
            .OrderBy(d => d.Name)
            .ToListAsync();

        var taskStats = await _context.WorkspaceTasks
            .Where(t => !t.IsDeleted && t.RelatedDepartmentId != null)
            .GroupBy(t => t.RelatedDepartmentId)
            .Select(g => new
            {
                DepartmentId = g.Key!.Value,
                Total = g.Count(),
                Open = g.Count(t => t.Status != "Completed" && t.Status != "Done" && t.Status != "Cancelled")
            })
            .ToListAsync();

        var projectStats = await _context.ProjectDepartments
            .GroupBy(pd => pd.DepartmentId)
            .Select(g => new { DepartmentId = g.Key, Count = g.Count() })
            .ToListAsync();

        var taskMap = taskStats.ToDictionary(x => x.DepartmentId);
        var projectMap = projectStats.ToDictionary(x => x.DepartmentId);

        return departments.Select(d =>
        {
            taskMap.TryGetValue(d.Id, out var tasks);
            projectMap.TryGetValue(d.Id, out var projects);
            return new DepartmentOverviewResponse
            {
                Id = d.Id,
                Code = d.Code,
                Name = d.Name,
                ContactName = d.ContactName,
                ContactEmail = d.ContactEmail,
                ContactPhone = d.ContactPhone,
                RelatedTaskCount = tasks?.Total ?? 0,
                OpenRelatedTaskCount = tasks?.Open ?? 0,
                ProjectCount = projects?.Count ?? 0
            };
        }).ToList();
    }

    public async Task<DepartmentDetailResponse?> GetDetailAsync(Guid id)
    {
        var department = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (department == null) return null;

        var overview = (await GetOverviewAsync()).First(d => d.Id == id);

        var projects = await _context.ProjectDepartments
            .Where(pd => pd.DepartmentId == id)
            .Include(pd => pd.Project)
            .Where(pd => pd.Project != null && !pd.Project.IsDeleted)
            .Select(pd => new DepartmentProjectLinkDto
            {
                ProjectId = pd.ProjectId,
                Title = pd.Project!.Title,
                Status = pd.Project.Status
            })
            .OrderBy(p => p.Title)
            .ToListAsync();

        var recentTasks = await _context.WorkspaceTasks
            .Where(t => !t.IsDeleted && t.RelatedDepartmentId == id)
            .Include(t => t.Project)
            .OrderByDescending(t => t.UpdatedAt ?? t.CreatedAt)
            .Take(15)
            .Select(t => new DepartmentTaskLinkDto
            {
                TaskId = t.Id,
                Title = t.Title,
                Status = t.Status,
                DueDate = t.DueDate,
                ProjectTitle = t.Project != null ? t.Project.Title : null
            })
            .ToListAsync();

        return new DepartmentDetailResponse
        {
            Id = overview.Id,
            Code = overview.Code,
            Name = overview.Name,
            RelatedTaskCount = overview.RelatedTaskCount,
            OpenRelatedTaskCount = overview.OpenRelatedTaskCount,
            ProjectCount = overview.ProjectCount,
            ContactName = overview.ContactName,
            ContactEmail = overview.ContactEmail,
            ContactPhone = overview.ContactPhone,
            Projects = projects,
            RecentTasks = recentTasks
        };
    }

    public async Task<DepartmentOverviewResponse?> UpdateContactsAsync(Guid id, UpdateDepartmentRequest request)
    {
        var department = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (department == null) return null;

        department.ContactName = request.ContactName?.Trim();
        department.ContactEmail = request.ContactEmail?.Trim();
        department.ContactPhone = request.ContactPhone?.Trim();
        department.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return (await GetOverviewAsync()).FirstOrDefault(d => d.Id == id);
    }
}
