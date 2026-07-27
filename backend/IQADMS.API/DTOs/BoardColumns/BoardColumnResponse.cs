namespace IQADMS.API.DTOs.BoardColumns;

public class BoardColumnResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ColumnType { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Binding { get; set; } = string.Empty;
    public bool WrapText { get; set; }
    public int WidthPx { get; set; } = 180;
    public bool IsLocked { get; set; }
    public List<string> Options { get; set; } = new();
}