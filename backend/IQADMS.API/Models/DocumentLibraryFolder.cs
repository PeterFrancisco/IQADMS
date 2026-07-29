using IQADMS.API.Models.Base;

namespace IQADMS.API.Models;

public class DocumentLibraryFolder : BaseEntity
{
    public string Path { get; set; } = string.Empty;

    public DateTime? DeletedAt { get; set; }
}
