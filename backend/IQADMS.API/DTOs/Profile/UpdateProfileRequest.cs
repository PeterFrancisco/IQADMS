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
    public string? WebsiteUrl { get; set; }
}