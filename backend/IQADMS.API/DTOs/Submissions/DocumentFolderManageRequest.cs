namespace IQADMS.API.DTOs.Submissions;

public class CreateDocumentFolderRequest
{
    public string Name { get; set; } = string.Empty;
    public string? ParentPath { get; set; }
}

public class RenameDocumentFolderRequest
{
    public string OldPath { get; set; } = string.Empty;
    public string NewPath { get; set; } = string.Empty;
}
