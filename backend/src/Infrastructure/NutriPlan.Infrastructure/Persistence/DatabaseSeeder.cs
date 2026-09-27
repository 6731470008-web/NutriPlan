using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using NutriPlan.Domain.Common;
using NutriPlan.Domain.Entities;
using NutriPlan.Domain.Enums;
using NutriPlan.Domain.ValueObjects;

namespace NutriPlan.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        try
        {
            await context.Database.EnsureCreatedAsync();

            var defaultPasswordHash = BCrypt.Net.BCrypt.HashPassword("00000000");

            // Ensure missing columns exist
            await context.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""DateOfBirth"" timestamp with time zone NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""Gender"" integer NOT NULL DEFAULT 0;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""HealthConditions"" text NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""FoodAllergies"" text NULL;
            ");

            // 1. Ensure Food Items exist first so meal plans can attach to them
            var chickenItem = await context.FoodItems.FirstOrDefaultAsync(f => f.Name.Contains("อกไก่ย่าง"))
                           ?? await context.FoodItems.FirstOrDefaultAsync(f => f.Name.Contains("Chicken"));
            if (chickenItem == null)
            {
                chickenItem = new FoodItem("อกไก่ย่าง (Grilled Chicken Breast)", "Meat", new NutrientProfile(30.0, 0.0, 3.5, 0.0), false);
                await context.FoodItems.AddAsync(chickenItem);
                await context.SaveChangesAsync();
            }

            var riceItem = await context.FoodItems.FirstOrDefaultAsync(f => f.Name.Contains("ข้าวกล้อง"))
                        ?? await context.FoodItems.FirstOrDefaultAsync(f => f.Name.Contains("Rice"));
            if (riceItem == null)
            {
                riceItem = new FoodItem("ข้าวกล้องสุก (Cooked Brown Rice)", "Grain", new NutrientProfile(2.6, 23.5, 0.9, 1.8), false);
                await context.FoodItems.AddAsync(riceItem);
                await context.SaveChangesAsync();
            }

            var eggItem = await context.FoodItems.FirstOrDefaultAsync(f => f.Name.Contains("ไข่ต้ม"))
                       ?? await context.FoodItems.FirstOrDefaultAsync(f => f.Name.Contains("Egg"));
            if (eggItem == null)
            {
                eggItem = new FoodItem("ไข่ต้ม (Boiled Egg)", "Dairy & Egg", new NutrientProfile(12.6, 1.1, 10.6, 0.0), true, "Contains Egg");
                await context.FoodItems.AddAsync(eggItem);
                await context.SaveChangesAsync();
            }

            var broccoliItem = await context.FoodItems.FirstOrDefaultAsync(f => f.Name.Contains("บล็อกโคลี"))
                            ?? await context.FoodItems.FirstOrDefaultAsync(f => f.Name.Contains("Broccoli"));
            if (broccoliItem == null)
            {
                broccoliItem = new FoodItem("บล็อกโคลีนึ่ง (Steamed Broccoli)", "Vegetable", new NutrientProfile(2.4, 7.2, 0.4, 3.3), false);
                await context.FoodItems.AddAsync(broccoliItem);
                await context.SaveChangesAsync();
            }

            // 2. Ensure Admin User
            var existingAdmin = await context.Users.OfType<Nutritionist>().FirstOrDefaultAsync(u => u.Email == "admin@admin.com");
            if (existingAdmin == null)
            {
                var adminUser = new Nutritionist(
                    email: "admin@admin.com",
                    passwordHash: defaultPasswordHash,
                    fullName: "ดร. สมชาย ภักดีโภชน (System Admin)",
                    licenseNumber: "LIC-102938",
                    specialization: "Clinical Nutrition & System Administration",
                    role: UserRole.Admin
                );
                await context.Users.AddAsync(adminUser);
                await context.SaveChangesAsync();
                Console.WriteLine("[DatabaseSeeder] Seeded clean admin@admin.com account.");
            }
            else
            {
                await context.Database.ExecuteSqlAsync($"UPDATE users SET \"Role\" = 3, \"PasswordHash\" = {defaultPasswordHash} WHERE LOWER(\"Email\") = 'admin@admin.com';");
            }

            // 3. Ensure Interconnected Academic Nutritionist (Dr. Sarah Connor, RDN)
            var nutritionistGuid = Guid.Parse("11111111-1111-1111-1111-111111111111");
            var existingNutritionist = await context.Users.OfType<Nutritionist>().FirstOrDefaultAsync(u => u.Email == "nutritionist@test.com" || u.Id == nutritionistGuid);
            Nutritionist proNutritionist;
            if (existingNutritionist == null)
            {
                proNutritionist = new Nutritionist(
                    email: "nutritionist@test.com",
                    passwordHash: defaultPasswordHash,
                    fullName: "Dr. Sarah Connor, RDN",
                    licenseNumber: "LIC-RDN-98421",
                    specialization: "Sports & Hypertrophy (ผู้เชี่ยวชาญโภชนาการคลินิกและการกีฬา)",
                    role: UserRole.Nutritionist
                );
                typeof(Entity).GetProperty(nameof(Entity.Id))?.SetValue(proNutritionist, nutritionistGuid);
                await context.Users.AddAsync(proNutritionist);
                await context.SaveChangesAsync();
                Console.WriteLine("[DatabaseSeeder] Seeded linked Nutritionist (Dr. Sarah Connor, RDN).");
            }
            else
            {
                proNutritionist = existingNutritionist;
                await context.Database.ExecuteSqlAsync($"UPDATE users SET \"PasswordHash\" = {defaultPasswordHash} WHERE LOWER(\"Email\") = 'nutritionist@test.com';");
            }

            // 4. Ensure Interconnected Academic Client (John Doe)
            var clientGuid = Guid.Parse("22222222-2222-2222-2222-222222222222");
            var existingClient = await context.Users.OfType<Client>().FirstOrDefaultAsync(u => u.Email == "client@test.com" || u.Id == clientGuid);
            Client activeClient;
            if (existingClient == null)
            {
                activeClient = new Client(
                    email: "client@test.com",
                    passwordHash: defaultPasswordHash,
                    fullName: "สมศักดิ์ สุขภาพดี (John Doe)",
                    age: 28,
                    weightKg: 74.5,
                    heightCm: 178.0,
                    activityLevel: ActivityLevel.ModeratelyActive,
                    gender: Gender.Male,
                    healthConditions: "Healthy • Fitness Goal (ต้องการลดไขมันและเสริมสร้างกล้ามเนื้อ)",
                    foodAllergies: "Peanuts (แพ้ถั่วลิสง)"
                );
                typeof(Entity).GetProperty(nameof(Entity.Id))?.SetValue(activeClient, clientGuid);
                activeClient.AssignNutritionist(nutritionistGuid);

                await context.Users.AddAsync(activeClient);
                await context.SaveChangesAsync();
                Console.WriteLine("[DatabaseSeeder] Seeded linked Client (John Doe) assigned to Dr. Sarah Connor.");
            }
            else
            {
                activeClient = existingClient;
                activeClient.AssignNutritionist(nutritionistGuid);
                await context.Database.ExecuteSqlAsync($"UPDATE users SET \"PasswordHash\" = {defaultPasswordHash}, \"AssignedNutritionistId\" = {nutritionistGuid} WHERE LOWER(\"Email\") = 'client@test.com';");
            }

            // 5. Ensure Active Prescribed Meal Plan exists for the Client
            var existingPlan = await context.MealPlans.Include(p => p.DailyMenus).FirstOrDefaultAsync(p => p.ClientId == clientGuid);
            if (existingPlan == null)
            {
                var plan = new MealPlan(
                    clientGuid,
                    "แผนโภชนาการโปรตีนสูงเสริมสร้างกล้ามเนื้อ (14-Day High-Protein Hypertrophy Plan)",
                    DateTime.UtcNow.Date,
                    DateTime.UtcNow.Date.AddDays(14)
                );

                for (int day = 1; day <= 7; day++)
                {
                    var menu = new DailyMenu(day, targetCalories: 2150, targetProteinGrams: 155, targetCarbsGrams: 230, targetFatGrams: 65);
                    if (chickenItem != null) menu.AddMealEntry(new MealEntry(MealType.Lunch, 200, chickenItem));
                    if (riceItem != null) menu.AddMealEntry(new MealEntry(MealType.Lunch, 150, riceItem));
                    if (broccoliItem != null) menu.AddMealEntry(new MealEntry(MealType.Lunch, 100, broccoliItem));
                    if (eggItem != null) menu.AddMealEntry(new MealEntry(MealType.Breakfast, 120, eggItem));
                    plan.AddDailyMenu(menu);
                }

                await context.MealPlans.AddAsync(plan);
                await context.SaveChangesAsync();
                Console.WriteLine("[DatabaseSeeder] Seeded active 14-day meal plan for Client.");
            }

            // 6. Ensure Meal Logs exist for high compliance demonstration
            var existingLogs = await context.MealLogs.Where(l => l.ClientId == clientGuid).ToListAsync();
            if (existingLogs.Count == 0)
            {
                var dummyEntryId = Guid.NewGuid();
                for (int i = 0; i < 10; i++)
                {
                    var log = new MealLog(clientGuid, dummyEntryId, actualPortionGrams: 200, plannedPortionGrams: 200);
                    typeof(Entity).GetProperty(nameof(Entity.CreatedAt))?.SetValue(log, DateTime.UtcNow.AddDays(-i));
                    await context.MealLogs.AddAsync(log);
                }
                await context.SaveChangesAsync();
                Console.WriteLine("[DatabaseSeeder] Seeded adherence meal logs for Client.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DatabaseSeeder Warning] Error in DatabaseSeeder: {ex.Message}");
        }
    }
}
