using IQADMS.API.Data;
using IQADMS.API.DTOs.Monitoring;
using Microsoft.EntityFrameworkCore;

namespace IQADMS.API.Services;

public class SubmissionMonitoringService
{
    private readonly ApplicationDbContext _context;

    public SubmissionMonitoringService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<DepartmentSubmissionProgressResponse>>
        GetDepartmentProgressAsync(Guid activityId)
    {
        var totalRequired = await _context.RequiredDocuments
            .CountAsync(r => r.AccreditationActivityId == activityId);

        var departments = await _context.Departments.ToListAsync();

        var result = new List<DepartmentSubmissionProgressResponse>();

        foreach (var dept in departments)
        {
            var submitted = await _context.Submissions
                .Where(s => s.AccreditationActivityId == activityId
                         && s.DepartmentId == dept.Id)
                .Select(s => s.RequiredDocumentId)
                .Distinct()
                .CountAsync();

            var missing = totalRequired - submitted;

            var progress = totalRequired == 0
                ? 0
                : (double)submitted / totalRequired * 100;

            result.Add(new DepartmentSubmissionProgressResponse
            {
                DepartmentId = dept.Id,
                DepartmentName = dept.Name,
                TotalRequiredDocuments = totalRequired,
                SubmittedDocuments = submitted,
                MissingDocuments = missing,
                ProgressPercentage = Math.Round(progress, 2),
                IsComplete = missing == 0 && totalRequired > 0
            });
        }

        return result;
    }
}
