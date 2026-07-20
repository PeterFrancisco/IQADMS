using IQADMS.API.Models;
using Microsoft.EntityFrameworkCore;

namespace IQADMS.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Department> Departments => Set<Department>();

    public DbSet<AllowedUser> AllowedUsers => Set<AllowedUser>();

    public DbSet<AccreditationActivity> AccreditationActivities => Set<AccreditationActivity>();

    public DbSet<RequiredDocument> RequiredDocuments => Set<RequiredDocument>();

    public DbSet<Submission> Submissions => Set<Submission>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<AllowedUser>()
            .HasIndex(a => a.Email)
            .IsUnique();

        modelBuilder.Entity<Department>()
            .HasIndex(d => d.Code)
            .IsUnique();

        modelBuilder.Entity<Department>()
            .HasIndex(d => d.Name)
            .IsUnique();

        modelBuilder.Entity<AccreditationActivity>()
            .Property(a => a.Name)
            .HasMaxLength(200);

        modelBuilder.Entity<AccreditationActivity>()
            .Property(a => a.Status)
            .HasMaxLength(50);

        modelBuilder.Entity<RequiredDocument>()
            .HasOne(r => r.AccreditationActivity)
            .WithMany()
            .HasForeignKey(r => r.AccreditationActivityId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RequiredDocument>()
            .Property(r => r.Title)
            .HasMaxLength(200);

        modelBuilder.Entity<RequiredDocument>()
            .Property(r => r.Category)
            .HasMaxLength(100);

        modelBuilder.Entity<Submission>()
            .HasOne(s => s.AccreditationActivity)
            .WithMany()
            .HasForeignKey(s => s.AccreditationActivityId);

        modelBuilder.Entity<Submission>()
            .HasOne(s => s.RequiredDocument)
            .WithMany()
            .HasForeignKey(s => s.RequiredDocumentId);

        modelBuilder.Entity<Submission>()
            .HasOne(s => s.Department)
            .WithMany()
            .HasForeignKey(s => s.DepartmentId);

        modelBuilder.Entity<Submission>()
            .HasOne(s => s.UploadedByUser)
            .WithMany()
            .HasForeignKey(s => s.UploadedByUserId);

        modelBuilder.Entity<Submission>()
            .Property(s => s.FileName)
            .HasMaxLength(255);

        modelBuilder.Entity<Submission>()
            .Property(s => s.Status)
            .HasMaxLength(50);

    }
}