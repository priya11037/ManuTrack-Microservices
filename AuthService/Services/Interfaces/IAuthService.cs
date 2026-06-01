using AuthService.DTOs;

namespace AuthService.Services.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<AuthUserViewModel> RegisterAsync(RegisterRequest request);
    Task<AuthUserViewModel> GetByIdAsync(int id);
    Task<List<AuthUserViewModel>> GetAllAsync();
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request);
    Task<AuthUserViewModel> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task<AuthUserViewModel> UpdateUserAsync(int userId, UpdateUserRequest request);
    Task DeleteUserAsync(int userId);
    Task DeactivateUserAsync(int userId);
    Task ActivateUserAsync(int userId);
}