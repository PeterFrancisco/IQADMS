namespace IQADMS.API.DTOs.Auth;

public class ForgotPasswordRequest
{
    public string EmailOrUsername { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    public string Token { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}
