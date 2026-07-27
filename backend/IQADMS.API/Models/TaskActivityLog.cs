using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class TaskActivityLog : BaseEntity
{
    public Guid TaskId { get; set; }
    public WorkspaceTask Task { get; set; } = null!;

    public Guid? ActorUserId { get; set; }
    public User? ActorUser { get; set; }

    public string Action { get; set; } = string.Empty;
    public string? Detail { get; set; }
}
