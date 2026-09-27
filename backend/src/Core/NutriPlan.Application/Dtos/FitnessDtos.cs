namespace NutriPlan.Application.Dtos;

public record GenerateWidgetSessionRequestDto(
    string? ReferenceId = null,
    List<string>? Providers = null,
    string? Language = "en"
);

public record WidgetSessionResponseDto(
    string Status,
    string Url,
    string SessionId
);

public record FitnessConnectionResponseDto(
    Guid Id,
    Guid UserId,
    string AggregatorProvider,
    string AggregatorUserId,
    string DeviceProvider,
    bool IsActive,
    DateTime? LastSyncAt
);

public record DailyActivitySummaryDto(
    Guid Id,
    Guid UserId,
    DateOnly Date,
    int Steps,
    decimal ActiveCaloriesBurned,
    decimal TotalCaloriesBurned,
    int? AverageHeartRate,
    int? RestingHeartRate,
    decimal? SleepHours,
    decimal? DistanceMeters,
    string SourceDevice,
    DateTime? UpdatedAt
);

public record MockSyncRequestDto(
    DateOnly Date,
    int Steps,
    decimal ActiveCaloriesBurned,
    decimal TotalCaloriesBurned,
    int? AverageHeartRate = null,
    int? RestingHeartRate = null,
    decimal? SleepHours = null,
    decimal? DistanceMeters = null,
    string SourceDevice = "Mock Garmin Watch"
);

public record TerraWebhookPayloadDto(
    string? Type,
    string? Status,
    TerraUserDto? User,
    object? Data,
    string? Message
);

public record TerraUserDto(
    string? UserId,
    string? ReferenceId,
    string? Provider,
    DateTime? LastWebhookUpdate
);

public record OAuthUrlResponseDto(
    string Provider,
    string Url,
    bool IsConfigured,
    string? Note = null
);

public record OAuthCallbackRequestDto(
    string Code,
    string? RedirectUri = null
);

public record ManualSyncResponseDto(
    bool Success,
    string Message,
    int SyncedActivitiesCount,
    DailyActivitySummaryDto? LatestActivity = null
);

