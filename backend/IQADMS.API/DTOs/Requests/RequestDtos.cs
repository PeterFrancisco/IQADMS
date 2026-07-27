namespace IQADMS.API.DTOs.Requests;

public class AccountRequestStatusDto
{
    public Guid Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
}

public class MyRequestsOverviewResponse
{
    public string Email { get; set; } = string.Empty;
    public bool IsOnAllowList { get; set; }
    public bool IsRegistered { get; set; }
    public AccountRequestStatusDto? LatestAccountRequest { get; set; }
    public int PendingAccountRequestsForAdmin { get; set; }
    public int PendingExtensionRequestsForAdmin { get; set; }
}

public class CreateExtensionRequestDto
{
    public Guid TaskId { get; set; }
    public DateOnly RequestedDueDate { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class ReviewExtensionRequestDto
{
    public string? ReviewNote { get; set; }
}

public class ExtensionRequestResponse
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public string TaskTitle { get; set; } = string.Empty;
    public DateOnly? CurrentDueDate { get; set; }
    public DateOnly RequestedDueDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string RequestedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }
}

public class CreateDocumentRequestDto
{
    public Guid RelatedDepartmentId { get; set; }
    public Guid? ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? DueDate { get; set; }
}

public class UpdateDocumentRequestDto
{
    public string? Status { get; set; }
    public string? FulfillmentNotes { get; set; }
    public string? FulfillmentLink { get; set; }
}

public class DocumentRequestResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string? ProjectTitle { get; set; }
    public string RequestedByName { get; set; } = string.Empty;
    public string? FulfillmentNotes { get; set; }
    public string? FulfillmentLink { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SubmitFeedbackDto
{
    public string Type { get; set; } = "feedback";
    public string Message { get; set; } = string.Empty;
}
