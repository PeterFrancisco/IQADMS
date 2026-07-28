using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace IQADMS.API.Services;

public class EmailService
{
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
        var greeting = string.IsNullOrWhiteSpace(recipientDisplayName)
            ? "Hello,"
            : $"Hello {recipientDisplayName.Trim()},";

        var invitedLine = string.IsNullOrWhiteSpace(invitedByDisplayName)
            ? "An IQADMS administrator has invited you to create an account."
            : $"{invitedByDisplayName.Trim()} has invited you to create an IQADMS account.";

        var body = $"""
{greeting}

{invitedLine}

Use this email address when you register:
  {to}

Open the registration page and choose "Register":
  {registerUrl}

Steps:
  1. Enter the email address above.
  2. Choose a username and a strong password.
  3. Sign in and complete your profile.

If you did not expect this message, you can ignore it.

— IQADMS (UPSHD Molino PQAD)
""";

        try
        {
            var smtp = _config.GetSection("SmtpSettings");
            var from = RequireFromAddress(smtp);
            await SendAsync(from, to, "You're invited to IQADMS", body);
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

    private string GetRegisterUrl()
    {
        var baseUrl = _config["App:PublicUrl"]?.Trim().TrimEnd('/');
        if (string.IsNullOrEmpty(baseUrl))
            return "(ask your administrator for the IQADMS website URL, then open Register)";

        return $"{baseUrl}/register";
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

    private async Task SendAsync(string from, string to, string subject, string body)
    {
        var smtp = _config.GetSection("SmtpSettings");
        var host = smtp["Host"]!.Trim();
        var port = int.Parse(smtp["Port"]!);
        var username = smtp["Username"]!.Trim();
        var password = smtp["Password"]!;

        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(from));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

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

    private static string DescribeSendFailure(Exception ex)
    {
        var text = ex.Message;
        for (var inner = ex.InnerException; inner != null; inner = inner.InnerException)
            text += " " + inner.Message;

        if (text.Contains("535", StringComparison.OrdinalIgnoreCase)
            || text.Contains("authentication", StringComparison.OrdinalIgnoreCase)
            || text.Contains("Authentication", StringComparison.Ordinal))
        {
            return "SMTP login failed. For Gmail use an App Password (not your normal password). For Outlook use smtp.office365.com and your M365 password or app password.";
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
