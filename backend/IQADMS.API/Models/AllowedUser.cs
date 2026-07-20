using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class AllowedUser : BaseEntity
{
    public string Email { get; set; } = string.Empty;

    public bool IsRegistered { get; set; } = false;
}