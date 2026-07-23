namespace IQADMS.API.DTOs.Auth;

public class AccessRequestDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}