namespace IQADMS.API.DTOs.Submissions;

public class DocumentListResponse
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string UploadedBy { get; set; } = string.Empty;
    public string Activity { get; set; } = string.Empty;
    public string Document { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string? GoogleDriveLink { get; set; }
}
