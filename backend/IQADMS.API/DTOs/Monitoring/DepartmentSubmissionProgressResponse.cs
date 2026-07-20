namespace IQADMS.API.DTOs.Monitoring;

public class DepartmentSubmissionProgressResponse
{
    public Guid DepartmentId { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public int TotalRequiredDocuments { get; set; }

    public int SubmittedDocuments { get; set; }

    public int MissingDocuments { get; set; }

    public double ProgressPercentage { get; set; }

    public bool IsComplete { get; set; }
}