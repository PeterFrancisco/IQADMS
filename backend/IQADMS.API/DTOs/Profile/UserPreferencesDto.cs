namespace IQADMS.API.DTOs.Profile;

public class UserPreferencesDto
{
    public string Theme { get; set; } = "original";
    public string Accent { get; set; } = "maroon";
    public string FontSize { get; set; } = "medium";
    public bool NotificationsMuted { get; set; }
    /// <summary>0–100 notification sound volume.</summary>
    public int NotificationVolume { get; set; } = 85;
}
