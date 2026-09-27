using NutriPlan.Domain.Common;

namespace NutriPlan.Domain.Entities;

public class UserFitnessConnection : Entity
{
    public Guid UserId { get; private set; }
    public string AggregatorProvider { get; private set; } = "Terra";
    public string AggregatorUserId { get; private set; } = string.Empty;
    public string DeviceProvider { get; private set; } = string.Empty; // GARMIN, FITBIT, APPLE, SAMSUNG, OURARING, WHOOP
    public bool IsActive { get; private set; } = true;
    public DateTime? LastSyncAt { get; private set; }
    public string? AccessToken { get; private set; }
    public string? RefreshToken { get; private set; }
    public DateTime? ExpiresAt { get; private set; }

    protected UserFitnessConnection() { }

    public UserFitnessConnection(
        Guid userId,
        string aggregatorUserId,
        string deviceProvider,
        string aggregatorProvider = "Terra",
        string? accessToken = null,
        string? refreshToken = null,
        DateTime? expiresAt = null)
    {
        if (userId == Guid.Empty) throw new DomainException("UserId cannot be empty.");
        if (string.IsNullOrWhiteSpace(deviceProvider)) throw new DomainException("DeviceProvider is required.");

        UserId = userId;
        AggregatorUserId = aggregatorUserId?.Trim() ?? string.Empty;
        DeviceProvider = deviceProvider.Trim().ToUpperInvariant();
        AggregatorProvider = aggregatorProvider.Trim();
        AccessToken = accessToken;
        RefreshToken = refreshToken;
        ExpiresAt = expiresAt.HasValue ? DateTime.SpecifyKind(expiresAt.Value, DateTimeKind.Utc) : null;
        IsActive = true;
        LastSyncAt = DateTime.UtcNow;
    }

    public void UpdateTokens(string accessToken, string? refreshToken, DateTime? expiresAt)
    {
        AccessToken = accessToken;
        if (!string.IsNullOrWhiteSpace(refreshToken)) RefreshToken = refreshToken;
        if (expiresAt.HasValue) ExpiresAt = DateTime.SpecifyKind(expiresAt.Value, DateTimeKind.Utc);
        Touch();
    }

    public void UpdateLastSync(DateTime syncTime)
    {
        LastSyncAt = DateTime.SpecifyKind(syncTime, DateTimeKind.Utc);
        Touch();
    }

    public void Deactivate()
    {
        IsActive = false;
        Touch();
    }

    public void Reactivate(string? newAggregatorUserId = null)
    {
        IsActive = true;
        if (!string.IsNullOrWhiteSpace(newAggregatorUserId))
        {
            AggregatorUserId = newAggregatorUserId.Trim();
        }
        LastSyncAt = DateTime.UtcNow;
        Touch();
    }
}

public class DailyActivityLog : Entity
{
    public Guid UserId { get; private set; }
    public DateOnly Date { get; private set; }
    public int Steps { get; private set; }
    public decimal ActiveCaloriesBurned { get; private set; }
    public decimal TotalCaloriesBurned { get; private set; }
    public int? AverageHeartRate { get; private set; }
    public int? RestingHeartRate { get; private set; }
    public decimal? SleepHours { get; private set; }
    public decimal? DistanceMeters { get; private set; }
    public string SourceDevice { get; private set; } = string.Empty;
    public string? RawDataJson { get; private set; }

    protected DailyActivityLog() { }

    public DailyActivityLog(
        Guid userId,
        DateOnly date,
        int steps,
        decimal activeCaloriesBurned,
        decimal totalCaloriesBurned,
        int? averageHeartRate = null,
        int? restingHeartRate = null,
        decimal? sleepHours = null,
        decimal? distanceMeters = null,
        string sourceDevice = "FitnessDevice",
        string? rawDataJson = null)
    {
        if (userId == Guid.Empty) throw new DomainException("UserId cannot be empty.");

        UserId = userId;
        Date = date;
        Steps = Math.Max(0, steps);
        ActiveCaloriesBurned = Math.Max(0, activeCaloriesBurned);
        TotalCaloriesBurned = Math.Max(0, totalCaloriesBurned);
        AverageHeartRate = averageHeartRate;
        RestingHeartRate = restingHeartRate;
        SleepHours = sleepHours;
        DistanceMeters = distanceMeters;
        SourceDevice = sourceDevice.Trim();
        RawDataJson = rawDataJson;
    }

    public void UpdateMetrics(
        int steps,
        decimal activeCalories,
        decimal totalCalories,
        int? avgHeartRate = null,
        int? restingHeartRate = null,
        decimal? sleepHours = null,
        decimal? distanceMeters = null,
        string? sourceDevice = null,
        string? rawDataJson = null)
    {
        Steps = Math.Max(0, steps);
        ActiveCaloriesBurned = Math.Max(0, activeCalories);
        TotalCaloriesBurned = Math.Max(0, totalCalories);
        
        if (avgHeartRate.HasValue) AverageHeartRate = avgHeartRate;
        if (restingHeartRate.HasValue) RestingHeartRate = restingHeartRate;
        if (sleepHours.HasValue) SleepHours = sleepHours;
        if (distanceMeters.HasValue) DistanceMeters = distanceMeters;
        if (!string.IsNullOrWhiteSpace(sourceDevice)) SourceDevice = sourceDevice.Trim();
        if (rawDataJson != null) RawDataJson = rawDataJson;

        Touch();
    }
}
