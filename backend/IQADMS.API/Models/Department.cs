using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class Department : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;
}