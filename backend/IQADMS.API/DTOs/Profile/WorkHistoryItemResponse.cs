namespace IQADMS.API.DTOs.Profile;

public class WorkHistoryItemResponse
{
    public Guid TaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? CompletedAt { get; set; }
    public string? DeliverableGoogleDriveLink { get; set; }
    public string? CreatedByName { get; set; }
}