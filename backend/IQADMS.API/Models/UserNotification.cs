using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class UserNotification : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Category { get; set; } = "task";
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? LinkPath { get; set; }

    public Guid? RelatedTaskId { get; set; }
    public Guid? RelatedProjectId { get; set; }

    public string? DedupKey { get; set; }

    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
}
