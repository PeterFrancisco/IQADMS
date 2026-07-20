namespace IQADMS.API.DTOs.Submissions;

public class SubmissionResponse
{
    public Guid Id { get; set; }

    public string Department { get; set; } = string.Empty;

    public string Document { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;

    public int Version { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime SubmittedAt { get; set; }
}