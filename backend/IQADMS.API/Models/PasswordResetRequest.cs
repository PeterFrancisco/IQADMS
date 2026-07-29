using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class PasswordResetRequest : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";

    public string? ResetToken { get; set; }
    public DateTime? TokenExpiresAt { get; set; }

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedByUserId { get; set; }
}
