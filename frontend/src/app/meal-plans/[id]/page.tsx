'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mealPlanService, foodService, userService } from '@/services/nutriServices';
import { MealPlanDto, FoodItemDto, MealType } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function MealPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { t } = useLanguage();

  const [plan, setPlan] = useState<MealPlanDto | null>(null);
  const [foodCatalog, setFoodCatalog] = useState<FoodItemDto[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [newDayNumber, setNewDayNumber] = useState<number>(1);
  const [newTargetCalories, setNewTargetCalories] = useState<number>(2000);
  const [newTargetProtein, setNewTargetProtein] = useState<number>(150);
  const [newTargetCarbs, setNewTargetCarbs] = useState<number>(200);
  const [newTargetFat, setNewTargetFat] = useState<number>(60);

  // Edit Meal Plan Modal state
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editPlanTitle, setEditPlanTitle] = useState('');
  const [editPlanStartDate, setEditPlanStartDate] = useState('');
  const [editPlanEndDate, setEditPlanEndDate] = useState('');

  // Target Macros Modal state (Image 2)
  const [showEditTargetsModal, setShowEditTargetsModal] = useState(false);
  const [targetMenuId, setTargetMenuId] = useState<string | null>(null);
  const [targetCaloriesInput, setTargetCaloriesInput] = useState<number>(2000);
  const [targetProteinInput, setTargetProteinInput] = useState<number>(150);
  const [targetCarbsInput, setTargetCarbsInput] = useState<number>(200);
  const [targetFatInput, setTargetFatInput] = useState<number>(60);

  // Auto-Calculator State (Calculated baseline energy & macros)
  const [calcWeight, setCalcWeight] = useState<number>(70);
  const [calcHeight, setCalcHeight] = useState<number>(170);
  const [calcAge, setCalcAge] = useState<number>(30);
  const [calcGender, setCalcGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [calcBodyFat, setCalcBodyFat] = useState<number | ''>('');
  const [calcActivity, setCalcActivity] = useState<'Sedentary' | 'LightlyActive' | 'ModeratelyActive' | 'VeryActive' | 'ExtraActive'>('Sedentary');
  const [calcGoal, setCalcGoal] = useState<'WeightLoss' | 'Maintenance' | 'MuscleGain'>('WeightLoss');
  const [calcCalorieOffset, setCalcCalorieOffset] = useState<number>(-500);

  // Active day filter for summary cards
  const [activeDayId, setActiveDayId] = useState<string | 'all'>('all');

  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [entryMealType, setEntryMealType] = useState<MealType>('Breakfast');
  const [entryFoodItemId, setEntryFoodItemId] = useState<string>('');
  const [entryPortionGrams, setEntryPortionGrams] = useState<number | string>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & custom food creation state
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [isCreatingCustomFood, setIsCreatingCustomFood] = useState(false);
  const [customFoodName, setCustomFoodName] = useState('');
  const [customCategory, setCustomCategory] = useState('General');
  const [customProtein, setCustomProtein] = useState<number>(0);
  const [customCarbs, setCustomCarbs] = useState<number>(0);
  const [customFat, setCustomFat] = useState<number>(0);
  const [customFiber, setCustomFiber] = useState<number>(0);
  const [customIsAllergenic, setCustomIsAllergenic] = useState(false);
  const [isSavingCustomFood, setIsSavingCustomFood] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const fetchPlanDetails = useCallback(async () => {
    try {
      const [data, foods] = await Promise.all([
        mealPlanService.getById(resolvedParams.id),
        foodService.getAll()
      ]);
      setPlan(data);
      setFoodCatalog(foods);
      if (foods.length > 0 && !entryFoodItemId) setEntryFoodItemId(foods[0].id);
      setNewDayNumber((data.dailyMenus?.length ?? 0) + 1);

      // Auto-fetch client metrics if clientId is available
      if (data.clientId) {
        try {
          const clientData = await userService.getClientById(data.clientId);
          if (clientData) {
            if (clientData.weightKg > 0) setCalcWeight(clientData.weightKg);
            if (clientData.heightCm > 0) setCalcHeight(clientData.heightCm);
            if (clientData.age > 0) setCalcAge(clientData.age);
            if (clientData.gender) {
              const g = clientData.gender.toString();
              setCalcGender(g === 'Female' ? 'Female' : g === 'Other' ? 'Other' : 'Male');
            }
            if (clientData.activityLevel) {
              const act = clientData.activityLevel.toString();
              setCalcActivity(act as any);
            }
          }
        } catch {
          // Ignore client fetch errors
        }
      }
    } catch (err: unknown) {
      setError(t('mealPlanDetail.failedLoadDetails'));
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id, t, entryFoodItemId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserRole(localStorage.getItem('nutriplan_user_role'));
    }
    fetchPlanDetails();
  }, [fetchPlanDetails]);

  const handleExport = async (format: 'pdf' | 'json') => {
    setExportLoading(format);
    try {
      const content = await mealPlanService.exportShoppingList(resolvedParams.id, format);
      const mimeType = format === 'pdf' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8';
      const blobParts = format === 'pdf' ? ['\uFEFF', content] : [content];
      const blob = new Blob(blobParts, { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = plan?.title ? plan.title.trim().replace(/\s+/g, '_') : 'Export';
      link.setAttribute(
        'download',
        `MEAL_PLAN_${safeTitle}.${format === 'pdf' ? 'txt' : 'json'}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: unknown) {
      alert(`Export failed for format: ${format}`);
    } finally {
      setExportLoading(null);
    }
  };

  const [modalError, setModalError] = useState<string | null>(null);

  // Meal Plan Edit & Delete Handlers
  const handleStartEditPlan = () => {
    if (!plan) return;
    setEditPlanTitle(plan.title);
    setEditPlanStartDate(plan.startDate ? plan.startDate.split('T')[0] : '');
    setEditPlanEndDate(plan.endDate ? plan.endDate.split('T')[0] : '');
    setShowEditPlanModal(true);
  };

  const handleSaveEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      await mealPlanService.update(plan.id, {
        title: editPlanTitle.trim(),
        startDate: new Date(editPlanStartDate).toISOString(),
        endDate: new Date(editPlanEndDate).toISOString()
      });
      setShowEditPlanModal(false);
      await fetchPlanDetails();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || (err as Error)?.message || 'Failed to update meal plan.';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!plan) return;
    if (!confirm(`คุณต้องการลบแผนอาหาร "${plan.title}" ใช่หรือไม่? / Delete meal plan?`)) {
      return;
    }
    try {
      await mealPlanService.delete(plan.id);
      router.push('/dashboard/nutritionist');
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || (err as Error)?.message || 'Failed to delete meal plan.';
      alert(msg);
    }
  };

  // Helper calculations for BMR, TDEE, and Target Calories/Macros
  const computeBaselineTargets = useCallback(() => {
    // 1. Calculate BMR
    let bmr = 0;
    if (calcBodyFat !== '' && Number(calcBodyFat) > 0) {
      // Katch-McArdle Formula
      const lbm = calcWeight * (1 - Number(calcBodyFat) / 100);
      bmr = 370 + 21.6 * lbm;
    } else {
      // Mifflin-St Jeor Formula
      const base = 10 * calcWeight + 6.25 * calcHeight - 5 * calcAge;
      bmr = calcGender === 'Male' ? base + 5 : base - 161;
    }

    // 2. Calculate TDEE
    const activityMultipliers: Record<string, number> = {
      Sedentary: 1.2,
      LightlyActive: 1.375,
      ModeratelyActive: 1.55,
      VeryActive: 1.725,
      ExtraActive: 1.9
    };
    const mult = activityMultipliers[calcActivity] || 1.2;
    const tdee = bmr * mult;

    // 3. Caloric Target by Goal & Custom Offset
    const targetCal = Math.max(1200, Math.round(tdee + calcCalorieOffset));

    // 4. Macro Splits (g)
    // Protein: Weight Loss / Muscle Gain -> 2.0 g/kg, Maintenance -> 1.8 g/kg
    const proteinFactor = calcGoal === 'Maintenance' ? 1.8 : 2.0;
    const targetProtein = Math.round(calcWeight * proteinFactor);
    const proteinCal = targetProtein * 4;

    // Fat: 25% of Total Calories
    const targetFat = Math.round((targetCal * 0.25) / 9);
    const fatCal = targetFat * 9;

    // Carbs: Remaining Calories
    const remainingCal = Math.max(0, targetCal - proteinCal - fatCal);
    const targetCarbs = Math.round(remainingCal / 4);

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCal,
      targetProtein,
      targetCarbs,
      targetFat
    };
  }, [calcWeight, calcHeight, calcAge, calcGender, calcBodyFat, calcActivity, calcGoal, calcCalorieOffset]);

  const handleApplyCalculatedBaseline = () => {
    const computed = computeBaselineTargets();
    setTargetCaloriesInput(computed.targetCal);
    setTargetProteinInput(computed.targetProtein);
    setTargetCarbsInput(computed.targetCarbs);
    setTargetFatInput(computed.targetFat);
  };

  // Image 2: Open Targets Edit Modal
  const handleOpenEditTargets = (menuId?: string) => {
    const targetMenu = plan?.dailyMenus?.find(m => m.id === (menuId || activeDayId)) || (plan?.dailyMenus && plan.dailyMenus.length > 0 ? plan.dailyMenus[0] : null);
    if (targetMenu) {
      setTargetMenuId(targetMenu.id);
      setTargetCaloriesInput(targetMenu.targetCalories);
      setTargetProteinInput(targetMenu.targetProteinGrams || 150);
      setTargetCarbsInput(targetMenu.targetCarbsGrams || 200);
      setTargetFatInput(targetMenu.targetFatGrams || 60);
    } else {
      setTargetMenuId(null);
      setTargetCaloriesInput(2000);
      setTargetProteinInput(150);
      setTargetCarbsInput(200);
      setTargetFatInput(60);
    }
    setShowEditTargetsModal(true);
  };

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      if (targetMenuId) {
        const currentMenu = plan.dailyMenus?.find(m => m.id === targetMenuId);
        await mealPlanService.updateDailyMenu(plan.id, targetMenuId, {
          dayNumber: currentMenu ? currentMenu.dayNumber : 1,
          targetCalories: targetCaloriesInput,
          targetProteinGrams: targetProteinInput,
          targetCarbsGrams: targetCarbsInput,
          targetFatGrams: targetFatInput
        });
      } else {
        // If no daily menu exists yet, create Day 1 menu with specified targets
        await mealPlanService.addDailyMenu(
          plan.id,
          1,
          targetCaloriesInput,
          targetProteinInput,
          targetCarbsInput,
          targetFatInput
        );
      }
      setShowEditTargetsModal(false);
      await fetchPlanDetails();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || (err as Error)?.message || 'Failed to update target macros.';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Image 1: Add Daily Menu (Simplified)
  const handleCreateDailyMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      await mealPlanService.addDailyMenu(
        plan.id,
        newDayNumber,
        2000,
        150,
        200,
        60
      );
      setShowAddMenuModal(false);
      setEditingMenuId(null);
      await fetchPlanDetails();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || (err as Error)?.message || 'Failed to save daily menu.';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMealEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuId || !entryFoodItemId) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      if (editingEntryId) {
        await mealPlanService.updateEntry(editingEntryId, {
          mealType: entryMealType,
          portionGrams: Number(entryPortionGrams) > 0 ? Number(entryPortionGrams) : 100,
          foodItemId: entryFoodItemId
        });
      } else {
        await mealPlanService.addEntry({
          dailyMenuId: selectedMenuId,
          mealType: entryMealType,
          portionGrams: Number(entryPortionGrams) > 0 ? Number(entryPortionGrams) : 100,
          foodItemId: entryFoodItemId
        });
      }
      setShowAddEntryModal(false);
      setEditingEntryId(null);
      setFoodSearchQuery('');
      await fetchPlanDetails();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || (err as Error)?.message || 'Failed to save meal entry.';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditEntry = (entry: { id: string; mealType: MealType; portionGrams: number; foodItemId: string }, menuId: string) => {
    setEditingEntryId(entry.id);
    setSelectedMenuId(menuId);
    setEntryMealType(entry.mealType);
    setEntryFoodItemId(entry.foodItemId);
    setEntryPortionGrams(entry.portionGrams);
    setShowAddEntryModal(true);
  };

  const handleStartEditMenu = (menu: { id: string; dayNumber: number; targetCalories: number; targetProteinGrams?: number; targetCarbsGrams?: number; targetFatGrams?: number }) => {
    handleOpenEditTargets(menu.id);
  };

  const handleCreateCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFoodName.trim()) return;
    setIsSavingCustomFood(true);
    setModalError(null);
    try {
      const newFood = await foodService.create({
        name: customFoodName.trim(),
        category: customCategory || 'General',
        proteinGrams: customProtein,
        carbsGrams: customCarbs,
        fatGrams: customFat,
        fiberGrams: customFiber,
        isAllergenic: customIsAllergenic
      });
      setFoodCatalog((prev) => [newFood, ...prev]);
      setEntryFoodItemId(newFood.id);
      setIsCreatingCustomFood(false);
      setCustomFoodName('');
      setCustomProtein(0);
      setCustomCarbs(0);
      setCustomFat(0);
      setCustomFiber(0);
      setCustomIsAllergenic(false);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || (err as Error)?.message || 'Failed to create food item.';
      setModalError(msg);
    } finally {
      setIsSavingCustomFood(false);
    }
  };

  const handleDeleteMealEntry = async (entryId: string, menuId: string) => {
    if (!confirm('คุณต้องการลบรายการอาหารนี้ใช่หรือไม่? / Are you sure you want to delete this meal entry?')) {
      return;
    }
    setDeletingEntryId(entryId);
    try {
      await mealPlanService.deleteEntry(entryId, menuId);
      await fetchPlanDetails();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || (err as Error)?.message || 'Failed to delete meal entry.';
      alert(msg);
    } finally {
      setDeletingEntryId(null);
    }
  };

  const [deletingMenuId, setDeletingMenuId] = useState<string | null>(null);

  const handleDeleteDailyMenu = async (menuId: string, dayNumber: number) => {
    if (!plan) return;
    if (!confirm(`คุณต้องการลบเมนูรายวัน "วัน ${dayNumber}" และรายการอาหารทั้งหมดในวันนี้ใช่หรือไม่? / Are you sure you want to delete Day ${dayNumber}?`)) {
      return;
    }
    setDeletingMenuId(menuId);
    try {
      await mealPlanService.deleteDailyMenu(plan.id, menuId);
      await fetchPlanDetails();
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || (err as Error)?.message || 'Failed to delete daily menu.';
      alert(msg);
    } finally {
      setDeletingMenuId(null);
    }
  };

  const mealTypeOrder: Record<string, number> = {
    Breakfast: 1,
    MorningSnack: 2,
    Lunch: 3,
    AfternoonSnack: 4,
    Dinner: 5,
    Supper: 6
  };

  const filteredFoods = foodCatalog.filter(
    (f) =>
      f.name.toLowerCase().includes(foodSearchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(foodSearchQuery.toLowerCase())
  );

  const selectedFoodItem = foodCatalog.find((f) => f.id === entryFoodItemId);

  const activeMenu = activeDayId === 'all' ? null : (plan?.dailyMenus?.find((m) => m.id === activeDayId) || null);

  // Total sum of targets across all daily menus when "รวมทุกวัน" (All Days) is selected
  const sumTargetCal = plan?.dailyMenus?.reduce((acc, m) => acc + (m.targetCalories || 2000), 0) || 2000;
  const sumTargetP = plan?.dailyMenus?.reduce((acc, m) => acc + (m.targetProteinGrams || 150), 0) || 150;
  const sumTargetC = plan?.dailyMenus?.reduce((acc, m) => acc + (m.targetCarbsGrams || 200), 0) || 200;
  const sumTargetF = plan?.dailyMenus?.reduce((acc, m) => acc + (m.targetFatGrams || 60), 0) || 60;

  const currentCal = activeDayId === 'all' ? (plan?.totalCalories ?? 0) : (activeMenu?.totalCalories ?? 0);
  const targetCal = activeDayId === 'all' ? sumTargetCal : (activeMenu ? activeMenu.targetCalories : 2000);

  const currentP = activeDayId === 'all' ? (plan?.totalProteinGrams ?? 0) : (activeMenu?.totalProteinGrams ?? 0);
  const targetP = activeDayId === 'all' ? sumTargetP : (activeMenu ? (activeMenu.targetProteinGrams || 150) : 150);

  const currentC = activeDayId === 'all' ? (plan?.totalCarbsGrams ?? 0) : (activeMenu?.totalCarbsGrams ?? 0);
  const targetC = activeDayId === 'all' ? sumTargetC : (activeMenu ? (activeMenu.targetCarbsGrams || 200) : 200);

  const currentF = activeDayId === 'all' ? (plan?.totalFatGrams ?? 0) : (activeMenu?.totalFatGrams ?? 0);
  const targetF = activeDayId === 'all' ? sumTargetF : (activeMenu ? (activeMenu.targetFatGrams || 60) : 60);

  const getMealTypeBadge = (mealType: string) => {
    switch (mealType) {
      case 'Breakfast':
        return 'bg-amber-900/50 text-amber-300 border-amber-700/50';
      case 'Lunch':
        return 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50';
      case 'Dinner':
        return 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const handleBackToDashboard = () => {
    const role = userRole || (typeof window !== 'undefined' ? localStorage.getItem('nutriplan_user_role') : null);
    if (role === 'Client') {
      router.push('/dashboard/client');
    } else {
      router.push('/dashboard/nutritionist');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handleBackToDashboard}
          className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
        >
          ← {t('common.backToDashboard')}
        </button>
        <LanguageSwitcher />
      </div>

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">{t('mealPlanDetail.loadingDetails')}</div>
      ) : error || !plan ? (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
          {error ?? t('mealPlanDetail.planNotFound')}
        </div>
      ) : (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Header Card with Edit/Delete Meal Plan */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-emerald-400">{plan.title}</h1>
                {userRole === 'Nutritionist' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleStartEditPlan}
                      title="แก้ไขชื่อและวันที่ของแผนอาหาร / Edit plan"
                      className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 p-1.5 rounded-lg transition-colors text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={handleDeletePlan}
                      title="ลบแผนอาหารนี้ / Delete plan"
                      className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-1">
                {t('mealPlanDetail.validityPeriod')}: {new Date(plan.startDate).toLocaleDateString()} -{' '}
                {new Date(plan.endDate).toLocaleDateString()}
              </p>
            </div>

            {/* GoF Factory Export Action Section */}
            <div className="flex space-x-3">
              <button
                onClick={() => handleExport('pdf')}
                disabled={exportLoading === 'pdf'}
                className="bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950 text-xs px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {exportLoading === 'pdf' ? t('common.exporting') : t('common.exportPdf')}
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={exportLoading === 'json'}
                className="bg-slate-800 hover:bg-slate-700 font-semibold text-slate-200 text-xs px-4 py-2.5 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
              >
                {exportLoading === 'json' ? t('common.exporting') : t('common.exportJson')}
              </button>
            </div>
          </div>

          {/* Image 2: Macro Summary Dashboard Cards with Target vs Remaining Quota & Day Selector */}
          <div className="space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs text-slate-400 font-semibold uppercase mr-1">
                  {t('common.cancel') === 'Cancel' ? 'Select Day:' : 'เลือกวัน:'}
                </span>
                <button
                  onClick={() => setActiveDayId('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    activeDayId === 'all'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t('common.cancel') === 'Cancel' ? 'All Days' : 'รวมทุกวัน'}
                </button>
                {plan.dailyMenus?.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveDayId(m.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeDayId === m.id
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('mealPlanDetail.dayTitle')} {m.dayNumber}
                  </button>
                ))}
              </div>

              {userRole === 'Nutritionist' && (
                <button
                  onClick={() => handleOpenEditTargets()}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-semibold shadow-md"
                >
                  ✏️ {t('common.cancel') === 'Cancel' ? 'Set Target Macros' : 'กำหนดเป้าหมายสารอาหาร'}
                </button>
              )}
            </div>

            {(!plan.dailyMenus || plan.dailyMenus.length === 0) && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl p-3 flex items-center justify-between">
                <span>👉 <strong>ขั้นตอนที่ 1:</strong> กดปุ่ม <strong>"✏️ กำหนดเป้าหมายสารอาหาร"</strong> ด้านบน เพื่อเริ่มตั้งเป้าหมายแคลอรี่และสารอาหารสำหรับวันแรก</span>
                <button
                  onClick={() => handleOpenEditTargets()}
                  className="bg-amber-500 text-slate-950 px-3 py-1 rounded-lg font-bold hover:bg-amber-400 transition-colors text-[11px]"
                >
                  เริ่มตั้งเป้าหมาย
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: Energy / Calories */}
              {(() => {
                const remCal = targetCal - currentCal;
                const isOverCal = remCal < 0;
                return (
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl text-center shadow-lg relative overflow-hidden">
                    <p className="text-xs text-slate-400 uppercase font-semibold">
                      {t('common.cancel') === 'Cancel' ? 'Remaining Energy' : 'พลังงานคงเหลือ'}
                    </p>
                    <div className="mt-1">
                      <span className={`text-2xl font-bold ${isOverCal ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isOverCal ? `เกิน +${Math.abs(remCal).toFixed(1)}` : remCal.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold ml-1">kcal</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {t('common.cancel') === 'Cancel' ? 'Consumed:' : 'ทานแล้ว:'} {currentCal.toFixed(1)} / {targetCal.toFixed(1)} kcal
                    </p>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverCal ? 'bg-red-500' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, (currentCal / (targetCal || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Card 2: Protein */}
              {(() => {
                const remP = targetP - currentP;
                const isOverP = remP < 0;
                return (
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl text-center shadow-lg relative overflow-hidden">
                    <p className="text-xs text-slate-400 uppercase font-semibold">
                      {t('common.cancel') === 'Cancel' ? 'Remaining Protein' : 'โปรตีนคงเหลือ'}
                    </p>
                    <div className="mt-1">
                      <span className={`text-2xl font-bold ${isOverP ? 'text-red-400' : 'text-blue-400'}`}>
                        {isOverP ? `เกิน +${Math.abs(remP).toFixed(1)}` : remP.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold ml-1">g</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {t('common.cancel') === 'Cancel' ? 'Consumed:' : 'ทานแล้ว:'} {currentP.toFixed(1)} / {targetP} g
                    </p>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverP ? 'bg-red-500' : 'bg-blue-400'
                        }`}
                        style={{ width: `${Math.min(100, (currentP / (targetP || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Card 3: Carbs */}
              {(() => {
                const remC = targetC - currentC;
                const isOverC = remC < 0;
                return (
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl text-center shadow-lg relative overflow-hidden">
                    <p className="text-xs text-slate-400 uppercase font-semibold">
                      {t('common.cancel') === 'Cancel' ? 'Remaining Carbs' : 'คาร์โบไฮเดรตคงเหลือ'}
                    </p>
                    <div className="mt-1">
                      <span className={`text-2xl font-bold ${isOverC ? 'text-red-400' : 'text-amber-400'}`}>
                        {isOverC ? `เกิน +${Math.abs(remC).toFixed(1)}` : remC.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold ml-1">g</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {t('common.cancel') === 'Cancel' ? 'Consumed:' : 'ทานแล้ว:'} {currentC.toFixed(1)} / {targetC} g
                    </p>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverC ? 'bg-red-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(100, (currentC / (targetC || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Card 4: Fat */}
              {(() => {
                const remF = targetF - currentF;
                const isOverF = remF < 0;
                return (
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl text-center shadow-lg relative overflow-hidden">
                    <p className="text-xs text-slate-400 uppercase font-semibold">
                      {t('common.cancel') === 'Cancel' ? 'Remaining Fat' : 'ไขมันคงเหลือ'}
                    </p>
                    <div className="mt-1">
                      <span className={`text-2xl font-bold ${isOverF ? 'text-red-400' : 'text-rose-400'}`}>
                        {isOverF ? `เกิน +${Math.abs(remF).toFixed(1)}` : remF.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold ml-1">g</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {t('common.cancel') === 'Cancel' ? 'Consumed:' : 'ทานแล้ว:'} {currentF.toFixed(1)} / {targetF} g
                    </p>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverF ? 'bg-red-500' : 'bg-rose-400'
                        }`}
                        style={{ width: `${Math.min(100, (currentF / (targetF || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Daily Schedule breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-200">{t('mealPlanDetail.dailyMenuComposition')}</h2>
                <p className="text-xs text-slate-400 mt-1">{t('mealPlanDetail.dailyMenuDesc')}</p>
              </div>
              {userRole === 'Nutritionist' && (
                <button
                  onClick={() => {
                    setEditingMenuId(null);
                    setNewDayNumber((plan.dailyMenus?.length ?? 0) + 1);
                    setShowAddMenuModal(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  {t('mealPlanDetail.addDailyMenu')}
                </button>
              )}
            </div>

            {!plan.dailyMenus || plan.dailyMenus.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                {t('mealPlanDetail.noDailyMenus')}
              </div>
            ) : (
              <div className="space-y-6">
                {plan.dailyMenus.map((menu) => (
                  <div key={menu.id} className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
                      <div>
                        <h3 className="font-bold text-emerald-400 text-base">
                          {t('mealPlanDetail.dayTitle')} {menu.dayNumber}
                        </h3>
                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                          <span>
                            {t('mealPlanDetail.target')}: <span className="text-emerald-400 font-semibold">{menu.targetCalories.toFixed(1)} kcal</span>
                            <span className="text-slate-500 ml-1">({t('mealPlanDetail.actual')}: {menu.totalCalories.toFixed(1)} kcal)</span>
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="text-blue-300 font-medium">
                            P: {menu.totalProteinGrams.toFixed(1)}{menu.targetProteinGrams ? ` / ${menu.targetProteinGrams}g` : 'g'}
                          </span>
                          <span className="text-amber-300 font-medium">
                            C: {menu.totalCarbsGrams.toFixed(1)}{menu.targetCarbsGrams ? ` / ${menu.targetCarbsGrams}g` : 'g'}
                          </span>
                          <span className="text-rose-300 font-medium">
                            F: {menu.totalFatGrams.toFixed(1)}{menu.targetFatGrams ? ` / ${menu.targetFatGrams}g` : 'g'}
                          </span>
                        </div>
                      </div>

                      {userRole === 'Nutritionist' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEditMenu(menu)}
                            title="แก้ไขเป้าหมายแคลอรี่และสารอาหาร / Edit daily targets"
                            className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                          >
                            ✏️ {t('common.cancel') === 'Cancel' ? 'Edit Target' : 'แก้ไขเป้าหมาย'}
                          </button>

                          <button
                            onClick={() => {
                              setEditingEntryId(null);
                              setSelectedMenuId(menu.id);
                              if (foodCatalog.length > 0) setEntryFoodItemId(foodCatalog[0].id);
                              setEntryMealType('Breakfast');
                              setEntryPortionGrams(100);
                              setShowAddEntryModal(true);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {t('mealPlanDetail.addMealEntry')}
                          </button>

                          <button
                            onClick={() => handleDeleteDailyMenu(menu.id, menu.dayNumber)}
                            disabled={deletingMenuId === menu.id}
                            title="Delete Day Menu / ลบรายการวันนี้"
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            🗑️ {t('common.cancel') === 'Cancel' ? `Delete Day ${menu.dayNumber}` : `ลบวัน ${menu.dayNumber}`}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Meal entries list */}
                    {!menu.entries || menu.entries.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-2">
                        {t('mealPlanDetail.noEntries')}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800/60">
                        {[...menu.entries]
                          .sort((a, b) => (mealTypeOrder[a.mealType] ?? 99) - (mealTypeOrder[b.mealType] ?? 99))
                          .map((entry) => (
                            <div key={entry.id} className="py-3 flex justify-between items-center text-xs hover:bg-slate-900/40 px-2 rounded-lg transition-colors group">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-2.5 py-1 rounded border font-semibold ${getMealTypeBadge(
                                    entry.mealType
                                  )}`}
                                >
                                  {entry.mealType}
                                </span>
                                <span className="font-medium text-slate-200">{entry.foodItemName}</span>
                                <span className="text-slate-400">({entry.portionGrams}g)</span>
                              </div>

                              <div className="flex items-center gap-3 text-slate-300">
                                <span className="font-semibold text-emerald-400">{entry.calories.toFixed(1)} kcal</span>
                                <span className="text-blue-300">P: {entry.proteinGrams.toFixed(1)}g</span>
                                <span className="text-amber-300">C: {entry.carbsGrams.toFixed(1)}g</span>
                                <span className="text-rose-300">F: {entry.fatGrams.toFixed(1)}g</span>

                                <div className="flex items-center gap-1 ml-2">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditEntry(entry, menu.id)}
                                    title="แก้ไขรายการอาหาร / Edit item"
                                    className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 p-1.5 rounded-md transition-colors"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMealEntry(entry.id, menu.id)}
                                    disabled={deletingEntryId === entry.id}
                                    title="ลบรายการอาหาร / Delete item"
                                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-md transition-colors disabled:opacity-50"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Image 1 Simplified Add Daily Menu */}
      {showAddMenuModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-emerald-400 mb-4">
              + {t('mealPlanDetail.addDailyMenu')}
            </h3>
            {modalError && (
              <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 text-xs rounded-lg p-3">
                {modalError}
              </div>
            )}
            <form onSubmit={handleCreateDailyMenu} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  หมายเลขอินเด็กซ์วัน (Day #)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newDayNumber}
                  onChange={(e) => setNewDayNumber(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 rounded-lg border border-slate-700 font-semibold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? t('common.loading') : t('common.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Target Macros Edit with Auto-Calculator */}
      {showEditTargetsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-xl w-full shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                ✏️ กำหนด/แก้ไขเป้าหมายสารอาหารรายวัน
              </h3>
            </div>

            {modalError && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 text-xs rounded-lg p-3">
                {modalError}
              </div>
            )}

            {/* Auto-Calculate Section */}
            {(() => {
              const computed = computeBaselineTargets();
              return (
                <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                      ⚡ คำนวณเบื้องต้นจากข้อมูลคนไข้ (BMR & TDEE Calculator)
                    </span>
                  </div>

                  {/* Inputs grid for patient metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">ส่วนสูง (cm)</label>
                      <input
                        type="number"
                        min="50"
                        max="250"
                        value={calcHeight}
                        onChange={(e) => setCalcHeight(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">น้ำหนัก (kg)</label>
                      <input
                        type="number"
                        min="20"
                        max="300"
                        value={calcWeight}
                        onChange={(e) => setCalcWeight(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">อายุ (ปี)</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={calcAge}
                        onChange={(e) => setCalcAge(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">% ไขมัน (ถ้ามี)</label>
                      <input
                        type="number"
                        min="1"
                        max="70"
                        placeholder="ระบุ %"
                        value={calcBodyFat}
                        onChange={(e) => setCalcBodyFat(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">เพศ</label>
                      <select
                        value={calcGender}
                        onChange={(e) => setCalcGender(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-[11px] focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Male">ชาย / Male</option>
                        <option value="Female">หญิง / Female</option>
                        <option value="Other">อื่นๆ / Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">ระดับกิจกรรม</label>
                      <select
                        value={calcActivity}
                        onChange={(e) => setCalcActivity(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-[11px] focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Sedentary">น้อย / Sedentary (x1.2)</option>
                        <option value="LightlyActive">เบาๆ / Light (x1.375)</option>
                        <option value="ModeratelyActive">ปานกลาง / Moderate (x1.55)</option>
                        <option value="VeryActive">หนัก / Active (x1.725)</option>
                        <option value="ExtraActive">หนักมาก / Extra (x1.9)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">เป้าหมายคนไข้</label>
                      <select
                        value={calcGoal}
                        onChange={(e) => {
                          const goal = e.target.value as 'WeightLoss' | 'Maintenance' | 'MuscleGain';
                          setCalcGoal(goal);
                          if (goal === 'WeightLoss') setCalcCalorieOffset(-500);
                          else if (goal === 'Maintenance') setCalcCalorieOffset(0);
                          else if (goal === 'MuscleGain') setCalcCalorieOffset(300);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-[11px] focus:outline-none focus:border-emerald-500 font-medium"
                      >
                        <option value="WeightLoss">📉 ลดน้ำหนัก (Deficit)</option>
                        <option value="Maintenance">⚖️ รักษาน้ำหนัก (Maintain)</option>
                        <option value="MuscleGain">🏋️‍♂️ เพิ่มกล้ามเนื้อ (Surplus)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">ส่วนต่างแคลอรี่ (kcal)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="50"
                          value={calcCalorieOffset}
                          onChange={(e) => setCalcCalorieOffset(Number(e.target.value))}
                          className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-emerald-500 ${
                            calcCalorieOffset < 0 ? 'text-amber-400' : calcCalorieOffset > 0 ? 'text-emerald-400' : 'text-slate-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Calculated Values Result Panel */}
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1.5 text-[11px]">
                      <span>BMR: <strong className="text-slate-200">{computed.bmr} kcal</strong></span>
                      <span>TDEE: <strong className="text-slate-200">{computed.tdee} kcal</strong></span>
                      <span className="text-emerald-400 font-semibold">สูตร: {calcBodyFat !== '' && Number(calcBodyFat) > 0 ? 'Katch-McArdle' : 'Mifflin-St Jeor'}</span>
                    </div>

                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-300 font-medium">ค่าเบื้องต้นที่คำนวณได้:</span>
                      <div className="flex items-center gap-3 font-semibold text-[11px]">
                        <span className="text-emerald-400">🔥 {computed.targetCal} kcal</span>
                        <span className="text-blue-300">P: {computed.targetProtein}g</span>
                        <span className="text-amber-300">C: {computed.targetCarbs}g</span>
                        <span className="text-rose-300">F: {computed.targetFat}g</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyCalculatedBaseline}
                      className="w-full mt-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      ⚡ นำค่าที่คำนวณได้ไปใช้กับเป้าหมาย (Apply to Target Form)
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Target Macros Form (Editable) */}
            <form onSubmit={handleSaveTargets} className="space-y-4 pt-1 border-t border-slate-800">
              <p className="text-xs font-semibold text-slate-300">
                🎯 กำหนดเป้าหมายที่จะใช้งาน (สามารถปรับแก้ด้วยตัวเองได้):
              </p>

              <div>
                <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.targetCalories')} (kcal)</label>
                <input
                  type="number"
                  step="10"
                  required
                  value={targetCaloriesInput}
                  onChange={(e) => setTargetCaloriesInput(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 font-bold text-emerald-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.targetProtein')} (g)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={targetProteinInput}
                    onChange={(e) => setTargetProteinInput(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 font-semibold text-blue-300"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.targetCarbs')} (g)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={targetCarbsInput}
                    onChange={(e) => setTargetCarbsInput(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 font-semibold text-amber-300"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.targetFat')} (g)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={targetFatInput}
                    onChange={(e) => setTargetFatInput(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 font-semibold text-rose-300"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditTargetsModal(false)}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 rounded-lg border border-slate-700 font-semibold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? t('common.loading') : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Meal Plan Details (Title & Dates) */}
      {showEditPlanModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-emerald-400">
              ✏️ แก้ไขแผนอาหาร / Edit Meal Plan
            </h3>
            {modalError && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 text-xs rounded-lg p-3">
                {modalError}
              </div>
            )}
            <form onSubmit={handleSaveEditPlan} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">ชื่อแผนอาหาร / Plan Title *</label>
                <input
                  type="text"
                  required
                  value={editPlanTitle}
                  onChange={(e) => setEditPlanTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">วันเริ่มต้น / Start Date</label>
                  <input
                    type="date"
                    required
                    value={editPlanStartDate}
                    onChange={(e) => setEditPlanStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">วันสิ้นสุด / End Date</label>
                  <input
                    type="date"
                    required
                    value={editPlanEndDate}
                    onChange={(e) => setEditPlanEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditPlanModal(false)}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 rounded-lg border border-slate-700 font-semibold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? t('common.loading') : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Add/Edit Meal Entry */}
      {showAddEntryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-emerald-400">
                {isCreatingCustomFood
                  ? t('mealPlanDetail.customFoodTitle')
                  : editingEntryId
                  ? t('common.cancel') === 'Cancel'
                    ? 'Edit Meal Entry'
                    : 'แก้ไขรายการอาหาร'
                  : t('mealPlanDetail.addMealEntry')}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingCustomFood(!isCreatingCustomFood)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline transition-colors"
              >
                {isCreatingCustomFood ? t('mealPlanDetail.selectFromList') : t('mealPlanDetail.createCustomFood')}
              </button>
            </div>

            {modalError && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 text-xs rounded-lg p-3">
                {modalError}
              </div>
            )}

            {isCreatingCustomFood ? (
              /* Custom Food Form */
              <form onSubmit={handleCreateCustomFood} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.foodName')} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., อกไก่ย่าง / Grilled Chicken Breast"
                    value={customFoodName}
                    onChange={(e) => setCustomFoodName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.category')}</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Meat" className="bg-slate-900 text-slate-100">Meat / เนื้อสัตว์</option>
                      <option value="Seafood" className="bg-slate-900 text-slate-100">Seafood / อาหารทะเล</option>
                      <option value="Grain" className="bg-slate-900 text-slate-100">Grain / ข้าวและแป้ง</option>
                      <option value="Vegetable" className="bg-slate-900 text-slate-100">Vegetable / ผัก</option>
                      <option value="Fruit" className="bg-slate-900 text-slate-100">Fruit / ผลไม้</option>
                      <option value="Dairy" className="bg-slate-900 text-slate-100">Dairy / นมและไข่</option>
                      <option value="General" className="bg-slate-900 text-slate-100">General / ทั่วไป</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.proteinGrams')}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={customProtein}
                      onChange={(e) => setCustomProtein(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.carbsGrams')}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={customCarbs}
                      onChange={(e) => setCustomCarbs(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.fatGrams')}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={customFat}
                      onChange={(e) => setCustomFat(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.fiberGrams')}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={customFiber}
                      onChange={(e) => setCustomFiber(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAllergenic"
                    checked={customIsAllergenic}
                    onChange={(e) => setCustomIsAllergenic(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="isAllergenic" className="text-xs text-slate-300">
                    {t('mealPlanDetail.isAllergenic')}
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingCustomFood(false)}
                    className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 rounded-lg border border-slate-700 font-semibold"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCustomFood}
                    className="w-1/2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {isSavingCustomFood ? t('common.loading') : t('mealPlanDetail.saveCustomFood')}
                  </button>
                </div>
              </form>
            ) : (
              /* Normal Entry Form */
              <form onSubmit={handleCreateMealEntry} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.mealType')}</label>
                  <select
                    value={entryMealType}
                    onChange={(e) => setEntryMealType(e.target.value as MealType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Breakfast" className="bg-slate-900 text-slate-100">Breakfast / อาหารเช้า</option>
                    <option value="MorningSnack" className="bg-slate-900 text-slate-100">Morning Snack / อาหารว่างเช้า</option>
                    <option value="Lunch" className="bg-slate-900 text-slate-100">Lunch / อาหารกลางวัน</option>
                    <option value="AfternoonSnack" className="bg-slate-900 text-slate-100">Afternoon Snack / อาหารว่างบ่าย</option>
                    <option value="Dinner" className="bg-slate-900 text-slate-100">Dinner / อาหารเย็น</option>
                    <option value="Supper" className="bg-slate-900 text-slate-100">Supper / อาหารค่ำ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">{t('mealPlanDetail.selectFoodItem')}</label>
                  
                  {/* Search Filter Input */}
                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder={t('mealPlanDetail.searchFoodPlaceholder')}
                      value={foodSearchQuery}
                      onChange={(e) => setFoodSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                    />
                    {foodSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFoodSearchQuery('')}
                        className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-200"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Food Item Dropdown */}
                  <select
                    value={entryFoodItemId}
                    onChange={(e) => setEntryFoodItemId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {filteredFoods.length === 0 ? (
                      <option disabled value="" className="bg-slate-900 text-slate-400">
                        {t('mealPlanDetail.noFoodFound')}
                      </option>
                    ) : (
                      filteredFoods.map((food) => (
                        <option key={food.id} value={food.id} className="bg-slate-900 text-slate-100 py-1">
                          {food.name} ({food.caloriesPer100g.toFixed(1)} kcal/100g | P:{food.proteinGrams.toFixed(1)}g C:{food.carbsGrams.toFixed(1)}g F:{food.fatGrams.toFixed(1)}g)
                        </option>
                      ))
                    )}
                  </select>

                  {/* Selected Item Quick Preview */}
                  {selectedFoodItem && (
                    <div className="mt-2 bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-emerald-400">{selectedFoodItem.name}</span>
                        <span className="text-slate-400 text-[11px] block mt-0.5">
                          {selectedFoodItem.category} | {selectedFoodItem.caloriesPer100g.toFixed(1)} kcal/100g
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-slate-400 space-x-2">
                        <span className="text-blue-300">P: {selectedFoodItem.proteinGrams.toFixed(1)}g</span>
                        <span className="text-amber-300">C: {selectedFoodItem.carbsGrams.toFixed(1)}g</span>
                        <span className="text-rose-300">F: {selectedFoodItem.fatGrams.toFixed(1)}g</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs text-slate-300">{t('mealPlanDetail.portionGrams')}</label>
                    <div className="flex gap-1 text-[11px]">
                      {[50, 100, 150, 200, 250, 300].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setEntryPortionGrams(g)}
                          className={`px-2 py-0.5 rounded border transition-colors ${
                            Number(entryPortionGrams) === g
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {g}g
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      placeholder="e.g. 100"
                      value={entryPortionGrams}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEntryPortionGrams(val === '' ? '' : Math.max(0, Number(val)));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-16 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none select-none">
                      กรัม / g
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddEntryModal(false);
                      setFoodSearchQuery('');
                    }}
                    className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 rounded-lg border border-slate-700 font-semibold"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !entryFoodItemId}
                    className="w-1/2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {isSubmitting
                      ? t('common.loading')
                      : editingEntryId
                      ? t('common.cancel') === 'Cancel'
                        ? 'Save Changes'
                        : 'บันทึกการเปลี่ยนแปลง'
                      : t('common.submit')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
