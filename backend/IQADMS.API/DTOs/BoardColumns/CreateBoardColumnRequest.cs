namespace IQADMS.API.DTOs.BoardColumns;

public class CreateBoardColumnRequest
{
    public string Name { get; set; } = string.Empty;
    public string ColumnType { get; set; } = "text";
    public List<string>? Options { get; set; }
}