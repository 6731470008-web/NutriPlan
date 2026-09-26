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
    Task AddAsync(User user, CancellationToken cancellationToken = default);
    Task<List<Client>> GetClientsByNutritionistIdAsync(Guid nutritionistId, CancellationToken cancellationToken = default);
    Task<List<Client>> GetUnassignedClientsAsync(CancellationToken cancellationToken = default);
}

public interface IMealPlanRepository
{
    Task<MealPlan?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<MealPlan?> GetByIdWithMenuAsync(Guid id, CancellationToken cancellationToken = default);
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

// ─── AI Services ──────────────────────────────────────────────────────────────

public interface IFoodRecognitionService
{
    Task<FoodAnalysisResultDto> AnalyzeFoodImageAsync(Stream imageStream, string contentType, CancellationToken ct = default);
}

