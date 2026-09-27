using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NutriPlan.Application.Common.Interfaces;
using NutriPlan.Application.Dtos;

namespace NutriPlan.Api.Controllers;

[ApiController]
[Route("api/v1/fitness")]
public class FitnessController : ControllerBase
{
    private readonly IFitnessService _fitnessService;
    private readonly ILogger<FitnessController> _logger;

    public FitnessController(IFitnessService fitnessService, ILogger<FitnessController> logger)
    {
        _fitnessService = fitnessService;
        _logger = logger;
    }

    private Guid? GetCurrentUserId()
    {
        var claimValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claimValue, out var guid) ? guid : null;
    }

    /// <summary>
    /// Generates a Connect Widget Session URL to open the device selection window (Apple, Garmin, Fitbit, etc.)
    /// </summary>
    [HttpPost("widget-session")]
    [Authorize]
    public async Task<ActionResult<WidgetSessionResponseDto>> GenerateWidgetSession(
        [FromBody] GenerateWidgetSessionRequestDto? request,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized("Invalid user authentication context.");

        try
        {
            var session = await _fitnessService.GenerateWidgetSessionAsync(userId.Value, request, ct);
            return Ok(session);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate widget session for user {UserId}", userId);
            return StatusCode(500, new { message = "Error initiating device connection session." });
        }
    }

    /// <summary>
    /// Gets all fitness device connections linked to the current user
    /// </summary>
    [HttpGet("connections")]
    [Authorize]
    public async Task<ActionResult<List<FitnessConnectionResponseDto>>> GetConnections(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized("Invalid user context.");

        var connections = await _fitnessService.GetUserConnectionsAsync(userId.Value, ct);
        return Ok(connections);
    }

    /// <summary>
    /// Disconnects a specific fitness wearable integration
    /// </summary>
    [HttpDelete("connections/{connectionId:guid}")]
    [Authorize]
    public async Task<IActionResult> Disconnect(Guid connectionId, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized("Invalid user context.");

        var success = await _fitnessService.DisconnectAsync(userId.Value, connectionId, ct);
        if (!success) return NotFound(new { message = "Connection not found or unauthorized." });

        return Ok(new { message = "Device disconnected successfully." });
    }

    /// <summary>
    /// Returns daily physical activity metrics (steps, calories burned, heart rate, sleep)
    /// </summary>
    [HttpGet("daily-summary")]
    [Authorize]
    public async Task<ActionResult<List<DailyActivitySummaryDto>>> GetDailySummary(
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized("Invalid user context.");

        var defaultFrom = fromDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
        var defaultTo = toDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var activities = await _fitnessService.GetDailyActivitiesAsync(userId.Value, defaultFrom, defaultTo, ct);
        return Ok(activities);
    }

    /// <summary>
    /// Simulation endpoint: Allows testing watch data sync immediately without physical devices
    /// </summary>
    [HttpPost("mock-sync")]
    [Authorize]
    public async Task<ActionResult<DailyActivitySummaryDto>> MockSync(
        [FromBody] MockSyncRequestDto dto,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized("Invalid user context.");

        var result = await _fitnessService.MockSyncActivityAsync(userId.Value, dto, ct);
        return Ok(result);
    }

    /// <summary>
    /// Webhook receiver endpoint for real-time device updates sent by the Aggregator (e.g. Terra)
    /// </summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> WebhookReceiver(CancellationToken ct)
    {
        try
        {
            using var reader = new StreamReader(Request.Body, Encoding.UTF8);
            var payload = await reader.ReadToEndAsync(ct);

            var signatureHeader = Request.Headers["terra-signature"].ToString();
            var success = await _fitnessService.ProcessTerraWebhookAsync(payload, signatureHeader, ct);

            return Ok(new { received = true, processed = success });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing incoming fitness webhook.");
            return StatusCode(500, new { message = "Webhook handling error." });
        }
    }

    /// <summary>
    /// Gets Direct OAuth Authorization URL for free bridges (Strava, Fitbit)
    /// </summary>
    [HttpGet("oauth-url/{provider}")]
    [Authorize]
    public async Task<ActionResult<OAuthUrlResponseDto>> GetOAuthUrl(
        string provider,
        [FromQuery] string redirectUri,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized("Invalid user context.");

        var res = await _fitnessService.GetOAuthUrlAsync(userId.Value, provider, redirectUri, ct);
        return Ok(res);
    }

    /// <summary>
    /// Handles OAuth callback and exchanges code for permanent sync tokens
    /// </summary>
    [HttpPost("oauth-callback/{provider}")]
    [Authorize]
    public async Task<ActionResult<ManualSyncResponseDto>> HandleOAuthCallback(
        string provider,
        [FromBody] OAuthCallbackRequestDto dto,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized("Invalid user context.");

        var res = await _fitnessService.HandleOAuthCallbackAsync(userId.Value, provider, dto.Code, dto.RedirectUri, ct);
        return Ok(res);
    }

    /// <summary>
    /// Manually triggers immediate sync of workout activities / steps
    /// </summary>
    [HttpPost("sync/{provider}")]
    [Authorize]
    public async Task<ActionResult<ManualSyncResponseDto>> TriggerSync(string provider, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized("Invalid user context.");

        var res = await _fitnessService.TriggerDeviceSyncAsync(userId.Value, provider, ct);
        return Ok(res);
    }
}

