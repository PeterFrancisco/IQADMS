namespace IQADMS.API.DTOs.Auth;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;

    public Guid UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Position { get; set; } = string.Empty;

    public bool IsAdmin { get; set; }
}