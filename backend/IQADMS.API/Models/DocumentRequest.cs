using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class DocumentRequest : BaseEntity
{
    public Guid RelatedDepartmentId { get; set; }
    public Department RelatedDepartment { get; set; } = null!;

    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }

    public Guid RequestedByUserId { get; set; }
    public User RequestedByUser { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "Pending";

    public string? FulfillmentNotes { get; set; }
    public string? FulfillmentLink { get; set; }
}
