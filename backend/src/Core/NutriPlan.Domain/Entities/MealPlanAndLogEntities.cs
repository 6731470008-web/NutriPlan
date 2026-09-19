using System.ComponentModel.DataAnnotations.Schema;
using NutriPlan.Domain.Common;
using NutriPlan.Domain.Enums;
using NutriPlan.Domain.ValueObjects;

namespace NutriPlan.Domain.Entities;

public class MealPlan : Entity
{
    public Guid ClientId { get; private set; }
    public string Title { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }

    // Composition: MealPlan owns DailyMenus
    private readonly List<DailyMenu> _dailyMenus = new();
    public IReadOnlyCollection<DailyMenu> DailyMenus => _dailyMenus.AsReadOnly();

    protected MealPlan() { Title = null!; }

    public MealPlan(Guid clientId, string title, DateTime startDate, DateTime endDate)
    {
        if (clientId == Guid.Empty) throw new DomainException("Client ID is required.");
        if (string.IsNullOrWhiteSpace(title)) throw new DomainException("Meal plan title is required.");
        if (endDate < startDate) throw new DomainException("End date cannot be before start date.");

        ClientId = clientId;
        Title = title;
        StartDate = startDate;
        EndDate = endDate;
    }

    public void AddDailyMenu(DailyMenu menu)
    {
        ArgumentNullException.ThrowIfNull(menu);
        if (_dailyMenus.Any(m => m.DayNumber == menu.DayNumber))
            throw new DomainException($"Daily menu for Day {menu.DayNumber} already exists.");

        _dailyMenus.Add(menu);
        Touch();
    }

    public NutrientProfile CalculateTotalPlanNutrients()
    {
        var total = NutrientProfile.Zero;
        foreach (var menu in _dailyMenus)
        {
            total += menu.CalculateDailyNutrients();
        }
        return total;
    }
}

public class DailyMenu : Entity
{
    public int DayNumber { get; private set; }
    public double TargetCalories { get; private set; }

    private double _targetProtein;
    private double _targetCarbs;
    private double _targetFat;

    [NotMapped]
    public double TargetProteinGrams
    {
        get => _targetProtein > 0 ? _targetProtein : Math.Round(TargetCalories * 0.25 / 4);
        private set => _targetProtein = value;
    }

    [NotMapped]
    public double TargetCarbsGrams
    {
        get => _targetCarbs > 0 ? _targetCarbs : Math.Round(TargetCalories * 0.50 / 4);
        private set => _targetCarbs = value;
    }

    [NotMapped]
    public double TargetFatGrams
    {
        get => _targetFat > 0 ? _targetFat : Math.Round(TargetCalories * 0.25 / 9);
        private set => _targetFat = value;
    }

    // Composition: DailyMenu owns MealEntries
    private readonly List<MealEntry> _entries = new();
    public IReadOnlyCollection<MealEntry> Entries => _entries.AsReadOnly();

    protected DailyMenu() { }

    public DailyMenu(int dayNumber, double targetCalories, double targetProteinGrams = 0, double targetCarbsGrams = 0, double targetFatGrams = 0)
    {
        if (dayNumber < 1 || dayNumber > 365) throw new DomainException("Day number must be between 1 and 365.");
        if (targetCalories <= 0) throw new DomainException("Target calories must be greater than zero.");

        DayNumber = dayNumber;
        TargetCalories = targetCalories;
        TargetProteinGrams = targetProteinGrams >= 0 ? targetProteinGrams : 0;
        TargetCarbsGrams = targetCarbsGrams >= 0 ? targetCarbsGrams : 0;
        TargetFatGrams = targetFatGrams >= 0 ? targetFatGrams : 0;
    }

    public void AddMealEntry(MealEntry entry)
    {
        ArgumentNullException.ThrowIfNull(entry);
        _entries.Add(entry);
        Touch();
    }

    public void RemoveMealEntry(Guid entryId)
    {
        var existing = _entries.FirstOrDefault(e => e.Id == entryId);
        if (existing == null) throw new DomainException("Meal entry not found in menu.");
        _entries.Remove(existing);
        Touch();
    }

    public NutrientProfile CalculateDailyNutrients()
    {
        var total = NutrientProfile.Zero;
        foreach (var entry in _entries)
        {
            total += entry.CalculateEntryNutrients();
        }
        return total;
    }
}

public class MealEntry : Entity
{
    public MealType MealType { get; private set; }
    public double PortionGrams { get; private set; }

    // Aggregation: MealEntry references FoodItem (FoodItem exists independently)
    public Guid FoodItemId { get; private set; }
    public FoodItem FoodItem { get; private set; } = null!;

    protected MealEntry() { }

    public MealEntry(MealType mealType, double portionGrams, FoodItem foodItem)
    {
        if (portionGrams <= 0) throw new DomainException("Portion size must be greater than zero.");
        ArgumentNullException.ThrowIfNull(foodItem);

        MealType = mealType;
        PortionGrams = portionGrams;
        FoodItemId = foodItem.Id;
        FoodItem = foodItem;
    }

    public NutrientProfile CalculateEntryNutrients()
    {
        double factor = PortionGrams / 100.0;
        return FoodItem.NutrientsPer100g.Scale(factor);
    }
}

public class MealLog : Entity
{
    public Guid ClientId { get; private set; }
    public Guid MealEntryId { get; private set; }
    public DateTime ConsumedAt { get; private set; }
    public double ActualPortionGrams { get; private set; }
    public bool IsAdhered { get; private set; }

    protected MealLog() { }

    public MealLog(Guid clientId, Guid mealEntryId, double actualPortionGrams, double plannedPortionGrams)
    {
        if (clientId == Guid.Empty || mealEntryId == Guid.Empty)
            throw new DomainException("Client and Meal Entry IDs are required.");
        if (actualPortionGrams <= 0)
            throw new DomainException("Consumed portion must be positive.");

        ClientId = clientId;
        MealEntryId = mealEntryId;
        ConsumedAt = DateTime.UtcNow;
        ActualPortionGrams = actualPortionGrams;

        // Adherence rule: Consumed portion is within +/- 15% of planned portion
        double variation = Math.Abs(actualPortionGrams - plannedPortionGrams) / plannedPortionGrams;
        IsAdhered = variation <= 0.15;
    }
}
