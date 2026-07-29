using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using IQADMS.API.Models;

namespace IQADMS.API.Authentication;

public class JwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user, bool rememberMe = true)
    {
        var key = _configuration["Jwt:Key"]!;

        var issuer = _configuration["Jwt:Issuer"];

        var audience = _configuration["Jwt:Audience"];

        var expiryMinutes = rememberMe
            ? Convert.ToDouble(_configuration["Jwt:RememberMeExpiryMinutes"] ?? "43200")
            : Convert.ToDouble(_configuration["Jwt:ExpiryMinutes"] ?? "480");

        return GenerateTokenInternal(user, expiryMinutes, key, issuer, audience);
    }

    public string GenerateTokenForUser(User user, bool rememberMe) => GenerateToken(user, rememberMe);

    private string GenerateTokenInternal(
        User user,
        double expiryMinutes,
        string key,
        string? issuer,
        string? audience)
    {
        var securityKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(key));

        var credentials = new SigningCredentials(
            securityKey,
            SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Position)
        };

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public bool TryGetUserIdFromToken(string bearerToken, bool allowExpired, out Guid userId)
    {
        userId = Guid.Empty;
        var key = _configuration["Jwt:Key"]!;
        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];

        var handler = new JwtSecurityTokenHandler();
        var parameters = BuildValidationParameters(key, issuer, audience, validateLifetime: !allowExpired);

        try
        {
            var principal = handler.ValidateToken(bearerToken, parameters, out var validated);
            var sub = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out userId))
                return false;

            if (!allowExpired || validated is not JwtSecurityToken jwt)
                return true;

            var maxStaleMinutes = Convert.ToDouble(
                _configuration["Jwt:RefreshGraceMinutes"] ?? "10080");
            return DateTime.UtcNow <= jwt.ValidTo.AddMinutes(maxStaleMinutes);
        }
        catch
        {
            return false;
        }
    }

    private static TokenValidationParameters BuildValidationParameters(
        string key,
        string? issuer,
        string? audience,
        bool validateLifetime)
    {
        return new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = validateLifetime,
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    }
}