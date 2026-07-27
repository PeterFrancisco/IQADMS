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

    /// <summary>task | owner | status | due_date — empty for custom columns</summary>
    public string Binding { get; set; } = string.Empty;

    public bool WrapText { get; set; }

    public int WidthPx { get; set; } = 180;

    public Guid CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;
}