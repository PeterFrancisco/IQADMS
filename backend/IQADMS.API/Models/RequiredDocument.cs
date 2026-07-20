using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class RequiredDocument : BaseEntity
{
    public Guid AccreditationActivityId { get; set; }

    public AccreditationActivity AccreditationActivity { get; set; } = null!;

    public string Title { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public bool IsRequired { get; set; } = true;
}