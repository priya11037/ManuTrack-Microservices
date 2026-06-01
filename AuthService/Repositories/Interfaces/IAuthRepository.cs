using AuthService.Models;

namespace AuthService.Repositories.Interfaces;

public interface IAuthRepository
{
    Task<AuthUser?> GetByEmailAsync(string email);
    Task<AuthUser?> GetByIdAsync(int id);
    Task<List<AuthUser>> GetAllAsync();
    Task<AuthUser> CreateAsync(AuthUser user);
    Task<AuthUser> UpdateAsync(AuthUser user);
    Task DeleteAsync(AuthUser user);
    Task<bool> EmailExistsAsync(string email);
    Task<bool> EmailExistsExceptUserAsync(string email, int userId);
}