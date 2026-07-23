using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class TaskColumnValue : BaseEntity
{
    public Guid TaskId { get; set; }
    public WorkspaceTask Task { get; set; } = null!;

    public Guid ColumnId { get; set; }
    public BoardColumn Column { get; set; } = null!;

    public string? Value { get; set; }
}