namespace IQADMS.API.DTOs.Auth;

public class LoginRequest
{
    public string UsernameOrEmail { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    /// <summary>When true, issues a long-lived token (see Jwt:RememberMeExpiryMinutes).</summary>
    public bool RememberMe { get; set; } = true;
}