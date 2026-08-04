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

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<ProjectDepartment> ProjectDepartments => Set<ProjectDepartment>();
    public DbSet<TaskComment> TaskComments => Set<TaskComment>();
    public DbSet<TaskActivityLog> TaskActivityLogs => Set<TaskActivityLog>();
    public DbSet<TaskAttachment> TaskAttachments => Set<TaskAttachment>();

    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();

    public DbSet<TaskExtensionRequest> TaskExtensionRequests => Set<TaskExtensionRequest>();

    public DbSet<DocumentRequest> DocumentRequests => Set<DocumentRequest>();

    public DbSet<UserFeedback> UserFeedbacks => Set<UserFeedback>();

    public DbSet<PqadAnnouncement> PqadAnnouncements => Set<PqadAnnouncement>();

    public DbSet<BoardColumn> BoardColumns => Set<BoardColumn>();

    public DbSet<TaskColumnValue> TaskColumnValues => Set<TaskColumnValue>();

    public DbSet<PasswordResetRequest> PasswordResetRequests => Set<PasswordResetRequest>();

    public DbSet<DocumentLibraryFolder> DocumentLibraryFolders => Set<DocumentLibraryFolder>();
    
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

        modelBuilder.Entity<Department>()
            .Property(d => d.ContactName)
            .HasMaxLength(200);

        modelBuilder.Entity<Department>()
            .Property(d => d.ContactEmail)
            .HasMaxLength(200);

        modelBuilder.Entity<Department>()
            .Property(d => d.ContactPhone)
            .HasMaxLength(50);

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
            .Property(s => s.AutoFolderPath)
            .HasMaxLength(300);

        modelBuilder.Entity<Submission>()
            .Property(s => s.StoredRelativePath)
            .HasMaxLength(500);

        modelBuilder.Entity<Submission>()
            .Property(s => s.Status)
            .HasMaxLength(50);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<User>()
            .Property(u => u.PresenceStatus)
            .HasMaxLength(16);

        modelBuilder.Entity<User>()
            .Property(u => u.PreferencesJson)
            .HasMaxLength(2000);

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

        modelBuilder.Entity<WorkspaceTask>()
            .Property(t => t.Priority)
            .HasMaxLength(20);

        modelBuilder.Entity<WorkspaceTask>()
            .HasOne(t => t.Project)
            .WithMany(p => p.Tasks)
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<WorkspaceTask>()
            .HasOne(t => t.RelatedDepartment)
            .WithMany()
            .HasForeignKey(t => t.RelatedDepartmentId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Project>()
            .Property(p => p.Title)
            .HasMaxLength(300);

        modelBuilder.Entity<Project>()
            .Property(p => p.Status)
            .HasMaxLength(50);

        modelBuilder.Entity<Project>()
            .Property(p => p.Priority)
            .HasMaxLength(20);

        modelBuilder.Entity<Project>()
            .HasOne(p => p.CreatedByUser)
            .WithMany()
            .HasForeignKey(p => p.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ProjectMember>()
            .HasKey(pm => new { pm.ProjectId, pm.UserId });

        modelBuilder.Entity<ProjectMember>()
            .HasOne(pm => pm.Project)
            .WithMany(p => p.Members)
            .HasForeignKey(pm => pm.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectMember>()
            .HasOne(pm => pm.User)
            .WithMany()
            .HasForeignKey(pm => pm.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectDepartment>()
            .HasKey(pd => new { pd.ProjectId, pd.DepartmentId });

        modelBuilder.Entity<ProjectDepartment>()
            .HasOne(pd => pd.Project)
            .WithMany(p => p.Departments)
            .HasForeignKey(pd => pd.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectDepartment>()
            .HasOne(pd => pd.Department)
            .WithMany()
            .HasForeignKey(pd => pd.DepartmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskComment>()
            .Property(c => c.Body)
            .HasMaxLength(4000);

        modelBuilder.Entity<TaskComment>()
            .HasOne(c => c.Task)
            .WithMany(t => t.Comments)
            .HasForeignKey(c => c.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskComment>()
            .HasOne(c => c.AuthorUser)
            .WithMany()
            .HasForeignKey(c => c.AuthorUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TaskActivityLog>()
            .Property(a => a.Action)
            .HasMaxLength(100);

        modelBuilder.Entity<TaskActivityLog>()
            .Property(a => a.Detail)
            .HasMaxLength(2000);

        modelBuilder.Entity<TaskActivityLog>()
            .HasOne(a => a.Task)
            .WithMany(t => t.ActivityLogs)
            .HasForeignKey(a => a.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskAttachment>()
            .Property(a => a.FileName)
            .HasMaxLength(255);

        modelBuilder.Entity<TaskAttachment>()
            .Property(a => a.StoredFileName)
            .HasMaxLength(255);

        modelBuilder.Entity<TaskAttachment>()
            .HasOne(a => a.Task)
            .WithMany(t => t.Attachments)
            .HasForeignKey(a => a.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskAttachment>()
            .HasOne(a => a.UploadedByUser)
            .WithMany()
            .HasForeignKey(a => a.UploadedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TaskActivityLog>()
            .HasOne(a => a.ActorUser)
            .WithMany()
            .HasForeignKey(a => a.ActorUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<UserNotification>()
            .Property(n => n.Category)
            .HasMaxLength(30);

        modelBuilder.Entity<UserNotification>()
            .Property(n => n.Title)
            .HasMaxLength(300);

        modelBuilder.Entity<UserNotification>()
            .Property(n => n.Body)
            .HasMaxLength(2000);

        modelBuilder.Entity<UserNotification>()
            .Property(n => n.LinkPath)
            .HasMaxLength(500);

        modelBuilder.Entity<UserNotification>()
            .Property(n => n.DedupKey)
            .HasMaxLength(200);

        modelBuilder.Entity<UserNotification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserNotification>()
            .HasIndex(n => new { n.UserId, n.DedupKey })
            .IsUnique()
            .HasFilter("\"DedupKey\" IS NOT NULL");

        modelBuilder.Entity<TaskExtensionRequest>()
            .Property(r => r.Reason)
            .HasMaxLength(2000);

        modelBuilder.Entity<TaskExtensionRequest>()
            .Property(r => r.Status)
            .HasMaxLength(30);

        modelBuilder.Entity<TaskExtensionRequest>()
            .Property(r => r.ReviewNote)
            .HasMaxLength(1000);

        modelBuilder.Entity<TaskExtensionRequest>()
            .HasOne(r => r.Task)
            .WithMany()
            .HasForeignKey(r => r.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskExtensionRequest>()
            .HasOne(r => r.RequestedByUser)
            .WithMany()
            .HasForeignKey(r => r.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TaskExtensionRequest>()
            .HasOne(r => r.ReviewedByUser)
            .WithMany()
            .HasForeignKey(r => r.ReviewedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<DocumentRequest>()
            .Property(d => d.Title)
            .HasMaxLength(300);

        modelBuilder.Entity<DocumentRequest>()
            .Property(d => d.Status)
            .HasMaxLength(30);

        modelBuilder.Entity<DocumentRequest>()
            .Property(d => d.Description)
            .HasMaxLength(4000);

        modelBuilder.Entity<DocumentRequest>()
            .Property(d => d.FulfillmentNotes)
            .HasMaxLength(2000);

        modelBuilder.Entity<DocumentRequest>()
            .Property(d => d.FulfillmentLink)
            .HasMaxLength(500);

        modelBuilder.Entity<DocumentRequest>()
            .HasOne(d => d.RelatedDepartment)
            .WithMany()
            .HasForeignKey(d => d.RelatedDepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DocumentRequest>()
            .HasOne(d => d.Project)
            .WithMany()
            .HasForeignKey(d => d.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<DocumentRequest>()
            .HasOne(d => d.RequestedByUser)
            .WithMany()
            .HasForeignKey(d => d.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<UserFeedback>()
            .Property(f => f.Type)
            .HasMaxLength(20);

        modelBuilder.Entity<UserFeedback>()
            .Property(f => f.Message)
            .HasMaxLength(4000);

        modelBuilder.Entity<UserFeedback>()
            .HasOne(f => f.User)
            .WithMany()
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PqadAnnouncement>()
            .Property(a => a.Title)
            .HasMaxLength(300);

        modelBuilder.Entity<PqadAnnouncement>()
            .Property(a => a.Category)
            .HasMaxLength(50);

        modelBuilder.Entity<PqadAnnouncement>()
            .Property(a => a.Location)
            .HasMaxLength(300);

        modelBuilder.Entity<PqadAnnouncement>()
            .Property(a => a.Description)
            .HasMaxLength(4000);

        modelBuilder.Entity<PqadAnnouncement>()
            .HasOne(a => a.CreatedByUser)
            .WithMany()
            .HasForeignKey(a => a.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BoardColumn>()
            .Property(c => c.Name)
            .HasMaxLength(100);

        modelBuilder.Entity<BoardColumn>()
            .Property(c => c.ColumnType)
            .HasMaxLength(30);

        modelBuilder.Entity<BoardColumn>()
            .Property(c => c.Binding)
            .HasMaxLength(32);

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

        modelBuilder.Entity<PasswordResetRequest>()
            .Property(r => r.Email)
            .HasMaxLength(256);

        modelBuilder.Entity<PasswordResetRequest>()
            .Property(r => r.Status)
            .HasMaxLength(32);

        modelBuilder.Entity<PasswordResetRequest>()
            .Property(r => r.ResetToken)
            .HasMaxLength(128);

        modelBuilder.Entity<PasswordResetRequest>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DocumentLibraryFolder>()
            .Property(f => f.Path)
            .HasMaxLength(300);

        modelBuilder.Entity<DocumentLibraryFolder>()
            .HasIndex(f => f.Path)
            .IsUnique();

    }
}