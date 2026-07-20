using IQADMS.API.Models.Base;
namespace IQADMS.API.Models;

public class User : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    // Optional display name
    public string? Username { get; set; }

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    // Job title / position
    public string Position { get; set; } = string.Empty;

    // System permission
    public bool IsAdmin { get; set; } = false;

    public bool IsActive { get; set; } = true;
}