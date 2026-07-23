using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class WorkspaceTask : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "Planning";

    public Guid? AssignedToUserId { get; set; }
    public User? AssignedToUser { get; set; }

    public Guid CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;

    // Reference doc creator attaches (assignee can view/download)
    public string? AttachmentFileName { get; set; }
    public string? AttachmentFilePath { get; set; }

    // GDrive link creator gives for assignee to upload finished work
    public string? UploadGoogleDriveLink { get; set; }

    // GDrive link assignee submits when task is done
    public string? DeliverableGoogleDriveLink { get; set; }

    public DateTime? CompletedAt { get; set; }
}