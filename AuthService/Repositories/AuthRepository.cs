using AuthService.Data;
using AuthService.Models;
using AuthService.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Repositories;

public class AuthRepository : IAuthRepository
{
    private readonly AuthDbContext _db;

    public AuthRepository(AuthDbContext db)
    {
        _db = db;
    }

    public async Task<AuthUser?> GetByEmailAsync(string email) =>
        await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        // email is already .Trim().ToLower() from the service layer
        // direct equality lets EF use the unique index IX_Users_Email

    public async Task<AuthUser?> GetByIdAsync(int id) =>
        await _db.Users.FindAsync(id);

    public async Task<List<AuthUser>> GetAllAsync() =>
        await _db.Users.OrderBy(u => u.Name).ToListAsync();

    public async Task<AuthUser> CreateAsync(AuthUser user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    public async Task<AuthUser> UpdateAsync(AuthUser user)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
        return user;
    }

    public async Task DeleteAsync(AuthUser user)
    {
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
    }

    public async Task<bool> EmailExistsAsync(string email) =>
        await _db.Users.AnyAsync(u => u.Email == email);

    public async Task<bool> EmailExistsExceptUserAsync(string email, int userId) =>
        await _db.Users.AnyAsync(u => u.Email == email && u.UserID != userId);
}