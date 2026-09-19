using Microsoft.EntityFrameworkCore;
using NutriPlan.Application.Common.Interfaces;
using NutriPlan.Domain.Entities;
using NutriPlan.Domain.ValueObjects;

namespace NutriPlan.Infrastructure.Persistence.Repositories;

public class UserRepository : IUserRepository
{
    private readonly ApplicationDbContext _context;

    public UserRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _context.Users.FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant().Trim(), cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        await _context.Users.AddAsync(user, cancellationToken);
    }

    public async Task<List<Client>> GetClientsByNutritionistIdAsync(Guid nutritionistId, CancellationToken cancellationToken = default)
    {
        return await _context.Clients
            .Where(c => c.AssignedNutritionistId == nutritionistId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<Client>> GetUnassignedClientsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Clients
            .Where(c => c.AssignedNutritionistId == null)
            .ToListAsync(cancellationToken);
    }
}

public class MealPlanRepository : IMealPlanRepository
{
    private readonly ApplicationDbContext _context;

    public MealPlanRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<MealPlan?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.MealPlans
            .Include(mp => mp.DailyMenus)
                .ThenInclude(dm => dm.Entries)
                    .ThenInclude(e => e.FoodItem)
            .FirstOrDefaultAsync(mp => mp.Id == id, cancellationToken);
    }

    /// <summary>
    /// Loads a MealPlan by a DailyMenu ID rather than the plan's own ID.
    /// Used by RemoveMealEntryAsync which only knows the menu/entry IDs.
    /// </summary>
    public async Task<MealPlan?> GetByIdWithMenuAsync(Guid menuId, CancellationToken cancellationToken = default)
    {
        return await _context.MealPlans
            .Include(mp => mp.DailyMenus)
                .ThenInclude(dm => dm.Entries)
            .FirstOrDefaultAsync(mp => mp.DailyMenus.Any(dm => dm.Id == menuId), cancellationToken);
    }

    public async Task<List<MealPlan>> GetByClientIdAsync(Guid clientId, CancellationToken cancellationToken = default)
    {
        return await _context.MealPlans
            .Include(mp => mp.DailyMenus)
            .Where(mp => mp.ClientId == clientId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(MealPlan mealPlan, CancellationToken cancellationToken = default)
    {
        await _context.MealPlans.AddAsync(mealPlan, cancellationToken);
    }

    public void Update(MealPlan mealPlan)
    {
        _context.MealPlans.Update(mealPlan);
    }
}

public class FoodItemRepository : IFoodItemRepository
{
    private readonly ApplicationDbContext _context;

    public FoodItemRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<FoodItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.FoodItems.FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
    }

    public async Task<List<FoodItem>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = await _context.FoodItems.ToListAsync(cancellationToken);

        var defaultFoods = new List<FoodItem>
        {
            // Meat & Poultry (เนื้อสัตว์และสัตว์ปีก)
            new("อกไก่ต้ม (Boiled Chicken Breast)", "Meat", new NutrientProfile(31.0, 0.0, 3.6, 0.0), false),
            new("อกไก่ย่าง (Grilled Chicken Breast)", "Meat", new NutrientProfile(30.0, 0.0, 3.5, 0.0), false),
            new("อกไก่ฉีก (Shredded Boiled Chicken)", "Meat", new NutrientProfile(31.5, 0.0, 3.2, 0.0), false),
            new("น่องไก่ไม่มีหนัง (Chicken Thigh Skinless)", "Meat", new NutrientProfile(24.0, 0.0, 8.0, 0.0), false),
            new("น่องติดสะโพกไก่อบ (Roasted Chicken Leg Quarter)", "Meat", new NutrientProfile(22.0, 0.0, 14.0, 0.0), false),
            new("ตับไก่ต้ม (Boiled Chicken Liver)", "Meat", new NutrientProfile(24.5, 0.9, 6.5, 0.0), false),
            new("สันในหมูต้ม (Boiled Pork Loin)", "Meat", new NutrientProfile(26.0, 0.0, 3.5, 0.0), false),
            new("หมูเนื้อแดงย่าง (Grilled Pork Red Meat)", "Meat", new NutrientProfile(25.0, 0.0, 7.5, 0.0), false),
            new("สันนอกหมูย่าง (Grilled Pork Chop)", "Meat", new NutrientProfile(25.0, 0.0, 12.0, 0.0), false),
            new("ตับหมูต้ม (Boiled Pork Liver)", "Meat", new NutrientProfile(26.0, 3.8, 4.4, 0.0), false),
            new("สเต๊กเนื้อสันใน (Beef Tenderloin Steak)", "Meat", new NutrientProfile(28.0, 0.0, 10.0, 0.0), false),
            new("เนื้อบดลีน (Lean Ground Beef 90/10)", "Meat", new NutrientProfile(26.0, 0.0, 10.0, 0.0), false),
            new("เนื้อแกะย่าง (Grilled Lamb Chop)", "Meat", new NutrientProfile(25.0, 0.0, 16.5, 0.0), false),
            new("เป็ดอบ (Roasted Duck Breast)", "Meat", new NutrientProfile(23.5, 0.0, 11.2, 0.0), false),

            // Seafood (อาหารทะเล)
            new("แซลมอนย่าง (Grilled Salmon)", "Seafood", new NutrientProfile(22.0, 0.0, 13.0, 0.0), true, "Contains Fish"),
            new("กุ้งต้ม (Boiled Shrimp)", "Seafood", new NutrientProfile(24.0, 0.2, 0.3, 0.0), true, "Contains Shellfish/Crustaceans"),
            new("ปลากระพงนึ่ง (Steamed Sea Bass)", "Seafood", new NutrientProfile(23.0, 0.0, 2.5, 0.0), true, "Contains Fish"),
            new("ปลาทูน่าในน้ำแร่ (Tuna in Water)", "Seafood", new NutrientProfile(26.0, 0.0, 1.0, 0.0), true, "Contains Fish"),
            new("ปลาทูนึ่ง (Steamed Mackerel / Pla Too)", "Seafood", new NutrientProfile(20.0, 0.0, 8.5, 0.0), true, "Contains Fish"),
            new("ปลาดุกย่าง (Grilled Catfish)", "Seafood", new NutrientProfile(18.5, 0.0, 7.2, 0.0), true, "Contains Fish"),
            new("ปลาซาบะย่าง (Grilled Saba Mackerel)", "Seafood", new NutrientProfile(19.0, 0.0, 14.0, 0.0), true, "Contains Fish"),
            new("ปลาหมึกย่าง (Grilled Squid)", "Seafood", new NutrientProfile(18.0, 3.0, 1.4, 0.0), true, "Contains Mollusks"),
            new("หอยแมลงภู่ต้ม (Boiled Mussels)", "Seafood", new NutrientProfile(24.0, 7.0, 4.5, 0.0), true, "Contains Shellfish"),
            new("เนื้อปูต้ม (Boiled Crab Meat)", "Seafood", new NutrientProfile(18.0, 0.0, 1.0, 0.0), true, "Contains Shellfish/Crustaceans"),

            // Eggs & Plant Protein (ไข่และโปรตีนพืช)
            new("ไข่ต้ม (Boiled Egg)", "Dairy & Egg", new NutrientProfile(12.6, 1.1, 10.6, 0.0), true, "Contains Egg"),
            new("ไข่ขาวต้ม (Boiled Egg Whites)", "Dairy & Egg", new NutrientProfile(11.0, 0.7, 0.2, 0.0), true, "Contains Egg"),
            new("เต้าหู้ขาวกระดาน (Firm Tofu)", "Vegetarian", new NutrientProfile(10.0, 2.0, 5.0, 1.0), true, "Contains Soy"),
            new("เต้าหู้อ่อน (Soft Tofu)", "Vegetarian", new NutrientProfile(6.5, 1.8, 3.0, 0.5), true, "Contains Soy"),
            new("เทมเป้ (Tempeh)", "Vegetarian", new NutrientProfile(19.0, 9.0, 11.0, 8.0), true, "Contains Soy"),
            new("เวย์โปรตีน (Whey Protein Powder)", "Supplements", new NutrientProfile(80.0, 6.0, 3.0, 0.0), true, "Contains Milk/Dairy"),

            // Grains & Carbs (คาร์โบไฮเดรต ข้าว และแป้ง)
            new("ข้าวกล้องสุก (Cooked Brown Rice)", "Grain", new NutrientProfile(2.6, 23.5, 0.9, 1.8), false),
            new("ข้าวหอมมะลิสุก (Cooked Jasmine Rice)", "Grain", new NutrientProfile(2.7, 28.0, 0.3, 0.4), false),
            new("ข้าวไรซ์เบอร์รี่สุก (Cooked Riceberry)", "Grain", new NutrientProfile(2.8, 24.0, 0.8, 2.2), false),
            new("ข้าวเหนียวสุก (Cooked Sticky Rice)", "Grain", new NutrientProfile(3.5, 42.0, 0.4, 1.0), false),
            new("มันนึ่ง (Steamed Sweet Potato)", "Grain", new NutrientProfile(1.6, 20.1, 0.1, 3.0), false),
            new("ฟักทองนึ่ง (Steamed Pumpkin)", "Grain", new NutrientProfile(1.0, 6.5, 0.1, 1.5), false),
            new("ขนมปังโฮลวีต (Whole Wheat Bread)", "Grain", new NutrientProfile(13.0, 41.0, 3.4, 7.0), true, "Contains Gluten/Wheat"),
            new("ข้าวโอ๊ต (Oatmeal)", "Grain", new NutrientProfile(16.9, 66.3, 6.9, 10.6), true, "May Contain Gluten"),
            new("เส้นก๋วยเตี๋ยว (Rice Noodles)", "Grain", new NutrientProfile(1.8, 24.0, 0.2, 0.8), false),

            // Vegetables (ผัก)
            new("บล็อกโคลีนึ่ง (Steamed Broccoli)", "Vegetable", new NutrientProfile(2.4, 7.2, 0.4, 3.3), false),
            new("ผักโขม (Spinach)", "Vegetable", new NutrientProfile(2.9, 3.6, 0.4, 2.2), false),
            new("แครอทนึ่ง (Steamed Carrot)", "Vegetable", new NutrientProfile(0.8, 8.2, 0.2, 2.8), false),
            new("แตงกวาสด (Fresh Cucumber)", "Vegetable", new NutrientProfile(0.7, 3.6, 0.1, 0.5), false),
            new("มะเขือเทศสด (Fresh Tomato)", "Vegetable", new NutrientProfile(0.9, 3.9, 0.2, 1.2), false),
            new("กะหล่ำปลีนึ่ง (Steamed Cabbage)", "Vegetable", new NutrientProfile(1.3, 5.5, 0.1, 1.9), false),
            new("เห็ดออรินจิ (Eringi Mushroom)", "Vegetable", new NutrientProfile(3.0, 5.0, 0.3, 2.5), false),
            new("หน่อไม้ฝรั่งนึ่ง (Steamed Asparagus)", "Vegetable", new NutrientProfile(2.4, 4.1, 0.2, 2.0), false),
            new("ผักบุ้ง (Water Spinach / Morning Glory)", "Vegetable", new NutrientProfile(2.6, 3.1, 0.2, 2.1), false),
            new("ผักคะน้านึ่ง (Steamed Chinese Kale)", "Vegetable", new NutrientProfile(2.7, 5.6, 0.5, 3.2), false),
            new("ผักกวางตุ้งนึ่ง (Steamed Bok Choy)", "Vegetable", new NutrientProfile(1.5, 2.2, 0.2, 1.0), false),
            new("มะระขี้นกต้ม (Boiled Bitter Gourd)", "Vegetable", new NutrientProfile(0.8, 4.3, 0.2, 2.0), false),
            new("ดอกกะหล่ำนึ่ง (Steamed Cauliflower)", "Vegetable", new NutrientProfile(1.9, 5.0, 0.3, 2.0), false),
            new("หอมหัวใหญ่สด (Fresh Onion)", "Vegetable", new NutrientProfile(1.1, 9.3, 0.1, 1.7), false),
            new("พริกหยวกหวานสด (Fresh Bell Pepper)", "Vegetable", new NutrientProfile(1.0, 6.0, 0.3, 2.1), false),
            new("ตำลึงนึ่ง (Steamed Ivy Gourd Leaves)", "Vegetable", new NutrientProfile(3.2, 2.0, 0.3, 1.6), false),
            new("เห็ดเข็มทอง (Enoki Mushroom)", "Vegetable", new NutrientProfile(2.7, 7.8, 0.3, 2.7), false),
            new("เห็ดฟาง (Straw Mushroom)", "Vegetable", new NutrientProfile(3.8, 5.0, 0.7, 2.5), false),

            // Fruits (ผลไม้)
            new("กล้วยหอมสด (Fresh Banana)", "Fruit", new NutrientProfile(1.1, 22.8, 0.3, 2.6), false),
            new("แอปเปิ้ลเขียว (Green Apple)", "Fruit", new NutrientProfile(0.3, 13.8, 0.2, 2.4), false),
            new("ฝรั่งสด (Fresh Guava)", "Fruit", new NutrientProfile(2.6, 14.3, 1.0, 5.4), false),
            new("ส้มสด (Fresh Orange)", "Fruit", new NutrientProfile(0.9, 11.8, 0.1, 2.4), false),
            new("แก้วมังกร (Dragon Fruit)", "Fruit", new NutrientProfile(1.2, 13.0, 0.5, 2.9), false),
            new("สตรอเบอร์รี่สด (Fresh Strawberry)", "Fruit", new NutrientProfile(0.7, 7.7, 0.3, 2.0), false),
            new("มังคุดสด (Fresh Mangosteen)", "Fruit", new NutrientProfile(0.6, 18.0, 0.6, 1.8), false),
            new("แตงโมสด (Fresh Watermelon)", "Fruit", new NutrientProfile(0.6, 7.5, 0.2, 0.4), false),
            new("มะละกอสุก (Fresh Ripe Papaya)", "Fruit", new NutrientProfile(0.5, 10.8, 0.3, 1.7), false),
            new("สับปะรดสด (Fresh Pineapple)", "Fruit", new NutrientProfile(0.5, 13.1, 0.1, 1.4), false),
            new("แคนตาลูปสด (Fresh Cantaloupe)", "Fruit", new NutrientProfile(0.8, 8.2, 0.2, 0.9), false),
            new("กีวี่สด (Fresh Kiwi)", "Fruit", new NutrientProfile(1.1, 14.7, 0.5, 3.0), false),
            new("มะม่วงสุก (Fresh Ripe Mango)", "Fruit", new NutrientProfile(0.8, 15.0, 0.4, 1.6), false),
            new("มะม่วงดิบ (Fresh Green Mango)", "Fruit", new NutrientProfile(0.5, 17.0, 0.2, 2.0), false),
            new("องุ่นแดง (Fresh Red Grapes)", "Fruit", new NutrientProfile(0.7, 18.1, 0.2, 0.9), false),
            new("ส้มโอสด (Fresh Pomelo)", "Fruit", new NutrientProfile(0.8, 9.6, 0.0, 1.0), false),
            new("เงาะสด (Fresh Rambutan)", "Fruit", new NutrientProfile(0.9, 16.0, 0.2, 0.9), false),
            new("ลิ้นจี่สด (Fresh Lychee)", "Fruit", new NutrientProfile(0.8, 16.5, 0.4, 1.3), false),
            new("บลูเบอร์รี่สด (Fresh Blueberry)", "Fruit", new NutrientProfile(0.7, 14.5, 0.3, 2.4), false),

            // Healthy Fats & Dairy (ไขมันดีและผลิตภัณฑ์จากนม)
            new("อะโวคาโด (Fresh Avocado)", "Healthy Fats", new NutrientProfile(2.0, 8.5, 14.7, 6.7), false),
            new("อัลมอนด์อบ (Roasted Almonds)", "Healthy Fats", new NutrientProfile(21.2, 21.7, 49.9, 12.5), true, "Contains Tree Nuts"),
            new("เม็ดมะม่วงหิมพานต์ (Cashew Nuts)", "Healthy Fats", new NutrientProfile(18.2, 30.2, 43.8, 3.3), true, "Contains Tree Nuts"),
            new("น้ำมันมะกอก (Olive Oil)", "Healthy Fats", new NutrientProfile(0.0, 0.0, 100.0, 0.0), false),
            new("เนยถั่วลิสง (Peanut Butter)", "Healthy Fats", new NutrientProfile(25.0, 20.0, 50.0, 6.0), true, "Contains Peanuts"),
            new("กรีกโยเกิร์ต (Greek Yogurt Plain)", "Dairy", new NutrientProfile(10.0, 3.6, 0.4, 0.0), true, "Contains Dairy/Milk"),
            new("นมอัลมอนด์จืด (Unsweetened Almond Milk)", "Dairy", new NutrientProfile(0.6, 0.3, 1.2, 0.2), true, "Contains Tree Nuts"),

            // Thai Healthy Dishes (อาหารไทยสุขภาพ per 100g)
            new("ต้มยำกุ้งน้ำใส (Tom Yum Goong Clear)", "Thai Dish", new NutrientProfile(6.5, 2.5, 1.0, 0.5), true, "Contains Crustaceans/Fish Sauce"),
            new("ส้มตำไทย (Som Tum Thai)", "Thai Dish", new NutrientProfile(2.0, 12.0, 0.5, 2.5), true, "Contains Peanuts/Fish Sauce"),
            new("แกงจืดเต้าหู้หมูสับ (Clear Soup Tofu Pork)", "Thai Dish", new NutrientProfile(5.5, 2.0, 2.8, 0.4), true, "Contains Soy"),
            new("ผัดกะเพราไก่ (Pad Krapow Chicken)", "Thai Dish", new NutrientProfile(14.0, 8.0, 8.0, 0.6), true, "Contains Soy"),
            new("ไก่อบสมุนไพร (Herbal Roasted Chicken)", "Thai Dish", new NutrientProfile(25.0, 2.0, 5.0, 0.2), false)
        };

        if (items.Count < defaultFoods.Count)
        {
            var existingNames = new HashSet<string>(items.Select(i => i.Name));
            var newFoodsToAdd = defaultFoods.Where(f => !existingNames.Contains(f.Name)).ToList();
            if (newFoodsToAdd.Any())
            {
                await _context.FoodItems.AddRangeAsync(newFoodsToAdd, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
                items = await _context.FoodItems.ToListAsync(cancellationToken);
            }
        }

        return items;
    }

    public async Task AddAsync(FoodItem foodItem, CancellationToken cancellationToken = default)
    {
        await _context.FoodItems.AddAsync(foodItem, cancellationToken);
    }
}

public class MealLogRepository : IMealLogRepository
{
    private readonly ApplicationDbContext _context;

    public MealLogRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<MealLog>> GetByClientIdAsync(Guid clientId, CancellationToken cancellationToken = default)
    {
        return await _context.MealLogs
            .Where(ml => ml.ClientId == clientId)
            .OrderByDescending(ml => ml.ConsumedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(MealLog mealLog, CancellationToken cancellationToken = default)
    {
        await _context.MealLogs.AddAsync(mealLog, cancellationToken);
    }
}
