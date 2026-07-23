using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class AccountRequest : BaseEntity
{
    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Department { get; set; } = string.Empty;

    public string Position { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ReviewedAt { get; set; }
}