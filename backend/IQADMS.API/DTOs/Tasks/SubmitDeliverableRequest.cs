namespace IQADMS.API.DTOs.Tasks;

public class SubmitDeliverableRequest
{
    public string DeliverableGoogleDriveLink { get; set; } = string.Empty;
}

public class TaskAdminRemarkRequest
{
    public string? Remark { get; set; }
}
