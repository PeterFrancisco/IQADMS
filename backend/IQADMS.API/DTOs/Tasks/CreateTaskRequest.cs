namespace IQADMS.API.DTOs.Tasks;

public class CreateTaskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? RelatedDepartmentId { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? UploadGoogleDriveLink { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Priority { get; set; } = "Medium";
    public string Status { get; set; } = "To Do";
}