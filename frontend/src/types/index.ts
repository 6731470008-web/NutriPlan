export type UserRole = 'Client' | 'Nutritionist' | 'Admin';
export type MealType = 'Breakfast' | 'MorningSnack' | 'Lunch' | 'AfternoonSnack' | 'Dinner' | 'Supper';
export type GoalType = 'WeightLoss' | 'Maintenance' | 'MuscleGain' | 'KetogenicAdaptation';
export type ActivityLevel = 'Sedentary' | 'LightlyActive' | 'ModeratelyActive' | 'VeryActive' | 'ExtraActive';
export type Gender = 'Male' | 'Female' | 'Other';

export interface RegisterRequestDto {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  age?: number;
  dateOfBirth?: string;
  weightKg?: number;
  heightCm?: number;
  activityLevel?: ActivityLevel;
  gender?: Gender;
  healthConditions?: string;
  foodAllergies?: string;
  licenseNumber?: string;
  specialization?: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  token: string;
}

export interface FoodItemDto {
  id: string;
  name: string;
  category: string;
  caloriesPer100g: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  isAllergenic: boolean;
  allergenWarning?: string;
}

export interface CreateFoodItemDto {
  name: string;
  category: string;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  isAllergenic: boolean;
  allergenWarning?: string;
}

export interface MealEntryDto {
  id: string;
  mealType: MealType;
  portionGrams: number;
  foodItemId: string;
  foodItemName: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface DailyMenuDto {
  id: string;
  dayNumber: number;
  targetCalories: number;
  targetProteinGrams?: number;
  targetCarbsGrams?: number;
  targetFatGrams?: number;
  totalCalories: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
  entries: MealEntryDto[];
}

export interface MealPlanDto {
  id: string;
  clientId: string;
  title: string;
  startDate: string;
  endDate: string;
  totalCalories: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
  dailyMenus?: DailyMenuDto[];
}

export interface CreateMealPlanDto {
  clientId: string;
  title: string;
  startDate: string;
  endDate: string;
}

export interface AddMealEntryDto {
  dailyMenuId: string;
  mealType: MealType;
  portionGrams: number;
  foodItemId: string;
}

export interface AdherenceReportDto {
  clientId: string;
  totalLogged?: number;
  adheredCount?: number;
  adherenceRatePercent: number;
  status: string;
}

export interface ClientProgressDto {
  clientId: string;
  currentWeight: number;
  targetWeight: number;
  caloriesBurnedThisWeek: number;
}
