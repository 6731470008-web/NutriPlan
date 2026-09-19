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

    private string GenerateJwtToken(User user)
    {
        // ✅ JWT secret is loaded from configuration — no hardcoded fallback.
        var jwtSecret = _configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT secret is not configured. Add 'Jwt:Secret' to appsettings.json.");

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
}
