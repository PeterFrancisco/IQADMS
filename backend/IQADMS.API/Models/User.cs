using IQADMS.API.Models.Base;
namespace IQADMS.API.Models;

public class User : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    // Optional display name
// Login username (required and unique)
    public string Username { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    // Job title / position
    public string Position { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string? Bio { get; set; }

    public int? Age { get; set; }

    public string? ProfilePictureUrl { get; set; }

    public string? LinkedInUrl { get; set; }

    public string? GitHubUrl { get; set; }
    
    public string? WebsiteUrl { get; set; }

    public string? InstagramUrl { get; set; }

    public string? FacebookUrl { get; set; }

    public string? TwitterUrl { get; set; }

    public string? FacebookDisplayName { get; set; }

    public string? InstagramDisplayName { get; set; }

    public string? TwitterDisplayName { get; set; }

    public string? LinkedInDisplayName { get; set; }

    public string? GitHubDisplayName { get; set; }

    /// <summary>online | away | dnd | offline</summary>
    public string PresenceStatus { get; set; } = "offline";

    public DateTime? LastActiveAt { get; set; }

    /// <summary>JSON blob: theme, accent, fontSize, notificationsMuted.</summary>
    public string? PreferencesJson { get; set; }

    // System permission
    public bool IsAdmin { get; set; } = false;

    public bool IsActive { get; set; } = true;
}