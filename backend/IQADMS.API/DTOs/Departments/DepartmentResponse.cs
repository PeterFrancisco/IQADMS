namespace IQADMS.API.DTOs.Departments;

public class DepartmentResponse
{
    public Guid Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}