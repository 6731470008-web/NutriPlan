using NutriPlan.Domain.Common;

namespace NutriPlan.Domain.ValueObjects;

public class NutrientProfile : ValueObject
{
    public double ProteinGrams { get; private set; }
    public double CarbsGrams { get; private set; }
    public double FatGrams { get; private set; }
    public double FiberGrams { get; private set; }

    // Fix: static readonly field — one allocation per app lifetime, not per call.
    // The old `=> new(0,0,0,0)` property created a new heap object on every access.
    public static readonly NutrientProfile Zero = new(0, 0, 0, 0);

    protected NutrientProfile() { }

    public NutrientProfile(double proteinGrams, double carbsGrams, double fatGrams, double fiberGrams)
    {
        if (proteinGrams < 0 || carbsGrams < 0 || fatGrams < 0 || fiberGrams < 0)
            throw new DomainException("Nutrient quantities cannot be negative.");

        ProteinGrams = proteinGrams;
        CarbsGrams = carbsGrams;
        FatGrams = fatGrams;
        FiberGrams = fiberGrams;
    }

    public double TotalCalories => Math.Round((ProteinGrams * 4.0) + (CarbsGrams * 4.0) + (FatGrams * 9.0), 1);

    public NutrientProfile Scale(double factor)
    {
        if (factor < 0) throw new DomainException("Scale factor must be non-negative.");
        return new NutrientProfile(ProteinGrams * factor, CarbsGrams * factor, FatGrams * factor, FiberGrams * factor);
    }

    public static NutrientProfile operator +(NutrientProfile a, NutrientProfile b)
    {
        return new NutrientProfile(
            a.ProteinGrams + b.ProteinGrams,
            a.CarbsGrams + b.CarbsGrams,
            a.FatGrams + b.FatGrams,
            a.FiberGrams + b.FiberGrams
        );
    }

    // ValueObject structural equality: two NutrientProfiles are equal iff all nutrient values match.
    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return ProteinGrams;
        yield return CarbsGrams;
        yield return FatGrams;
        yield return FiberGrams;
    }
}
