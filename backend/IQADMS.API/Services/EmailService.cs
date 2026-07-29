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

        await SendAsync(from, adminEmail, "IQADMS Access Request", body, htmlBody: null, GetFromDisplayName());
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

        var invitedLine = BuildInvitedLine(invitedByDisplayName);

        var fromName = GetFromDisplayName();
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
            await SendAsync(from, to, "Register on IQADMS — PQAD Molino", body, htmlBody, fromName);
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

        var htmlBody = $"""
<p>An IQADMS administrator approved your password reset request.</p>
<p><a href="{resetUrl}">Set a new password</a></p>
<p>This link expires in 24 hours. If you did not request a reset, contact your administrator.</p>
""";

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

    private string BuildInvitedLine(string? invitedByDisplayName)
    {
        var orgLine =
            "You have been invited to join IQADMS for the Planning and Quality Assurance Department (PQAD), University of Perpetual Help System DALTA — Molino Campus.";

        if (string.IsNullOrWhiteSpace(invitedByDisplayName))
            return orgLine;

        var label = invitedByDisplayName.Trim();
        if (label.Contains('@', StringComparison.Ordinal))
            return orgLine;

        return $"{label} (PQAD) has invited you to join IQADMS on the official UPSHD Molino website.";
    }

    private string GetFromDisplayName()
    {
        var name = _config["SmtpSettings:FromName"]?.Trim();
        return string.IsNullOrWhiteSpace(name) ? "IQADMS · PQAD · UPSHD Molino" : name;
    }

    private static string BuildRegistrationInviteHtml(
        string greetingHtml,
        string invitedLine,
        string siteUrl,
        string registerUrl,
        string recipientEmail)
    {
        var logoUrl = $"{siteUrl.TrimEnd('/')}/logo.svg";
        var enc = System.Net.WebUtility.HtmlEncode;
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
              <div style="color:#fecaca;font-size:12px;margin-top:4px;">PQAD · UPSHD Molino Campus</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px;">{greetingHtml}</p>
              <p style="margin:0 0 16px;line-height:1.5;">{enc(invitedLine)}</p>
              <p style="margin:0 0 8px;font-weight:600;">Create your account</p>
              <p style="margin:0 0 20px;">
                <a href="{registerUrl}" style="display:inline-block;background:#7a0019;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Register on IQADMS</a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Official website: <a href="{siteUrl}">{enc(siteUrl)}</a></p>
              <p style="margin:0 0 16px;font-size:13px;">Use this email when you register: <strong>{enc(recipientEmail)}</strong></p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">If you did not expect this invitation, you can ignore this email.</p>
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
        string? fromDisplayName = null)
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
