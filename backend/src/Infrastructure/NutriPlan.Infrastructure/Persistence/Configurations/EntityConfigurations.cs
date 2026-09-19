using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NutriPlan.Domain.Entities;
using NutriPlan.Domain.ValueObjects;

namespace NutriPlan.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).HasMaxLength(200).IsRequired();
        builder.HasIndex(u => u.Email).IsUnique();
        builder.Property(u => u.FullName).HasMaxLength(150).IsRequired();

        // TPH Inheritance Mapping
        builder.HasDiscriminator(u => u.Role)
            .HasValue<Client>(NutriPlan.Domain.Enums.UserRole.Client)
            .HasValue<Nutritionist>(NutriPlan.Domain.Enums.UserRole.Nutritionist);
    }
}

public class ClientConfiguration : IEntityTypeConfiguration<Client>
{
    public void Configure(EntityTypeBuilder<Client> builder)
    {
        builder.HasMany(c => c.MealPlans)
            .WithOne()
            .HasForeignKey(mp => mp.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(c => c.MealLogs)
            .WithOne()
            .HasForeignKey(ml => ml.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // ✅ Backing field mapping: EF Core populates the private _mealPlans and _mealLogs
        // lists directly via reflection. Without this, EF would need a public setter.
        builder.Navigation(c => c.MealPlans).HasField("_mealPlans").UsePropertyAccessMode(PropertyAccessMode.Field);
        builder.Navigation(c => c.MealLogs).HasField("_mealLogs").UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.OwnsOne(c => c.CurrentGoal, goal =>
        {
            goal.Property(g => g.TargetWeightKg).HasColumnName("goal_target_weight_kg");
            goal.Property(g => g.TargetDate).HasColumnName("goal_target_date");
            goal.Property(g => g.GoalType).HasColumnName("goal_type");
        });
    }
}

public class NutritionistConfiguration : IEntityTypeConfiguration<Nutritionist>
{
    public void Configure(EntityTypeBuilder<Nutritionist> builder)
    {
        builder.Property(n => n.LicenseNumber).HasMaxLength(50);
        builder.Property(n => n.Specialization).HasMaxLength(100);

        builder.HasMany(n => n.AssignedClients)
            .WithOne()
            .HasForeignKey(c => c.AssignedNutritionistId)
            .OnDelete(DeleteBehavior.SetNull);

        // ✅ Backing field for encapsulated AssignedClients collection.
        builder.Navigation(n => n.AssignedClients).HasField("_assignedClients").UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public class FoodItemConfiguration : IEntityTypeConfiguration<FoodItem>
{
    public void Configure(EntityTypeBuilder<FoodItem> builder)
    {
        builder.ToTable("food_items");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Name).HasMaxLength(200).IsRequired();
        builder.Property(f => f.Category).HasMaxLength(100).IsRequired();

        // Flatten NutrientProfile Value Object into food_items table
        builder.OwnsOne(f => f.NutrientsPer100g, n =>
        {
            n.Property(p => p.ProteinGrams).HasColumnName("protein_g");
            n.Property(p => p.CarbsGrams).HasColumnName("carbs_g");
            n.Property(p => p.FatGrams).HasColumnName("fat_g");
            n.Property(p => p.FiberGrams).HasColumnName("fiber_g");
        });
    }
}

public class MealPlanConfiguration : IEntityTypeConfiguration<MealPlan>
{
    public void Configure(EntityTypeBuilder<MealPlan> builder)
    {
        builder.ToTable("meal_plans");
        builder.HasKey(mp => mp.Id);
        builder.Property(mp => mp.Title).HasMaxLength(200).IsRequired();

        // Composition: MealPlan owns DailyMenus
        builder.HasMany(mp => mp.DailyMenus)
            .WithOne()
            .HasForeignKey("MealPlanId")
            .OnDelete(DeleteBehavior.Cascade);

        // ✅ Backing field: EF Core writes directly into the private _dailyMenus List<>.
        builder.Navigation(mp => mp.DailyMenus).HasField("_dailyMenus").UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public class DailyMenuConfiguration : IEntityTypeConfiguration<DailyMenu>
{
    public void Configure(EntityTypeBuilder<DailyMenu> builder)
    {
        builder.ToTable("daily_menus");
        builder.HasKey(dm => dm.Id);

        // Ignore unmapped C# target macro helper properties
        builder.Ignore(dm => dm.TargetProteinGrams);
        builder.Ignore(dm => dm.TargetCarbsGrams);
        builder.Ignore(dm => dm.TargetFatGrams);

        // Composition: DailyMenu owns MealEntries
        builder.HasMany(dm => dm.Entries)
            .WithOne()
            .HasForeignKey("DailyMenuId")
            .OnDelete(DeleteBehavior.Cascade);

        // ✅ Backing field: EF Core populates the private _entries List<> when querying.
        // Without this mapping, EF could not hydrate the collection in entities
        // that expose only IReadOnlyCollection<> without a public setter.
        builder.Navigation(dm => dm.Entries).HasField("_entries").UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public class MealEntryConfiguration : IEntityTypeConfiguration<MealEntry>
{
    public void Configure(EntityTypeBuilder<MealEntry> builder)
    {
        builder.ToTable("meal_entries");
        builder.HasKey(me => me.Id);

        // Aggregation: MealEntry references FoodItem
        builder.HasOne(me => me.FoodItem)
            .WithMany()
            .HasForeignKey(me => me.FoodItemId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class MealLogConfiguration : IEntityTypeConfiguration<MealLog>
{
    public void Configure(EntityTypeBuilder<MealLog> builder)
    {
        builder.ToTable("meal_logs");
        builder.HasKey(ml => ml.Id);
    }
}
