using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class BoardColumn : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    // text | link | date | number
    // text | link | date | number | dropdown
    public string ColumnType { get; set; } = "text";

// JSON array of options, e.g. ["High","Medium","Low"] — used when ColumnType is dropdown
    public string? OptionsJson { get; set; }

    public int SortOrder { get; set; }

    public Guid CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;
}