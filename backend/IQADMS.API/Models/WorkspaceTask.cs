using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class WorkspaceTask : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "To Do";
    public string Priority { get; set; } = "Medium";
    public DateOnly? DueDate { get; set; }

    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }

    public Guid? RelatedDepartmentId { get; set; }
    public Department? RelatedDepartment { get; set; }

    public Guid? AssignedToUserId { get; set; }
    public User? AssignedToUser { get; set; }

    public Guid CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;

    public string? AttachmentFileName { get; set; }
    public string? AttachmentFilePath { get; set; }

    public string? UploadGoogleDriveLink { get; set; }
    public string? DeliverableGoogleDriveLink { get; set; }

    public DateTime? CompletedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? AdminReviewRemark { get; set; }

    public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
    public ICollection<TaskActivityLog> ActivityLogs { get; set; } = new List<TaskActivityLog>();
    public ICollection<TaskAttachment> Attachments { get; set; } = new List<TaskAttachment>();
}
