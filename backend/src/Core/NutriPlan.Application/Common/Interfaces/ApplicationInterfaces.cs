using NutriPlan.Application.Dtos;
using NutriPlan.Domain.Entities;

namespace NutriPlan.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface IUnitOfWork
{
    Task<int> CommitAsync(CancellationToken cancellationToken = default);
}

// ─── Authentication ────────────────────────────────────────────────────────────

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto, CancellationToken ct = default);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto dto, CancellationToken ct = default);
    Task<bool> ForgotPasswordAsync(ForgotPasswordRequestDto dto, CancellationToken ct = default);
    Task<bool> ResetPasswordAsync(ResetPasswordRequestDto dto, CancellationToken ct = default);
    Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordRequestDto dto, CancellationToken ct = default);
    Task<object> UpdateUserProfileAsync(Guid userId, UpdateProfileRequestDto dto, CancellationToken ct = default);
}

// ─── Meal Plan ─────────────────────────────────────────────────────────────────

public interface IMealPlanService
{
    Task<MealPlanResponseDto> CreateMealPlanAsync(CreateMealPlanRequestDto dto, CancellationToken ct = default);
    Task AddMealEntryAsync(AddMealEntryRequestDto dto, CancellationToken ct = default);
    Task RemoveMealEntryAsync(Guid menuId, Guid entryId, CancellationToken ct = default);
    Task<string> ExportShoppingListAsync(Guid planId, string format, CancellationToken ct = default);
}

// ─── Repositories ──────────────────────────────────────────────────────────────

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<List<User>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(User user, CancellationToken cancellationToken = default);
    void Delete(User user);
    Task<List<Client>> GetClientsByNutritionistIdAsync(Guid nutritionistId, CancellationToken cancellationToken = default);
    Task<List<Client>> GetUnassignedClientsAsync(CancellationToken cancellationToken = default);
}

public interface IMealPlanRepository
{
    Task<MealPlan?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<MealPlan?> GetByIdWithMenuAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<MealPlan>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<List<MealPlan>> GetByClientIdAsync(Guid clientId, CancellationToken cancellationToken = default);
    Task AddAsync(MealPlan mealPlan, CancellationToken cancellationToken = default);
    void Update(MealPlan mealPlan);
}

public interface IFoodItemRepository
{
    Task<FoodItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<FoodItem>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(FoodItem foodItem, CancellationToken cancellationToken = default);
}

public interface IMealLogRepository
{
    Task<List<MealLog>> GetByClientIdAsync(Guid clientId, CancellationToken cancellationToken = default);
    Task AddAsync(MealLog mealLog, CancellationToken cancellationToken = default);
}

// ─── Fitness Integration ───────────────────────────────────────────────────

public interface IFitnessConnectionRepository
{
    Task<UserFitnessConnection?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<UserFitnessConnection>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<UserFitnessConnection?> GetByAggregatorUserIdAsync(string aggregatorUserId, CancellationToken cancellationToken = default);
    Task AddAsync(UserFitnessConnection connection, CancellationToken cancellationToken = default);
    void Update(UserFitnessConnection connection);
    void Delete(UserFitnessConnection connection);
}

public interface IDailyActivityRepository
{
    Task<DailyActivityLog?> GetByUserAndDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default);
    Task<List<DailyActivityLog>> GetByUserIdAsync(Guid userId, DateOnly? fromDate = null, DateOnly? toDate = null, CancellationToken cancellationToken = default);
    Task AddAsync(DailyActivityLog activityLog, CancellationToken cancellationToken = default);
    void Update(DailyActivityLog activityLog);
}

public interface IFitnessService
{
    Task<WidgetSessionResponseDto> GenerateWidgetSessionAsync(Guid userId, GenerateWidgetSessionRequestDto? request = null, CancellationToken ct = default);
    Task<List<FitnessConnectionResponseDto>> GetUserConnectionsAsync(Guid userId, CancellationToken ct = default);
    Task<bool> DisconnectAsync(Guid userId, Guid connectionId, CancellationToken ct = default);
    Task<List<DailyActivitySummaryDto>> GetDailyActivitiesAsync(Guid userId, DateOnly? fromDate = null, DateOnly? toDate = null, CancellationToken ct = default);
    Task<DailyActivitySummaryDto> MockSyncActivityAsync(Guid userId, MockSyncRequestDto dto, CancellationToken ct = default);
    Task<bool> ProcessTerraWebhookAsync(string payloadJson, string? signatureHeader = null, CancellationToken ct = default);

    // Free Direct Open API Bridges (Strava & Fitbit)
    Task<OAuthUrlResponseDto> GetOAuthUrlAsync(Guid userId, string provider, string redirectUri, CancellationToken ct = default);
    Task<ManualSyncResponseDto> HandleOAuthCallbackAsync(Guid userId, string provider, string code, string? redirectUri = null, CancellationToken ct = default);
    Task<ManualSyncResponseDto> TriggerDeviceSyncAsync(Guid userId, string provider, CancellationToken ct = default);
}

// ─── AI Services ──────────────────────────────────────────────────────────────

public interface IFoodRecognitionService
{
    Task<FoodAnalysisResultDto> AnalyzeFoodImageAsync(Stream imageStream, string contentType, CancellationToken ct = default);
}

