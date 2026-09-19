using System.Net;
using System.Text.Json;
using NutriPlan.Domain.Common;

namespace NutriPlan.Api.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred during request processing.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = exception switch
        {
            DomainException domainEx => (HttpStatusCode.BadRequest, domainEx.Message),
            KeyNotFoundException notFoundEx => (HttpStatusCode.NotFound, notFoundEx.Message),
            UnauthorizedAccessException authEx => (HttpStatusCode.Unauthorized, authEx.Message),
            _ => (HttpStatusCode.InternalServerError, "ระบบเกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง (An unexpected server error occurred.)")
        };

        context.Response.StatusCode = (int)statusCode;

        var responsePayload = new
        {
            statusCode = context.Response.StatusCode,
            error = statusCode.ToString(),
            message,
            timestamp = DateTime.UtcNow
        };

        return context.Response.WriteAsync(JsonSerializer.Serialize(responsePayload));
    }
}
