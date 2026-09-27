namespace NutriPlan.Api.Middlewares;

/// <summary>
/// Middleware ที่เพิ่ม Security Headers มาตรฐานให้ทุก HTTP Response
/// ป้องกัน Clickjacking, MIME-type sniffing, XSS, และ Information Disclosure
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Prevent MIME-type sniffing
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";

        // Prevent clickjacking
        context.Response.Headers["X-Frame-Options"] = "DENY";

        // XSS Protection (legacy browsers)
        context.Response.Headers["X-XSS-Protection"] = "1; mode=block";

        // Enforce HTTPS via HSTS (1 year)
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

        // Control referrer information leakage
        context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

        // Restrict browser features/permissions
        context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";

        // Prevent serving responses to cross-origin requests
        context.Response.Headers["X-Permitted-Cross-Domain-Policies"] = "none";

        // Remove server identity header
        context.Response.Headers.Remove("Server");
        context.Response.Headers.Remove("X-Powered-By");

        await _next(context);
    }
}
