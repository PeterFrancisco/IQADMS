using IQADMS.API.Models.Base;


namespace IQADMS.API.Models;

public class AccreditationActivity : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    public int Year { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly Deadline { get; set; }

    public string GoogleDriveFolderLink { get; set; } = string.Empty;

    // Planning | Ongoing | Completed | Archived
    public string Status { get; set; } = "Planning";

    public string Description { get; set; } = string.Empty;
}