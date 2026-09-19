using NutriPlan.Domain.Entities;
using NutriPlan.Domain.ValueObjects;

namespace NutriPlan.Domain.Strategies;

public interface IMacroCalculatorStrategy
{
    NutrientProfile CalculateTargetMacros(double tdeeCalories, DietaryGoal goal);
}

public class KetoMacroStrategy : IMacroCalculatorStrategy
{
    public NutrientProfile CalculateTargetMacros(double tdeeCalories, DietaryGoal goal)
    {
        double targetCalories = tdeeCalories * 0.80; // 20% caloric deficit for Keto
        double fatCal = targetCalories * 0.70;       // 70% Fat
        double proteinCal = targetCalories * 0.25;   // 25% Protein
        double carbsCal = targetCalories * 0.05;     // 5% Carbs

        return new NutrientProfile(
            proteinGrams: proteinCal / 4.0,
            carbsGrams: carbsCal / 4.0,
            fatGrams: fatCal / 9.0,
            fiberGrams: 25.0
        );
    }
}

public class HighProteinStrategy : IMacroCalculatorStrategy
{
    public NutrientProfile CalculateTargetMacros(double tdeeCalories, DietaryGoal goal)
    {
        double targetCalories = tdeeCalories * 1.10; // 10% Surplus for Muscle Gain
        double proteinCal = targetCalories * 0.40;   // 40% Protein
        double carbsCal = targetCalories * 0.40;     // 40% Carbs
        double fatCal = targetCalories * 0.20;       // 20% Fat

        return new NutrientProfile(
            proteinGrams: proteinCal / 4.0,
            carbsGrams: carbsCal / 4.0,
            fatGrams: fatCal / 9.0,
            fiberGrams: 35.0
        );
    }
}

public class BalancedMacroStrategy : IMacroCalculatorStrategy
{
    public NutrientProfile CalculateTargetMacros(double tdeeCalories, DietaryGoal goal)
    {
        double targetCalories = tdeeCalories;       // Maintenance
        double proteinCal = targetCalories * 0.30;   // 30% Protein
        double carbsCal = targetCalories * 0.45;     // 45% Carbs
        double fatCal = targetCalories * 0.25;       // 25% Fat

        return new NutrientProfile(
            proteinGrams: proteinCal / 4.0,
            carbsGrams: carbsCal / 4.0,
            fatGrams: fatCal / 9.0,
            fiberGrams: 30.0
        );
    }
}
