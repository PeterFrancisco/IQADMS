namespace IQADMS.API.Authentication;

public static class AuthSessionCookies
{
    public const string SessionName = "iqadms_session";
    public const string RememberName = "iqadms_remember";

    public static void SetSessionCookies(
        HttpContext httpContext,
        string jwt,
        bool rememberMe,
        IConfiguration configuration)
    {
        var rememberMinutes = Convert.ToDouble(
            configuration["Jwt:RememberMeExpiryMinutes"] ?? "43200");
        var sessionMinutes = Convert.ToDouble(configuration["Jwt:ExpiryMinutes"] ?? "480");
        var maxAge = TimeSpan.FromMinutes(rememberMe ? rememberMinutes : sessionMinutes);

        var secure = httpContext.Request.IsHttps;

        httpContext.Response.Cookies.Append(SessionName, jwt, new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            MaxAge = maxAge,
            IsEssential = true
        });

        httpContext.Response.Cookies.Append(RememberName, rememberMe ? "1" : "0", new CookieOptions
        {
            HttpOnly = false,
            Secure = secure,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            MaxAge = TimeSpan.FromDays(400),
            IsEssential = true
        });
    }

    public static void ClearSessionCookies(HttpResponse response)
    {
        response.Cookies.Delete(SessionName, new CookieOptions { Path = "/" });
        response.Cookies.Delete(RememberName, new CookieOptions { Path = "/" });
    }
}
