using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace IQADMS.API.Services;

public class EmailService
{
    /// <summary>Used when App:PublicUrl is not set in appsettings (pqad).</summary>
    public const string DefaultPublicSiteUrl = "https://iqadms.iotlab-uphsdm.live";

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

        await SendAsync(from, adminEmail, "IQADMS Access Request", body);
    }

    public async Task<(bool Sent, string? Error)> TrySendRegistrationInviteAsync(
        string recipientEmail,
        string? invitedByDisplayName = null,
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
        var greetingPlain = string.IsNullOrWhiteSpace(recipientDisplayName)
            ? "Hello,"
            : $"Hello {recipientDisplayName.Trim()},";
        var greetingHtml = string.IsNullOrWhiteSpace(recipientDisplayName)
            ? "Hello,"
            : $"Hello {System.Net.WebUtility.HtmlEncode(recipientDisplayName.Trim())},";

        var invitedLine = string.IsNullOrWhiteSpace(invitedByDisplayName)
            ? "You have been invited to join IQADMS for the Planning and Quality Assurance Department (PQAD), University of Perpetual Help System DALTA — Molino Campus."
            : $"{invitedByDisplayName.Trim()} has invited you to join IQADMS (PQAD · UPSHD Molino).";

        var body = $"""
{greetingPlain}

{invitedLine}

Official IQADMS website:
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

— IQADMS · PQAD · UPSHD Molino
""";

        var htmlBody = $"""
<p>{greetingHtml}</p>
<p>{System.Net.WebUtility.HtmlEncode(invitedLine)}</p>
<p><strong>Official IQADMS website:</strong><br />
<a href="{siteUrl}">{System.Net.WebUtility.HtmlEncode(siteUrl)}</a></p>
<p><strong>Create your account:</strong><br />
<a href="{registerUrl}">{System.Net.WebUtility.HtmlEncode(registerUrl)}</a></p>
<p>Use this email address when you register:<br />
<code>{System.Net.WebUtility.HtmlEncode(to)}</code></p>
<ol>
  <li>Open the registration link above.</li>
  <li>Enter the email address shown here.</li>
  <li>Choose a username and a strong password, then complete your profile.</li>
  <li>Sign in at the same website when you are done.</li>
</ol>
<p>If you did not expect this invitation, you can safely ignore this email.</p>
<p>— IQADMS · PQAD · UPSHD Molino</p>
""";

        try
        {
            var smtp = _config.GetSection("SmtpSettings");
            var from = RequireFromAddress(smtp);
            await SendAsync(from, to, "Register on IQADMS — PQAD Molino", body, htmlBody);
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
                "If you received this message, SMTP is configured correctly for IQADMS.");
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

    private async Task SendAsync(string from, string to, string subject, string body, string? htmlBody = null)
    {
        var smtp = _config.GetSection("SmtpSettings");
        var host = smtp["Host"]!.Trim();
        var port = int.Parse(smtp["Port"]!);
        var username = smtp["Username"]!.Trim();
        var password = NormalizeSmtpPassword(smtp["Password"]);

        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(from));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;

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
            adminEmail = smtp["AdminEmail"]?.Trim(),
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
