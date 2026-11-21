using System.Security.Cryptography;

namespace IQADMS.API.Services;

public static class PasswordResetTokenGenerator
{
    public static string Generate()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }
}