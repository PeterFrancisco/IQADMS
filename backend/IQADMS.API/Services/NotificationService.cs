using IQADMS.API.Data;
using IQADMS.API.Models;
using Microsoft.EntityFrameworkCore;

namespace IQADMS.API.Services;

public class NotificationService
{
    private readonly ApplicationDbContext _context;

    public NotificationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task NotifyAsync(
        Guid userId,
        string category,
        string title,
        string? body,
        string? linkPath,
        Guid? relatedTaskId = null,
        Guid? relatedProjectId = null,
        string? dedupKey = null)
    {
        if (userId == Guid.Empty) return;

        var active = await _context.Users.AnyAsync(u => u.Id == userId && u.IsActive);
        if (!active) return;

        if (!string.IsNullOrEmpty(dedupKey))
        {
            var exists = await _context.UserNotifications.AnyAsync(n =>
                n.UserId == userId && n.DedupKey == dedupKey && !n.IsDeleted);
            if (exists) return;
        }

        _context.UserNotifications.Add(new UserNotification
        {
            UserId = userId,
            Category = category,
            Title = title,
            Body = body,
            LinkPath = linkPath,
            RelatedTaskId = relatedTaskId,
            RelatedProjectId = relatedProjectId,
            DedupKey = dedupKey
        });

        await _context.SaveChangesAsync();
    }

    public async Task SyncDueRemindersAsync(Guid userId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayKey = today.ToString("yyyy-MM-dd");

        var tasks = await _context.WorkspaceTasks
            .Where(t => !t.IsDeleted && t.AssignedToUserId == userId && t.DueDate != null)
            .Where(t => t.Status != "Completed" && t.Status != "Done" && t.Status != "Cancelled")
            .ToListAsync();

        foreach (var task in tasks)
        {
            var due = task.DueDate!.Value;
            if (due == today)
            {
                await NotifyAsync(
                    userId,
                    "reminder",
                    "Task due today",
                    $"\"{task.Title}\" is due today.",
                    "/my-tasks",
                    task.Id,
                    task.ProjectId,
                    $"task-due-today-{task.Id}-{todayKey}");
            }
            else if (due < today)
            {
                await NotifyAsync(
                    userId,
                    "reminder",
                    "Overdue task",
                    $"\"{task.Title}\" was due on {due:yyyy-MM-dd}.",
                    "/my-tasks",
                    task.Id,
                    task.ProjectId,
                    $"task-overdue-{task.Id}-{todayKey}");
            }
        }
    }

    public async Task SyncAdminAccountRequestAlertsAsync(Guid adminUserId)
    {
        var isAdmin = await _context.Users.AnyAsync(u => u.Id == adminUserId && u.IsAdmin && u.IsActive);
        if (!isAdmin) return;

        var pending = await _context.AccountRequests
            .Where(r => r.Status == "Pending")
            .ToListAsync();

        foreach (var req in pending)
        {
            await NotifyAsync(
                adminUserId,
                "admin",
                "New account request",
                $"{req.FullName} ({req.Email}) requested access.",
                "/settings",
                dedupKey: $"account-request-{req.Id}");
        }
    }

    public async Task NotifyAllAdminsAsync(
        string category,
        string title,
        string? body,
        string? linkPath,
        Guid? relatedTaskId = null,
        Guid? relatedProjectId = null,
        string? dedupKey = null)
    {
        var adminIds = await _context.Users
            .Where(u => u.IsAdmin && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var adminId in adminIds)
        {
            await NotifyAsync(
                adminId,
                category,
                title,
                body,
                linkPath,
                relatedTaskId,
                relatedProjectId,
                dedupKey);
        }
    }

    public async Task NotifyAdminsOfAccountRequestAsync(Guid accountRequestId, string fullName, string email)
    {
        var adminIds = await _context.Users
            .Where(u => u.IsAdmin && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var adminId in adminIds)
        {
            await NotifyAsync(
                adminId,
                "admin",
                "New account request",
                $"{fullName} ({email}) requested access.",
                "/settings",
                dedupKey: $"account-request-{accountRequestId}");
        }
    }

    public async Task NotifyAnnouncementPublishedAsync(
        Guid announcementId,
        string category,
        string title,
        string? description,
        Guid authorUserId,
        string authorEmail)
    {
        var author = await _context.Users.FindAsync(authorUserId);
        if (author == null) return;

        var tokens = MentionParser.ExtractTokens(title, description);
        var recipientIds = new HashSet<Guid>();

        if (tokens.Count == 0 || MentionParser.ContainsEveryone(tokens))
        {
            var all = await _context.Users
                .Where(u => u.IsActive && u.Id != authorUserId)
                .Select(u => u.Id)
                .ToListAsync();
            foreach (var id in all) recipientIds.Add(id);
        }
        else
        {
            var activeUsers = await _context.Users
                .Where(u => u.IsActive && u.Id != authorUserId)
                .Select(u => new { u.Id, u.Username, u.Email })
                .ToListAsync();

            foreach (var token in tokens)
            {
                if (token.Equals("everyone", StringComparison.OrdinalIgnoreCase))
                    continue;

                var match = activeUsers.FirstOrDefault(u =>
                    u.Username.Equals(token, StringComparison.OrdinalIgnoreCase)
                    || u.Email.Equals(token, StringComparison.OrdinalIgnoreCase)
                    || u.Email.StartsWith(token + "@", StringComparison.OrdinalIgnoreCase));

                if (match != null)
                    recipientIds.Add(match.Id);
            }
        }

        var preview = TruncatePreview(title, 96);
        var kind = category.Equals("Meeting", StringComparison.OrdinalIgnoreCase) ? "meeting" : "announcement";
        var notifyTitle = $"{authorEmail} published a {kind}";

        foreach (var userId in recipientIds)
        {
            await NotifyAsync(
                userId,
                "announcement",
                notifyTitle,
                preview,
                "/announcements",
                dedupKey: $"announcement-{announcementId}-{userId}");
        }
    }

    private static string TruncatePreview(string text, int maxLen)
    {
        var t = (text ?? string.Empty).Trim();
        if (t.Length <= maxLen) return t;
        return t[..(maxLen - 1)] + "…";
    }
}
