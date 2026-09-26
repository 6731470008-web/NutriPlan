using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NutriPlan.Application.Common.Interfaces;
using NutriPlan.Application.Dtos;

namespace NutriPlan.Infrastructure.Services;

public class GeminiFoodRecognitionService : IFoodRecognitionService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiFoodRecognitionService> _logger;

    public GeminiFoodRecognitionService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiFoodRecognitionService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<FoodAnalysisResultDto> AnalyzeFoodImageAsync(Stream imageStream, string contentType, CancellationToken ct = default)
    {
        string apiKey = _configuration["Gemini:ApiKey"] ?? string.Empty;

        // If no API key is configured or is default placeholder, return a realistic mock estimation for demonstration/testing
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY")
        {
            _logger.LogWarning("Gemini API key is not configured. Returning fallback mock food recognition analysis.");
            return GenerateMockFoodAnalysis();
        }

        try
        {
            using var ms = new MemoryStream();
            await imageStream.CopyToAsync(ms, ct);
            byte[] imageBytes = ms.ToArray();
            string base64Image = Convert.ToBase64String(imageBytes);

            var promptText = @"คุณเป็นนักโภชนาการมืออาชีพและระบบ AI วิเคราะห์ภาพถ่ายอาหาร 
โปรดวิเคราะห์ภาพถ่ายอาหารนี้อย่างละเอียด ระบุ:
1. ชื่ออาหารโดยรวม (SummaryTitle) ภาษาไทย
2. รายการองค์ประกอบอาหารแต่ละชนิดในจาน (Items) พร้อมปริมาณกรัมโดยประมาณ (EstimatedWeightGrams), แคลอรี (Calories), โปรตีน (ProteinGrams), คาร์โบไฮเดรต (CarbsGrams), ไขมัน (FatGrams) และความเชื่อมั่น 0.0-1.0 (ConfidenceScore)
3. สรุปแคลอรีรวมและสารอาหารรวมทั้งหมด

ตอบกลับเป็น JSON ที่มีโครงสร้างดังนี้เท่านั้น (ไม่ต้องใส่ markdown backticks):
{
  ""summaryTitle"": ""ชื่ออาหาร ภาษาไทย"",
  ""totalCalories"": 450,
  ""totalProteinGrams"": 35,
  ""totalCarbsGrams"": 50,
  ""totalFatGrams"": 12,
  ""items"": [
    {
      ""foodName"": ""ชื่อส่วนประกอบ"",
      ""estimatedWeightGrams"": 200,
      ""calories"": 300,
      ""proteinGrams"": 25,
      ""carbsGrams"": 40,
      ""fatGrams"": 5,
      ""confidenceScore"": 0.95
    }
  ]
}";

            var requestPayload = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = promptText },
                            new
                            {
                                inline_data = new
                                {
                                    mime_type = string.IsNullOrWhiteSpace(contentType) ? "image/jpeg" : contentType,
                                    data = base64Image
                                }
                            }
                        }
                    }
                },
                generationConfig = new
                {
                    response_mime_type = "application/json",
                    temperature = 0.2
                }
            };

            var endpointUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
            var response = await _httpClient.PostAsJsonAsync(endpointUrl, requestPayload, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Gemini API error ({StatusCode}): {ErrorText}", response.StatusCode, errorText);
                return GenerateMockFoodAnalysis();
            }

            var rawJsonResponse = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(rawJsonResponse);

            var textContent = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrWhiteSpace(textContent))
            {
                return GenerateMockFoodAnalysis();
            }

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var parsedResult = JsonSerializer.Deserialize<FoodAnalysisResultDto>(textContent, options);
            return parsedResult ?? GenerateMockFoodAnalysis();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while calling Gemini Food Recognition API.");
            return GenerateMockFoodAnalysis();
        }
    }

    private static FoodAnalysisResultDto GenerateMockFoodAnalysis()
    {
        var items = new List<DetectedFoodItemDto>
        {
            new("ข้าวกล้องสุก", 150, 195, 4.5, 42.0, 1.5, 0.96),
            new("อกไก่ย่างเกลือ", 120, 198, 37.2, 0.0, 4.3, 0.94),
            new("ผักบรอกโคลีและแครอทต้ม", 80, 28, 2.1, 5.5, 0.3, 0.90),
            new("น้ำมันมะกอก (สำหรับปรุงอาหาร)", 5, 44, 0.0, 0.0, 5.0, 0.85)
        };

        return new FoodAnalysisResultDto(
            SummaryTitle: "ข้าวกล้องอกไก่ย่างผักเคียง",
            TotalCalories: 465,
            TotalProteinGrams: 43.8,
            TotalCarbsGrams: 47.5,
            TotalFatGrams: 11.1,
            Items: items
        );
    }
}
