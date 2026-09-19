using Microsoft.EntityFrameworkCore;
using NutriPlan.Application.Common.Interfaces;
using NutriPlan.Domain.Common;
using NutriPlan.Domain.Entities;
using NutriPlan.Infrastructure.Persistence.Configurations;

namespace NutriPlan.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext, IUnitOfWork
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Nutritionist> Nutritionists => Set<Nutritionist>();
    public DbSet<MealPlan> MealPlans => Set<MealPlan>();
    public DbSet<DailyMenu> DailyMenus => Set<DailyMenu>();
    public DbSet<MealEntry> MealEntries => Set<MealEntry>();
    public DbSet<FoodItem> FoodItems => Set<FoodItem>();
    public DbSet<MealLog> MealLogs => Set<MealLog>();

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }

    private void FixNewEntityStates()
    {
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Modified && entry.Entity is Entity domainEntity && domainEntity.UpdatedAt == null)
            {
                entry.State = EntityState.Added;
            }
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        FixNewEntityStates();
        return base.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> CommitAsync(CancellationToken cancellationToken = default)
    {
        return await SaveChangesAsync(cancellationToken);
    }
}
