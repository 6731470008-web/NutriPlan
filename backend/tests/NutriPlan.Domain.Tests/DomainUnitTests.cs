using NutriPlan.Domain.Common;
using NutriPlan.Domain.Entities;
using NutriPlan.Domain.Enums;
using NutriPlan.Domain.Strategies;
using NutriPlan.Domain.ValueObjects;
using Xunit;

namespace NutriPlan.Domain.Tests;

public class DomainUnitTests
{
    [Fact]
    public void CalculateTDEE_ReturnsCorrectEnergyNeeds()
    {
        // Arrange
        var client = new Client(
            email: "jane.doe@example.com",
            passwordHash: "Hash123!",
            fullName: "Jane Doe",
            age: 28,
            weightKg: 65,
            heightCm: 168,
            activityLevel: ActivityLevel.ModeratelyActive
        );

        // Act
        double bmr = client.CalculateBMR(); // (10 * 65) + (6.25 * 168) - (5 * 28) + 5 = 650 + 1050 - 140 + 5 = 1565
        double tdee = client.CalculateTDEE(); // 1565 * 1.55 = 2425.75

        // Assert
        Assert.Equal(1565, bmr);
        Assert.Equal(2425.75, tdee);
    }

    [Fact]
    public void KetoMacroStrategy_ComputesCorrectRatios()
    {
        // Arrange
        var strategy = new KetoMacroStrategy();
        double tdee = 2000.0;
        var goal = new DietaryGoal(60, DateTime.UtcNow.AddMonths(3), GoalType.KetogenicAdaptation);

        // Act
        var result = strategy.CalculateTargetMacros(tdee, goal);

        // Assert (Target calories = 1600. Fat=1120cal => 124.44g. Protein=400cal => 100g. Carbs=80cal => 20g)
        Assert.InRange(result.FatGrams, 124, 125);
        Assert.Equal(100, result.ProteinGrams);
        Assert.Equal(20, result.CarbsGrams);
    }

    [Fact]
    public void MealPlan_Composition_CalculatesTotalNutrientsCorrectly()
    {
        // Arrange
        var food = new FoodItem(
            name: "Chicken Breast",
            category: "Poultry",
            nutrientsPer100g: new NutrientProfile(31.0, 0.0, 3.6, 0.0),
            isAllergenic: false
        );

        var entry = new MealEntry(MealType.Lunch, 200.0, food); // 62g protein, 0g carbs, 7.2g fat
        var menu = new DailyMenu(dayNumber: 1, targetCalories: 2000);
        menu.AddMealEntry(entry);

        var plan = new MealPlan(Guid.NewGuid(), "High Protein Plan", DateTime.UtcNow, DateTime.UtcNow.AddDays(7));
        plan.AddDailyMenu(menu);

        // Act
        var totalNutrients = plan.CalculateTotalPlanNutrients();

        // Assert
        Assert.Equal(62.0, totalNutrients.ProteinGrams);
        Assert.Equal(7.2, totalNutrients.FatGrams);
        Assert.Equal(0.0, totalNutrients.CarbsGrams);
    }
}
