namespace IQADMS.API.DTOs.Tasks;

public class UpdateTaskRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public DateOnly? DueDate { get; set; }
    public bool SetDueDate { get; set; }
    public bool SetNotes { get; set; }
    public Guid? ProjectId { get; set; }
    public bool SetProject { get; set; }
    public string? RelatedDepartmentOrOrg { get; set; }
    public bool SetRelatedDepartmentOrOrg { get; set; }
    public bool SetAssignee { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? UploadGoogleDriveLink { get; set; }
    public string? DeliverableGoogleDriveLink { get; set; }
}
