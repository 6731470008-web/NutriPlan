using NutriPlan.Application.Common.Interfaces;
using NutriPlan.Application.Dtos;
using NutriPlan.Application.Services.ShoppingList;
using NutriPlan.Domain.Common;
using NutriPlan.Domain.Entities;
using NutriPlan.Domain.ValueObjects;

namespace NutriPlan.Application.Services;

public class MealPlanService : IMealPlanService
{
    private readonly IMealPlanRepository _mealPlanRepository;
    private readonly IUserRepository _userRepository;
    private readonly IFoodItemRepository _foodItemRepository;
    private readonly IUnitOfWork _unitOfWork;

    public MealPlanService(
        IMealPlanRepository mealPlanRepository,
        IUserRepository userRepository,
        IFoodItemRepository foodItemRepository,
        IUnitOfWork unitOfWork)
    {
        _mealPlanRepository = mealPlanRepository;
        _userRepository = userRepository;
        _foodItemRepository = foodItemRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<MealPlanResponseDto> CreateMealPlanAsync(CreateMealPlanRequestDto dto, CancellationToken ct = default)
    {
        var client = await _userRepository.GetByIdAsync(dto.ClientId, ct);
        if (client == null || client is not Client)
            throw new DomainException("Target client not found.");

        var plan = new MealPlan(dto.ClientId, dto.Title, dto.StartDate, dto.EndDate);
        await _mealPlanRepository.AddAsync(plan, ct);
        await _unitOfWork.CommitAsync(ct);

        return new MealPlanResponseDto(
            plan.Id,
            plan.ClientId,
            plan.Title,
            plan.StartDate,
            plan.EndDate,
            0, 0, 0, 0
        );
    }

    public async Task AddMealEntryAsync(AddMealEntryRequestDto dto, CancellationToken ct = default)
    {
        var food = await _foodItemRepository.GetByIdAsync(dto.FoodItemId, ct);
        if (food == null) throw new DomainException("Food item not found.");

        MealPlan? plan = null;
        if (dto.MealPlanId != Guid.Empty)
        {
            plan = await _mealPlanRepository.GetByIdAsync(dto.MealPlanId, ct);
        }
        else
        {
            plan = await _mealPlanRepository.GetByIdWithMenuAsync(dto.DailyMenuId, ct);
        }

        if (plan == null) throw new DomainException("Meal plan not found.");

        var menu = plan.DailyMenus.FirstOrDefault(m => m.Id == dto.DailyMenuId);
        if (menu == null) throw new DomainException("Daily menu not found in the specified meal plan.");

        var entry = new MealEntry(dto.MealType, dto.PortionGrams, food);
        menu.AddMealEntry(entry);

        await _unitOfWork.CommitAsync(ct);
    }

    public async Task RemoveMealEntryAsync(Guid menuId, Guid entryId, CancellationToken ct = default)
    {
        // Use the variant that loads the full graph (includes DailyMenus + Entries).
        var plan = await _mealPlanRepository.GetByIdWithMenuAsync(menuId, ct);
        if (plan == null) throw new DomainException("Meal plan containing this menu not found.");

        var menu = plan.DailyMenus.FirstOrDefault(m => m.Id == menuId);
        if (menu == null) throw new DomainException("Daily menu not found.");

        // Domain method validates existence and removes from tracked collection.
        menu.RemoveMealEntry(entryId);

        await _unitOfWork.CommitAsync(ct);
    }

    public async Task<string> ExportShoppingListAsync(Guid planId, string format, CancellationToken ct = default)
    {
        var plan = await _mealPlanRepository.GetByIdAsync(planId, ct);
        if (plan == null) throw new DomainException("Meal plan not found.");

        ShoppingListFactory factory = format.ToLowerInvariant() switch
        {
            "pdf" => new PdfShoppingListFactory(),
            "json" => new JsonShoppingListFactory(),
            _ => throw new DomainException("Unsupported export format. Use 'pdf' or 'json'.")
        };

        return factory.GenerateShoppingList(plan);
    }
}
