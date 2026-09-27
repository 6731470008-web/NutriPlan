using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using NutriPlan.Application.Common.Interfaces;
using NutriPlan.Application.Dtos;
using NutriPlan.Domain.Common;
using NutriPlan.Domain.Entities;
using NutriPlan.Domain.Enums;

namespace NutriPlan.Application.Services;

/// <summary>
/// Handles user registration and login. Belongs in the Application layer (not Api)
/// because it orchestrates domain objects and cross-cutting concerns (hashing, JWT).
/// </summary>
public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _configuration;

    public AuthService(IUserRepository userRepository, IUnitOfWork unitOfWork, IConfiguration configuration)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto dto, CancellationToken ct = default)
    {
        var existing = await _userRepository.GetByEmailAsync(dto.Email, ct);
        if (existing != null) throw new DomainException("Email is already registered.");

        // ✅ Password Strength Validation — prevent weak passwords.
        ValidatePasswordStrength(dto.Password);

        // ✅ BCrypt hash — never store plaintext passwords.
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        User user = dto.Role switch
        {
            UserRole.Nutritionist => new Nutritionist(
                dto.Email,
                passwordHash,
                dto.FullName,
                dto.LicenseNumber ?? "LIC-12345",
                dto.Specialization ?? "General Nutrition"
            ),
            UserRole.Client => new Client(
                dto.Email,
                passwordHash,
                dto.FullName,
                dto.DateOfBirth.HasValue ? Client.CalculateAge(dto.DateOfBirth.Value) : (dto.Age ?? 25),
                dto.WeightKg ?? 70.0,
                dto.HeightCm ?? 175.0,
                dto.ActivityLevel ?? ActivityLevel.ModeratelyActive,
                dto.Gender ?? Gender.Other,
                dto.HealthConditions,
                dto.FoodAllergies,
                dto.DateOfBirth.HasValue ? DateTime.SpecifyKind(dto.DateOfBirth.Value, DateTimeKind.Utc) : null
            ),
            _ => throw new DomainException("Invalid user role.")
        };

        await _userRepository.AddAsync(user, ct);
        await _unitOfWork.CommitAsync(ct);

        string token = GenerateJwtToken(user);
        return new AuthResponseDto(user.Id, user.Email, user.FullName, user.Role.ToString(), token);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto dto, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email, ct);

        // ✅ BCrypt.Verify — constant-time comparison, prevents timing attacks.
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new DomainException("Invalid email or password.");

        string token = GenerateJwtToken(user);
        return new AuthResponseDto(user.Id, user.Email, user.FullName, user.Role.ToString(), token);
    }

    public async Task<bool> ForgotPasswordAsync(ForgotPasswordRequestDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            throw new DomainException("กรุณาระบุอีเมล (Email is required.)");

        var user = await _userRepository.GetByEmailAsync(dto.Email, ct);
        if (user == null)
            throw new DomainException("ไม่พบบัญชีผู้ใช้ที่ลงทะเบียนด้วยอีเมลนี้ (No account found with this email address.)");

        return true;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequestDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            throw new DomainException("กรุณาระบุอีเมล (Email is required.)");

        var user = await _userRepository.GetByEmailAsync(dto.Email, ct);
        if (user == null)
            throw new DomainException("ไม่พบบัญชีผู้ใช้ที่ลงทะเบียนด้วยอีเมลนี้ (No account found with this email address.)");

        ValidatePasswordStrength(dto.NewPassword);

        var newHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.ChangePassword(newHash);

        await _unitOfWork.CommitAsync(ct);
        return true;
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordRequestDto dto, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct);
        if (user == null)
            throw new DomainException("ไม่พบข้อมูลผู้ใช้ในระบบ (User not found.)");

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            throw new DomainException("รหัสผ่านปัจจุบันไม่ถูกต้อง (Current password is incorrect.)");

        ValidatePasswordStrength(dto.NewPassword);

        if (dto.CurrentPassword == dto.NewPassword)
            throw new DomainException("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม (New password cannot be the same as current password.)");

        var newHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.ChangePassword(newHash);

        await _unitOfWork.CommitAsync(ct);
        return true;
    }

    public async Task<object> UpdateUserProfileAsync(Guid userId, UpdateProfileRequestDto dto, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, ct);
        if (user == null)
            throw new DomainException("ไม่พบข้อมูลผู้ใช้ในระบบ (User not found.)");

        if (user is Client client)
        {
            client.UpdateFullProfile(
                dto.FullName,
                dto.Age ?? client.Age,
                dto.WeightKg ?? client.WeightKg,
                dto.HeightCm ?? client.HeightCm,
                dto.ActivityLevel ?? client.ActivityLevel,
                dto.Gender ?? client.Gender,
                dto.HealthConditions ?? client.HealthConditions,
                dto.FoodAllergies ?? client.FoodAllergies,
                dto.DateOfBirth ?? client.DateOfBirth
            );
        }
        else if (user is Nutritionist nutritionist)
        {
            nutritionist.UpdateNutritionistProfile(
                dto.FullName,
                dto.Specialization ?? nutritionist.Specialization,
                dto.LicenseNumber ?? nutritionist.LicenseNumber
            );
        }
        else
        {
            user.UpdateProfile(dto.FullName);
        }

        await _unitOfWork.CommitAsync(ct);

        if (user is Client c)
        {
            return new
            {
                id = c.Id,
                email = c.Email,
                fullName = c.FullName,
                role = c.Role.ToString(),
                age = c.Age,
                dateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"),
                weightKg = c.WeightKg,
                heightCm = c.HeightCm,
                gender = c.Gender.ToString(),
                activityLevel = c.ActivityLevel.ToString(),
                healthConditions = c.HealthConditions,
                foodAllergies = c.FoodAllergies,
                bmr = c.CalculateBMR(),
                tdee = c.CalculateTDEE()
            };
        }

        if (user is Nutritionist n)
        {
            return new
            {
                id = n.Id,
                email = n.Email,
                fullName = n.FullName,
                role = n.Role.ToString(),
                specialization = n.Specialization,
                licenseNumber = n.LicenseNumber
            };
        }

        return new { id = user.Id, email = user.Email, fullName = user.FullName, role = user.Role.ToString() };
    }

    private string GenerateJwtToken(User user)
    {
        // ✅ JWT secret is loaded from configuration or environment variable — no hardcoded fallback.
        var jwtSecret = _configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(jwtSecret))
        {
            jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
        }
        if (string.IsNullOrWhiteSpace(jwtSecret))
        {
            throw new InvalidOperationException(
                "JWT secret is not configured. Set 'Jwt:Secret' in appsettings.json or the JWT_SECRET environment variable.");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var issuer = _configuration["Jwt:Issuer"] ?? "NutriPlanApi";
        var audience = _configuration["Jwt:Audience"] ?? "NutriPlanClient";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// ✅ Password Policy: Min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit.
    /// </summary>
    private static void ValidatePasswordStrength(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            throw new DomainException("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร (Password must be at least 8 characters.)");

        if (!password.Any(char.IsUpper))
            throw new DomainException("รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว (Password must contain at least one uppercase letter.)");

        if (!password.Any(char.IsLower))
            throw new DomainException("รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว (Password must contain at least one lowercase letter.)");

        if (!password.Any(char.IsDigit))
            throw new DomainException("รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว (Password must contain at least one digit.)");
    }
}
