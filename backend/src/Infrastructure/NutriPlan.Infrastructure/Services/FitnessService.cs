using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NutriPlan.Application.Common.Interfaces;
using NutriPlan.Application.Dtos;
using NutriPlan.Domain.Entities;

namespace NutriPlan.Infrastructure.Services;

public class FitnessService : IFitnessService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FitnessService> _logger;
    private readonly IFitnessConnectionRepository _connectionRepo;
    private readonly IDailyActivityRepository _activityRepo;
    private readonly IUnitOfWork _unitOfWork;

    public FitnessService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<FitnessService> logger,
        IFitnessConnectionRepository connectionRepo,
        IDailyActivityRepository activityRepo,
        IUnitOfWork unitOfWork)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
        _connectionRepo = connectionRepo;
        _activityRepo = activityRepo;
        _unitOfWork = unitOfWork;
    }

    public async Task<WidgetSessionResponseDto> GenerateWidgetSessionAsync(
        Guid userId,
        GenerateWidgetSessionRequestDto? request = null,
        CancellationToken ct = default)
    {
        var apiKey = GetConfigValue("TERRA_API_KEY", "Terra:ApiKey");
        var devId = GetConfigValue("TERRA_DEV_ID", "Terra:DevId");

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(devId) || apiKey.Contains("YOUR_"))
        {
            _logger.LogWarning("Terra API Key or Dev ID not configured. Generating simulated Sandbox Widget Session for user {UserId}.", userId);
            
            var mockSessionId = Guid.NewGuid().ToString("N");
            return new WidgetSessionResponseDto(
                Status: "sandbox_mode",
                Url: $"https://widget.tryterra.co/session-mock?reference_id={userId}&session_id={mockSessionId}",
                SessionId: mockSessionId
            );
        }

        try
        {
            var requestBody = new
            {
                reference_id = userId.ToString(),
                providers = request?.Providers ?? new List<string> { "GARMIN", "FITBIT", "APPLE", "SAMSUNG", "OURA", "WHOOP", "GOOGLE" },
                language = request?.Language ?? "en",
                auth_success_redirect_url = _configuration["Terra:SuccessRedirectUrl"] ?? "https://nutri-plan-chi-two.vercel.app/dashboard?fitness_connected=true"
            };

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.tryterra.co/v2/auth/generateWidgetSession");
            httpRequest.Headers.Add("dev-id", devId);
            httpRequest.Headers.Add("x-api-key", apiKey);
            httpRequest.Content = JsonContent.Create(requestBody);

            var response = await _httpClient.SendAsync(httpRequest, ct);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Failed to generate Terra widget session: {StatusCode} - {Error}", response.StatusCode, errorBody);
                throw new InvalidOperationException($"Terra API returned error: {response.StatusCode}");
            }

            using var responseStream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(responseStream, cancellationToken: ct);
            var root = doc.RootElement;

            var url = root.TryGetProperty("url", out var urlEl) ? urlEl.GetString() ?? "" : "";
            var sessionId = root.TryGetProperty("session_id", out var sidEl) ? sidEl.GetString() ?? "" : "";
            var status = root.TryGetProperty("status", out var stEl) ? stEl.GetString() ?? "success" : "success";

            return new WidgetSessionResponseDto(status, url, sessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception while requesting Terra widget session for user {UserId}", userId);
            throw;
        }
    }

    public async Task<List<FitnessConnectionResponseDto>> GetUserConnectionsAsync(Guid userId, CancellationToken ct = default)
    {
        var connections = await _connectionRepo.GetByUserIdAsync(userId, ct);
        return connections.Select(c => new FitnessConnectionResponseDto(
            c.Id,
            c.UserId,
            c.AggregatorProvider,
            c.AggregatorUserId,
            c.DeviceProvider,
            c.IsActive,
            c.LastSyncAt
        )).ToList();
    }

    public async Task<bool> DisconnectAsync(Guid userId, Guid connectionId, CancellationToken ct = default)
    {
        var connection = await _connectionRepo.GetByIdAsync(connectionId, ct);
        if (connection == null || connection.UserId != userId)
        {
            return false;
        }

        connection.Deactivate();
        _connectionRepo.Update(connection);
        await _unitOfWork.CommitAsync(ct);
        return true;
    }

    public async Task<List<DailyActivitySummaryDto>> GetDailyActivitiesAsync(
        Guid userId,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        CancellationToken ct = default)
    {
        var activities = await _activityRepo.GetByUserIdAsync(userId, fromDate, toDate, ct);
        return activities.Select(a => new DailyActivitySummaryDto(
            a.Id,
            a.UserId,
            a.Date,
            a.Steps,
            a.ActiveCaloriesBurned,
            a.TotalCaloriesBurned,
            a.AverageHeartRate,
            a.RestingHeartRate,
            a.SleepHours,
            a.DistanceMeters,
            a.SourceDevice,
            a.UpdatedAt
        )).ToList();
    }

    public async Task<DailyActivitySummaryDto> MockSyncActivityAsync(Guid userId, MockSyncRequestDto dto, CancellationToken ct = default)
    {
        // 1. Ensure user has a mock connection record
        var connections = await _connectionRepo.GetByUserIdAsync(userId, ct);
        var existingConn = connections.FirstOrDefault(c => c.DeviceProvider.Equals("GARMIN", StringComparison.OrdinalIgnoreCase) || c.DeviceProvider.Equals("MOCK", StringComparison.OrdinalIgnoreCase));
        if (existingConn == null)
        {
            existingConn = new UserFitnessConnection(userId, $"terra_mock_{userId:N}", "GARMIN", "Terra");
            await _connectionRepo.AddAsync(existingConn, ct);
        }
        else
        {
            existingConn.Reactivate();
            existingConn.UpdateLastSync(DateTime.UtcNow);
            _connectionRepo.Update(existingConn);
        }

        // 2. Upsert daily activity log
        var existingLog = await _activityRepo.GetByUserAndDateAsync(userId, dto.Date, ct);
        if (existingLog != null)
        {
            existingLog.UpdateMetrics(
                dto.Steps,
                dto.ActiveCaloriesBurned,
                dto.TotalCaloriesBurned,
                dto.AverageHeartRate,
                dto.RestingHeartRate,
                dto.SleepHours,
                dto.DistanceMeters,
                dto.SourceDevice,
                JsonSerializer.Serialize(dto)
            );
            _activityRepo.Update(existingLog);
        }
        else
        {
            existingLog = new DailyActivityLog(
                userId,
                dto.Date,
                dto.Steps,
                dto.ActiveCaloriesBurned,
                dto.TotalCaloriesBurned,
                dto.AverageHeartRate,
                dto.RestingHeartRate,
                dto.SleepHours,
                dto.DistanceMeters,
                dto.SourceDevice,
                JsonSerializer.Serialize(dto)
            );
            await _activityRepo.AddAsync(existingLog, ct);
        }

        await _unitOfWork.CommitAsync(ct);

        return new DailyActivitySummaryDto(
            existingLog.Id,
            existingLog.UserId,
            existingLog.Date,
            existingLog.Steps,
            existingLog.ActiveCaloriesBurned,
            existingLog.TotalCaloriesBurned,
            existingLog.AverageHeartRate,
            existingLog.RestingHeartRate,
            existingLog.SleepHours,
            existingLog.DistanceMeters,
            existingLog.SourceDevice,
            existingLog.UpdatedAt
        );
    }

    public async Task<bool> ProcessTerraWebhookAsync(string payloadJson, string? signatureHeader = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(payloadJson)) return false;

        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            var root = doc.RootElement;

            var eventType = root.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : null;
            _logger.LogInformation("Processing Terra Webhook event: {EventType}", eventType);

            // Handle Authentication Success
            if (eventType == "auth_success" && root.TryGetProperty("user", out var userEl))
            {
                var terraUserId = userEl.TryGetProperty("user_id", out var tuid) ? tuid.GetString() : null;
                var referenceId = userEl.TryGetProperty("reference_id", out var refId) ? refId.GetString() : null;
                var provider = userEl.TryGetProperty("provider", out var pvd) ? pvd.GetString() : "UNKNOWN";

                if (Guid.TryParse(referenceId, out var parsedUserId) && !string.IsNullOrWhiteSpace(terraUserId))
                {
                    var existing = await _connectionRepo.GetByAggregatorUserIdAsync(terraUserId, ct);
                    if (existing != null)
                    {
                        existing.Reactivate(terraUserId);
                        _connectionRepo.Update(existing);
                    }
                    else
                    {
                        var newConn = new UserFitnessConnection(parsedUserId, terraUserId, provider ?? "GENERIC", "Terra");
                        await _connectionRepo.AddAsync(newConn, ct);
                    }
                    await _unitOfWork.CommitAsync(ct);
                    return true;
                }
            }

            // Handle Daily / Activity summary push
            if ((eventType == "daily" || eventType == "activity") && root.TryGetProperty("user", out var dataUserEl))
            {
                var terraUserId = dataUserEl.TryGetProperty("user_id", out var tuid) ? tuid.GetString() : null;
                var referenceId = dataUserEl.TryGetProperty("reference_id", out var refId) ? refId.GetString() : null;
                var provider = dataUserEl.TryGetProperty("provider", out var pvd) ? pvd.GetString() : "Wearable";

                Guid targetUserId = Guid.Empty;
                if (!string.IsNullOrWhiteSpace(referenceId) && Guid.TryParse(referenceId, out var parsedRefId))
                {
                    targetUserId = parsedRefId;
                }
                else if (!string.IsNullOrWhiteSpace(terraUserId))
                {
                    var conn = await _connectionRepo.GetByAggregatorUserIdAsync(terraUserId, ct);
                    if (conn != null) targetUserId = conn.UserId;
                }

                if (targetUserId == Guid.Empty)
                {
                    _logger.LogWarning("Webhook user could not be mapped to NutriPlan UserId. TerraUserId: {TUserId}", terraUserId);
                    return false;
                }

                if (root.TryGetProperty("data", out var dataEl) && dataEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in dataEl.EnumerateArray())
                    {
                        DateOnly logDate = DateOnly.FromDateTime(DateTime.UtcNow);
                        if (item.TryGetProperty("metadata", out var metaEl) && metaEl.TryGetProperty("start_time", out var stTime))
                        {
                            if (DateTime.TryParse(stTime.GetString(), out var dt))
                            {
                                logDate = DateOnly.FromDateTime(dt);
                            }
                        }

                        int steps = 0;
                        decimal activeCalories = 0;
                        decimal totalCalories = 0;
                        int? avgHeartRate = null;
                        int? restingHeartRate = null;
                        decimal? distanceMeters = null;

                        // Parse Distance & Steps
                        if (item.TryGetProperty("distance_data", out var distEl))
                        {
                            if (distEl.TryGetProperty("steps", out var stEl)) steps = stEl.GetInt32();
                            if (distEl.TryGetProperty("distance_meters", out var dmEl)) distanceMeters = dmEl.GetDecimal();
                        }

                        // Parse Calories
                        if (item.TryGetProperty("calories_data", out var calEl))
                        {
                            if (calEl.TryGetProperty("net_activity_calories", out var nacEl)) activeCalories = nacEl.GetDecimal();
                            if (calEl.TryGetProperty("total_burned_calories", out var tbcEl)) totalCalories = tbcEl.GetDecimal();
                            if (totalCalories == 0 && activeCalories > 0) totalCalories = activeCalories;
                        }

                        // Parse Heart Rate
                        if (item.TryGetProperty("heart_rate_data", out var hrEl) && hrEl.TryGetProperty("summary", out var summaryEl))
                        {
                            if (summaryEl.TryGetProperty("avg_hr_bpm", out var ahrEl)) avgHeartRate = (int)ahrEl.GetDouble();
                            if (summaryEl.TryGetProperty("resting_hr_bpm", out var rhrEl)) restingHeartRate = (int)rhrEl.GetDouble();
                        }

                        // Upsert
                        var existingLog = await _activityRepo.GetByUserAndDateAsync(targetUserId, logDate, ct);
                        if (existingLog != null)
                        {
                            existingLog.UpdateMetrics(
                                steps,
                                activeCalories,
                                totalCalories,
                                avgHeartRate,
                                restingHeartRate,
                                null,
                                distanceMeters,
                                provider ?? "Wearable",
                                item.GetRawText()
                            );
                            _activityRepo.Update(existingLog);
                        }
                        else
                        {
                            var newLog = new DailyActivityLog(
                                targetUserId,
                                logDate,
                                steps,
                                activeCalories,
                                totalCalories,
                                avgHeartRate,
                                restingHeartRate,
                                null,
                                distanceMeters,
                                provider ?? "Wearable",
                                item.GetRawText()
                            );
                            await _activityRepo.AddAsync(newLog, ct);
                        }
                    }

                    await _unitOfWork.CommitAsync(ct);
                    return true;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Terra Webhook payload.");
            return false;
        }
    }

    public Task<OAuthUrlResponseDto> GetOAuthUrlAsync(Guid userId, string provider, string redirectUri, CancellationToken ct = default)
    {
        var prov = provider.Trim().ToUpperInvariant();
        if (prov == "STRAVA")
        {
            var clientId = GetConfigValue("STRAVA_CLIENT_ID", "Strava:ClientId");
            if (string.IsNullOrWhiteSpace(clientId) || clientId.Contains("YOUR_"))
            {
                return Task.FromResult(new OAuthUrlResponseDto(
                    "STRAVA",
                    "",
                    false,
                    "Strava Client ID is not configured yet. Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in .env."
                ));
            }

            var url = $"https://www.strava.com/oauth/authorize?client_id={clientId}&response_type=code&redirect_uri={Uri.EscapeDataString(redirectUri)}&approval_prompt=auto&scope=read,activity:read_all";
            return Task.FromResult(new OAuthUrlResponseDto("STRAVA", url, true));
        }

        if (prov == "FITBIT")
        {
            var clientId = GetConfigValue("FITBIT_CLIENT_ID", "Fitbit:ClientId");
            if (string.IsNullOrWhiteSpace(clientId) || clientId.Contains("YOUR_"))
            {
                return Task.FromResult(new OAuthUrlResponseDto(
                    "FITBIT",
                    "",
                    false,
                    "Fitbit Client ID is not configured yet. Set FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET in .env."
                ));
            }

            var url = $"https://www.fitbit.com/oauth2/authorize?response_type=code&client_id={clientId}&redirect_uri={Uri.EscapeDataString(redirectUri)}&scope=activity%20heartrate%20sleep%20profile";
            return Task.FromResult(new OAuthUrlResponseDto("FITBIT", url, true));
        }

        throw new NotSupportedException($"Provider {provider} is not supported for direct OAuth.");
    }

    public async Task<ManualSyncResponseDto> HandleOAuthCallbackAsync(Guid userId, string provider, string code, string? redirectUri = null, CancellationToken ct = default)
    {
        var prov = provider.Trim().ToUpperInvariant();
        if (prov == "STRAVA")
        {
            var clientId = GetConfigValue("STRAVA_CLIENT_ID", "Strava:ClientId");
            var clientSecret = GetConfigValue("STRAVA_CLIENT_SECRET", "Strava:ClientSecret");

            if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            {
                throw new InvalidOperationException("Strava API credentials are not configured.");
            }

            var tokenReq = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                { "client_id", clientId },
                { "client_secret", clientSecret },
                { "code", code },
                { "grant_type", "authorization_code" }
            });

            var resp = await _httpClient.PostAsync("https://www.strava.com/oauth/token", tokenReq, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var err = await resp.Content.ReadAsStringAsync(ct);
                _logger.LogError("Strava token exchange failed: {Error}", err);
                return new ManualSyncResponseDto(false, "Failed to exchange authorization token with Strava.", 0);
            }

            using var doc = await JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var root = doc.RootElement;

            var accessToken = root.GetProperty("access_token").GetString() ?? "";
            var refreshToken = root.GetProperty("refresh_token").GetString() ?? "";
            var expiresAtUnix = root.GetProperty("expires_at").GetInt64();
            var expiresAt = DateTimeOffset.FromUnixTimeSeconds(expiresAtUnix).UtcDateTime;

            string athleteId = "strava_athlete";
            if (root.TryGetProperty("athlete", out var athleteEl) && athleteEl.TryGetProperty("id", out var aIdEl))
            {
                athleteId = aIdEl.ToString();
            }

            var connections = await _connectionRepo.GetByUserIdAsync(userId, ct);
            var existingConn = connections.FirstOrDefault(c => c.DeviceProvider == "STRAVA");
            if (existingConn == null)
            {
                existingConn = new UserFitnessConnection(userId, athleteId, "STRAVA", "Direct", accessToken, refreshToken, expiresAt);
                await _connectionRepo.AddAsync(existingConn, ct);
            }
            else
            {
                existingConn.Reactivate(athleteId);
                existingConn.UpdateTokens(accessToken, refreshToken, expiresAt);
                existingConn.UpdateLastSync(DateTime.UtcNow);
                _connectionRepo.Update(existingConn);
            }

            await _unitOfWork.CommitAsync(ct);
            return await SyncStravaActivitiesInternalAsync(userId, existingConn, ct);
        }

        if (prov == "FITBIT")
        {
            var clientId = GetConfigValue("FITBIT_CLIENT_ID", "Fitbit:ClientId");
            var clientSecret = GetConfigValue("FITBIT_CLIENT_SECRET", "Fitbit:ClientSecret");

            if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            {
                throw new InvalidOperationException("Fitbit API credentials are not configured.");
            }

            using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.fitbit.com/oauth2/token");
            var basicAuth = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
            req.Headers.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);
            req.Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                { "client_id", clientId },
                { "grant_type", "authorization_code" },
                { "redirect_uri", redirectUri ?? "" },
                { "code", code }
            });

            var resp = await _httpClient.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var err = await resp.Content.ReadAsStringAsync(ct);
                _logger.LogError("Fitbit token exchange failed: {Error}", err);
                return new ManualSyncResponseDto(false, "Failed to exchange authorization token with Fitbit.", 0);
            }

            using var doc = await JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var root = doc.RootElement;
            var accessToken = root.GetProperty("access_token").GetString() ?? "";
            var refreshToken = root.GetProperty("refresh_token").GetString() ?? "";
            var userIdFitbit = root.GetProperty("user_id").GetString() ?? "fitbit_user";
            var expiresIn = root.GetProperty("expires_in").GetInt32();
            var expiresAt = DateTime.UtcNow.AddSeconds(expiresIn);

            var connections = await _connectionRepo.GetByUserIdAsync(userId, ct);
            var existingConn = connections.FirstOrDefault(c => c.DeviceProvider == "FITBIT");
            if (existingConn == null)
            {
                existingConn = new UserFitnessConnection(userId, userIdFitbit, "FITBIT", "Direct", accessToken, refreshToken, expiresAt);
                await _connectionRepo.AddAsync(existingConn, ct);
            }
            else
            {
                existingConn.Reactivate(userIdFitbit);
                existingConn.UpdateTokens(accessToken, refreshToken, expiresAt);
                existingConn.UpdateLastSync(DateTime.UtcNow);
                _connectionRepo.Update(existingConn);
            }

            await _unitOfWork.CommitAsync(ct);
            return await SyncFitbitDataInternalAsync(userId, existingConn, ct);
        }

        throw new NotSupportedException($"Provider {provider} not supported.");
    }

    public async Task<ManualSyncResponseDto> TriggerDeviceSyncAsync(Guid userId, string provider, CancellationToken ct = default)
    {
        var prov = provider.Trim().ToUpperInvariant();
        var connections = await _connectionRepo.GetByUserIdAsync(userId, ct);
        var conn = connections.FirstOrDefault(c => c.DeviceProvider == prov && c.IsActive);

        if (conn == null || string.IsNullOrWhiteSpace(conn.AccessToken))
        {
            return new ManualSyncResponseDto(false, $"No active {provider} connection with access token found.", 0);
        }

        if (prov == "STRAVA")
        {
            return await SyncStravaActivitiesInternalAsync(userId, conn, ct);
        }

        if (prov == "FITBIT")
        {
            return await SyncFitbitDataInternalAsync(userId, conn, ct);
        }

        return new ManualSyncResponseDto(false, $"Sync for {provider} not supported.", 0);
    }

    private async Task<ManualSyncResponseDto> SyncStravaActivitiesInternalAsync(Guid userId, UserFitnessConnection conn, CancellationToken ct)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, "https://www.strava.com/api/v3/athlete/activities?per_page=30");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", conn.AccessToken);

            var resp = await _httpClient.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to fetch Strava activities: {Status}", resp.StatusCode);
                return new ManualSyncResponseDto(false, "Could not fetch activities from Strava.", 0);
            }

            using var doc = await JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            int syncedCount = 0;
            DailyActivitySummaryDto? latestDto = null;

            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                var activitiesByDate = new Dictionary<DateOnly, (decimal calories, decimal distance, int? hr, string device)>();

                foreach (var act in doc.RootElement.EnumerateArray())
                {
                    if (!act.TryGetProperty("start_date_local", out var startDateEl)) continue;
                    if (!DateTime.TryParse(startDateEl.GetString(), out var dt)) continue;

                    var date = DateOnly.FromDateTime(dt);

                    decimal calories = 0;
                    if (act.TryGetProperty("calories", out var calEl))
                    {
                        calories = calEl.GetDecimal();
                    }
                    else if (act.TryGetProperty("kilojoules", out var kjEl))
                    {
                        calories = kjEl.GetDecimal() * 0.239m;
                    }

                    decimal distance = act.TryGetProperty("distance", out var distEl) ? distEl.GetDecimal() : 0;
                    int? hr = act.TryGetProperty("average_heartrate", out var hrEl) ? (int)hrEl.GetDouble() : null;
                    string deviceName = act.TryGetProperty("device_name", out var dnEl) ? dnEl.GetString() ?? "Garmin/Apple (via Strava)" : "Garmin/Apple (via Strava)";

                    if (!activitiesByDate.ContainsKey(date))
                    {
                        activitiesByDate[date] = (calories, distance, hr, deviceName);
                    }
                    else
                    {
                        var curr = activitiesByDate[date];
                        activitiesByDate[date] = (curr.calories + calories, curr.distance + distance, hr ?? curr.hr, deviceName);
                    }
                }

                foreach (var kvp in activitiesByDate)
                {
                    var date = kvp.Key;
                    var (calories, distance, hr, deviceName) = kvp.Value;
                    int estimatedSteps = (int)(distance / 0.75m);

                    var existing = await _activityRepo.GetByUserAndDateAsync(userId, date, ct);
                    if (existing != null)
                    {
                        existing.UpdateMetrics(
                            steps: Math.Max(existing.Steps, estimatedSteps),
                            activeCalories: existing.ActiveCaloriesBurned + calories,
                            totalCalories: existing.TotalCaloriesBurned + calories,
                            avgHeartRate: hr ?? existing.AverageHeartRate,
                            restingHeartRate: existing.RestingHeartRate,
                            sleepHours: existing.SleepHours,
                            distanceMeters: (existing.DistanceMeters ?? 0) + distance,
                            sourceDevice: deviceName
                        );
                        _activityRepo.Update(existing);
                    }
                    else
                    {
                        var newLog = new DailyActivityLog(
                            userId,
                            date,
                            steps: estimatedSteps,
                            activeCaloriesBurned: calories,
                            totalCaloriesBurned: calories,
                            averageHeartRate: hr,
                            distanceMeters: distance,
                            sourceDevice: deviceName
                        );
                        await _activityRepo.AddAsync(newLog, ct);
                    }
                    syncedCount++;
                }

                conn.UpdateLastSync(DateTime.UtcNow);
                _connectionRepo.Update(conn);
                await _unitOfWork.CommitAsync(ct);

                var todayLog = await _activityRepo.GetByUserAndDateAsync(userId, DateOnly.FromDateTime(DateTime.UtcNow), ct);
                if (todayLog != null)
                {
                    latestDto = new DailyActivitySummaryDto(
                        todayLog.Id, todayLog.UserId, todayLog.Date, todayLog.Steps,
                        todayLog.ActiveCaloriesBurned, todayLog.TotalCaloriesBurned,
                        todayLog.AverageHeartRate, todayLog.RestingHeartRate,
                        todayLog.SleepHours, todayLog.DistanceMeters, todayLog.SourceDevice, todayLog.UpdatedAt
                    );
                }
            }

            return new ManualSyncResponseDto(true, $"Successfully synced {syncedCount} activity records from Strava!", syncedCount, latestDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception syncing Strava activities");
            return new ManualSyncResponseDto(false, "Exception occurred while syncing with Strava.", 0);
        }
    }

    private async Task<ManualSyncResponseDto> SyncFitbitDataInternalAsync(Guid userId, UserFitnessConnection conn, CancellationToken ct)
    {
        try
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            using var req = new HttpRequestMessage(HttpMethod.Get, $"https://api.fitbit.com/1/user/-/activities/date/{today}.json");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", conn.AccessToken);

            var resp = await _httpClient.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
            {
                return new ManualSyncResponseDto(false, "Could not fetch daily summary from Fitbit.", 0);
            }

            using var doc = await JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var root = doc.RootElement;

            int steps = 0;
            decimal calories = 0;
            if (root.TryGetProperty("summary", out var summaryEl))
            {
                if (summaryEl.TryGetProperty("steps", out var stEl)) steps = stEl.GetInt32();
                if (summaryEl.TryGetProperty("activityCalories", out var acEl)) calories = acEl.GetDecimal();
            }

            var logDate = DateOnly.FromDateTime(DateTime.UtcNow);
            var existing = await _activityRepo.GetByUserAndDateAsync(userId, logDate, ct);
            if (existing != null)
            {
                existing.UpdateMetrics(
                    steps: steps,
                    activeCalories: calories,
                    totalCalories: calories,
                    sourceDevice: "Fitbit Tracker"
                );
                _activityRepo.Update(existing);
            }
            else
            {
                var newLog = new DailyActivityLog(
                    userId,
                    logDate,
                    steps: steps,
                    activeCaloriesBurned: calories,
                    totalCaloriesBurned: calories,
                    sourceDevice: "Fitbit Tracker"
                );
                await _activityRepo.AddAsync(newLog, ct);
            }

            conn.UpdateLastSync(DateTime.UtcNow);
            _connectionRepo.Update(conn);
            await _unitOfWork.CommitAsync(ct);

            return new ManualSyncResponseDto(true, "Successfully synced daily steps and calories from Fitbit!", 1);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception syncing Fitbit data");
            return new ManualSyncResponseDto(false, "Exception occurred while syncing with Fitbit.", 0);
        }
    }

    private string? GetConfigValue(string envName, string configPath)
    {
        var val = Environment.GetEnvironmentVariable(envName);
        if (!string.IsNullOrWhiteSpace(val)) return val;
        return _configuration[configPath];
    }
}

