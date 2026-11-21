using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using IQADMS.API.Models;

namespace IQADMS.API.Services;

public class EmailService
{
    /// <summary>Used when App:PublicUrl is not set in appsettings (pqad).</summary>
    public const string DefaultPublicSiteUrl = "https://iqadms.iotlab-uphsdm.live";

    /// <summary>Default inbox for bug reports and user feedback.</summary>
    public const string DefaultFeedbackEmail = "iqadms.pqad@gmail.com";

    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAccessRequestAsync(
        string fullName,
        string email,
        string department,
        string position,
        string reason)
    {
        var smtp = _config.GetSection("SmtpSettings");
        var from = RequireFromAddress(smtp);
        var adminEmail = smtp["AdminEmail"]?.Trim()
            ?? throw new InvalidOperationException("SMTP AdminEmail is not configured.");

        var body = $@"
A new IQADMS access request has been submitted.

Name: {fullName}
Email: {email}
Department: {department}
Position: {position}

Reason:
{reason}

Please review this request in the admin panel.";

        var settingsUrl = $"{GetPublicSiteUrl().TrimEnd('/')}/settings?section=account&tab=requests";
        var htmlBody = BuildBrandedEmailHtml(
            $"""
<p style="margin:0 0 16px;line-height:1.5;">A new <strong>IQADMS access request</strong> has been submitted.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;font-size:14px;line-height:1.6;">
  <tr><td style="padding:4px 0;color:#64748b;width:110px;vertical-align:top;">Name</td><td style="padding:4px 0;"><strong>{System.Net.WebUtility.HtmlEncode(fullName)}</strong></td></tr>
  <tr><td style="padding:4px 0;color:#64748b;vertical-align:top;">Email</td><td style="padding:4px 0;">{System.Net.WebUtility.HtmlEncode(email)}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;vertical-align:top;">Department</td><td style="padding:4px 0;">{System.Net.WebUtility.HtmlEncode(department)}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;vertical-align:top;">Position</td><td style="padding:4px 0;">{System.Net.WebUtility.HtmlEncode(position)}</td></tr>
</table>
<p style="margin:0 0 8px;font-weight:600;">Reason</p>
<div style="margin:0 0 20px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;white-space:pre-wrap;line-height:1.55;">{System.Net.WebUtility.HtmlEncode(reason)}</div>
<p style="margin:0 0 20px;">
  <a href="{settingsUrl}" style="display:inline-block;background:#7a0019;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Review access requests</a>
</p>
<p style="margin:0;font-size:12px;color:#94a3b8;">Open IQADMS → Settings → Account settings → Access requests.</p>
""");

        await SendAsync(from, adminEmail, "IQADMS Access Request", body, htmlBody, GetFromDisplayName(), replyToEmail: email);
    }

    public async Task<(bool Sent, string? Error)> TrySendPasswordResetRequestToAdminAsync(
        string userEmail,
        string? displayName,
        string? username)
    {
        if (!IsSmtpConfigured(out var configError))
        {
            _logger.LogWarning("Password reset admin notice not sent: {Reason}", configError);
            return (false, configError);
        }

        var smtp = _config.GetSection("SmtpSettings");
        var from = RequireFromAddress(smtp);
        var adminEmail = smtp["AdminEmail"]?.Trim();
        if (string.IsNullOrWhiteSpace(adminEmail))
            return (false, "Set SmtpSettings:AdminEmail.");

        var who = string.IsNullOrWhiteSpace(displayName) ? username : displayName;
        if (string.IsNullOrWhiteSpace(who))
            who = userEmail;

        var body = $"""
An IQADMS user requested a password reset.

User: {who}
Account email: {userEmail}
{(string.IsNullOrWhiteSpace(username) ? "" : $"Username: {username}\n")}

Approve or reject in the admin panel under Settings → Password resets.
""";

        var settingsUrl = $"{GetPublicSiteUrl().TrimEnd('/')}/settings?section=account&tab=password-resets";
        var htmlBody = BuildBrandedEmailHtml(
            $"""
<p style="margin:0 0 16px;line-height:1.5;">An IQADMS user requested a <strong>password reset</strong>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;font-size:14px;line-height:1.6;">
  <tr><td style="padding:4px 0;color:#64748b;width:110px;vertical-align:top;">User</td><td style="padding:4px 0;"><strong>{System.Net.WebUtility.HtmlEncode(who)}</strong></td></tr>
  <tr><td style="padding:4px 0;color:#64748b;vertical-align:top;">Email</td><td style="padding:4px 0;">{System.Net.WebUtility.HtmlEncode(userEmail)}</td></tr>
  {(string.IsNullOrWhiteSpace(username) ? "" : $"<tr><td style=\"padding:4px 0;color:#64748b;vertical-align:top;\">Username</td><td style=\"padding:4px 0;\">{System.Net.WebUtility.HtmlEncode(username)}</td></tr>")}
</table>
<p style="margin:0 0 20px;">
  <a href="{settingsUrl}" style="display:inline-block;background:#7a0019;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Review password resets</a>
</p>
<p style="margin:0;font-size:12px;color:#94a3b8;">IQADMS → Settings → Account settings → Password resets.</p>
""");

        try
        {
            await SendAsync(
                from,
                adminEmail,
                "IQADMS password reset request",
                body,
                htmlBody,
                GetFromDisplayName(),
                replyToEmail: userEmail);
            _logger.LogInformation("Password reset request notice sent to admin {AdminEmail} for {UserEmail}", adminEmail, userEmail);
            return (true, null);
        }
        catch (Exception ex)
        {
            var detail = DescribeSendFailure(ex);
            _logger.LogError(ex, "Failed to send password reset request notice to admin for {UserEmail}", userEmail);
            return (false, detail);
        }
    }

    public async Task<(bool Sent, string? Error)> TrySendRegistrationInviteAsync(
        string recipientEmail,
        string? recipientDisplayName = null)
    {
        if (!IsSmtpConfigured(out var configError))
        {
            _logger.LogWarning("Registration invite not sent to {Email}: {Reason}", recipientEmail, configError);
            return (false, configError);
        }

        var to = recipientEmail.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(to) || !to.Contains('@'))
            return (false, "Invalid recipient email.");

        var registerUrl = GetRegisterUrl();
        var siteUrl = GetPublicSiteUrl();
        var greetingName = ResolveInviteRecipientGreeting(to, recipientDisplayName);
        var greetingPlain = FormatGreetingPlain(greetingName);
        var greetingHtml = FormatGreetingHtml(greetingName);

        const string invitedLine =
            "An IQADMS administrator has invited you to create your account and join IQADMS.";

        var fromName = GetFromDisplayName();
        var body = $"""
{greetingPlain}

{invitedLine}

IQADMS website:
  {siteUrl}

Create your account (registration page):
  {registerUrl}

Use this email address when you register:
  {to}

How to register:
  1. Open the registration link above (or the website, then choose Register).
  2. Enter the email address shown here.
  3. Choose a username and a strong password, then complete your profile.
  4. Sign in at the same website when you are done.

If you did not expect this invitation, you can safely ignore this email.

— IQADMS
""";

        var htmlBody = BuildRegistrationInviteHtml(
            greetingHtml,
            invitedLine,
            siteUrl,
            registerUrl,
            to);

        try
        {
            var smtp = _config.GetSection("SmtpSettings");
            var from = RequireFromAddress(smtp);
            await SendAsync(from, to, "Register on IQADMS", body, htmlBody, fromName);
            _logger.LogInformation("Registration invite sent to {Email}", to);
            return (true, null);
        }
        catch (Exception ex)
        {
            var detail = DescribeSendFailure(ex);
            _logger.LogError(ex, "Failed to send registration invite to {Email}", to);
            return (false, detail);
        }
    }

    public async Task<(bool Sent, string? Error)> TrySendPasswordResetEmailAsync(string recipientEmail, string resetUrl)
    {
        if (!IsSmtpConfigured(out var configError))
            return (false, configError);

        var to = recipientEmail.Trim();
        if (string.IsNullOrWhiteSpace(to) || !to.Contains('@'))
            return (false, "Invalid recipient email.");

        var body = $"""
An IQADMS administrator approved your password reset request.

Open this link to choose a new password (valid for 24 hours):
  {resetUrl}

If you did not request a reset, contact your administrator.

— IQADMS · PQAD · UPSHD Molino
""";

        var htmlBody = BuildBrandedEmailHtml(
            $"""
<p style="margin:0 0 16px;line-height:1.5;">An IQADMS administrator approved your password reset request.</p>
<p style="margin:0 0 20px;">
  <a href="{resetUrl}" style="display:inline-block;background:#7a0019;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Set a new password</a>
</p>
<p style="margin:0;font-size:12px;color:#94a3b8;">This link expires in 24 hours. If you did not request a reset, contact your administrator.</p>
""");

        try
        {
            var smtp = _config.GetSection("SmtpSettings");
            var from = RequireFromAddress(smtp);
            await SendAsync(from, to, "IQADMS password reset", body, htmlBody, GetFromDisplayName());
            return (true, null);
        }
        catch (Exception ex)
        {
            var detail = DescribeSendFailure(ex);
            _logger.LogError(ex, "Failed to send password reset email to {Email}", to);
            return (false, detail);
        }
    }

    private string GetResetPasswordUrl(string token) =>
        $"{GetPublicSiteUrl()}/reset-password?token={Uri.EscapeDataString(token)}";

    public string BuildResetPasswordUrl(string token) => GetResetPasswordUrl(token);

    public async Task<(bool Sent, string? Error)> TrySendTestEmailAsync(string? toEmail = null)
    {
        if (!IsSmtpConfigured(out var configError))
            return (false, configError);

        var smtp = _config.GetSection("SmtpSettings");
        var from = RequireFromAddress(smtp);
        var to = (toEmail ?? smtp["AdminEmail"])?.Trim();
        if (string.IsNullOrWhiteSpace(to))
            return (false, "Set SmtpSettings:AdminEmail or pass a recipient address.");

        try
        {
            await SendAsync(
                from,
                to,
                "IQADMS SMTP test",
                "If you received this message, SMTP is configured correctly for IQADMS.",
                htmlBody: null,
                GetFromDisplayName());
            return (true, null);
        }
        catch (Exception ex)
        {
            var detail = DescribeSendFailure(ex);
            _logger.LogError(ex, "SMTP test email failed to {Email}", to);
            return (false, detail);
        }
    }

    private string GetRegisterUrl() => $"{GetPublicSiteUrl()}/register";

    private string GetPublicSiteUrl()
    {
        var baseUrl = _config["App:PublicUrl"]?.Trim().TrimEnd('/');
        if (!string.IsNullOrEmpty(baseUrl))
            return baseUrl;

        _logger.LogWarning(
            "App:PublicUrl is not set; using default {DefaultUrl} in registration invite emails.",
            DefaultPublicSiteUrl);
        return DefaultPublicSiteUrl;
    }

    private bool IsSmtpConfigured(out string? error)
    {
        var smtp = _config.GetSection("SmtpSettings");
        if (string.IsNullOrWhiteSpace(smtp["Host"]))
        {
            error = "SMTP Host is not configured in appsettings.json.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(smtp["Port"]) || !int.TryParse(smtp["Port"], out var port) || port <= 0)
        {
            error = "SMTP Port is missing or invalid (use 587 for Gmail/Outlook).";
            return false;
        }

        if (string.IsNullOrWhiteSpace(smtp["From"]))
        {
            error = "SMTP From is not configured.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(smtp["Username"]) || string.IsNullOrWhiteSpace(smtp["Password"]))
        {
            error = "SMTP Username or Password is empty on the server. Edit backend/IQADMS.API/appsettings.json on pqad.";
            return false;
        }

        if (NormalizeSmtpPassword(smtp["Password"]).Length < 8)
        {
            error = "SMTP Password looks too short after trimming spaces. For Gmail use a 16-character App Password.";
            return false;
        }

        var from = smtp["From"]!.Trim();
        var user = smtp["Username"]!.Trim();
        if (!from.Equals(user, StringComparison.OrdinalIgnoreCase)
            && smtp["Host"]!.Contains("gmail", StringComparison.OrdinalIgnoreCase))
        {
            error = "For Gmail, SmtpSettings:From must match SmtpSettings:Username.";
            return false;
        }

        error = null;
        return true;
    }

    private static string RequireFromAddress(IConfigurationSection smtp) =>
        smtp["From"]?.Trim() ?? throw new InvalidOperationException("SMTP From is not configured.");

    /// <summary>Best-effort greeting from the email local part (e.g. maria.santos@… → Maria Santos).</summary>
    public static string? DeriveGreetingNameFromEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 0)
            return null;

        var local = email[..at].Trim();
        if (local.Length == 0)
            return null;

        var plus = local.IndexOf('+');
        if (plus > 0)
            local = local[..plus];

        var parts = local.Split(new[] { '.', '_', '-', ' ' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0)
            return null;

        var words = new List<string>();
        foreach (var part in parts)
        {
            if (part.All(char.IsDigit))
                continue;

            if (part.Length == 1)
            {
                words.Add(part.ToUpperInvariant());
                continue;
            }

            words.Add(char.ToUpperInvariant(part[0]) + part[1..].ToLowerInvariant());
        }

        return words.Count == 0 ? null : string.Join(' ', words);
    }

    private static string? ResolveGreetingName(string? explicitName, string email)
    {
        if (!string.IsNullOrWhiteSpace(explicitName))
            return explicitName.Trim();

        return DeriveGreetingNameFromEmail(email);
    }

    private static string FormatGreetingPlain(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "Hello," : $"Hello {name.Trim()},";

    private static string FormatGreetingHtml(string? name) =>
        string.IsNullOrWhiteSpace(name)
            ? "Hello,"
            : $"Hello {System.Net.WebUtility.HtmlEncode(name.Trim())},";

    private string GetFromDisplayName()
    {
        var name = _config["SmtpSettings:FromName"]?.Trim();
        return string.IsNullOrWhiteSpace(name) ? "IQADMS · PQAD" : name;
    }

    public string PublicSenderName => GetFromDisplayName();

    private string BuildBrandedEmailHtml(string contentHtml, string? headerSubtitle = null)
    {
        var siteUrl = GetPublicSiteUrl().TrimEnd('/');
        var logoUrl = $"{siteUrl}/logo.svg";
        var subtitle = string.IsNullOrWhiteSpace(headerSubtitle)
            ? "Planning &amp; Quality Assurance Department"
            : System.Net.WebUtility.HtmlEncode(headerSubtitle);

        return $"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,system-ui,sans-serif;color:#334155;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background:#7a0019;padding:20px 24px;text-align:center;">
              <img src="{logoUrl}" alt="IQADMS" width="56" height="56" style="display:block;margin:0 auto 12px;" />
              <div style="color:#ffffff;font-size:18px;font-weight:700;">IQADMS</div>
              <div style="color:#fecaca;font-size:12px;margin-top:4px;">{subtitle}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              {contentHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""";
    }

    private static string BuildRegistrationInviteHtml(
        string greetingHtml,
        string invitedLine,
        string siteUrl,
        string registerUrl,
        string recipientEmail)
    {
        var content = $"""
<p style="margin:0 0 12px;">{greetingHtml}</p>
<p style="margin:0 0 16px;line-height:1.5;">{System.Net.WebUtility.HtmlEncode(invitedLine)}</p>
<p style="margin:0 0 8px;font-weight:600;">Create your account</p>
<p style="margin:0 0 20px;">
  <a href="{registerUrl}" style="display:inline-block;background:#7a0019;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Register on IQADMS</a>
</p>
<p style="margin:0 0 8px;font-size:13px;color:#64748b;">IQADMS website: <a href="{siteUrl}">{System.Net.WebUtility.HtmlEncode(siteUrl)}</a></p>
<p style="margin:0 0 16px;font-size:13px;">Use this email when you register: <strong>{System.Net.WebUtility.HtmlEncode(recipientEmail)}</strong></p>
<p style="margin:0;font-size:12px;color:#94a3b8;">If you did not expect this invitation, you can ignore this email.</p>
""";

        // Static helper — inline branded shell (same layout as instance BuildBrandedEmailHtml).
        var logoUrl = $"{siteUrl.TrimEnd('/')}/logo.svg";
        return $"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,system-ui,sans-serif;color:#334155;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background:#7a0019;padding:20px 24px;text-align:center;">
              <img src="{logoUrl}" alt="IQADMS" width="56" height="56" style="display:block;margin:0 auto 12px;" />
              <div style="color:#ffffff;font-size:18px;font-weight:700;">IQADMS</div>
              <div style="color:#fecaca;font-size:12px;margin-top:4px;">Planning &amp; Quality Assurance Department</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              {content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""";
    }

    private async Task SendAsync(
        string from,
        string to,
        string subject,
        string body,
        string? htmlBody = null,
        string? fromDisplayName = null,
        string? replyToEmail = null)
    {
        var smtp = _config.GetSection("SmtpSettings");
        var host = smtp["Host"]!.Trim();
        var port = int.Parse(smtp["Port"]!);
        var username = smtp["Username"]!.Trim();
        var password = NormalizeSmtpPassword(smtp["Password"]);

        var message = new MimeMessage();
        if (!string.IsNullOrWhiteSpace(fromDisplayName))
            message.From.Add(new MailboxAddress(fromDisplayName, from));
        else
            message.From.Add(MailboxAddress.Parse(from));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;

        var replyTo = replyToEmail?.Trim()
            ?? smtp["ReplyTo"]?.Trim()
            ?? smtp["AdminEmail"]?.Trim();
        if (!string.IsNullOrWhiteSpace(replyTo) &&
            !string.Equals(replyTo, to, StringComparison.OrdinalIgnoreCase))
        {
            message.ReplyTo.Add(MailboxAddress.Parse(replyTo));
        }

        if (!string.IsNullOrWhiteSpace(htmlBody))
        {
            var builder = new BodyBuilder
            {
                TextBody = body,
                HtmlBody = htmlBody
            };
            message.Body = builder.ToMessageBody();
        }
        else
        {
            message.Body = new TextPart("plain") { Text = body };
        }

        using var client = new SmtpClient();
        client.Timeout = 30_000;

        var socketOptions = ResolveSocketOptions(smtp, port);
        await client.ConnectAsync(host, port, socketOptions);
        await client.AuthenticateAsync(username, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    private static SecureSocketOptions ResolveSocketOptions(IConfigurationSection smtp, int port)
    {
        var mode = smtp["Security"]?.Trim();
        if (string.Equals(mode, "None", StringComparison.OrdinalIgnoreCase))
            return SecureSocketOptions.None;
        if (string.Equals(mode, "Ssl", StringComparison.OrdinalIgnoreCase) || port == 465)
            return SecureSocketOptions.SslOnConnect;
        if (string.Equals(mode, "StartTls", StringComparison.OrdinalIgnoreCase) || port == 587)
            return SecureSocketOptions.StartTls;

        return SecureSocketOptions.Auto;
    }

    public object GetSmtpConfigSummary()
    {
        var smtp = _config.GetSection("SmtpSettings");
        var password = smtp["Password"];
        var normalizedLen = NormalizeSmtpPassword(password).Length;

        return new
        {
            host = smtp["Host"]?.Trim(),
            port = smtp["Port"]?.Trim(),
            security = smtp["Security"]?.Trim(),
            username = smtp["Username"]?.Trim(),
            from = smtp["From"]?.Trim(),
            fromName = GetFromDisplayName(),
            adminEmail = smtp["AdminEmail"]?.Trim(),
            feedbackEmail = GetFeedbackEmail(),
            passwordConfigured = normalizedLen > 0,
            passwordLength = normalizedLen,
            gmailFromMatchesUsername = string.Equals(
                smtp["From"]?.Trim(),
                smtp["Username"]?.Trim(),
                StringComparison.OrdinalIgnoreCase),
            note = "SMTP uses appsettings.json on the machine running dotnet run (pqad). IQADMS login passwords are unrelated.",
            publicUrl = GetPublicSiteUrl(),
            registerUrl = GetRegisterUrl()
        };
    }

    public object GetInviteLinkPreview() => new
    {
        publicUrl = GetPublicSiteUrl(),
        registerUrl = GetRegisterUrl()
    };

    public static string FormatPersonName(string? displayName, string? username, string email)
    {
        if (!string.IsNullOrWhiteSpace(displayName))
            return displayName.Trim();
        if (!string.IsNullOrWhiteSpace(username))
            return username.Trim();
        return email.Trim();
    }

    /// <summary>Sender line in task emails — never expose personal admin usernames (e.g. Jp).</summary>
    public string FormatEmailActorName(User actor)
    {
        if (actor.IsAdmin)
            return GetFromDisplayName();

        if (!string.IsNullOrWhiteSpace(actor.DisplayName))
            return actor.DisplayName.Trim();

        var fromEmail = DeriveGreetingNameFromEmail(actor.Email);
        if (!string.IsNullOrWhiteSpace(fromEmail))
            return fromEmail;

        return FormatPersonName(actor.DisplayName, actor.Username, actor.Email);
    }

    /// <summary>Greeting for registration invites — derived from recipient email, not admin profile.</summary>
    public static string? ResolveInviteRecipientGreeting(string email, string? explicitName = null)
    {
        if (!string.IsNullOrWhiteSpace(explicitName))
            return explicitName.Trim();

        return DeriveGreetingNameFromEmail(email);
    }

    public string BuildTaskLink(Guid taskId, Guid? projectId)
    {
        var baseUrl = GetPublicSiteUrl().TrimEnd('/');
        var query = $"task={taskId}";
        if (projectId.HasValue)
            query += $"&project={projectId.Value}";
        return $"{baseUrl}/my-tasks?{query}";
    }

    public async Task<(bool Sent, string? Error)> TrySendTaskAssignedEmailAsync(
        string assigneeEmail,
        string assigneeGreetingName,
        string actorName,
        string taskTitle,
        string? taskDescription,
        string? projectTitle,
        DateOnly? dueDate,
        string taskLink,
        string? regardsName = null)
    {
        if (!IsSmtpConfigured(out var configError))
        {
            _logger.LogWarning(
                "Task assigned email not sent to {Email}: {Reason}",
                assigneeEmail,
                configError);
            return (false, configError);
        }

        if (string.IsNullOrWhiteSpace(assigneeEmail))
        {
            const string msg = "Assignee has no email address on their IQADMS profile.";
            _logger.LogWarning("Task assigned email skipped: {Reason}", msg);
            return (false, msg);
        }

        var to = assigneeEmail.Trim();

        var dueLine = dueDate.HasValue ? dueDate.Value.ToString("yyyy-MM-dd") : "Not set";
        var projectLine = string.IsNullOrWhiteSpace(projectTitle) ? "—" : projectTitle.Trim();
        var details = string.IsNullOrWhiteSpace(taskDescription)
            ? "(No additional details.)"
            : taskDescription.Trim();

        var signOff = regardsName ?? actorName;

        var body = $"""
Hello {assigneeGreetingName},

{actorName} has assigned a task to you. Please review and comply.

Task: {taskTitle}
Project: {projectLine}
Due date: {dueLine}

Details:
{details}

Open task: {taskLink}

Regards,
{signOff}
IQADMS
""";

        var htmlBody = BuildTaskActionHtml(
            $"Hello {System.Net.WebUtility.HtmlEncode(assigneeGreetingName)},",
            $"<p><strong>{System.Net.WebUtility.HtmlEncode(actorName)}</strong> has assigned a task to you. Please review and comply.</p>" +
            $"<p><strong>Task:</strong> {System.Net.WebUtility.HtmlEncode(taskTitle)}<br />" +
            $"<strong>Project:</strong> {System.Net.WebUtility.HtmlEncode(projectLine)}<br />" +
            $"<strong>Due date:</strong> {System.Net.WebUtility.HtmlEncode(dueLine)}</p>" +
            $"<p><strong>Details:</strong><br />{System.Net.WebUtility.HtmlEncode(details).Replace("\n", "<br />")}</p>" +
            $"""<p><a href="{taskLink}" style="display:inline-block;background:#7a0019;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">Open task</a></p>""",
            regardsName ?? actorName);

        try
        {
            var smtp = _config.GetSection("SmtpSettings");
            var from = RequireFromAddress(smtp);
            await SendAsync(
                from,
                to,
                "IQADMS — New task assigned",
                body,
                htmlBody,
                GetFromDisplayName());
            _logger.LogInformation("Task assigned email sent to {Email} for task {TaskTitle}", to, taskTitle);
            return (true, null);
        }
        catch (Exception ex)
        {
            var detail = DescribeSendFailure(ex);
            _logger.LogWarning(ex, "Task assigned email failed for {Email}", to);
            return (false, detail);
        }
    }

    public async Task<(bool Sent, string? Error)> TrySendTaskSubmittedEmailAsync(
        string adminEmail,
        string adminGreetingName,
        string assigneeName,
        string submitterName,
        string taskTitle,
        string? projectTitle,
        string taskLink)
    {
        if (!IsSmtpConfigured(out var configError))
        {
            _logger.LogWarning(
                "Task submitted email not sent to {Email}: {Reason}",
                adminEmail,
                configError);
            return (false, configError);
        }

        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            const string msg = "Admin has no email address on their IQADMS profile.";
            _logger.LogWarning("Task submitted email skipped: {Reason}", msg);
            return (false, msg);
        }

        var to = adminEmail.Trim();

        var projectLine = string.IsNullOrWhiteSpace(projectTitle) ? "—" : projectTitle.Trim();

        var body = $"""
Hello {adminGreetingName},

The task "{taskTitle}" assigned to {assigneeName} has been submitted and is waiting for your review. Please check for revisions or approve the submission.

Project: {projectLine}
Submitted by: {submitterName}

Review task: {taskLink}

Regards,
IQADMS
""";

        var htmlBody = BuildTaskActionHtml(
            $"Hello {System.Net.WebUtility.HtmlEncode(adminGreetingName)},",
            $"<p>The task <strong>{System.Net.WebUtility.HtmlEncode(taskTitle)}</strong> assigned to " +
            $"<strong>{System.Net.WebUtility.HtmlEncode(assigneeName)}</strong> has been submitted and is waiting for your review. " +
            "Please check for revisions or approve the submission.</p>" +
            $"<p><strong>Project:</strong> {System.Net.WebUtility.HtmlEncode(projectLine)}<br />" +
            $"<strong>Submitted by:</strong> {System.Net.WebUtility.HtmlEncode(submitterName)}</p>" +
            $"""<p><a href="{taskLink}" style="display:inline-block;background:#7a0019;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">Review task</a></p>""",
            null);

        try
        {
            var smtp = _config.GetSection("SmtpSettings");
            var from = RequireFromAddress(smtp);
            await SendAsync(
                from,
                to,
                "IQADMS — Task submitted for review",
                body,
                htmlBody,
                GetFromDisplayName());
            _logger.LogInformation("Task submitted email sent to {Email} for task {TaskTitle}", to, taskTitle);
            return (true, null);
        }
        catch (Exception ex)
        {
            var detail = DescribeSendFailure(ex);
            _logger.LogWarning(ex, "Task submitted email failed for {Email}", to);
            return (false, detail);
        }
    }

    public async Task<(bool Sent, string? Error)> TrySendTaskAttachmentEmailAsync(
        string recipientEmail,
        string recipientGreeting,
        string actorName,
        string taskTitle,
        string fileName,
        string? projectTitle,
        string taskLink,
        bool notifyAdmins)
    {
        if (!IsSmtpConfigured(out var configError))
        {
            _logger.LogWarning("Task attachment email not sent: {Reason}", configError);
            return (false, configError);
        }

        if (string.IsNullOrWhiteSpace(recipientEmail))
            return (false, "Recipient has no email address.");

        var to = recipientEmail.Trim();
        var projectLine = string.IsNullOrWhiteSpace(projectTitle) ? "—" : projectTitle.Trim();
        var subject = notifyAdmins
            ? "IQADMS — Task file uploaded"
            : "IQADMS — Reference file on your task";
        var intro = notifyAdmins
            ? $"<strong>{System.Net.WebUtility.HtmlEncode(actorName)}</strong> uploaded a file on a task assigned to them."
            : $"<strong>{System.Net.WebUtility.HtmlEncode(actorName)}</strong> added a reference file to your task.";

        var body = $"""
Hello {recipientGreeting},

{(notifyAdmins ? $"{actorName} uploaded a file on a task." : $"{actorName} added a reference file to your task.")}

Task: {taskTitle}
Project: {projectLine}
File: {fileName}

Open task: {taskLink}

Regards,
IQADMS
""";

        var htmlBody = BuildTaskActionHtml(
            $"Hello {System.Net.WebUtility.HtmlEncode(recipientGreeting)},",
            $"<p>{intro}</p>" +
            $"<p><strong>Task:</strong> {System.Net.WebUtility.HtmlEncode(taskTitle)}<br />" +
            $"<strong>Project:</strong> {System.Net.WebUtility.HtmlEncode(projectLine)}<br />" +
            $"<strong>File:</strong> {System.Net.WebUtility.HtmlEncode(fileName)}</p>" +
            $"""<p><a href="{taskLink}" style="display:inline-block;background:#7a0019;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">Open task</a></p>""",
            null);

        try
        {
            var smtp = _config.GetSection("SmtpSettings");
            var from = RequireFromAddress(smtp);
            await SendAsync(from, to, subject, body, htmlBody, GetFromDisplayName());
            _logger.LogInformation("Task attachment email sent to {Email} for {TaskTitle}", to, taskTitle);
            return (true, null);
        }
        catch (Exception ex)
        {
            var detail = DescribeSendFailure(ex);
            _logger.LogWarning(ex, "Task attachment email failed for {Email}", to);
            return (false, detail);
        }
    }

    private string BuildTaskActionHtml(string greetingHtml, string bodyHtml, string? regardsName)
    {
        var regards = string.IsNullOrWhiteSpace(regardsName)
            ? "<p style=\"margin:16px 0 0;\">Regards,<br />IQADMS</p>"
            : $"<p style=\"margin:16px 0 0;\">Regards,<br />{System.Net.WebUtility.HtmlEncode(regardsName)}<br />IQADMS</p>";

        return BuildBrandedEmailHtml(
            $"<p style=\"margin:0 0 12px;\">{greetingHtml}</p>{bodyHtml}{regards}");
    }

    public string GetFeedbackEmail()
    {
        var smtp = _config.GetSection("SmtpSettings");
        return smtp["FeedbackEmail"]?.Trim() ?? DefaultFeedbackEmail;
    }

    public async Task<(bool Sent, string? Error)> TrySendFeedbackReportAsync(
        string reporterName,
        string reporterEmail,
        string reporterUsername,
        string type,
        string message)
    {
        if (!IsSmtpConfigured(out var configError))
        {
            _logger.LogWarning("Feedback email not sent: {Reason}", configError);
            return (false, configError);
        }

        var to = GetFeedbackEmail();
        var typeLabel = string.Equals(type, "bug", StringComparison.OrdinalIgnoreCase)
            ? "Bug report"
            : "Feedback";
        var subject = $"IQADMS {typeLabel} from {reporterUsername}";

        var body = $"""
A new IQADMS {typeLabel.ToLowerInvariant()} was submitted.

From: {reporterName} (@{reporterUsername})
Email: {reporterEmail}
Type: {typeLabel}

Message:
{message}

Review in IQADMS under Settings → Account settings → Submitted reports (admin).

— IQADMS
""";

        var settingsUrl = $"{GetPublicSiteUrl().TrimEnd('/')}/settings?section=account&tab=feedback";
        var typeBadgeColor = string.Equals(type, "bug", StringComparison.OrdinalIgnoreCase) ? "#b91c1c" : "#7a0019";
        var htmlBody = BuildBrandedEmailHtml(
            $"""
<p style="margin:0 0 16px;line-height:1.5;">A new <span style="display:inline-block;background:{typeBadgeColor};color:#fff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;vertical-align:middle;">{System.Net.WebUtility.HtmlEncode(typeLabel)}</span> was submitted through IQADMS.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;font-size:14px;line-height:1.6;">
  <tr><td style="padding:4px 0;color:#64748b;width:110px;vertical-align:top;">From</td><td style="padding:4px 0;"><strong>{System.Net.WebUtility.HtmlEncode(reporterName)}</strong> (@{System.Net.WebUtility.HtmlEncode(reporterUsername)})</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;vertical-align:top;">Email</td><td style="padding:4px 0;"><a href="mailto:{System.Net.WebUtility.HtmlEncode(reporterEmail)}">{System.Net.WebUtility.HtmlEncode(reporterEmail)}</a></td></tr>
  <tr><td style="padding:4px 0;color:#64748b;vertical-align:top;">Type</td><td style="padding:4px 0;">{System.Net.WebUtility.HtmlEncode(typeLabel)}</td></tr>
</table>
<p style="margin:0 0 8px;font-weight:600;">Message</p>
<div style="margin:0 0 20px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;white-space:pre-wrap;line-height:1.55;">{System.Net.WebUtility.HtmlEncode(message)}</div>
<p style="margin:0 0 20px;">
  <a href="{settingsUrl}" style="display:inline-block;background:#7a0019;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">View submitted reports</a>
</p>
<p style="margin:0;font-size:12px;color:#94a3b8;">Open IQADMS → Settings → Account settings → Submitted reports. Reply to this email to reach the user who sent the report.</p>
""");

        try
        {
            var smtp = _config.GetSection("SmtpSettings");
            var from = RequireFromAddress(smtp);
            await SendAsync(from, to, subject, body, htmlBody, GetFromDisplayName(), replyToEmail: reporterEmail);
            _logger.LogInformation("Feedback email sent to {Email} ({Type})", to, typeLabel);
            return (true, null);
        }
        catch (Exception ex)
        {
            var detail = DescribeSendFailure(ex);
            _logger.LogWarning(ex, "Feedback email failed to {Email}", to);
            return (false, detail);
        }
    }

    private static string NormalizeSmtpPassword(string? password) =>
        (password ?? string.Empty).Replace(" ", string.Empty).Trim();

    private static string DescribeSendFailure(Exception ex)
    {
        var text = ex.Message;
        for (var inner = ex.InnerException; inner != null; inner = inner.InnerException)
            text += " " + inner.Message;

        if (text.Contains("535", StringComparison.OrdinalIgnoreCase)
            || text.Contains("authentication", StringComparison.OrdinalIgnoreCase)
            || text.Contains("Authentication", StringComparison.Ordinal))
        {
            return "SMTP login failed. Use an App Password for the same Gmail as Username/From (create at Google Account → Security → App passwords). Remove spaces from the 16-character password in appsettings.json on pqad, then restart dotnet run. IQADMS registration password is not used for SMTP.";
        }

        if (text.Contains("timed out", StringComparison.OrdinalIgnoreCase)
            || text.Contains("connection", StringComparison.OrdinalIgnoreCase)
            || text.Contains("refused", StringComparison.OrdinalIgnoreCase))
        {
            return "Cannot reach the mail server (timeout or blocked). On pqad, ensure outbound port 587 is allowed, or try port 465 with Security: Ssl in appsettings.";
        }

        if (text.Length > 220)
            text = text[..220] + "…";

        return $"Mail send failed: {text}";
    }
}
