using NutriPlan.Domain.Common;
using NutriPlan.Domain.Enums;
using NutriPlan.Domain.ValueObjects;

namespace NutriPlan.Domain.Entities;

public abstract class User : Entity
{
    public string Email { get; private set; }
    public string PasswordHash { get; private set; }
    public string FullName { get; private set; }
    public UserRole Role { get; private set; }

    protected User() { Email = null!; PasswordHash = null!; FullName = null!; }

    protected User(string email, string passwordHash, string fullName, UserRole role)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains("@"))
            throw new DomainException("Valid email address is required.");
        if (string.IsNullOrWhiteSpace(fullName))
            throw new DomainException("Full name is required.");

        Email = email.ToLowerInvariant().Trim();
        PasswordHash = passwordHash;
        FullName = fullName.Trim();
        Role = role;
    }

    public void UpdateProfile(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new DomainException("Full name cannot be empty.");
        FullName = fullName.Trim();
        Touch();
    }
}

public class Nutritionist : User
{
    public string LicenseNumber { get; private set; }
    public string Specialization { get; private set; }
    private readonly List<Client> _assignedClients = new();
    public IReadOnlyCollection<Client> AssignedClients => _assignedClients.AsReadOnly();

    protected Nutritionist() : base() { LicenseNumber = null!; Specialization = null!; }

    public Nutritionist(string email, string passwordHash, string fullName, string licenseNumber, string specialization)
        : base(email, passwordHash, fullName, UserRole.Nutritionist)
    {
        if (string.IsNullOrWhiteSpace(licenseNumber))
            throw new DomainException("License number is mandatory for nutritionists.");

        LicenseNumber = licenseNumber.Trim();
        Specialization = specialization ?? "General Nutrition";
    }

    public void AssignClient(Client client)
    {
        ArgumentNullException.ThrowIfNull(client);
        if (_assignedClients.Any(c => c.Id == client.Id))
            throw new DomainException("Client is already assigned to this nutritionist.");

        _assignedClients.Add(client);
        Touch();
    }

    public void UnassignClient(Guid clientId)
    {
        var existing = _assignedClients.FirstOrDefault(c => c.Id == clientId);
        if (existing == null)
            throw new DomainException("Client assignment not found.");

        _assignedClients.Remove(existing);
        Touch();
    }
}

public class Client : User
{
    private int _storedAge = 25;

    public DateTime? DateOfBirth { get; private set; }

    public int Age
    {
        get
        {
            if (DateOfBirth.HasValue)
            {
                return CalculateAge(DateOfBirth.Value);
            }
            return _storedAge;
        }
        private set => _storedAge = value;
    }

    public double WeightKg { get; private set; }
    public double HeightCm { get; private set; }
    public Gender Gender { get; private set; }
    public ActivityLevel ActivityLevel { get; private set; }
    public string? HealthConditions { get; private set; }
    public string? FoodAllergies { get; private set; }
    public Guid? AssignedNutritionistId { get; private set; }
    public DietaryGoal? CurrentGoal { get; private set; }

    private readonly List<MealPlan> _mealPlans = new();
    public IReadOnlyCollection<MealPlan> MealPlans => _mealPlans.AsReadOnly();

    private readonly List<MealLog> _mealLogs = new();
    public IReadOnlyCollection<MealLog> MealLogs => _mealLogs.AsReadOnly();

    protected Client() : base() { }

    public Client(string email, string passwordHash, string fullName,
        int age, double weightKg, double heightCm, ActivityLevel activityLevel, Gender gender = Gender.Other,
        string? healthConditions = null, string? foodAllergies = null, DateTime? dateOfBirth = null)
        : base(email, passwordHash, fullName, UserRole.Client)
    {
        Gender = gender;
        DateOfBirth = dateOfBirth.HasValue ? DateTime.SpecifyKind(dateOfBirth.Value.Date, DateTimeKind.Utc) : null;
        HealthConditions = healthConditions?.Trim();
        FoodAllergies = foodAllergies?.Trim();

        int effectiveAge = dateOfBirth.HasValue ? CalculateAge(dateOfBirth.Value) : age;
        UpdateBodyMetrics(effectiveAge, weightKg, heightCm, activityLevel);
    }

    public static int CalculateAge(DateTime birthDate)
    {
        var today = DateTime.UtcNow.Date;
        var age = today.Year - birthDate.Year;
        if (birthDate.Date > today.AddYears(-age)) age--;
        return Math.Max(0, age);
    }

    public void SetDateOfBirth(DateTime dateOfBirth)
    {
        int calculatedAge = CalculateAge(dateOfBirth);
        if (calculatedAge < 12 || calculatedAge > 120)
            throw new DomainException("Age calculated from date of birth must be between 12 and 120.");

        DateOfBirth = DateTime.SpecifyKind(dateOfBirth.Date, DateTimeKind.Utc);
        _storedAge = calculatedAge;
        Touch();
    }

    public void UpdateMedicalHistory(string? healthConditions, string? foodAllergies)
    {
        HealthConditions = healthConditions?.Trim();
        FoodAllergies = foodAllergies?.Trim();
        Touch();
    }

    public void UpdateBodyMetrics(int age, double weightKg, double heightCm, ActivityLevel activityLevel)
    {
        if (age < 12 || age > 120) throw new DomainException("Age must be between 12 and 120.");
        if (weightKg < 30 || weightKg > 350) throw new DomainException("Weight must be realistic (30-350 kg).");
        if (heightCm < 100 || heightCm > 250) throw new DomainException("Height must be realistic (100-250 cm).");

        Age = age;
        WeightKg = weightKg;
        HeightCm = heightCm;
        ActivityLevel = activityLevel;
        Touch();
    }

    public void SetDietaryGoal(DietaryGoal goal)
    {
        CurrentGoal = goal ?? throw new DomainException("Dietary goal cannot be null.");
        Touch();
    }

    public void AssignNutritionist(Guid nutritionistId)
    {
        if (nutritionistId == Guid.Empty) throw new DomainException("Invalid nutritionist ID.");
        AssignedNutritionistId = nutritionistId;
        Touch();
    }

    public void AddMealPlan(MealPlan plan)
    {
        ArgumentNullException.ThrowIfNull(plan);
        _mealPlans.Add(plan);
        Touch();
    }

    public void LogMeal(MealLog log)
    {
        ArgumentNullException.ThrowIfNull(log);
        _mealLogs.Add(log);
        Touch();
    }

    /// <summary>
    /// Harris-Benedict Revised BMR (Mifflin-St Jeor style constants).
    /// Male:   (10 × W) + (6.25 × H) - (5 × A) + 5
    /// Female: (10 × W) + (6.25 × H) - (5 × A) - 161
    /// Other uses the more conservative female formula.
    /// </summary>
    public double CalculateBMR()
    {
        double base_ = (10 * WeightKg) + (6.25 * HeightCm) - (5 * Age);
        return Gender == Gender.Male ? base_ + 5 : base_ - 161;
    }

    public double CalculateTDEE()
    {
        double multiplier = ActivityLevel switch
        {
            ActivityLevel.Sedentary => 1.2,
            ActivityLevel.LightlyActive => 1.375,
            ActivityLevel.ModeratelyActive => 1.55,
            ActivityLevel.VeryActive => 1.725,
            ActivityLevel.ExtraActive => 1.9,
            _ => 1.2
        };

        return CalculateBMR() * multiplier;
    }
}
