using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class TaskExtensionRequest : BaseEntity
{
    public Guid TaskId { get; set; }
    public WorkspaceTask Task { get; set; } = null!;

    public Guid RequestedByUserId { get; set; }
    public User RequestedByUser { get; set; } = null!;

    public DateOnly RequestedDueDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";

    public Guid? ReviewedByUserId { get; set; }
    public User? ReviewedByUser { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }
}
