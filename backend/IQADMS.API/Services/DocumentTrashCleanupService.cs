namespace IQADMS.API.Services;

public class DocumentTrashCleanupService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<DocumentTrashCleanupService> _logger;

    public DocumentTrashCleanupService(IServiceProvider services, ILogger<DocumentTrashCleanupService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var submissionService = scope.ServiceProvider.GetRequiredService<SubmissionService>();
                var purged = await submissionService.PurgeExpiredTrashAsync();
                if (purged > 0)
                    _logger.LogInformation("Purged {Count} expired document(s) from trash.", purged);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Document trash purge failed.");
            }

            await Task.Delay(TimeSpan.FromHours(12), stoppingToken);
        }
    }
}
