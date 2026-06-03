using AuthService.DTOs;
using AuthService.Services.Interfaces;
using ManuTrack.SharedKernel.Helpers;
using ManuTrack.SharedKernel.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // POST api/v1/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        return Ok(ApiResponse<object>.Ok(result, "Login successful."));
    }

    // POST api/v1/auth/register
    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        return Created($"api/v1/auth/users/{result.UserID}",
            ApiResponse<object>.Ok(result, "User registered successfully."));
    }

    // GET api/v1/auth/users  — Admin only (full user list with sensitive fields)
    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllUsers()
    {
        var result = await _authService.GetAllAsync();
        return Ok(ApiResponse<object>.Ok(result));
    }

    // GET api/v1/auth/users/by-role?role=ShopFloorOperator — any authenticated user
    // Used by forms to populate dropdowns (operators, inspectors, etc.)
    [HttpGet("users/by-role")]
    [Authorize]
    public async Task<IActionResult> GetUsersByRole([FromQuery] string role)
    {
        var all = await _authService.GetAllAsync();
        var filtered = all
            .Where(u => u.Role.Equals(role, StringComparison.OrdinalIgnoreCase) && u.IsActive)
            .Select(u => new { u.UserID, u.Name, u.Role, u.Email });
        return Ok(ApiResponse<object>.Ok(filtered));
    }

    // GET api/v1/auth/users/{id}
    [HttpGet("users/{id:int}")]
    [Authorize]
    public async Task<IActionResult> GetUser(int id)
    {
        if (id <= 0)
            return BadRequest(ApiResponse.Fail("User ID must be a positive number."));

        var result = await _authService.GetByIdAsync(id);
        return Ok(ApiResponse<object>.Ok(result));
    }

    // PUT api/v1/auth/profile  — any authenticated user can update their own profile
    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = JwtHelper.GetUserId(User);
        var result = await _authService.UpdateProfileAsync(userId, request);
        return Ok(ApiResponse<object>.Ok(result, "Profile updated successfully."));
    }

    // PUT api/v1/auth/users/{id}
    [HttpPut("users/{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        if (id <= 0)
            return BadRequest(ApiResponse.Fail("User ID must be a positive number."));

        var result = await _authService.UpdateUserAsync(id, request);
        return Ok(ApiResponse<object>.Ok(result, "User updated successfully."));
    }

    // DELETE api/v1/auth/users/{id}
    [HttpDelete("users/{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        if (id <= 0)
            return BadRequest(ApiResponse.Fail("User ID must be a positive number."));

        if (id == JwtHelper.GetUserId(User))
            return BadRequest(ApiResponse.Fail("You cannot delete your own account."));

        await _authService.DeleteUserAsync(id);
        return Ok(ApiResponse.Ok("User deleted successfully."));
    }

    // PUT api/v1/auth/change-password
    [HttpPut("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = JwtHelper.GetUserId(User);
        await _authService.ChangePasswordAsync(userId, request);
        return Ok(ApiResponse.Ok("Password changed successfully."));
    }

    // PUT api/v1/auth/users/{id}/deactivate
    [HttpPut("users/{id:int}/deactivate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeactivateUser(int id)
    {
        if (id <= 0)
            return BadRequest(ApiResponse.Fail("User ID must be a positive number."));

        if (id == JwtHelper.GetUserId(User))
            return BadRequest(ApiResponse.Fail("You cannot deactivate your own account."));

        await _authService.DeactivateUserAsync(id);
        return Ok(ApiResponse.Ok("User deactivated successfully."));
    }

    // PUT api/v1/auth/users/{id}/activate
    [HttpPut("users/{id:int}/activate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ActivateUser(int id)
    {
        if (id <= 0)
            return BadRequest(ApiResponse.Fail("User ID must be a positive number."));

        await _authService.ActivateUserAsync(id);
        return Ok(ApiResponse.Ok("User activated successfully."));
    }
}