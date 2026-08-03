namespace IQADMS.API.DTOs.Admin;

public class SystemStorageResponse
{
    public UploadStorageSection Uploads { get; set; } = new();
    public DatabaseStorageSection Database { get; set; } = new();
    public DiskStorageSection Disk { get; set; } = new();
}

public class UploadStorageSection
{
    public long TotalBytes { get; set; }
    public long DocumentsBytes { get; set; }
    public long ProfilesBytes { get; set; }
    public long TasksBytes { get; set; }
    public int FileCount { get; set; }
    public long MaxBytes { get; set; }
    public string UploadsPath { get; set; } = string.Empty;
}

public class DatabaseStorageSection
{
    public string Name { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
}

public class DiskStorageSection
{
    public long TotalBytes { get; set; }
    public long UsedBytes { get; set; }
    public long FreeBytes { get; set; }
    public int UsedPercent { get; set; }
    public string MountRoot { get; set; } = string.Empty;
}
