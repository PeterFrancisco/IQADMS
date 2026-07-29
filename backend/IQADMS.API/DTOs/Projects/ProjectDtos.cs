namespace IQADMS.API.DTOs.Projects;

public class ProjectMemberDto
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class ProjectDepartmentDto
{
    public Guid DepartmentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class ProjectResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public int TaskCount { get; set; }
    public int OpenTaskCount { get; set; }
    /// <summary>Tasks in Submitted, Completed, or Done (monitoring progress).</summary>
    public int TaskProgressDone { get; set; }
    public int TaskProgressPercent { get; set; }
    public List<ProjectMemberDto> Members { get; set; } = new();
    public List<ProjectDepartmentDto> Departments { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class CreateProjectRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "Planning";
    public string Priority { get; set; } = "Medium";
    public List<Guid> MemberUserIds { get; set; } = new();
    public List<Guid> DepartmentIds { get; set; } = new();
}

public class UpdateProjectRequest : CreateProjectRequest
{
}
