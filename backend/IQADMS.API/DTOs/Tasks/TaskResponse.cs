namespace IQADMS.API.DTOs.Tasks;

public class TaskResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;

    public Guid? AssignedToUserId { get; set; }
    public string? AssignedToName { get; set; }
    public string? AssignedToUsername { get; set; }

    public Guid CreatedByUserId { get; set; }
    public string? CreatedByName { get; set; }

    public string? AttachmentFileName { get; set; }
    public string? AttachmentDownloadUrl { get; set; }
    public string? UploadGoogleDriveLink { get; set; }
    public string? DeliverableGoogleDriveLink { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}