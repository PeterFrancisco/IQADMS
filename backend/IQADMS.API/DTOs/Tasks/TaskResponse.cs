namespace IQADMS.API.DTOs.Tasks;

public class TaskResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateOnly? DueDate { get; set; }

    public Guid? ProjectId { get; set; }
    public string? ProjectTitle { get; set; }

    public Guid? RelatedDepartmentId { get; set; }
    public string? RelatedDepartmentName { get; set; }

    public Guid? AssignedToUserId { get; set; }
    public string? AssignedToName { get; set; }
    public string? AssignedToUsername { get; set; }

    public Guid CreatedByUserId { get; set; }
    public string? CreatedByName { get; set; }

    public string? AttachmentFileName { get; set; }
    public string? AttachmentDownloadUrl { get; set; }
    public string? UploadGoogleDriveLink { get; set; }
    public string? DeliverableGoogleDriveLink { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<TaskAttachmentDto> Attachments { get; set; } = new();
    public int CommentCount { get; set; }
}

public class TaskAttachmentDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string DownloadUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateTaskCommentRequest
{
    public string Body { get; set; } = string.Empty;
}

public class TaskCommentResponse
{
    public Guid Id { get; set; }
    public string Body { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class TaskActivityResponse
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Detail { get; set; }
    public string? ActorName { get; set; }
    public DateTime CreatedAt { get; set; }
}