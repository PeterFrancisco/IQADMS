using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class Submission : BaseEntity
{
    public Guid AccreditationActivityId { get; set; }
    public AccreditationActivity AccreditationActivity { get; set; } = null!;

    public Guid RequiredDocumentId { get; set; }
    public RequiredDocument RequiredDocument { get; set; } = null!;

    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public Guid UploadedByUserId { get; set; }
    public User UploadedByUser { get; set; } = null!;

    public string FileName { get; set; } = string.Empty;

    public string GoogleDriveFileId { get; set; } = string.Empty;

    public string GoogleDriveLink { get; set; } = string.Empty;

    public int Version { get; set; } = 1;

    // Pending | Submitted | Reviewed | Returned
    public string Status { get; set; } = "Submitted";

    public string Remarks { get; set; } = string.Empty;

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}