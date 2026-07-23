using IQADMS.API.Models;

namespace IQADMS.API.Data;

public static class DbInitializer
{
    public static void Seed(ApplicationDbContext context)
    {
        // Ensure team allowed emails exist
        var teamEmails = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)
        {
            ["isco.jamespeter@gmail.com"] = true,
            ["jamespeter.francisco3rd@gmail.com"] = false
        };

        foreach (var entry in teamEmails)
        {
            var existing = context.AllowedUsers
                .FirstOrDefault(x => x.Email.ToLower() == entry.Key.ToLower());

            if (existing == null)
            {
                context.AllowedUsers.Add(new AllowedUser
                {
                    Email = entry.Key.ToLower(),
                    IsRegistered = false,
                    IsAdmin = entry.Value
                });
            }
            else
            {
                existing.IsAdmin = entry.Value;
            }
        }

        if (context.ChangeTracker.HasChanges())
            context.SaveChanges();

        // Seed departments
        if (!context.Departments.Any())
        {
            context.Departments.AddRange(
                new Department { Name = "Registrar Office", Code = "REG" },
                new Department { Name = "College of Engineering", Code = "COE" },
                new Department { Name = "College of Business", Code = "COB" },
                new Department { Name = "College of Education", Code = "CED" },
                new Department { Name = "Human Resource Office", Code = "HRO" },
                new Department { Name = "Finance Office", Code = "FIN" }
            );

            context.SaveChanges();
        }

        // Seed sample accreditation activity
        if (!context.AccreditationActivities.Any())
        {
            var activity = new AccreditationActivity
            {
                Name = "PACUCOA Accreditation 2026",
                Year = 2026,
                StartDate = new DateOnly(2026, 8, 1),
                Deadline = new DateOnly(2026, 9, 30),
                GoogleDriveFolderLink = "https://drive.google.com/",
                Status = "Ongoing",
                Description = "Sample accreditation activity for testing."
            };

            context.AccreditationActivities.Add(activity);
            context.SaveChanges();

            context.RequiredDocuments.AddRange(
                new RequiredDocument
                {
                    AccreditationActivityId = activity.Id,
                    Title = "Operational Plan",
                    Category = "Planning"
                },
                new RequiredDocument
                {
                    AccreditationActivityId = activity.Id,
                    Title = "Minutes of Meeting",
                    Category = "Meeting"
                },
                new RequiredDocument
                {
                    AccreditationActivityId = activity.Id,
                    Title = "Accomplishment Report",
                Category = "Report"
                }
            );

            context.SaveChanges();
        }
    }
}