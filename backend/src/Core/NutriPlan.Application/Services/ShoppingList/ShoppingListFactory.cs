using System.Text;
using System.Text.Json;
using NutriPlan.Domain.Entities;

namespace NutriPlan.Application.Services.ShoppingList;

public interface IShoppingListBuilder
{
    string BuildShoppingList(MealPlan mealPlan);
}

public class PdfShoppingListBuilder : IShoppingListBuilder
{
    public string BuildShoppingList(MealPlan mealPlan)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"==========================================");
        sb.AppendLine($"       OFFICIAL MEAL PLAN REPORT          ");
        sb.AppendLine($"Plan Title: {mealPlan.Title}");
        sb.AppendLine($"Validity Period: {mealPlan.StartDate:yyyy-MM-dd} - {mealPlan.EndDate:yyyy-MM-dd}");
        sb.AppendLine($"Generated Date: {DateTime.UtcNow:yyyy-MM-dd}");
        sb.AppendLine($"==========================================");
        sb.AppendLine();

        if (mealPlan.DailyMenus == null || !mealPlan.DailyMenus.Any())
        {
            sb.AppendLine("No daily menus found in this plan.");
        }
        else
        {
            var sortedMenus = mealPlan.DailyMenus.OrderBy(m => m.DayNumber).ToList();
            foreach (var menu in sortedMenus)
            {
                var dailyNutrients = menu.CalculateDailyNutrients();
                sb.AppendLine($"------------------------------------------");
                sb.AppendLine($" 📅 วันที่ {menu.DayNumber} (Day {menu.DayNumber})");
                sb.AppendLine($"    เป้าหมายพลังงาน: {menu.TargetCalories:F1} kcal | พลังงานจริง: {dailyNutrients.TotalCalories:F1} kcal");
                sb.AppendLine($"    สารอาหาร: P: {dailyNutrients.ProteinGrams:F1}g | C: {dailyNutrients.CarbsGrams:F1}g | F: {dailyNutrients.FatGrams:F1}g");
                sb.AppendLine($"------------------------------------------");

                if (menu.Entries == null || !menu.Entries.Any())
                {
                    sb.AppendLine("   (ไม่มีรายการอาหารในวันนี้)");
                }
                else
                {
                    var mealTypeOrder = new Dictionary<string, int>
                    {
                        { "Breakfast", 1 }, { "MorningSnack", 2 }, { "Lunch", 3 },
                        { "AfternoonSnack", 4 }, { "Dinner", 5 }, { "Supper", 6 }
                    };

                    var sortedEntries = menu.Entries
                        .OrderBy(e => mealTypeOrder.TryGetValue(e.MealType.ToString(), out var o) ? o : 99)
                        .ToList();

                    foreach (var entry in sortedEntries)
                    {
                        var foodName = entry.FoodItem?.Name ?? "Unspecified Item";
                        var entryNutrients = entry.CalculateEntryNutrients();
                        sb.AppendLine($"   [{entry.MealType}] {foodName} - {entry.PortionGrams:F0}g");
                        sb.AppendLine($"     -> {entryNutrients.TotalCalories:F1} kcal | P: {entryNutrients.ProteinGrams:F1}g | C: {entryNutrients.CarbsGrams:F1}g | F: {entryNutrients.FatGrams:F1}g");
                    }
                }
                sb.AppendLine();
            }

            sb.AppendLine($"==========================================");
            sb.AppendLine($" 🛒 สรุปวัตถุดิบอาหารรวมทั้งหมด (Consolidated Shopping List)");
            sb.AppendLine($"==========================================");
            var consolidatedItems = mealPlan.DailyMenus
                .SelectMany(m => m.Entries)
                .GroupBy(e => e.FoodItem?.Name ?? "Unspecified Item")
                .Select(g => new { FoodName = g.Key, TotalGrams = g.Sum(e => e.PortionGrams) });

            foreach (var item in consolidatedItems)
            {
                sb.AppendLine($" [ ] {item.FoodName}: {item.TotalGrams:F1}g");
            }
        }

        sb.AppendLine($"==========================================");
        return sb.ToString();
    }
}

public class JsonShoppingListBuilder : IShoppingListBuilder
{
    public string BuildShoppingList(MealPlan mealPlan)
    {
        var dailyMenus = mealPlan.DailyMenus
            .OrderBy(m => m.DayNumber)
            .Select(m => {
                var dailyNutrients = m.CalculateDailyNutrients();
                return new
                {
                    dayNumber = m.DayNumber,
                    targetCalories = m.TargetCalories,
                    totalCalories = dailyNutrients.TotalCalories,
                    totalProteinGrams = dailyNutrients.ProteinGrams,
                    totalCarbsGrams = dailyNutrients.CarbsGrams,
                    totalFatGrams = dailyNutrients.FatGrams,
                    entries = m.Entries.Select(e => {
                        var entryNutrients = e.CalculateEntryNutrients();
                        return new
                        {
                            mealType = e.MealType.ToString(),
                            foodItemName = e.FoodItem?.Name,
                            portionGrams = e.PortionGrams,
                            calories = entryNutrients.TotalCalories,
                            proteinGrams = entryNutrients.ProteinGrams,
                            carbsGrams = entryNutrients.CarbsGrams,
                            fatGrams = entryNutrients.FatGrams
                        };
                    })
                };
            });

        var consolidatedShoppingList = mealPlan.DailyMenus
            .SelectMany(m => m.Entries)
            .GroupBy(e => e.FoodItem?.Name ?? "Unspecified Item")
            .Select(g => new { foodName = g.Key, totalGrams = g.Sum(e => e.PortionGrams) });

        var exportPayload = new
        {
            planTitle = mealPlan.Title,
            startDate = mealPlan.StartDate,
            endDate = mealPlan.EndDate,
            generatedAt = DateTime.UtcNow,
            dailyMenus = dailyMenus,
            shoppingListSummary = consolidatedShoppingList
        };

        return JsonSerializer.Serialize(exportPayload, new JsonSerializerOptions { WriteIndented = true });
    }
}

public abstract class ShoppingListFactory
{
    public abstract IShoppingListBuilder CreateListBuilder();

    public string GenerateShoppingList(MealPlan mealPlan)
    {
        var builder = CreateListBuilder();
        return builder.BuildShoppingList(mealPlan);
    }
}

public class PdfShoppingListFactory : ShoppingListFactory
{
    public override IShoppingListBuilder CreateListBuilder()
    {
        return new PdfShoppingListBuilder();
    }
}

public class JsonShoppingListFactory : ShoppingListFactory
{
    public override IShoppingListBuilder CreateListBuilder()
    {
        return new JsonShoppingListBuilder();
    }
}
