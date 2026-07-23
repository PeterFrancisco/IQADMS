using System.Net;
using System.Net.Mail;

namespace IQADMS.API.Services;

public class EmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendAccessRequestAsync(
        string fullName,
        string email,
        string department,
        string position,
        string reason)
    {
        var smtp = _config.GetSection("SmtpSettings");

        using var client = new SmtpClient(smtp["Host"], int.Parse(smtp["Port"]!))
        {
            Credentials = new NetworkCredential(
                smtp["Username"],
                smtp["Password"]),
            EnableSsl = true
        };

        var body = $@"
A new IQADMS access request has been submitted.

Name: {fullName}
Email: {email}
Department: {department}
Position: {position}

Reason:
{reason}

Please review this request in the admin panel.";

        var from = smtp["From"] ?? throw new Exception("SMTP From is not configured.");
        var adminEmail = smtp["AdminEmail"] ?? throw new Exception("SMTP AdminEmail is not configured.");

        var message = new MailMessage(
            from,
            adminEmail,
            "IQADMS Access Request",
            body);

        await client.SendMailAsync(message);
    }
}