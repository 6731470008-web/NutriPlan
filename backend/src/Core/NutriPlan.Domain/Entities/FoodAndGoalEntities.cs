using NutriPlan.Domain.Common;
using NutriPlan.Domain.Enums;
using NutriPlan.Domain.ValueObjects;

namespace NutriPlan.Domain.Entities;

public class FoodItem : Entity
{
    public string Name { get; private set; }
    public string Category { get; private set; }
    public NutrientProfile NutrientsPer100g { get; private set; }
    public bool IsAllergenic { get; private set; }
    public string? AllergenWarning { get; private set; }

    protected FoodItem() { Name = null!; Category = null!; NutrientsPer100g = null!; }

    public FoodItem(string name, string category, NutrientProfile nutrientsPer100g, bool isAllergenic, string? allergenWarning = null)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new DomainException("Food item name cannot be empty.");
        if (string.IsNullOrWhiteSpace(category)) throw new DomainException("Category cannot be empty.");
        ArgumentNullException.ThrowIfNull(nutrientsPer100g);

        Name = name.Trim();
        Category = category.Trim();
        NutrientsPer100g = nutrientsPer100g;
        IsAllergenic = isAllergenic;
        AllergenWarning = allergenWarning;
    }

    public void UpdateNutrients(NutrientProfile newProfile)
    {
        NutrientsPer100g = newProfile ?? throw new DomainException("Nutrient profile cannot be null.");
        Touch();
    }
}

public class DietaryGoal
{
    public double TargetWeightKg { get; private set; }
    public DateTime TargetDate { get; private set; }
    public GoalType GoalType { get; private set; }

    protected DietaryGoal() { }

    public DietaryGoal(double targetWeightKg, DateTime targetDate, GoalType goalType)
    {
        if (targetWeightKg < 30 || targetWeightKg > 300) throw new DomainException("Invalid target weight.");
        if (targetDate <= DateTime.UtcNow) throw new DomainException("Target date must be in the future.");

        TargetWeightKg = targetWeightKg;
        TargetDate = targetDate;
        GoalType = goalType;
    }
}
