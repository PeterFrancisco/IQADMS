namespace IQADMS.API.DTOs.AllowedUsers;

public class CreateAllowedUserRequest
{
    public string Email { get; set; } = string.Empty;
    public bool IsAdmin { get; set; } = false;

}