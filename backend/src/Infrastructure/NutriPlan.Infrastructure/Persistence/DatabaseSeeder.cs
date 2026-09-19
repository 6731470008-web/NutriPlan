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

            // Ensure missing columns exist in existing PostgreSQL schema
            await context.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""DateOfBirth"" timestamp with time zone NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""Gender"" integer NOT NULL DEFAULT 0;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""HealthConditions"" text NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""FoodAllergies"" text NULL;
            ");

            var defaultPasswordHash = BCrypt.Net.BCrypt.HashPassword("00000000");

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

            await context.SaveChangesAsync();
            Console.WriteLine("[DatabaseSeeder] Successfully updated database schema and seeded initial demo accounts (user@test.com, client@test.com, nutritionist@test.com).");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DatabaseSeeder Warning] Failed to seed demo users: {ex.Message}");
        }
    }
}
