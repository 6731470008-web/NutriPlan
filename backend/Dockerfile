# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY ["src/Infrastructure/NutriPlan.Api/NutriPlan.Api.csproj", "src/Infrastructure/NutriPlan.Api/"]
COPY ["src/Infrastructure/NutriPlan.Infrastructure/NutriPlan.Infrastructure.csproj", "src/Infrastructure/NutriPlan.Infrastructure/"]
COPY ["src/Core/NutriPlan.Application/NutriPlan.Application.csproj", "src/Core/NutriPlan.Application/"]
COPY ["src/Core/NutriPlan.Domain/NutriPlan.Domain.csproj", "src/Core/NutriPlan.Domain/"]

RUN dotnet restore "src/Infrastructure/NutriPlan.Api/NutriPlan.Api.csproj"

# Copy everything else and build Release
COPY . .
WORKDIR "/src/src/Infrastructure/NutriPlan.Api"
RUN dotnet publish "NutriPlan.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "NutriPlan.Api.dll"]
