namespace IQADMS.API.DTOs.Reports;

public class TaskReportRowResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateOnly? DueDate { get; set; }
    public string? AssigneeName { get; set; }
    public string? ProjectTitle { get; set; }
    public string? RelatedDepartmentName { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ReportsSummaryResponse
{
    public int TotalRows { get; set; }
    public int OpenCount { get; set; }
    public int CompletedCount { get; set; }
    public int OverdueCount { get; set; }
    public List<TaskReportRowResponse> Rows { get; set; } = new();
}
