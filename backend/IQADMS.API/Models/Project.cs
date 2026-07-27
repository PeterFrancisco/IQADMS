using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class Project : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "Planning";
    public string Priority { get; set; } = "Medium";

    public Guid CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;

    public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
    public ICollection<ProjectDepartment> Departments { get; set; } = new List<ProjectDepartment>();
    public ICollection<WorkspaceTask> Tasks { get; set; } = new List<WorkspaceTask>();
}
