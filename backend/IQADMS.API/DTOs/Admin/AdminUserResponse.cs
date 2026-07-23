namespace IQADMS.API.DTOs.Admin;

public class AdminUserResponse
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public int? Age { get; set; }
    public bool IsAdmin { get; set; }
    public bool IsActive { get; set; }
}