using AuthService.DTOs;
using AuthService.Models;
using AuthService.Repositories.Interfaces;
using AuthService.Services.Interfaces;
using AuthService.Enums;
using ManuTrack.SharedKernel.Exceptions;
using ManuTrack.SharedKernel.Helpers;

namespace AuthService.Services;

public class AuthServiceImpl : IAuthService
{
    private readonly IAuthRepository _repo;
    private readonly IConfiguration _config;

    public AuthServiceImpl(IAuthRepository repo, IConfiguration config)
    {
        _repo = repo;
        _config = config;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var email = request.Email.Trim().ToLower();

        var user = await _repo.GetByEmailAsync(email)
            ?? throw new UnauthorizedException("Invalid email or password.");

        if (!user.IsActive)
            throw new UnauthorizedException("Your account has been deactivated. Please contact admin.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        var token = JwtHelper.GenerateToken(
            userId: user.UserID,
            email: user.Email,
            role: user.Role,
            name: user.Name,
            secretKey: _config["Jwt:Key"]!,
            issuer: _config["Jwt:Issuer"]!,
            audience: _config["Jwt:Audience"]!,
            expiryMinutes: 60);

        return new LoginResponse(token, 
            new LoginUserInfo(user.UserID,user.Name,user.Email,user.Role)
            );
    }

    public async Task<AuthUserViewModel> RegisterAsync(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLower();

        if (await _repo.EmailExistsAsync(email))
            throw new ConflictException($"Email '{email}' is already registered.");

        var validRoles = new[]
        {
            AppRoles.Admin, AppRoles.Planner, AppRoles.Operator,
            AppRoles.Inspector, AppRoles.InventoryManager, AppRoles.ComplianceOfficer
        };

        if (!validRoles.Contains(request.Role))
            throw new ValidationException($"Invalid role '{request.Role}'.");

        var user = new AuthUser
        {
            Name = request.Name.Trim(),
            Email = email,
            Phone = request.Phone.Trim(),
            Role = request.Role,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 4),
            IsActive = true
        };

        var created = await _repo.CreateAsync(user);
        return MapToViewModel(created);
    }

    public async Task<AuthUserViewModel> GetByIdAsync(int id)
    {
        var user = await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException("User", id);
        return MapToViewModel(user);
    }

    public async Task<List<AuthUserViewModel>> GetAllAsync()
    {
        var users = await _repo.GetAllAsync();
        return users.Select(MapToViewModel).ToList();
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await _repo.GetByIdAsync(userId)
            ?? throw new NotFoundException("User", userId);

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new ValidationException("Current password is incorrect.");

        if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
            throw new ValidationException("New password cannot be the same as current password.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 4);
        await _repo.UpdateAsync(user);
    }

    public async Task DeactivateUserAsync(int userId)
    {
        var user = await _repo.GetByIdAsync(userId)
            ?? throw new NotFoundException("User", userId);

        if (!user.IsActive)
            throw new ValidationException("User is already deactivated.");

        user.IsActive = false;
        await _repo.UpdateAsync(user);
    }

    public async Task ActivateUserAsync(int userId)
    {
        var user = await _repo.GetByIdAsync(userId)
            ?? throw new NotFoundException("User", userId);

        if (user.IsActive)
            throw new ValidationException("User is already active.");

        user.IsActive = true;
        await _repo.UpdateAsync(user);
    }

    private static AuthUserViewModel MapToViewModel(AuthUser user) =>
        new(user.UserID, user.Name, user.Role, user.Email, user.Phone, user.IsActive);
}