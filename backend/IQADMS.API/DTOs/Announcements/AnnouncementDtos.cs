namespace IQADMS.API.DTOs.Announcements;

public class AnnouncementResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Location { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateAnnouncementRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = "General";
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Location { get; set; }
}

public class UpdateAnnouncementRequest : CreateAnnouncementRequest
{
}
