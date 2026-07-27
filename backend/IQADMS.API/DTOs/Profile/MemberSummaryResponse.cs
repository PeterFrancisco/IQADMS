namespace IQADMS.API.DTOs.Profile;

public class MemberSummaryResponse
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string Presence { get; set; } = "offline";
    public DateTime? LastActiveAt { get; set; }
    public string? ProfilePictureUrl { get; set; }
}
