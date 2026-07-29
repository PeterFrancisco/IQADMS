namespace IQADMS.API.DTOs.Analytics;

public class MonthlyAnalyticsResponse
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string PeriodLabel { get; set; } = string.Empty;
    public DateTime RangeStartUtc { get; set; }
    public DateTime RangeEndUtc { get; set; }
    public AnalyticsKpiSummary Kpis { get; set; } = new();
    public TaskMonitoringSnapshot TaskMonitoring { get; set; } = new();
    public DocumentMonitoringSnapshot? DocumentMonitoring { get; set; }
    public List<DailyCountPoint> TasksCompletedByDay { get; set; } = new();
    public List<DailyCountPoint> DocumentsUploadedByDay { get; set; } = new();
    public List<AnalyticsActivityItem> RecentActivity { get; set; } = new();
    public List<CompletedTaskRow> TasksCompletedInPeriod { get; set; } = new();
    public List<DocumentUploadRow> DocumentsUploadedInPeriod { get; set; } = new();
}

public class AnalyticsKpiSummary
{
    public int TasksCompleted { get; set; }
    public int TasksSubmitted { get; set; }
    public int DocumentsUploaded { get; set; }
    public int ActivityEvents { get; set; }
    public int OpenTasksNow { get; set; }
    public int TasksInProgressNow { get; set; }
    public int TasksAwaitingReviewNow { get; set; }
}

public class TaskMonitoringSnapshot
{
    public int TotalOpen { get; set; }
    public int InProgress { get; set; }
    public int Submitted { get; set; }
    public int Returned { get; set; }
    public int CompletedAllTime { get; set; }
    public int OverdueOpen { get; set; }
}

public class DocumentMonitoringSnapshot
{
    public int TotalLibraryFiles { get; set; }
    public int UploadedThisPeriod { get; set; }
    public long StorageBytesUsed { get; set; }
    public int TrashedFiles { get; set; }
}

public class DailyCountPoint
{
    public string Date { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class AnalyticsActivityItem
{
    public Guid Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public string? ActorName { get; set; }
    public string? ProjectTitle { get; set; }
    public DateTime OccurredAt { get; set; }
}

public class CompletedTaskRow
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? AssigneeName { get; set; }
    public string? ProjectTitle { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class DocumentUploadRow
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string? FolderPath { get; set; }
    public string? UploadedByName { get; set; }
    public DateTime UploadedAt { get; set; }
}
