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

        var allowedUser = await _context.AllowedUsers
            .FirstOrDefaultAsync(x => x.Email == request.Email);

        if (allowedUser == null)
            throw new Exception("This email is not authorized to register.");

        // Strong password validation
        if (!IsStrongPassword(request.Password))
            throw new Exception(
                "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.");

        // Confirm password
        if (request.Password != request.ConfirmPassword)
            throw new Exception("Password and confirmation password do not match.");

        // Prevent duplicate username or email
        if (await _context.Users.AnyAsync(x =>
                x.Email.ToLower() == request.Email.ToLower() ||
                x.Username!.ToLower() == request.Username.ToLower()))
        {
            throw new Exception("Username or email is already in use.");
        }

        var user = new User
        {
            Username = request.Username,
            Email = request.Email.Trim().ToLower(),
            DisplayName = request.Username,
            Position = string.Empty,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsAdmin = allowedUser.IsAdmin
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
            IsAdmin = user.IsAdmin
        };
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(x =>
                x.Email.ToLower() == request.UsernameOrEmail.ToLower() ||
                x.Username!.ToLower() == request.UsernameOrEmail.ToLower());

        if (user == null)
            throw new Exception("Invalid username/email or password.");

        if (!user.IsActive)
            throw new Exception("This account is inactive.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new Exception("Invalid username/email or password.");

        var token = _jwtService.GenerateToken(user);

        return new LoginResponse
        {
            Token = token,
            UserId = user.Id,
            FullName = $"{user.FirstName} {user.LastName}",
            Email = user.Email,
            Position = user.Position,
            IsAdmin = user.IsAdmin
        };
    }

    private bool IsStrongPassword(string password)
    {
        if (password.Length < 8)
            return false;

        bool hasUpper = password.Any(char.IsUpper);
        bool hasLower = password.Any(char.IsLower);
        bool hasDigit = password.Any(char.IsDigit);
        bool hasSpecial = password.Any(ch => !char.IsLetterOrDigit(ch));

        return hasUpper && hasLower && hasDigit && hasSpecial;
    }
}