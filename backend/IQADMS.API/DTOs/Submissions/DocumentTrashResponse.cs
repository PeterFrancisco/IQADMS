namespace IQADMS.API.DTOs.Submissions;

public class DocumentTrashResponse
{
    public int RetentionDays { get; set; }
    public List<DocumentListResponse> Items { get; set; } = new();
}
