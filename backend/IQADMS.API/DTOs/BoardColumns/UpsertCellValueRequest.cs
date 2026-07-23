namespace IQADMS.API.DTOs.BoardColumns;

public class UpsertCellValueRequest
{
    public Guid TaskId { get; set; }
    public Guid ColumnId { get; set; }
    public string? Value { get; set; }
}