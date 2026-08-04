using IQADMS.API.Data;
using IQADMS.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace IQADMS.API.Services;

public class NotificationService
{
    private readonly ApplicationDbContext _context;

    public NotificationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public static string BuildTaskLinkPath(Guid taskId, Guid? projectId)
    {
        if (projectId.HasValue)
            return $"/my-tasks?task={taskId}&project={projectId}";
        return $"/my-tasks?task={taskId}&project=__none__";
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
                    BuildTaskLinkPath(task.Id, task.ProjectId),
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
                    BuildTaskLinkPath(task.Id, task.ProjectId),
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
        if (tokens.Count == 0) return;

        var authorLabel = string.IsNullOrWhiteSpace(author.DisplayName)
            ? authorEmail
            : author.DisplayName.Trim();
        var preview = TruncatePreview(title, 96);
        var kind = category.Equals("Meeting", StringComparison.OrdinalIgnoreCase) ? "meeting" : "announcement";
        var linkPath = $"/announcements?id={announcementId}";
        var dedupSuffix = BuildMentionDedupSuffix(title, description, tokens);

        var activeUsers = await _context.Users
            .Where(u => u.IsActive && u.Id != authorUserId)
            .Select(u => new MentionCandidate(u.Id, u.Username, u.Email, u.DisplayName))
            .ToListAsync();

        if (MentionParser.ContainsEveryone(tokens))
        {
            foreach (var user in activeUsers)
            {
                await NotifyAsync(
                    user.Id,
                    "announcement",
                    $"{authorLabel} posted a {kind} for @everyone",
                    preview,
                    linkPath,
                    dedupKey: $"announcement-broadcast-{announcementId}-{user.Id}{dedupSuffix}");
            }
        }

        var mentionedIds = new HashSet<Guid>();
        foreach (var token in MentionParser.SpecificMentionTokens(tokens))
        {
            var match = activeUsers.FirstOrDefault(u => UserMatchesMentionToken(u, token));
            if (match != null)
                mentionedIds.Add(match.Id);
        }

        foreach (var userId in mentionedIds)
        {
            await NotifyAsync(
                userId,
                "mention",
                $"{authorLabel} mentioned you in an announcement",
                preview,
                linkPath,
                dedupKey: $"announcement-mention-{announcementId}-{userId}{dedupSuffix}");
        }
    }

    private static bool UserMatchesMentionToken(MentionCandidate user, string token)
    {
        if (user.Username.Equals(token, StringComparison.OrdinalIgnoreCase))
            return true;

        if (user.Email.Equals(token, StringComparison.OrdinalIgnoreCase))
            return true;

        if (user.Email.StartsWith(token + "@", StringComparison.OrdinalIgnoreCase))
            return true;

        if (!string.IsNullOrWhiteSpace(user.DisplayName))
        {
            if (user.DisplayName.Equals(token, StringComparison.OrdinalIgnoreCase))
                return true;

            var compactDisplay = user.DisplayName.Replace(" ", string.Empty, StringComparison.Ordinal);
            if (compactDisplay.Equals(token, StringComparison.OrdinalIgnoreCase))
                return true;

            var firstName = user.DisplayName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .FirstOrDefault();
            if (firstName != null && firstName.Equals(token, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    private static string BuildMentionDedupSuffix(string title, string? description, IEnumerable<string> tokens)
    {
        var tokenPart = string.Join(',', tokens.OrderBy(t => t, StringComparer.OrdinalIgnoreCase));
        var payload = $"{tokenPart}\n{title.Trim()}\n{(description ?? string.Empty).Trim()}";
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload)))[..16];
        return $"-{hash}";
    }

    private sealed record MentionCandidate(Guid Id, string Username, string Email, string DisplayName);

    private static string TruncatePreview(string text, int maxLen)
    {
        var t = (text ?? string.Empty).Trim();
        if (t.Length <= maxLen) return t;
        return t[..(maxLen - 1)] + "…";
    }
}
