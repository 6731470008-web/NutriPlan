using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using NutriPlan.Domain.Entities;
using NutriPlan.Domain.Enums;

namespace NutriPlan.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        try
        {
            await context.Database.EnsureCreatedAsync();

            var defaultPasswordHash = BCrypt.Net.BCrypt.HashPassword("00000000");

            // Ensure missing columns exist and elevate admin@admin.com to Admin role with default password
            await context.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""DateOfBirth"" timestamp with time zone NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""Gender"" integer NOT NULL DEFAULT 0;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""HealthConditions"" text NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""FoodAllergies"" text NULL;
            ");
            await context.Database.ExecuteSqlAsync($"UPDATE users SET \"Role\" = 3, \"PasswordHash\" = {defaultPasswordHash} WHERE LOWER(\"Email\") = 'admin@admin.com';");

            // Seed user@test.com if it doesn't exist
            if (!await context.Users.AnyAsync(u => u.Email == "user@test.com"))
            {
                var userTest = new Client(
                    email: "user@test.com",
                    passwordHash: defaultPasswordHash,
                    fullName: "ผู้ใช้ทดสอบ (Test User)",
                    age: 27,
                    weightKg: 65.0,
                    heightCm: 170.0,
                    activityLevel: ActivityLevel.ModeratelyActive,
                    gender: Gender.Other,
                    healthConditions: null,
                    foodAllergies: null,
                    dateOfBirth: DateTime.SpecifyKind(new DateTime(1999, 1, 15), DateTimeKind.Utc)
                );

                await context.Users.AddAsync(userTest);
            }

            // Seed client@test.com if it doesn't exist
            if (!await context.Users.AnyAsync(u => u.Email == "client@test.com"))
            {
                var clientTest = new Client(
                    email: "client@test.com",
                    passwordHash: defaultPasswordHash,
                    fullName: "สมชาย รักสุขภาพ (Client Demo)",
                    age: 28,
                    weightKg: 70.0,
                    heightCm: 175.0,
                    activityLevel: ActivityLevel.ModeratelyActive,
                    gender: Gender.Male,
                    healthConditions: "ความดันโลหิตสูงเล็กน้อย",
                    foodAllergies: "กุ้ง, อาหารทะเล",
                    dateOfBirth: DateTime.SpecifyKind(new DateTime(1996, 5, 15), DateTimeKind.Utc)
                );

                await context.Users.AddAsync(clientTest);
            }

            // Seed nutritionist@test.com if it doesn't exist
            if (!await context.Users.AnyAsync(u => u.Email == "nutritionist@test.com"))
            {
                var nutritionistTest = new Nutritionist(
                    email: "nutritionist@test.com",
                    passwordHash: defaultPasswordHash,
                    fullName: "ดร.สมหญิง โภชนาการ (Nutritionist Demo)",
                    licenseNumber: "LIC-998877",
                    specialization: "Clinical Nutrition & Dietetics"
                );

                await context.Users.AddAsync(nutritionistTest);
            }

            // Seed admin@admin.com if it doesn't exist with Admin role
            Nutritionist adminUser;
            var existingAdmin = await context.Users.OfType<Nutritionist>().FirstOrDefaultAsync(u => u.Email == "admin@admin.com");
            if (existingAdmin == null)
            {
                adminUser = new Nutritionist(
                    email: "admin@admin.com",
                    passwordHash: defaultPasswordHash,
                    fullName: "ดร. สมชาย ภักดีโภชน (System Admin)",
                    licenseNumber: "LIC-102938",
                    specialization: "Clinical Nutrition & System Administration",
                    role: UserRole.Admin
                );
                await context.Users.AddAsync(adminUser);
                await context.SaveChangesAsync();
            }
            else
            {
                adminUser = existingAdmin;
            }

            // Seed nutritionist@admin.com if it doesn't exist (Nutritionist role with full client access)
            Nutritionist staffNutritionist;
            var existingStaff = await context.Users.OfType<Nutritionist>().FirstOrDefaultAsync(u => u.Email == "nutritionist@admin.com");
            if (existingStaff == null)
            {
                staffNutritionist = new Nutritionist(
                    email: "nutritionist@admin.com",
                    passwordHash: defaultPasswordHash,
                    fullName: "พญ. นภาพร วงศ์โภชนา (Nutritionist Staff)",
                    licenseNumber: "LIC-887766",
                    specialization: "Clinical Nutrition & Patient Care"
                );
                await context.Users.AddAsync(staffNutritionist);
                await context.SaveChangesAsync();
            }
            else
            {
                staffNutritionist = existingStaff;
            }

            // Seed 10 clients assigned to admin@admin.com with 10-day meal plans
            var mockClientsData = new[]
            {
                new { Email = "client01@nutriplan.com", Name = "คุณวิภาดา สุขสำราญ", Age = 34, W = 68.0, H = 160.0, Gender = Gender.Female, Act = ActivityLevel.ModeratelyActive, Health = "ไขมันในเลือดสูง (Hyperlipidemia)", Allergy = "กุ้ง, อาหารทะเล", GoalTitle = "แผนโภชนาการลดไขมัน 10 วัน", Cal = 1500.0, P = 94.0, C = 188.0, F = 42.0 },
                new { Email = "client02@nutriplan.com", Name = "คุณสุรศักดิ์ เด่นดวง", Age = 45, W = 82.0, H = 172.0, Gender = Gender.Male, Act = ActivityLevel.LightlyActive, Health = "เบาหวานชนิดที่ 2 (Type 2 Diabetes)", Allergy = "ไม่มี", GoalTitle = "แผนโภชนาการ Low GI คุมน้ำตาล 10 วัน", Cal = 1700.0, P = 106.0, C = 213.0, F = 47.0 },
                new { Email = "client03@nutriplan.com", Name = "คุณพิมลพรรณ วงศ์เทวา", Age = 29, W = 52.0, H = 163.0, Gender = Gender.Female, Act = ActivityLevel.ModeratelyActive, Health = "ภาวะโลหิตจาง (Anemia)", Allergy = "ถั่วเหลือง", GoalTitle = "แผนโภชนาการเสริมธาตุเหล็ก 10 วัน", Cal = 1800.0, P = 113.0, C = 225.0, F = 50.0 },
                new { Email = "client04@nutriplan.com", Name = "คุณอนุรักษ์ ปัญญาวุธ", Age = 52, W = 78.0, H = 168.0, Gender = Gender.Male, Act = ActivityLevel.LightlyActive, Health = "ความดันโลหิตสูง (Hypertension - DASH)", Allergy = "นมวัว (Lactose)", GoalTitle = "แผนโภชนาการ DASH คุมความดัน 10 วัน", Cal = 1600.0, P = 100.0, C = 200.0, F = 44.0 },
                new { Email = "client05@nutriplan.com", Name = "คุณณิชาภัทร เลิศศิริ", Age = 38, W = 59.0, H = 158.0, Gender = Gender.Female, Act = ActivityLevel.ModeratelyActive, Health = "กรดไหลย้อน (GERD)", Allergy = "ผงชูรส, อาหารรสจัด", GoalTitle = "แผนโภชนาการย่อยง่ายลดกรด 10 วัน", Cal = 1550.0, P = 97.0, C = 194.0, F = 43.0 },
                new { Email = "client06@nutriplan.com", Name = "คุณชยุต รัตนโชติ", Age = 27, W = 74.0, H = 178.0, Gender = Gender.Male, Act = ActivityLevel.VeryActive, Health = "สร้างกล้ามเนื้อ (Athlete)", Allergy = "ไม่มี", GoalTitle = "แผนโภชนาการ High Protein 10 วัน", Cal = 2400.0, P = 180.0, C = 270.0, F = 67.0 },
                new { Email = "client07@nutriplan.com", Name = "คุณธิดารัตน์ รุ่งเรือง", Age = 41, W = 64.0, H = 155.0, Gender = Gender.Female, Act = ActivityLevel.LightlyActive, Health = "ภาวะถุงน้ำในรังไข่ (PCOS)", Allergy = "แป้งสาลี (Gluten)", GoalTitle = "แผนโภชนาการ Gluten-Free Low Carb 10 วัน", Cal = 1450.0, P = 91.0, C = 145.0, F = 56.0 },
                new { Email = "client08@nutriplan.com", Name = "คุณเกียรติศักดิ์ เจริญพร", Age = 60, W = 66.0, H = 165.0, Gender = Gender.Male, Act = ActivityLevel.Sedentary, Health = "โรคเกาต์ (Gout)", Allergy = "ปีกไก่, เครื่องในสัตว์", GoalTitle = "แผนโภชนาการ Low Purine 10 วัน", Cal = 1650.0, P = 103.0, C = 206.0, F = 46.0 },
                new { Email = "client09@nutriplan.com", Name = "คุณมณีรัตน์ แสงทอง", Age = 31, W = 55.0, H = 162.0, Gender = Gender.Female, Act = ActivityLevel.ModeratelyActive, Health = "คุณแม่ให้นมบุตร (Postpartum)", Allergy = "ไม่มี", GoalTitle = "แผนโภชนาการบำรุงน้ำนม 10 วัน", Cal = 2200.0, P = 138.0, C = 275.0, F = 61.0 },
                new { Email = "client10@nutriplan.com", Name = "คุณกิตติพงษ์ ศรีอุบล", Age = 50, W = 85.0, H = 170.0, Gender = Gender.Male, Act = ActivityLevel.LightlyActive, Health = "ไขมันพอกตับ (NAFLD)", Allergy = "อาหารหมักดอง", GoalTitle = "แผนโภชนาการ Mediterranean Diet 10 วัน", Cal = 1600.0, P = 100.0, C = 200.0, F = 44.0 }
            };

            foreach (var item in mockClientsData)
            {
                if (!await context.Users.AnyAsync(u => u.Email == item.Email))
                {
                    var client = new Client(
                        email: item.Email,
                        passwordHash: defaultPasswordHash,
                        fullName: item.Name,
                        age: item.Age,
                        weightKg: item.W,
                        heightCm: item.H,
                        activityLevel: item.Act,
                        gender: item.Gender,
                        healthConditions: item.Health,
                        foodAllergies: item.Allergy,
                        dateOfBirth: DateTime.SpecifyKind(DateTime.UtcNow.AddYears(-item.Age), DateTimeKind.Utc)
                    );

                    client.AssignNutritionist(adminUser.Id);

                    // Create 10-day MealPlan
                    var plan = new MealPlan(client.Id, item.GoalTitle, DateTime.UtcNow, DateTime.UtcNow.AddDays(10));
                    for (int day = 1; day <= 10; day++)
                    {
                        var dailyMenu = new DailyMenu(day, item.Cal, item.P, item.C, item.F);
                        plan.AddDailyMenu(dailyMenu);
                    }
                    client.AddMealPlan(plan);

                    await context.Users.AddAsync(client);
                }
            }

            await context.SaveChangesAsync();
            Console.WriteLine("[DatabaseSeeder] Successfully seeded admin@admin.com and 10 patients with 10-day meal plans.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DatabaseSeeder Warning] Failed to seed demo users: {ex.Message}");
        }
    }
}
