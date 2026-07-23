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

    public DbSet<AccountRequest> AccountRequests => Set<AccountRequest>();

    public DbSet<WorkspaceTask> WorkspaceTasks => Set<WorkspaceTask>();

    public DbSet<BoardColumn> BoardColumns => Set<BoardColumn>();

    public DbSet<TaskColumnValue> TaskColumnValues => Set<TaskColumnValue>();
    
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

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<WorkspaceTask>()
            .Property(t => t.Title)
            .HasMaxLength(300);

        modelBuilder.Entity<WorkspaceTask>()
            .Property(t => t.Status)
            .HasMaxLength(50);

        modelBuilder.Entity<WorkspaceTask>()
            .HasOne(t => t.AssignedToUser)
            .WithMany()
            .HasForeignKey(t => t.AssignedToUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<WorkspaceTask>()
            .HasOne(t => t.CreatedByUser)
            .WithMany()
            .HasForeignKey(t => t.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BoardColumn>()
            .Property(c => c.Name)
            .HasMaxLength(100);

        modelBuilder.Entity<BoardColumn>()
            .Property(c => c.ColumnType)
            .HasMaxLength(30);

        modelBuilder.Entity<BoardColumn>()
            .HasOne(c => c.CreatedByUser)
            .WithMany()
            .HasForeignKey(c => c.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        
        modelBuilder.Entity<BoardColumn>()
            .Property(c => c.OptionsJson)
            .HasMaxLength(2000);

        modelBuilder.Entity<TaskColumnValue>()
            .HasOne(v => v.Task)
            .WithMany()
            .HasForeignKey(v => v.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskColumnValue>()
            .HasOne(v => v.Column)
            .WithMany()
            .HasForeignKey(v => v.ColumnId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskColumnValue>()
            .HasIndex(v => new { v.TaskId, v.ColumnId })
            .IsUnique();

    }
}