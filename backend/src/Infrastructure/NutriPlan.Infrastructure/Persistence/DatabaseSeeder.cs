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

            // Ensure missing columns exist
            await context.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""DateOfBirth"" timestamp with time zone NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""Gender"" integer NOT NULL DEFAULT 0;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""HealthConditions"" text NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS ""FoodAllergies"" text NULL;
            ");

            // Clean out all previous mock/test clients, nutritionists, meal plans, logs
            var nonAdminUsers = await context.Users
                .Where(u => u.Email != "admin@admin.com")
                .ToListAsync();

            if (nonAdminUsers.Count > 0)
            {
                context.Users.RemoveRange(nonAdminUsers);
                await context.SaveChangesAsync();
                Console.WriteLine($"[DatabaseSeeder] Cleared {nonAdminUsers.Count} previous non-admin accounts.");
            }

            // Ensure admin@admin.com exists with Admin role and default password
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
                Console.WriteLine("[DatabaseSeeder] Verified admin@admin.com credentials.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DatabaseSeeder Warning] Error in DatabaseSeeder: {ex.Message}");
        }
    }
}
