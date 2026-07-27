using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

/// <summary>PQAD office announcements: orientations, meetings, PACUCOA visits, etc.</summary>
public class PqadAnnouncement : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Orientation | Meeting | PACUCOA Visit | General</summary>
    public string Category { get; set; } = "General";

    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Location { get; set; }

    public Guid CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;
}
