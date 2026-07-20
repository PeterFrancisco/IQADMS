namespace IQADMS.API.DTOs.AllowedUsers;

public class AllowedUserResponse
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public bool IsRegistered { get; set; }
}