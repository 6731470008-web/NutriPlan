namespace NutriPlan.Domain.Enums;

public enum UserRole
{
    Client = 1,
    Nutritionist = 2,
    Admin = 3
}

public enum Gender
{
    Male = 1,
    Female = 2,
    Other = 3   // Uses female formula as conservative default
}

public enum MealType
{
    Breakfast = 1,
    MorningSnack = 2,
    Lunch = 3,
    AfternoonSnack = 4,
    Dinner = 5,
    Supper = 6
}

public enum GoalType
{
    WeightLoss = 1,
    Maintenance = 2,
    MuscleGain = 3,
    KetogenicAdaptation = 4
}

public enum ActivityLevel
{
    Sedentary = 1,      // 1.2
    LightlyActive = 2,  // 1.375
    ModeratelyActive = 3, // 1.55
    VeryActive = 4,     // 1.725
    ExtraActive = 5     // 1.9
}
