using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class TaskComment : BaseEntity
{
    public Guid TaskId { get; set; }
    public WorkspaceTask Task { get; set; } = null!;

    public Guid AuthorUserId { get; set; }
    public User AuthorUser { get; set; } = null!;

    public string Body { get; set; } = string.Empty;
}
