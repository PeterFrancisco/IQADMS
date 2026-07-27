using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class UserFeedback : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Type { get; set; } = "feedback";
    public string Message { get; set; } = string.Empty;
}
