using IQADMS.API.Models;

namespace IQADMS.API.Data;

public static class DbInitializer
{
    public static void Seed(ApplicationDbContext context)
    {
        // Ensure team allowed emails exist
        var teamEmails = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)
        {
            ["franciscopeterj@gmail.com"] = true,
            ["jamespeter.francisco3rd@gmail.com"] = false
        };

        var retiredAllowedEmails = new[]
        {
            "isco.jamespeter@gmail.com"
        };

        foreach (var retired in retiredAllowedEmails)
        {
            var allowed = context.AllowedUsers
                .FirstOrDefault(x => x.Email.ToLower() == retired.ToLower());
            if (allowed != null)
                context.AllowedUsers.Remove(allowed);
        }

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

        const string primaryAdminEmail = "franciscopeterj@gmail.com";
        var primaryAdmin = context.Users
            .FirstOrDefault(u => u.Email.ToLower() == primaryAdminEmail);
        if (primaryAdmin != null)
            primaryAdmin.IsAdmin = true;

        var retiredAdmin = context.Users
            .FirstOrDefault(u => u.Email.ToLower() == "isco.jamespeter@gmail.com");
        if (retiredAdmin != null)
            retiredAdmin.IsAdmin = false;

        if (context.ChangeTracker.HasChanges())
            context.SaveChanges();

        // Seed departments
        if (!context.Departments.Any())
        {
            context.Departments.AddRange(
                new Department { Name = "Registrar Office", Code = "REG" },
                new Department { Name = "School Director Office", Code = "SDO" },
                new Department { Name = "College of Engineering", Code = "COE" },
                new Department { Name = "College of Business", Code = "COB" },
                new Department { Name = "College of Education", Code = "CED" },
                new Department { Name = "Human Resource Office", Code = "HRO" },
                new Department { Name = "Finance Office", Code = "FIN" }
            );

            context.SaveChanges();
        }

        if (!context.Departments.Any(d => d.Code == "SDO"))
        {
            context.Departments.Add(new Department
            {
                Name = "School Director Office",
                Code = "SDO"
            });
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

        // Seed sample project (PQAD initiatives)
        if (!context.Projects.Any())
        {
            var creator = context.Users.FirstOrDefault(u => u.IsActive);
            if (creator != null)
            {
                var project = new Project
                {
                    Title = "PACUCOA 2026",
                    Description = "University-wide PACUCOA accreditation preparation and document tracking.",
                    StartDate = new DateOnly(2026, 1, 1),
                    DueDate = new DateOnly(2026, 9, 30),
                    Status = "Active",
                    Priority = "High",
                    CreatedByUserId = creator.Id
                };
                context.Projects.Add(project);
                context.SaveChanges();

                context.ProjectMembers.Add(new ProjectMember
                {
                    ProjectId = project.Id,
                    UserId = creator.Id
                });

                var regDept = context.Departments.FirstOrDefault(d => d.Code == "REG");
                if (regDept != null)
                {
                    context.ProjectDepartments.Add(new ProjectDepartment
                    {
                        ProjectId = project.Id,
                        DepartmentId = regDept.Id
                    });
                }

                context.SaveChanges();
            }
        }

        if (!context.PqadAnnouncements.Any())
        {
            var creator = context.Users.FirstOrDefault(u => u.IsActive);
            if (creator != null)
            {
                context.PqadAnnouncements.AddRange(
                    new PqadAnnouncement
                    {
                        Title = "PQAD Staff Orientation",
                        Description = "Welcome session for PQAD members — roles, tools, and accreditation calendar.",
                        Category = "Orientation",
                        StartDate = new DateOnly(2026, 8, 15),
                        Location = "PQAD Office, Molino Campus",
                        CreatedByUserId = creator.Id
                    },
                    new PqadAnnouncement
                    {
                        Title = "Monthly PQAD Coordination Meeting",
                        Description = "Progress review on PACUCOA 2026 tasks and department follow-ups.",
                        Category = "Meeting",
                        StartDate = new DateOnly(2026, 8, 5),
                        Location = "Conference Room / Google Meet",
                        CreatedByUserId = creator.Id
                    },
                    new PqadAnnouncement
                    {
                        Title = "PACUCOA Virtual Visit",
                        Description = "Scheduled PACUCOA virtual accreditation visit — ensure evidence folders are ready.",
                        Category = "PACUCOA Visit",
                        StartDate = new DateOnly(2026, 9, 8),
                        EndDate = new DateOnly(2026, 9, 10),
                        Location = "Virtual (link to be shared)",
                        CreatedByUserId = creator.Id
                    }
                );
                context.SaveChanges();
            }
        }
    }
}