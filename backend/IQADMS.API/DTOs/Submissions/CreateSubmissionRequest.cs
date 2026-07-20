namespace IQADMS.API.DTOs.Submissions;

public class CreateSubmissionRequest
{
    public Guid AccreditationActivityId { get; set; }

    public Guid RequiredDocumentId { get; set; }

    public Guid DepartmentId { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string GoogleDriveLink { get; set; } = string.Empty;
}