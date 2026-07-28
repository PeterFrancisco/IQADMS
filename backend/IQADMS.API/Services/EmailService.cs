using System.Net;
using System.Net.Mail;

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

    /// <summary>
    /// Sends a registration invite to the invited user's inbox (Gmail, Outlook, etc.).
    /// Returns false if SMTP is not configured or send fails (user may still be added in the database).
    /// </summary>
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
            _logger.LogError(ex, "Failed to send registration invite to {Email}", to);
            return (false, "Could not send email. Check SMTP settings on the server.");
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
            error = "SMTP Host is not configured.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(smtp["Port"]))
        {
            error = "SMTP Port is not configured.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(smtp["From"]))
        {
            error = "SMTP From is not configured.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(smtp["Username"]) || string.IsNullOrWhiteSpace(smtp["Password"]))
        {
            error = "SMTP username or password is not configured.";
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
        using var client = CreateSmtpClient(smtp);
        using var message = new MailMessage(from, to, subject, body);
        await client.SendMailAsync(message);
    }

    private static SmtpClient CreateSmtpClient(IConfigurationSection smtp)
    {
        return new SmtpClient(smtp["Host"]!, int.Parse(smtp["Port"]!))
        {
            Credentials = new NetworkCredential(smtp["Username"], smtp["Password"]),
            EnableSsl = true
        };
    }
}
