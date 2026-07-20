using BCrypt.Net;
using IQADMS.API.Data;
using IQADMS.API.DTOs.Auth;
using IQADMS.API.Models;
using Microsoft.EntityFrameworkCore;
using IQADMS.API.Authentication;

namespace IQADMS.API.Services;

public class AuthService
{
    private readonly ApplicationDbContext _context;
    private readonly JwtService _jwtService;
    private readonly AllowedUserService _allowedUserService;

    public AuthService(
        ApplicationDbContext context,
        JwtService jwtService,
        AllowedUserService allowedUserService)
    {
        _context = context;
        _jwtService = jwtService;
        _allowedUserService = allowedUserService;
    }

    public async Task<LoginResponse> RegisterAsync(RegisterRequest request)
    {
        // Check if email is allowed
        if (!await _allowedUserService.IsEmailAllowedAsync(request.Email))
            throw new Exception("This email is not authorized to register.");

        // Prevent duplicate accounts
        if (await _context.Users.AnyAsync(x => x.Email == request.Email))
            throw new Exception("Account already exists.");

        var user = new User
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Position = request.Position,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        _context.Users.Add(user);

        await _context.SaveChangesAsync();

        await _allowedUserService.MarkAsRegisteredAsync(request.Email);

        var token = _jwtService.GenerateToken(user);

        return new LoginResponse
        {
            Token = token,
            UserId = user.Id,
            FullName = $"{user.FirstName} {user.LastName}",
            Email = user.Email,
            Position = user.Position,
            IsAdmin = false
        };
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Email == request.Email);

        if (user == null)
            throw new Exception("Invalid email or password.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new Exception("Invalid email or password.");

        var token = _jwtService.GenerateToken(user);

        return new LoginResponse
        {
            Token = token,
            UserId = user.Id,
            FullName = $"{user.FirstName} {user.LastName}",
            Email = user.Email,
            Position = user.Position,
            IsAdmin = false
        };
    }
}