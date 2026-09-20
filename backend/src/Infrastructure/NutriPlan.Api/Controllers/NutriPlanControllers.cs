using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NutriPlan.Application.Common.Interfaces;
using NutriPlan.Application.Dtos;
using NutriPlan.Domain.Entities;
using NutriPlan.Domain.ValueObjects;
using NutriPlan.Infrastructure.Persistence;

namespace NutriPlan.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // Endpoint 1: Register
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterRequestDto dto)
    {
        var result = await _authService.RegisterAsync(dto);
        return Ok(result);
    }

    // Endpoint 2: Login
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto dto)
    {
        var result = await _authService.LoginAsync(dto);
        return Ok(result);
    }

    // Endpoint 3: Refresh Token / Verify Session
    [Authorize]
    [HttpGet("verify")]
    public ActionResult<object> VerifySession()
    {
        return Ok(new { status = "Authenticated", timestamp = DateTime.UtcNow });
    }
}

[ApiController]
[Route("api/v1/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UsersController(IUserRepository userRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    // Endpoint 4: Get Current Profile
    [HttpGet("me")]
    public async Task<ActionResult<object>> GetMyProfile()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();

        var user = await _userRepository.GetByIdAsync(Guid.Parse(userIdClaim));
        if (user == null) return NotFound();

        if (user is Client c)
        {
            return Ok(new {
                id = user.Id, email = user.Email, fullName = user.FullName, role = user.Role.ToString(),
                age = c.Age, dateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"), weightKg = c.WeightKg, heightCm = c.HeightCm, gender = c.Gender.ToString(),
                activityLevel = c.ActivityLevel.ToString(), healthConditions = c.HealthConditions, foodAllergies = c.FoodAllergies
            });
        }

        return Ok(new { id = user.Id, email = user.Email, fullName = user.FullName, role = user.Role.ToString() });
    }

    // Endpoint 5: Update Client Body Metrics
    [HttpPut("clients/{id:guid}/body-metrics")]
    [Authorize(Roles = "Client,Admin")]
    public async Task<IActionResult> UpdateBodyMetrics(Guid id, [FromBody] UpdateBodyMetricsRequestDto dto)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user is not Client client) return NotFound("Client not found.");

        client.UpdateBodyMetrics(dto.Age, dto.WeightKg, dto.HeightCm, client.ActivityLevel);
        await _unitOfWork.CommitAsync();
        return NoContent();
    }

    // Endpoint 6: Assign Client to Nutritionist
    [HttpPost("nutritionists/{nutritionistId:guid}/assign/{clientId:guid}")]
    [Authorize(Roles = "Nutritionist,Admin")]
    public async Task<IActionResult> AssignClient(Guid nutritionistId, Guid clientId)
    {
        var nutritionist = await _userRepository.GetByIdAsync(nutritionistId);
        var client = await _userRepository.GetByIdAsync(clientId);

        if (nutritionist is not Nutritionist n || client is not Client c)
            return NotFound("Nutritionist or Client not found.");

        n.AssignClient(c);
        await _unitOfWork.CommitAsync();
        return Ok(new { message = "Client assigned successfully." });
    }

    // Endpoint 7: Get Nutritionist Clients
    [HttpGet("nutritionists/my-clients")]
    [Authorize(Roles = "Nutritionist,Admin")]
    public async Task<ActionResult<List<object>>> GetMyClients([FromQuery] Guid nutritionistId)
    {
        var clients = await _userRepository.GetClientsByNutritionistIdAsync(nutritionistId);
        return Ok(clients.Select(c => new {
            c.Id, c.FullName, c.Email, c.WeightKg, c.HeightCm, c.Age, dateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"),
            gender = c.Gender.ToString(), activityLevel = c.ActivityLevel.ToString(),
            healthConditions = c.HealthConditions, foodAllergies = c.FoodAllergies
        }));
    }

    // Endpoint 8: Get Unassigned Clients
    [HttpGet("clients/unassigned")]
    [Authorize(Roles = "Nutritionist,Admin")]
    public async Task<ActionResult<List<object>>> GetUnassignedClients()
    {
        var clients = await _userRepository.GetUnassignedClientsAsync();
        return Ok(clients.Select(c => new {
            c.Id, c.FullName, c.Email, c.WeightKg, c.HeightCm, c.Age, dateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"),
            gender = c.Gender.ToString(), activityLevel = c.ActivityLevel.ToString(),
            healthConditions = c.HealthConditions, foodAllergies = c.FoodAllergies
        }));
    }

    // Endpoint 8.5: Get Client Detail by ID
    [HttpGet("clients/{id:guid}")]
    [Authorize]
    public async Task<ActionResult<object>> GetClientById(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user is not Client client) return NotFound("Client not found.");

        return Ok(new
        {
            client.Id,
            client.FullName,
            client.Email,
            client.Age,
            client.WeightKg,
            client.HeightCm,
            Gender = client.Gender.ToString(),
            ActivityLevel = client.ActivityLevel.ToString(),
            Bmr = client.CalculateBMR(),
            Tdee = client.CalculateTDEE()
        });
    }
}

[ApiController]
[Route("api/v1/food-items")]
public class FoodItemsController : ControllerBase
{
    private readonly IFoodItemRepository _foodRepository;
    private readonly IUnitOfWork _unitOfWork;

    public FoodItemsController(IFoodItemRepository foodRepository, IUnitOfWork unitOfWork)
    {
        _foodRepository = foodRepository;
        _unitOfWork = unitOfWork;
    }

    // Endpoint 8: Query Food Catalog
    [HttpGet]
    public async Task<ActionResult<List<FoodItemResponseDto>>> GetAll()
    {
        var items = await _foodRepository.GetAllAsync();
        return Ok(items.Select(f => new FoodItemResponseDto(
            f.Id, f.Name, f.Category, f.NutrientsPer100g.TotalCalories,
            f.NutrientsPer100g.ProteinGrams, f.NutrientsPer100g.CarbsGrams,
            f.NutrientsPer100g.FatGrams, f.IsAllergenic, f.AllergenWarning
        )));
    }

    // Endpoint 9: Get Single Food Item
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FoodItemResponseDto>> GetById(Guid id)
    {
        var f = await _foodRepository.GetByIdAsync(id);
        if (f == null) return NotFound();

        return Ok(new FoodItemResponseDto(
            f.Id, f.Name, f.Category, f.NutrientsPer100g.TotalCalories,
            f.NutrientsPer100g.ProteinGrams, f.NutrientsPer100g.CarbsGrams,
            f.NutrientsPer100g.FatGrams, f.IsAllergenic, f.AllergenWarning
        ));
    }

    // Endpoint 10: Create Food Item
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<FoodItemResponseDto>> Create([FromBody] CreateFoodItemRequestDto dto)
    {
        var nutrients = new NutrientProfile(dto.ProteinGrams, dto.CarbsGrams, dto.FatGrams, dto.FiberGrams);
        var food = new FoodItem(dto.Name, dto.Category, nutrients, dto.IsAllergenic, dto.AllergenWarning);

        await _foodRepository.AddAsync(food);
        await _unitOfWork.CommitAsync();

        return CreatedAtAction(nameof(GetById), new { id = food.Id }, new FoodItemResponseDto(
            food.Id, food.Name, food.Category, food.NutrientsPer100g.TotalCalories,
            food.NutrientsPer100g.ProteinGrams, food.NutrientsPer100g.CarbsGrams,
            food.NutrientsPer100g.FatGrams, food.IsAllergenic, food.AllergenWarning
        ));
    }

    // Endpoint 11: Update Nutritional Profile
    [HttpPut("{id:guid}/nutrients")]
    [Authorize(Roles = "Nutritionist,Admin")]
    public async Task<IActionResult> UpdateNutrients(Guid id, [FromBody] NutrientProfile newProfile)
    {
        var item = await _foodRepository.GetByIdAsync(id);
        if (item == null) return NotFound();

        item.UpdateNutrients(newProfile);
        await _unitOfWork.CommitAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/v1/meal-plans")]
[Authorize]
public class MealPlansController : ControllerBase
{
    private readonly IMealPlanService _mealPlanService;
    private readonly IMealPlanRepository _mealPlanRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _dbContext;

    public MealPlansController(
        IMealPlanService mealPlanService,
        IMealPlanRepository mealPlanRepository,
        IUnitOfWork unitOfWork,
        ApplicationDbContext dbContext)
    {
        _mealPlanService = mealPlanService;
        _mealPlanRepository = mealPlanRepository;
        _unitOfWork = unitOfWork;
        _dbContext = dbContext;
    }

    // Endpoint 12: Create Meal Plan
    [HttpPost]
    [Authorize(Roles = "Nutritionist,Admin")]
    public async Task<ActionResult<MealPlanResponseDto>> Create([FromBody] CreateMealPlanRequestDto dto)
    {
        var res = await _mealPlanService.CreateMealPlanAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = res.Id }, res);
    }

    // Endpoint 13: Get Client Meal Plans
    [HttpGet("client/{clientId:guid}")]
    public async Task<ActionResult<List<MealPlanResponseDto>>> GetByClient(Guid clientId)
    {
        var plans = await _mealPlanRepository.GetByClientIdAsync(clientId);
        return Ok(plans.Select(p => new MealPlanResponseDto(
            p.Id, p.ClientId, p.Title, p.StartDate, p.EndDate, 0, 0, 0, 0
        )));
    }

    // Endpoint 14: Get Meal Plan By ID
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> GetById(Guid id)
    {
        var p = await _mealPlanRepository.GetByIdAsync(id);
        if (p == null) return NotFound();

        var nutrients = p.CalculateTotalPlanNutrients();
        return Ok(new
        {
            p.Id,
            p.ClientId,
            p.Title,
            p.StartDate,
            p.EndDate,
            totalCalories = nutrients.TotalCalories,
            totalProteinGrams = nutrients.ProteinGrams,
            totalCarbsGrams = nutrients.CarbsGrams,
            totalFatGrams = nutrients.FatGrams,
            dailyMenus = p.DailyMenus.OrderBy(m => m.DayNumber).Select(m => new
            {
                m.Id,
                m.DayNumber,
                m.TargetCalories,
                m.TargetProteinGrams,
                m.TargetCarbsGrams,
                m.TargetFatGrams,
                totalCalories = m.CalculateDailyNutrients().TotalCalories,
                totalProteinGrams = m.CalculateDailyNutrients().ProteinGrams,
                totalCarbsGrams = m.CalculateDailyNutrients().CarbsGrams,
                totalFatGrams = m.CalculateDailyNutrients().FatGrams,
                entries = m.Entries.Select(e => new
                {
                    e.Id,
                    mealType = e.MealType.ToString(),
                    e.PortionGrams,
                    foodItemId = e.FoodItem.Id,
                    foodItemName = e.FoodItem.Name,
                    calories = e.CalculateEntryNutrients().TotalCalories,
                    proteinGrams = e.CalculateEntryNutrients().ProteinGrams,
                    carbsGrams = e.CalculateEntryNutrients().CarbsGrams,
                    fatGrams = e.CalculateEntryNutrients().FatGrams
                })
            })
        });
    }

    // Endpoint 14b: Update Meal Plan
    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateMealPlanRequestDto dto)
    {
        var plan = await _dbContext.MealPlans.FindAsync(id);
        if (plan == null) return NotFound("Meal plan not found.");

        typeof(MealPlan).GetProperty(nameof(MealPlan.Title))?.SetValue(plan, dto.Title);
        typeof(MealPlan).GetProperty(nameof(MealPlan.StartDate))?.SetValue(plan, dto.StartDate);
        typeof(MealPlan).GetProperty(nameof(MealPlan.EndDate))?.SetValue(plan, dto.EndDate);
        plan.Touch();

        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    // Endpoint 14c: Delete Meal Plan
    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id)
    {
        var plan = await _dbContext.MealPlans
            .Include(p => p.DailyMenus)
            .ThenInclude(dm => dm.Entries)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (plan != null)
        {
            _dbContext.MealPlans.Remove(plan);
            await _dbContext.SaveChangesAsync();
        }

        return NoContent();
    }

    // Endpoint 15: Add Daily Menu
    [HttpPost("{planId:guid}/daily-menus")]
    [Authorize]
    public async Task<IActionResult> AddDailyMenu(
        Guid planId,
        [FromBody] AddDailyMenuBodyDto? bodyDto,
        [FromQuery] int dayNumber,
        [FromQuery] double targetCalories,
        [FromQuery] double targetProteinGrams = 0,
        [FromQuery] double targetCarbsGrams = 0,
        [FromQuery] double targetFatGrams = 0)
    {
        var actualDayNumber = (bodyDto != null && bodyDto.DayNumber > 0) ? bodyDto.DayNumber : dayNumber;
        var actualTargetCalories = (bodyDto != null && bodyDto.TargetCalories > 0) ? bodyDto.TargetCalories : targetCalories;
        var actualTargetProtein = (bodyDto != null && bodyDto.TargetProteinGrams > 0) ? bodyDto.TargetProteinGrams : targetProteinGrams;
        var actualTargetCarbs = (bodyDto != null && bodyDto.TargetCarbsGrams > 0) ? bodyDto.TargetCarbsGrams : targetCarbsGrams;
        var actualTargetFat = (bodyDto != null && bodyDto.TargetFatGrams > 0) ? bodyDto.TargetFatGrams : targetFatGrams;

        if (actualDayNumber <= 0) actualDayNumber = 1;
        if (actualTargetCalories <= 0) actualTargetCalories = 2000;

        var p = await _mealPlanRepository.GetByIdAsync(planId);
        if (p == null) return NotFound("Meal plan not found.");

        if (p.DailyMenus.Any(m => m.DayNumber == actualDayNumber))
        {
            return NoContent();
        }

        p.AddDailyMenu(new DailyMenu(
            actualDayNumber,
            actualTargetCalories,
            actualTargetProtein,
            actualTargetCarbs,
            actualTargetFat
        ));
        await _unitOfWork.CommitAsync();
        return NoContent();
    }

    // Endpoint 15b: DELETE Daily Menu
    [HttpDelete("{planId:guid}/daily-menus/{menuId:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteDailyMenu(Guid planId, Guid menuId)
    {
        var menu = await _dbContext.DailyMenus.FindAsync(menuId);
        if (menu != null)
        {
            _dbContext.DailyMenus.Remove(menu);
            await _dbContext.SaveChangesAsync();
        }
        return NoContent();
    }

    // Endpoint 15c: UPDATE Daily Menu
    [HttpPut("{planId:guid}/daily-menus/{menuId:guid}")]
    [Authorize]
    public async Task<IActionResult> UpdateDailyMenu(Guid planId, Guid menuId, [FromBody] AddDailyMenuBodyDto dto)
    {
        var menu = await _dbContext.DailyMenus.FindAsync(menuId);
        if (menu == null) return NotFound("Daily menu not found.");

        typeof(DailyMenu).GetProperty(nameof(DailyMenu.TargetCalories))?.SetValue(menu, dto.TargetCalories > 0 ? dto.TargetCalories : 2000);
        typeof(DailyMenu).GetProperty("TargetProteinGrams")?.SetValue(menu, dto.TargetProteinGrams >= 0 ? dto.TargetProteinGrams : 0);
        typeof(DailyMenu).GetProperty("TargetCarbsGrams")?.SetValue(menu, dto.TargetCarbsGrams >= 0 ? dto.TargetCarbsGrams : 0);
        typeof(DailyMenu).GetProperty("TargetFatGrams")?.SetValue(menu, dto.TargetFatGrams >= 0 ? dto.TargetFatGrams : 0);
        menu.Touch();

        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    // Endpoint 16: Add Meal Entry to Menu
    [HttpPost("daily-menus/entries")]
    [Authorize]
    public async Task<IActionResult> AddEntry([FromBody] AddMealEntryRequestDto dto)
    {
        await _mealPlanService.AddMealEntryAsync(dto);
        return NoContent();
    }

    // Endpoint 17: Export Shopping List (Factory Method Pattern)
    [HttpGet("{planId:guid}/shopping-list")]
    public async Task<ActionResult<string>> ExportShoppingList(Guid planId, [FromQuery] string format = "pdf")
    {
        var result = await _mealPlanService.ExportShoppingListAsync(planId, format);
        return Ok(result);
    }
}

public record UpdateMealEntryBodyDto(NutriPlan.Domain.Enums.MealType MealType, double PortionGrams, Guid FoodItemId);

// ─── Meal Entries ──────────────────────────────────────────────────────────────

[ApiController]
[Route("api/v1/meal-entries")]
[Authorize]
public class MealEntriesController : ControllerBase
{
    private readonly IMealPlanService _mealPlanService;
    private readonly ApplicationDbContext _dbContext;

    public MealEntriesController(IMealPlanService mealPlanService, ApplicationDbContext dbContext)
    {
        _mealPlanService = mealPlanService;
        _dbContext = dbContext;
    }

    // Endpoint 18: DELETE a Meal Entry from a Daily Menu
    [HttpDelete("{entryId:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteEntry(Guid entryId, [FromQuery] Guid menuId)
    {
        var entry = await _dbContext.MealEntries.FindAsync(entryId);
        if (entry != null)
        {
            _dbContext.MealEntries.Remove(entry);
            await _dbContext.SaveChangesAsync();
            return NoContent();
        }

        try
        {
            await _mealPlanService.RemoveMealEntryAsync(menuId, entryId);
        }
        catch
        {
            // Idempotent success
        }

        return NoContent();
    }

    // Endpoint 18b: UPDATE a Meal Entry
    [HttpPut("{entryId:guid}")]
    [Authorize]
    public async Task<IActionResult> UpdateEntry(Guid entryId, [FromBody] UpdateMealEntryBodyDto dto)
    {
        var entry = await _dbContext.MealEntries.Include(e => e.FoodItem).FirstOrDefaultAsync(e => e.Id == entryId);
        if (entry == null) return NotFound("Meal entry not found.");

        var food = await _dbContext.FoodItems.FindAsync(dto.FoodItemId);
        if (food == null) return NotFound("Food item not found.");

        typeof(MealEntry).GetProperty(nameof(MealEntry.MealType))?.SetValue(entry, dto.MealType);
        typeof(MealEntry).GetProperty(nameof(MealEntry.PortionGrams))?.SetValue(entry, dto.PortionGrams > 0 ? dto.PortionGrams : 100);
        typeof(MealEntry).GetProperty(nameof(MealEntry.FoodItemId))?.SetValue(entry, dto.FoodItemId);
        typeof(MealEntry).GetProperty(nameof(MealEntry.FoodItem))?.SetValue(entry, food);
        entry.Touch();

        await _dbContext.SaveChangesAsync();
        return NoContent();
    }
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

[ApiController]
[Route("api/v1/tracking")]
[Authorize]
public class TrackingController : ControllerBase
{
    private readonly IMealLogRepository _mealLogRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public TrackingController(
        IMealLogRepository mealLogRepository,
        IUserRepository userRepository,
        IUnitOfWork unitOfWork)
    {
        _mealLogRepository = mealLogRepository;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    // Endpoint 19: Log Daily Meal
    [HttpPost("logs")]
    public async Task<ActionResult<MealLogResponseDto>> LogMeal([FromBody] LogMealRequestDto dto)
    {
        var log = new MealLog(dto.ClientId, dto.MealEntryId, dto.ActualPortionGrams, dto.PlannedPortionGrams);
        await _mealLogRepository.AddAsync(log);
        await _unitOfWork.CommitAsync();

        return Ok(new MealLogResponseDto(
            log.Id, log.ClientId, log.MealEntryId, log.ConsumedAt,
            log.ActualPortionGrams, log.IsAdhered
        ));
    }

    // Endpoint 20: Get Adherence Report
    [HttpGet("clients/{clientId:guid}/adherence")]
    public async Task<ActionResult<AdherenceReportDto>> GetAdherence(Guid clientId)
    {
        var logs = await _mealLogRepository.GetByClientIdAsync(clientId);
        if (logs.Count == 0)
            return Ok(new AdherenceReportDto(clientId, 0, 0, 0, "No Data"));

        int adhered = logs.Count(l => l.IsAdhered);
        double rate = Math.Round((double)adhered / logs.Count * 100, 1);
        string status = rate >= 85 ? "Excellent Compliance"
                      : rate >= 65 ? "Good Compliance"
                      : "Needs Improvement";

        return Ok(new AdherenceReportDto(clientId, logs.Count, adhered, rate, status));
    }

    // Endpoint 21: Get Client Progress Tracking
    [HttpGet("clients/{clientId:guid}/progress")]
    public async Task<ActionResult<ProgressDto>> GetProgress(Guid clientId)
    {
        var user = await _userRepository.GetByIdAsync(clientId);
        if (user is not Client client) return NotFound("Client not found.");

        double? targetWeight = client.CurrentGoal?.TargetWeightKg;
        double? delta = targetWeight.HasValue ? client.WeightKg - targetWeight.Value : null;

        return Ok(new ProgressDto(
            clientId,
            client.WeightKg,
            targetWeight,
            delta.HasValue ? Math.Round(delta.Value, 2) : null,
            Math.Round(client.CalculateTDEE(), 0)
        ));
    }
}
