using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class TaskAttachment : BaseEntity
{
    public Guid TaskId { get; set; }
    public WorkspaceTask Task { get; set; } = null!;

    public Guid UploadedByUserId { get; set; }
    public User UploadedByUser { get; set; } = null!;

    public string FileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
}
