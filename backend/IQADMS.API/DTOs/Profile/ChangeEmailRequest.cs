namespace IQADMS.API.DTOs.Profile;

public class ChangeEmailRequest
{
    public string NewEmail { get; set; } = string.Empty;
    public string CurrentPassword { get; set; } = string.Empty;
}

public class DeleteAccountRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string ConfirmText { get; set; } = string.Empty;
}
