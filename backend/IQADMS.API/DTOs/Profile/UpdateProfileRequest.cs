namespace IQADMS.API.DTOs.Profile;

public class UpdateProfileRequest
{
    public string DisplayName { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Bio { get; set; }

    public string? LinkedInUrl { get; set; }
    public string? GitHubUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? FacebookUrl { get; set; }
    public string? TwitterUrl { get; set; }
    public string? WebsiteUrl { get; set; }

    public string? FacebookDisplayName { get; set; }
    public string? InstagramDisplayName { get; set; }
    public string? TwitterDisplayName { get; set; }
    public string? LinkedInDisplayName { get; set; }
    public string? GitHubDisplayName { get; set; }
}