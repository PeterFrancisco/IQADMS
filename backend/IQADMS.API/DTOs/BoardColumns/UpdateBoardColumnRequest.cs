namespace IQADMS.API.DTOs.BoardColumns;

public class UpdateBoardColumnRequest
{
    public string? Name { get; set; }
    public bool? WrapText { get; set; }
    public int? WidthPx { get; set; }
}
