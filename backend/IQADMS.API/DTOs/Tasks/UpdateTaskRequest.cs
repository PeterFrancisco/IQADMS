namespace IQADMS.API.DTOs.Tasks;

public class UpdateTaskRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public DateOnly? DueDate { get; set; }
    public bool SetDueDate { get; set; }
    public Guid? ProjectId { get; set; }
    public bool SetProject { get; set; }
    public Guid? RelatedDepartmentId { get; set; }
    public bool SetRelatedDepartment { get; set; }
    public bool SetAssignee { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? UploadGoogleDriveLink { get; set; }
    public string? DeliverableGoogleDriveLink { get; set; }
}
