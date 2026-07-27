namespace IQADMS.API.DTOs.Dashboard;

public class DeadlineItemResponse
{
    public string ItemType { get; set; } = string.Empty;
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly DueDate { get; set; }
    public string? Status { get; set; }
    public string? ProjectTitle { get; set; }
    public Guid? ProjectId { get; set; }
    public string? AssignedToName { get; set; }
    public bool IsOverdue { get; set; }
    public int DaysUntilDue { get; set; }
}

public class RecentActivityItemResponse
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public string TaskTitle { get; set; } = string.Empty;
    public Guid? ProjectId { get; set; }
    public string? ProjectTitle { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public string? ActorName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TaskStatusCountResponse
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class ProjectTaskSummaryResponse
{
    public Guid? ProjectId { get; set; }
    public string ProjectTitle { get; set; } = string.Empty;
    public int TotalTasks { get; set; }
    public int OpenTasks { get; set; }
    public int OverdueTasks { get; set; }
}

public class DashboardStatisticsResponse
{
    public int TotalTasks { get; set; }
    public int OpenTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int OverdueTasks { get; set; }
    public int MyOpenAssigned { get; set; }
    public int ActiveProjects { get; set; }
    public List<TaskStatusCountResponse> TasksByStatus { get; set; } = new();
    public List<ProjectTaskSummaryResponse> ByProject { get; set; } = new();
}

public class CalendarEventResponse
{
    public string ItemType { get; set; } = string.Empty;
    public string EventKind { get; set; } = string.Empty;
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string? Status { get; set; }
    public string? Category { get; set; }
    public string? Location { get; set; }
}
