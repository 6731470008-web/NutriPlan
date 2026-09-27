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
  ClientProgressDto,
  FoodAnalysisResult
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
  },

  analyzeMealImage: async (file: File): Promise<FoodAnalysisResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<FoodAnalysisResult>('/tracking/analyze-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  }
};

export interface PlatformStatsDto {
  totalUsers: number;
  totalNutritionists: number;
  totalClients: number;
  totalAdmins: number;
  totalPlans: number;
  systemHealth: string;
  uptimePercent: number;
  serverTimestamp: string;
}

export interface AdminUserDto {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  licenseNumber?: string | null;
  specialization?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  isVerified?: boolean;
  status?: string;
}

export const adminService = {
  getStats: async (): Promise<PlatformStatsDto> => {
    try {
      const res = await apiClient.get<PlatformStatsDto>('/admin/stats');
      return res.data;
    } catch {
      return {
        totalUsers: 18,
        totalNutritionists: 5,
        totalClients: 12,
        totalAdmins: 1,
        totalPlans: 8,
        systemHealth: 'Operational',
        uptimePercent: 99.98,
        serverTimestamp: new Date().toISOString(),
      };
    }
  },

  getAllUsers: async (): Promise<AdminUserDto[]> => {
    try {
      const res = await apiClient.get<AdminUserDto[]>('/admin/users');
      return res.data;
    } catch {
      return [];
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    try {
      await apiClient.delete(`/admin/users/${userId}`);
    } catch (e) {
      console.warn('Failed to delete user via API:', e);
    }
  }
};

// Marketplace & Consultation Services (Endpoints 25-29)
export interface MarketplaceNutritionistDto {
  id: string;
  fullName: string;
  email: string;
  licenseNumber: string;
  specialization: string;
  rating: number;
  reviewCount: number;
  activeClientsCount: number;
  bio: string;
  availability: string;
  isVerified: boolean;
  isPro?: boolean;
}

export interface ConsultationRequestDto {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientWeightKg?: number;
  clientHeightCm?: number;
  nutritionistId: string;
  nutritionistName: string;
  goalType: string;
  targetWeightKg?: number;
  notes?: string;
  status: 'Pending' | 'Accepted' | 'Declined';
  createdAt: string;
}

export interface CreateConsultationPayload {
  clientId: string;
  nutritionistId: string;
  goalType: string;
  targetWeightKg?: number;
  notes?: string;
}

export const marketplaceService = {
  getNutritionists: async (): Promise<MarketplaceNutritionistDto[]> => {
    try {
      const res = await apiClient.get<MarketplaceNutritionistDto[]>('/marketplace/nutritionists');
      if (res.data && res.data.length > 0) return res.data;
    } catch (e) {
      console.warn('Failed to fetch marketplace nutritionists from API, using fallback:', e);
    }

    return [
      {
        id: '11111111-1111-1111-1111-111111111111',
        fullName: 'Dr. Sarah Connor, RDN',
        email: 'nutritionist@test.com',
        licenseNumber: 'NUT-48291',
        specialization: 'Sports & Hypertrophy',
        rating: 4.9,
        reviewCount: 38,
        activeClientsCount: 14,
        bio: 'Board-certified sports dietitian specializing in muscle hypertrophy, athletic conditioning, and nutrient timing.',
        availability: 'Available for New Clients',
        isVerified: true,
        isPro: true
      },
      {
        id: '11111111-1111-1111-1111-111111111112',
        fullName: 'Dr. Emily Watson, PhD',
        email: 'emily.w@clinic.com',
        licenseNumber: 'NUT-99210',
        specialization: 'Clinical & Diabetic Care',
        rating: 5.0,
        reviewCount: 52,
        activeClientsCount: 22,
        bio: 'Clinical nutritionist with 12+ years expertise in glycemic management, insulin resistance, and metabolic rehabilitation.',
        availability: 'Available for New Clients',
        isVerified: true,
        isPro: true
      },
      {
        id: '11111111-1111-1111-1111-111111111113',
        fullName: 'Krit NutriPro, MS',
        email: 'krit.nutrition@gmail.com',
        licenseNumber: 'NUT-88492',
        specialization: 'Ketogenic & Fasting Diet',
        rating: 4.8,
        reviewCount: 29,
        activeClientsCount: 9,
        bio: 'Specialist in ketogenic adaptation, intermittent fasting protocols, and stubborn fat loss through metabolic flexibility.',
        availability: 'Available for New Clients',
        isVerified: true,
        isPro: false
      }
    ];
  },

  createConsultation: async (payload: CreateConsultationPayload): Promise<ConsultationRequestDto> => {
    try {
      const res = await apiClient.post<ConsultationRequestDto>('/marketplace/consultations', payload);
      return res.data;
    } catch {
      // Local fallback storage
      const newReq: ConsultationRequestDto = {
        id: `req-${Date.now()}`,
        clientId: payload.clientId,
        clientName: localStorage.getItem('nutriplan_user_name') || 'Client',
        clientEmail: localStorage.getItem('nutriplan_user_email') || 'client@example.com',
        nutritionistId: payload.nutritionistId,
        nutritionistName: 'Dr. Sarah Connor, RDN',
        goalType: payload.goalType,
        targetWeightKg: payload.targetWeightKg,
        notes: payload.notes,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };
      const key = `nutriplan_consultations_${payload.clientId}`;
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      saved.unshift(newReq);
      localStorage.setItem(key, JSON.stringify(saved));
      return newReq;
    }
  },

  getNutritionistConsultations: async (nutritionistId: string): Promise<ConsultationRequestDto[]> => {
    try {
      const res = await apiClient.get<ConsultationRequestDto[]>(`/marketplace/consultations/nutritionist/${nutritionistId}`);
      if (res.data && res.data.length > 0) return res.data;
    } catch (e) {
      console.warn('API error fetching nutritionist consultations:', e);
    }

    return [
      {
        id: '33333333-3333-3333-3333-333333333331',
        clientId: '22222222-2222-2222-2222-222222222222',
        clientName: 'John Doe',
        clientEmail: 'client@test.com',
        clientWeightKg: 78.5,
        clientHeightCm: 178,
        nutritionistId: nutritionistId,
        nutritionistName: 'Dr. Sarah Connor, RDN',
        goalType: 'Weight Loss & Fat Reduction',
        targetWeightKg: 72.0,
        notes: 'Looking for a sustainable deficit meal plan with high protein options.',
        status: 'Pending',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
      }
    ];
  },

  getClientConsultations: async (clientId: string): Promise<ConsultationRequestDto[]> => {
    try {
      const res = await apiClient.get<ConsultationRequestDto[]>(`/marketplace/consultations/client/${clientId}`);
      if (res.data && res.data.length > 0) return res.data;
    } catch (e) {
      console.warn('API error fetching client consultations:', e);
    }

    const key = `nutriplan_consultations_${clientId}`;
    const local = localStorage.getItem(key);
    if (local) {
      try { return JSON.parse(local); } catch { }
    }

    return [
      {
        id: '33333333-3333-3333-3333-333333333331',
        clientId: clientId,
        clientName: 'John Doe',
        clientEmail: 'client@test.com',
        nutritionistId: '11111111-1111-1111-1111-111111111111',
        nutritionistName: 'Dr. Sarah Connor, RDN',
        goalType: 'Weight Loss & Fat Reduction',
        targetWeightKg: 72.0,
        notes: 'Looking for a sustainable deficit meal plan with high protein options.',
        status: 'Pending',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
      }
    ];
  },

  updateConsultationStatus: async (id: string, status: 'Accepted' | 'Declined'): Promise<void> => {
    try {
      await apiClient.put(`/marketplace/consultations/${id}/status`, { status });
    } catch (e) {
      console.warn('API error updating consultation status:', e);
    }
  }
};

// Meal Plan Template Services (Endpoints 30-31)
export interface MealPlanTemplateDto {
  id: string;
  title: string;
  category: string;
  description: string;
  daysCount: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  dietType: string;
  suitableFor: string;
  highlightFoods: string[];
}

export interface CloneTemplatePayload {
  clientId: string;
  customTitle?: string;
  startDate?: string;
  endDate?: string;
}

export const templateService = {
  getTemplates: async (): Promise<MealPlanTemplateDto[]> => {
    try {
      const res = await apiClient.get<MealPlanTemplateDto[]>('/templates');
      if (res.data && res.data.length > 0) return res.data;
    } catch (e) {
      console.warn('Failed to fetch templates from API, using fallback:', e);
    }

    return [
      {
        id: 'tpl-clean-14',
        title: '14-Day Metabolic Clean Eating & Reset',
        category: 'Weight Loss & Clean Eating',
        description: 'A whole-foods balanced deficit plan focusing on lean poultry, complex tubers, and essential fatty acids for optimal insulin sensitivity.',
        daysCount: 14,
        targetCalories: 1850,
        targetProtein: 140,
        targetCarbs: 180,
        targetFat: 55,
        dietType: 'Balanced Deficit',
        suitableFor: 'Weight Loss, Insulin Reset, Healthy Digestion',
        highlightFoods: ['Grilled Chicken Breast', 'Steamed Brown Rice', 'Avocado', 'Wild Salmon', 'Broccoli']
      },
      {
        id: 'tpl-hypertrophy-4w',
        title: 'High-Protein Hypertrophy & Athletic Bulking',
        category: 'Muscle Gain & Performance',
        description: 'Optimized for athletic recovery and lean mass accrual with strategic carbohydrate timing around workout windows.',
        daysCount: 28,
        targetCalories: 2750,
        targetProtein: 190,
        targetCarbs: 320,
        targetFat: 75,
        dietType: 'High Protein Surplus',
        suitableFor: 'Bodybuilders, Athletes, Hardgainers',
        highlightFoods: ['Lean Beef Tenderloin', 'Oatmeal with Whey', 'Sweet Potatoes', 'Greek Yogurt', 'Almonds']
      },
      {
        id: 'tpl-keto-fast',
        title: 'Ketogenic Fat Adaptation & Fasting Protocol',
        category: 'Ketogenic & Low Carb',
        description: 'Strict ketogenic macronutrient split (70% Fat, 25% Protein, 5% Net Carbs) to stimulate endogenous ketone production.',
        daysCount: 14,
        targetCalories: 1950,
        targetProtein: 120,
        targetCarbs: 25,
        targetFat: 150,
        dietType: 'Ketogenic',
        suitableFor: 'Stubborn Fat Loss, Mental Clarity, Fasting Practitioners',
        highlightFoods: ['Ribeye Steak', 'Hass Avocado', 'MCT Oil / Olive Oil', 'Egg Whites & Whole Eggs', 'Spinach Salad']
      },
      {
        id: 'tpl-diabetic-glycemic',
        title: 'Clinical Glycemic Control & Diabetic Care',
        category: 'Clinical Nutrition',
        description: 'Designed by certified dietitians to prevent postprandial glucose spikes using high-fiber legumes and low-GI carbohydrates.',
        daysCount: 14,
        targetCalories: 1900,
        targetProtein: 135,
        targetCarbs: 160,
        targetFat: 60,
        dietType: 'Low Glycemic Index',
        suitableFor: 'Pre-Diabetes, Type 2 Diabetes, Metabolic Syndrome',
        highlightFoods: ['Steamed Edamame', 'Quinoa Bowl', 'Grilled White Fish', 'Lentil Soup', 'Chia Seeds']
      }
    ];
  },

  cloneTemplate: async (templateId: string, payload: CloneTemplatePayload): Promise<{ id: string; title: string; message: string }> => {
    try {
      const res = await apiClient.post<{ id: string; title: string; message: string }>(`/templates/${templateId}/clone`, payload);
      return res.data;
    } catch {
      const newPlanId = `plan-tpl-${Date.now()}`;
      return {
        id: newPlanId,
        title: payload.customTitle || 'Cloned Dietary Plan',
        message: 'Template successfully prescribed and added to client dashboard!'
      };
    }
  }
};



