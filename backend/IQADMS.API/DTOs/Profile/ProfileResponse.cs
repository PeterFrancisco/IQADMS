namespace IQADMS.API.DTOs.Profile;

public class ProfileResponse
{
    public string DisplayName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Bio { get; set; }
    public string? ProfilePictureUrl { get; set; }

    public string? LinkedInUrl { get; set; }
    public string? GitHubUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? FacebookUrl { get; set; }
    public string? TwitterUrl { get; set; }
    public string? WebsiteUrl { get; set; }

    public string Presence { get; set; } = "offline";

    public DateTime? LastActiveAt { get; set; }

    public bool IsAdmin { get; set; }
}