namespace IQADMS.API.DTOs.Tasks;

public class UpdateTaskRequest
{
    public string? Title { get; set; }
    public string? Status { get; set; }
    public bool SetAssignee { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? Description { get; set; }
    public string? UploadGoogleDriveLink { get; set; }
    public string? DeliverableGoogleDriveLink { get; set; }
}
