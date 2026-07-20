using IQADMS.API.Data;
using IQADMS.API.DTOs.AllowedUsers;
using IQADMS.API.Models;
using Microsoft.EntityFrameworkCore;

namespace IQADMS.API.Services;

public class AllowedUserService
{
    private readonly ApplicationDbContext _context;

    public AllowedUserService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<AllowedUserResponse>> GetAllAsync()
    {
        return await _context.AllowedUsers
            .Select(x => new AllowedUserResponse
            {
                Id = x.Id,
                Email = x.Email,
                IsRegistered = x.IsRegistered
            })
            .ToListAsync();
    }

    public async Task AddAsync(CreateAllowedUserRequest request)
    {
        if (await _context.AllowedUsers.AnyAsync(x => x.Email == request.Email))
            throw new Exception("Email already exists.");

        var allowedUser = new AllowedUser
        {
            Email = request.Email,
            IsRegistered = false
        };

        _context.AllowedUsers.Add(allowedUser);

        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var allowedUser = await _context.AllowedUsers.FindAsync(id);

        if (allowedUser == null)
            throw new Exception("Allowed email not found.");

        _context.AllowedUsers.Remove(allowedUser);

        await _context.SaveChangesAsync();
    }

    public async Task<bool> IsEmailAllowedAsync(string email)
    {
        return await _context.AllowedUsers
            .AnyAsync(x => x.Email == email && !x.IsRegistered);
    }

    public async Task MarkAsRegisteredAsync(string email)
    {
        var allowedUser = await _context.AllowedUsers
            .FirstOrDefaultAsync(x => x.Email == email);

        if (allowedUser == null)
            return;

        allowedUser.IsRegistered = true;

        await _context.SaveChangesAsync();
    }
}