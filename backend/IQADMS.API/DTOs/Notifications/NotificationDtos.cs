namespace IQADMS.API.DTOs.Notifications;

public class NotificationResponse
{
    public Guid Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public string? LinkPath { get; set; }
    public Guid? RelatedTaskId { get; set; }
    public Guid? RelatedProjectId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UnreadCountResponse
{
    public int Count { get; set; }
}
