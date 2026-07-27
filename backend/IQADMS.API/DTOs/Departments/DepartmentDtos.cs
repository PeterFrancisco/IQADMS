namespace IQADMS.API.DTOs.Departments;

public class DepartmentResponse
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class DepartmentOverviewResponse : DepartmentResponse
{
    public int RelatedTaskCount { get; set; }
    public int OpenRelatedTaskCount { get; set; }
    public int ProjectCount { get; set; }
    public string? ContactName { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
}

public class UpdateDepartmentRequest
{
    public string? ContactName { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
}

public class DepartmentProjectLinkDto
{
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class DepartmentTaskLinkDto
{
    public Guid TaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateOnly? DueDate { get; set; }
    public string? ProjectTitle { get; set; }
}

public class DepartmentDetailResponse : DepartmentOverviewResponse
{
    public List<DepartmentProjectLinkDto> Projects { get; set; } = new();
    public List<DepartmentTaskLinkDto> RecentTasks { get; set; } = new();
}
