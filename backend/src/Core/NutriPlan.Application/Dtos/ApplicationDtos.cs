using NutriPlan.Domain.Enums;

namespace NutriPlan.Application.Dtos;

public record RegisterRequestDto(
    string Email,
    string Password,
    string FullName,
    UserRole Role,
    int? Age,
    double? WeightKg,
    double? HeightCm,
    ActivityLevel? ActivityLevel,
    Gender? Gender,
    string? LicenseNumber,
    string? Specialization,
    string? HealthConditions = null,
    string? FoodAllergies = null,
    DateTime? DateOfBirth = null
);

public record LoginRequestDto(string Email, string Password);

public record AddDailyMenuBodyDto(
    int DayNumber,
    double TargetCalories,
    double TargetProteinGrams = 0,
    double TargetCarbsGrams = 0,
    double TargetFatGrams = 0
);

public record AuthResponseDto(Guid UserId, string Email, string FullName, string Role, string Token);

public record CreateMealPlanRequestDto(
    Guid ClientId,
    string Title,
    DateTime StartDate,
    DateTime EndDate
);

public record AddMealEntryRequestDto(
    Guid MealPlanId,
    Guid DailyMenuId,
    MealType MealType,
    double PortionGrams,
    Guid FoodItemId
);

public record UpdateBodyMetricsRequestDto(
    int Age,
    double WeightKg,
    double HeightCm
);

public record CreateFoodItemRequestDto(
    string Name,
    string Category,
    double ProteinGrams,
    double CarbsGrams,
    double FatGrams,
    double FiberGrams,
    bool IsAllergenic,
    string? AllergenWarning
);

public record FoodItemResponseDto(
    Guid Id,
    string Name,
    string Category,
    double CaloriesPer100g,
    double ProteinGrams,
    double CarbsGrams,
    double FatGrams,
    bool IsAllergenic,
    string? AllergenWarning
);

public record MealPlanResponseDto(
    Guid Id,
    Guid ClientId,
    string Title,
    DateTime StartDate,
    DateTime EndDate,
    double TotalCalories,
    double TotalProteinGrams,
    double TotalCarbsGrams,
    double TotalFatGrams
);

// ─── Tracking DTOs ─────────────────────────────────────────────────────────────

public record LogMealRequestDto(
    Guid ClientId,
    Guid MealEntryId,
    double ActualPortionGrams,
    double PlannedPortionGrams
);

public record MealLogResponseDto(
    Guid Id,
    Guid ClientId,
    Guid MealEntryId,
    DateTime ConsumedAt,
    double ActualPortionGrams,
    bool IsAdhered
);

public record AdherenceReportDto(
    Guid ClientId,
    int TotalLoggedMeals,
    int AdheredMeals,
    double AdherenceRatePercent,
    string Status
);

public record ProgressDto(
    Guid ClientId,
    double CurrentWeightKg,
    double? TargetWeightKg,
    double? WeightDeltaKg,
    double EstimatedDailyCalories
);
