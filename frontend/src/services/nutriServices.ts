import { apiClient } from './apiClient';
import {
  AuthResponseDto,
  LoginRequestDto,
  RegisterRequestDto,
  FoodItemDto,
  CreateFoodItemDto,
  MealPlanDto,
  CreateMealPlanDto,
  AddMealEntryDto,
  AdherenceReportDto,
  ClientProgressDto
} from '@/types';

// Auth Services (Endpoints 1-3)
export const authService = {
  register: async (data: RegisterRequestDto): Promise<AuthResponseDto> => {
    const res = await apiClient.post<AuthResponseDto>('/auth/register', data);
    return res.data;
  },

  login: async (data: LoginRequestDto): Promise<AuthResponseDto> => {
    const res = await apiClient.post<AuthResponseDto>('/auth/login', data);
    return res.data;
  },

  verifySession: async (): Promise<{ status: string }> => {
    const res = await apiClient.get<{ status: string }>('/auth/verify');
    return res.data;
  }
};

// User & Client Services (Endpoints 4-7)
export const userService = {
  getMyProfile: async (): Promise<{ id: string; email: string; fullName: string; role: string }> => {
    const res = await apiClient.get('/users/me');
    return res.data;
  },

  updateBodyMetrics: async (clientId: string, age: number, weightKg: number, heightCm: number): Promise<void> => {
    await apiClient.put(`/users/clients/${clientId}/body-metrics`, { age, weightKg, heightCm });
  },

  assignClient: async (nutritionistId: string, clientId: string): Promise<void> => {
    await apiClient.post(`/users/nutritionists/${nutritionistId}/assign/${clientId}`);
  },

  getMyClients: async (nutritionistId: string): Promise<Array<{ id: string; fullName: string; email: string; weightKg: number }>> => {
    const res = await apiClient.get(`/users/nutritionists/my-clients?nutritionistId=${nutritionistId}`);
    return res.data;
  },

  getUnassignedClients: async (): Promise<Array<{ id: string; fullName: string; email: string; weightKg: number }>> => {
    const res = await apiClient.get('/users/clients/unassigned');
    return res.data;
  },

  getClientById: async (clientId: string): Promise<{
    id: string;
    fullName: string;
    email: string;
    age: number;
    weightKg: number;
    heightCm: number;
    gender: string;
    activityLevel: string;
    bmr: number;
    tdee: number;
  }> => {
    const res = await apiClient.get(`/users/clients/${clientId}`);
    return res.data;
  }
};

// Food Catalog Services (Endpoints 8-11)
export const foodService = {
  getAll: async (): Promise<FoodItemDto[]> => {
    const res = await apiClient.get<FoodItemDto[]>('/food-items');
    return res.data;
  },

  getById: async (id: string): Promise<FoodItemDto> => {
    const res = await apiClient.get<FoodItemDto>(`/food-items/${id}`);
    return res.data;
  },

  create: async (data: CreateFoodItemDto): Promise<FoodItemDto> => {
    const res = await apiClient.post<FoodItemDto>('/food-items', data);
    return res.data;
  }
};

// Meal Plan Services (Endpoints 12-17)
export const mealPlanService = {
  create: async (data: CreateMealPlanDto): Promise<MealPlanDto> => {
    const res = await apiClient.post<MealPlanDto>('/meal-plans', data);
    return res.data;
  },

  getByClient: async (clientId: string): Promise<MealPlanDto[]> => {
    const res = await apiClient.get<MealPlanDto[]>(`/meal-plans/client/${clientId}`);
    return res.data;
  },

  getById: async (id: string): Promise<MealPlanDto> => {
    const res = await apiClient.get<MealPlanDto>(`/meal-plans/${id}`);
    return res.data;
  },

  update: async (id: string, data: { title: string; startDate: string; endDate: string }): Promise<void> => {
    await apiClient.put(`/meal-plans/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/meal-plans/${id}`);
  },

  addDailyMenu: async (
    planId: string,
    dayNumber: number,
    targetCalories: number,
    targetProteinGrams: number = 0,
    targetCarbsGrams: number = 0,
    targetFatGrams: number = 0
  ): Promise<void> => {
    await apiClient.post(`/meal-plans/${planId}/daily-menus`, {
      dayNumber,
      targetCalories,
      targetProteinGrams,
      targetCarbsGrams,
      targetFatGrams
    });
  },

  deleteDailyMenu: async (planId: string, menuId: string): Promise<void> => {
    await apiClient.delete(`/meal-plans/${planId}/daily-menus/${menuId}`);
  },

  updateDailyMenu: async (
    planId: string,
    menuId: string,
    data: { dayNumber: number; targetCalories: number; targetProteinGrams?: number; targetCarbsGrams?: number; targetFatGrams?: number }
  ): Promise<void> => {
    await apiClient.put(`/meal-plans/${planId}/daily-menus/${menuId}`, data);
  },

  addEntry: async (data: AddMealEntryDto): Promise<void> => {
    await apiClient.post('/meal-plans/daily-menus/entries', data);
  },

  updateEntry: async (
    entryId: string,
    data: { mealType: string; portionGrams: number; foodItemId: string }
  ): Promise<void> => {
    await apiClient.put(`/meal-entries/${entryId}`, data);
  },

  deleteEntry: async (entryId: string, menuId: string): Promise<void> => {
    await apiClient.delete(`/meal-entries/${entryId}?menuId=${menuId}`);
  },

  exportShoppingList: async (planId: string, format: 'pdf' | 'json' = 'pdf'): Promise<string> => {
    const res = await apiClient.get<string>(`/meal-plans/${planId}/shopping-list?format=${format}`);
    return res.data;
  }
};

// Tracking & Analytics Services (Endpoints 18-20)
export const trackingService = {
  logMeal: async (clientId: string, mealEntryId: string, actualPortionGrams: number, plannedPortionGrams: number): Promise<void> => {
    await apiClient.post('/tracking/logs', { clientId, mealEntryId, actualPortionGrams, plannedPortionGrams });
  },

  getAdherence: async (clientId: string): Promise<AdherenceReportDto> => {
    const res = await apiClient.get<AdherenceReportDto>(`/tracking/clients/${clientId}/adherence`);
    return res.data;
  },

  getProgress: async (clientId: string): Promise<ClientProgressDto> => {
    const res = await apiClient.get<ClientProgressDto>(`/tracking/clients/${clientId}/progress`);
    return res.data;
  }
};
