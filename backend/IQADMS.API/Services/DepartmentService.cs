using IQADMS.API.Data;
using IQADMS.API.DTOs.Departments;
using Microsoft.EntityFrameworkCore;

namespace IQADMS.API.Services;

public class DepartmentService
{
    private readonly ApplicationDbContext _context;

    public DepartmentService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<DepartmentResponse>> GetAllAsync()
    {
        return await _context.Departments
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentResponse
            {
                Id = d.Id,
                Code = d.Code,
                Name = d.Name
            })
            .ToListAsync();
    }
}