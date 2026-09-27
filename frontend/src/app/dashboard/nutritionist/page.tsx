'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { userService, mealPlanService, trackingService, marketplaceService, ConsultationRequestDto } from '@/services/nutriServices';
import { MealPlanDto, AdherenceReportDto } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserHeader } from '@/components/UserHeader';
import { ProgressAnalyticsChart } from '@/components/ProgressAnalyticsChart';
import { HealthReportExportModal } from '@/components/HealthReportExportModal';

interface ClientItem {
  id: string;
  fullName: string;
  email: string;
  weightKg: number;
  heightCm?: number;
  age?: number;
  gender?: string;
  activityLevel?: string;
  healthConditions?: string;
  foodAllergies?: string;
}

export default function NutritionistDashboard() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [unassignedClients, setUnassignedClients] = useState<ClientItem[]>([]);
  const [clientPlansMap, setClientPlansMap] = useState<Record<string, MealPlanDto[]>>({});
  const [consultations, setConsultations] = useState<ConsultationRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit plan modal state
  const [editingPlan, setEditingPlan] = useState<MealPlanDto | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Features 3-6: Client Analytics State
  interface ClientAnalytics {
    adherence: AdherenceReportDto | null;
    tdee: number;
    bmr: number;
    weightKg: number;
    targetWeightKg?: number;
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    totalMeals: number;
    totalDays: number;
  }
  const [clientAnalyticsMap, setClientAnalyticsMap] = useState<Record<string, ClientAnalytics>>({});
  const [showAnalyticsForClient, setShowAnalyticsForClient] = useState<string | null>(null);
  const [reportClient, setReportClient] = useState<ClientItem | null>(null);
  const [nutritionistName, setNutritionistName] = useState('Dr. Sarah Connor, RDN');

  const fetchDashboardData = useCallback(async () => {
    const nutritionistId = localStorage.getItem('nutriplan_user_id');
    if (!nutritionistId) {
      router.push('/login');
      return;
    }

    try {
      const [assignedData, unassignedData, consultsData] = await Promise.all([
        userService.getMyClients(nutritionistId),
        userService.getUnassignedClients(),
        marketplaceService.getNutritionistConsultations(nutritionistId)
      ]);
      setClients(assignedData);
      setUnassignedClients(unassignedData);
      setConsultations(consultsData);

      // Fetch meal plans for all assigned clients
      const plansEntries = await Promise.all(
        assignedData.map(async (client) => {
          try {
            const plans = await mealPlanService.getByClient(client.id);
            return [client.id, plans] as [string, MealPlanDto[]];
          } catch {
            return [client.id, []] as [string, MealPlanDto[]];
          }
        })
      );
      setClientPlansMap(Object.fromEntries(plansEntries));

      // Features 3-6: Fetch analytics for each assigned client
      const analyticsEntries = await Promise.all(
        assignedData.map(async (client) => {
          try {
            const [adherenceData, clientDetail] = await Promise.all([
              trackingService.getAdherence(client.id),
              userService.getClientById(client.id)
            ]);
            const plans = plansEntries.find(([id]) => id === client.id)?.[1] || [];
            const allMenus = plans.flatMap((p: MealPlanDto) => p.dailyMenus || []);
            const totalDays = allMenus.length || 1;
            const totalCalories = allMenus.reduce((sum: number, m) => sum + (m.totalCalories || 0), 0);
            const totalProtein = allMenus.reduce((sum: number, m) => sum + (m.totalProteinGrams || 0), 0);
            const totalCarbs = allMenus.reduce((sum: number, m) => sum + (m.totalCarbsGrams || 0), 0);
            const totalFat = allMenus.reduce((sum: number, m) => sum + (m.totalFatGrams || 0), 0);
            const totalMeals = allMenus.reduce((sum: number, m) => sum + (m.entries?.length || 0), 0);

            const avgTargetCal = allMenus.reduce((sum: number, m) => sum + (m.targetCalories || 0), 0) / totalDays;
            const avgTargetP = allMenus.reduce((sum: number, m) => sum + (m.targetProteinGrams || 0), 0) / totalDays;
            const avgTargetC = allMenus.reduce((sum: number, m) => sum + (m.targetCarbsGrams || 0), 0) / totalDays;
            const avgTargetF = allMenus.reduce((sum: number, m) => sum + (m.targetFatGrams || 0), 0) / totalDays;

            return [client.id, {
              adherence: adherenceData,
              tdee: clientDetail.tdee,
              bmr: clientDetail.bmr,
              weightKg: clientDetail.weightKg,
              avgCalories: Math.round(totalCalories / totalDays),
              avgProtein: Math.round(totalProtein / totalDays),
              avgCarbs: Math.round(totalCarbs / totalDays),
              avgFat: Math.round(totalFat / totalDays),
              targetCalories: Math.round(avgTargetCal > 0 ? avgTargetCal : clientDetail.tdee),
              targetProtein: Math.round(avgTargetP > 0 ? avgTargetP : clientDetail.tdee * 0.25 / 4),
              targetCarbs: Math.round(avgTargetC > 0 ? avgTargetC : clientDetail.tdee * 0.50 / 4),
              targetFat: Math.round(avgTargetF > 0 ? avgTargetF : clientDetail.tdee * 0.25 / 9),
              totalMeals,
              totalDays
            }] as [string, ClientAnalytics];
          } catch {
            return [client.id, null] as [string, ClientAnalytics | null];
          }
        })
      );
      setClientAnalyticsMap(Object.fromEntries(analyticsEntries.filter(([, v]) => v !== null) as [string, ClientAnalytics][]));
    } catch (err: unknown) {
      setError(t('nutritionistDashboard.failedFetchClients'));
    } finally {
      setIsLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleAssign = async (clientId: string) => {
    const nutritionistId = localStorage.getItem('nutriplan_user_id');
    if (!nutritionistId) return;

    setAssigningId(clientId);
    try {
      await userService.assignClient(nutritionistId, clientId);
      await fetchDashboardData();
    } catch (err: unknown) {
      alert('Failed to assign client.');
    } finally {
      setAssigningId(null);
    }
  };

  const handleDeletePlan = async (planId: string, clientName: string) => {
    if (!confirm(`${t('nutritionistDashboard.confirmDeletePlan')} (${clientName})`)) {
      return;
    }
    setDeletingPlanId(planId);
    try {
      await mealPlanService.delete(planId);
      await fetchDashboardData();
    } catch (err: unknown) {
      alert('Failed to delete meal plan.');
    } finally {
      setDeletingPlanId(null);
    }
  };

  const handleStartEditPlan = (plan: MealPlanDto) => {
    setEditingPlan(plan);
    setEditTitle(plan.title);
    setEditStartDate(plan.startDate ? plan.startDate.split('T')[0] : '');
    setEditEndDate(plan.endDate ? plan.endDate.split('T')[0] : '');
  };

  const handleSavePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setIsSavingPlan(true);
    try {
      await mealPlanService.update(editingPlan.id, {
        title: editTitle.trim(),
        startDate: new Date(editStartDate).toISOString(),
        endDate: new Date(editEndDate).toISOString()
      });
      setEditingPlan(null);
      await fetchDashboardData();
    } catch (err: unknown) {
      alert('Failed to update meal plan.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleAcceptConsultation = async (req: ConsultationRequestDto) => {
    const nutritionistId = localStorage.getItem('nutriplan_user_id') || '';
    try {
      await marketplaceService.updateConsultationStatus(req.id, 'Accepted');
      if (nutritionistId && req.clientId) {
        await userService.assignClient(nutritionistId, req.clientId);
      }
      setConsultations(prev => prev.map(c => c.id === req.id ? { ...c, status: 'Accepted' } : c));
      setToastMessage(isEn ? `Accepted consultation for ${req.clientName}! Added to your roster.` : `ยอมรับคำขอปรึกษาจาก ${req.clientName} เรียบร้อยแล้ว!`);
      setTimeout(() => setToastMessage(null), 3500);
      fetchDashboardData();
    } catch (e) {
      console.error('Failed to accept consultation:', e);
    }
  };

  const handleDeclineConsultation = async (id: string) => {
    try {
      await marketplaceService.updateConsultationStatus(id, 'Declined');
      setConsultations(prev => prev.map(c => c.id === id ? { ...c, status: 'Declined' } : c));
      setToastMessage(isEn ? 'Consultation request declined.' : 'ปฏิเสธคำขอเรียบร้อยแล้ว');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e) {
      console.error('Failed to decline consultation:', e);
    }
  };

  const pendingConsultations = consultations.filter(c => c.status === 'Pending');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 md:p-8 overflow-x-hidden w-full max-w-full">
      <UserHeader
        title={t('nutritionistDashboard.title')}
        subtitle={t('nutritionistDashboard.subtitle')}
      />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-bounce">
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">{t('nutritionistDashboard.loadingRoster')}</div>
      ) : (
        <div className="space-y-10">
          {/* Marketplace: Incoming Consultation Requests */}
          <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📥</span>
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  {t('marketplace.incomingRequests', 'Incoming Consultation Requests')}
                </h2>
                {pendingConsultations.length > 0 && (
                  <span className="bg-blue-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                    {pendingConsultations.length} {isEn ? 'New' : 'ใหม่'}
                  </span>
                )}
              </div>
            </div>

            {pendingConsultations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                {t('marketplace.noIncomingRequests', 'No pending consultation requests at this time.')}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingConsultations.map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-100 text-sm">{req.clientName}</h4>
                          <p className="text-[11px] text-slate-400">{req.clientEmail}</p>
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                          ⏳ {t('marketplace.pendingReview', 'Pending Review')}
                        </span>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
                        <p className="text-slate-300">
                          <strong className="text-slate-400">{t('marketplace.selectGoal', 'Goal')}:</strong> {req.goalType}
                        </p>
                        {req.targetWeightKg && (
                          <p className="text-emerald-400 text-[11px]">
                            <strong>{t('marketplace.targetWeight', 'Target Weight')}:</strong> {req.targetWeightKg} kg
                          </p>
                        )}
                        {req.notes && (
                          <p className="text-slate-400 text-[11px] italic mt-1">
                            "{req.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleAcceptConsultation(req)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs shadow-md transition-all text-center"
                      >
                        ✓ {t('marketplace.acceptRequest', 'Accept & Add to Care')}
                      </button>
                      <button
                        onClick={() => handleDeclineConsultation(req.id)}
                        className="px-3 py-2 bg-slate-900 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 font-semibold rounded-xl text-xs border border-slate-800 transition-colors"
                      >
                        ✕ {t('marketplace.declineRequest', 'Decline')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 1: Assigned Client Roster */}
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-slate-200">
                {t('nutritionistDashboard.assignedRoster')} ({clients.length})
              </h2>
              <button
                onClick={() => router.push('/templates')}
                className="bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>📚</span>
                <span>{t('templates.browseTemplates', 'Template Library')} →</span>
              </button>
            </div>

            {clients.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-8 text-center text-slate-400 text-sm">
                No clients currently assigned to your care. Choose from the available clients below.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map((client) => {
                  const plans = clientPlansMap[client.id] || [];
                  return (
                    <div
                      key={client.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-emerald-500/40 transition-colors shadow-lg space-y-4"
                    >
                      <div className="flex justify-between items-start pb-3 border-b border-slate-800/80">
                        <div>
                          <h3 className="font-semibold text-emerald-400 text-lg">{client.fullName}</h3>
                          <p className="text-xs text-slate-400">{client.email}</p>

                          {(client.healthConditions || client.foodAllergies) && (
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                              {client.healthConditions && (
                                <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-medium">
                                  🩺 {client.healthConditions}
                                </span>
                              )}
                              {client.foodAllergies && (
                                <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-medium">
                                  ⚠️ {t('common.allergies')}: {client.foodAllergies}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded block font-medium">
                            {client.weightKg} kg
                          </span>
                          {client.heightCm && (
                            <span className="text-[11px] text-slate-400 block">
                              {client.heightCm} cm
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Saved Meal Plans List */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            📋 {t('nutritionistDashboard.savedMealPlans')} ({plans.length})
                          </h4>
                        </div>

                        {plans.length === 0 ? (
                          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 text-center text-xs text-slate-500 italic">
                            {t('nutritionistDashboard.noSavedPlans')}
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {plans.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => router.push(`/meal-plans/${p.id}`)}
                                className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex justify-between items-center text-xs cursor-pointer hover:border-emerald-500/50 hover:bg-slate-900/60 transition-all group"
                              >
                                <div>
                                  <h5 className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{p.title}</h5>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEditPlan(p);
                                    }}
                                    title={t('nutritionistDashboard.editPlan')}
                                    className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/20 p-1.5 rounded transition-colors"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePlan(p.id, client.fullName);
                                    }}
                                    disabled={deletingPlanId === p.id}
                                    title={t('nutritionistDashboard.deletePlan')}
                                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/20 p-1.5 rounded transition-colors disabled:opacity-50"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={() => router.push(`/meal-plans/new?clientId=${client.id}`)}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 shadow-md"
                        >
                          + {t('nutritionistDashboard.createMealPlan')}
                        </button>
                        <button
                          onClick={() => setShowAnalyticsForClient(showAnalyticsForClient === client.id ? null : client.id)}
                          className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-all border ${
                            showAnalyticsForClient === client.id
                              ? 'bg-blue-500 text-white border-blue-400'
                              : 'bg-slate-800 text-blue-400 border-blue-500/40 hover:bg-blue-500/20'
                          }`}
                        >
                          📊
                        </button>
                        <button
                          onClick={() => setReportClient(client)}
                          title={t('healthReports.exportPdf', 'Export Clinical Report (PDF)')}
                          className="px-3 py-2.5 rounded-lg text-xs font-semibold transition-all border bg-slate-800 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20"
                        >
                          📄
                        </button>
                      </div>

                      {/* Features 3-6: Inline Client Analytics Panel */}
                      {showAnalyticsForClient === client.id && clientAnalyticsMap[client.id] && (() => {
                        const a = clientAnalyticsMap[client.id];
                        const calPct = a.targetCalories > 0 ? Math.round((a.avgCalories / a.targetCalories) * 100) : 0;
                        const pPct = a.targetProtein > 0 ? Math.round((a.avgProtein / a.targetProtein) * 100) : 0;
                        const cPct = a.targetCarbs > 0 ? Math.round((a.avgCarbs / a.targetCarbs) * 100) : 0;
                        const fPct = a.targetFat > 0 ? Math.round((a.avgFat / a.targetFat) * 100) : 0;

                        // Feature 5: Predictive Goal Tracking
                        const dailyDeficit = a.tdee - a.avgCalories;
                        const weeklyLossKg = dailyDeficit > 0 ? (dailyDeficit * 7) / 7700 : 0;

                        // Feature 6: Nutrient Gap Analysis
                        const proteinGap = a.avgProtein - a.targetProtein;
                        const carbsGap = a.avgCarbs - a.targetCarbs;
                        const fatGap = a.avgFat - a.targetFat;

                        const getGapStatus = (gap: number, threshold: number) => {
                          const absGap = Math.abs(gap);
                          if (absGap <= threshold * 0.1) return { label: t('nutritionistDashboard.normal', '✅ Normal'), color: 'text-emerald-400' };
                          if (gap < 0) return { label: t('nutritionistDashboard.deficit', '⚠️ Deficit'), color: 'text-amber-400' };
                          return { label: t('nutritionistDashboard.excess', '🔴 Excess'), color: 'text-red-400' };
                        };

                        return (
                          <div className="mt-3 bg-slate-950 border border-blue-500/30 rounded-xl p-4 space-y-4 animate-in fade-in duration-300">
                            {/* Feature 3: Weekly Progress Summary */}
                            <div>
                              <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">📈 {t('nutritionistDashboard.progressSummary', 'Weekly Progress')}</h4>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-slate-900 rounded-lg p-2">
                                  <p className="text-lg font-bold text-emerald-400">{a.adherence && (a.adherence.totalLogged ?? 0) > 0 ? `${a.adherence.adherenceRatePercent}%` : '—'}</p>
                                  <p className="text-[10px] text-slate-500">{t('nutritionistDashboard.adherenceRate', 'Adherence Rate')}</p>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-2">
                                  <p className="text-lg font-bold text-blue-400">{a.totalMeals}</p>
                                  <p className="text-[10px] text-slate-500">{t('nutritionistDashboard.mealItems', 'Meals')}</p>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-2">
                                  <p className="text-lg font-bold text-amber-400">{a.totalDays}</p>
                                  <p className="text-[10px] text-slate-500">{t('nutritionistDashboard.planDays', 'Plan Days')}</p>
                                </div>
                              </div>
                            </div>

                            {/* Feature 4: Smart Meal Insights */}
                            <div>
                              <h4 className="text-xs font-bold text-purple-400 uppercase mb-2">🧠 {t('nutritionistDashboard.nutrientAnalysis', 'Nutrient Analysis')}</h4>
                              <div className="space-y-2">
                                {[
                                  { name: `🔥 ${t('nutritionistDashboard.energy', 'Energy')}`, avg: a.avgCalories, target: a.targetCalories, pct: calPct, unit: 'kcal', color: 'emerald' },
                                  { name: `💪 ${t('nutritionistDashboard.protein', 'Protein')}`, avg: a.avgProtein, target: a.targetProtein, pct: pPct, unit: 'g', color: 'blue' },
                                  { name: `🌾 ${t('nutritionistDashboard.carbs', 'Carbs')}`, avg: a.avgCarbs, target: a.targetCarbs, pct: cPct, unit: 'g', color: 'amber' },
                                  { name: `🥑 ${t('nutritionistDashboard.fat', 'Fat')}`, avg: a.avgFat, target: a.targetFat, pct: fPct, unit: 'g', color: 'rose' },
                                ].map((item) => (
                                  <div key={item.name} className="flex items-center gap-2 text-[11px]">
                                    <span className="w-20 text-slate-300 font-medium">{item.name}</span>
                                    <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          item.pct > 110 ? 'bg-red-500' : item.pct >= 85 ? `bg-${item.color}-400` : 'bg-amber-400'
                                        }`}
                                        style={{ width: `${Math.min(100, item.pct)}%` }}
                                      />
                                    </div>
                                    <span className="w-24 text-right text-slate-400">{item.avg}/{item.target} {item.unit}</span>
                                    <span className={`w-10 text-right font-bold ${item.pct > 110 ? 'text-red-400' : item.pct >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>{item.pct}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Feature 5: Predictive Goal Tracking */}
                            <div>
                              <h4 className="text-xs font-bold text-emerald-400 uppercase mb-2">🔮 {t('nutritionistDashboard.predictiveGoal', 'Predictive Goal')}</h4>
                              <div className="bg-slate-900 rounded-lg p-3 text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">TDEE:</span>
                                  <span className="text-emerald-400 font-bold">{Math.round(a.tdee)} kcal/day</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">{t('nutritionistDashboard.avgEnergyDay', 'Avg Energy/Day:')}</span>
                                  <span className="text-blue-400 font-bold">{a.avgCalories} kcal</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">{t('nutritionistDashboard.caloricDeficitSurplus', 'Caloric Deficit/Surplus:')}</span>
                                  <span className={`font-bold ${dailyDeficit > 0 ? 'text-emerald-400' : dailyDeficit < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                    {dailyDeficit > 0 ? `−${Math.round(dailyDeficit)}` : dailyDeficit < 0 ? `+${Math.round(Math.abs(dailyDeficit))}` : '0'} kcal
                                  </span>
                                </div>
                                {weeklyLossKg > 0 && (
                                  <div className="flex justify-between pt-1 border-t border-slate-800 mt-1">
                                    <span className="text-slate-400">{t('nutritionistDashboard.estWeightLoss', 'Est. Weight Loss/Week:')}</span>
                                    <span className="text-emerald-400 font-bold">~{weeklyLossKg.toFixed(2)} kg</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Feature 6: Nutrient Gap Analysis */}
                            <div>
                              <h4 className="text-xs font-bold text-rose-400 uppercase mb-2">🔬 {t('nutritionistDashboard.nutrientGapAnalysis', 'Nutrient Gap Analysis')}</h4>
                              <div className="space-y-1">
                                {[
                                  { name: t('nutritionistDashboard.protein', 'Protein'), gap: proteinGap, target: a.targetProtein, unit: 'g' },
                                  { name: t('nutritionistDashboard.carbs', 'Carbs'), gap: carbsGap, target: a.targetCarbs, unit: 'g' },
                                  { name: t('nutritionistDashboard.fat', 'Fat'), gap: fatGap, target: a.targetFat, unit: 'g' },
                                ].map((item) => {
                                  const status = getGapStatus(item.gap, item.target);
                                  return (
                                    <div key={item.name} className="flex items-center justify-between text-[11px] bg-slate-900 rounded-lg px-3 py-1.5">
                                      <span className="text-slate-300">{item.name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className={status.color + ' font-bold'}>
                                          {item.gap > 0 ? `+${item.gap}` : item.gap} {item.unit}
                                        </span>
                                        <span className={status.color + ' text-[10px]'}>{status.label}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Detailed Interactive Progress & Weight History Chart */}
                            <div className="pt-2">
                              <ProgressAnalyticsChart
                                clientId={client.id}
                                initialWeight={client.weightKg}
                                heightCm={client.heightCm}
                                tdee={a.tdee}
                                plans={clientPlansMap[client.id] || []}
                                readOnly={false}
                              />
                            </div>

                            <button
                              onClick={() => setReportClient(client)}
                              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 mt-2"
                            >
                              <span>📄</span>
                              <span>{t('healthReports.exportPdf', 'Export Clinical Nutritional Progress Report (PDF)')}</span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Available Unassigned Clients */}
          <div className="space-y-4 pt-6 border-t border-slate-800/60">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-200">
                {t('nutritionistDashboard.availableClients')} ({unassignedClients.length})
              </h2>
            </div>

            {unassignedClients.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-8 text-center text-slate-400 text-sm">
                {t('nutritionistDashboard.noUnassignedClients')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {unassignedClients.map((client) => (
                  <div
                    key={client.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 transition-colors shadow-md flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-200">{client.fullName}</h3>
                        <p className="text-xs text-slate-400">{client.email}</p>
                      </div>
                      <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded">
                        {client.weightKg} kg
                      </span>
                    </div>

                    <button
                      onClick={() => handleAssign(client.id)}
                      disabled={assigningId === client.id}
                      className="w-full mt-4 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40 text-emerald-400 font-semibold py-2 rounded-lg text-xs transition-all disabled:opacity-50"
                    >
                      {assigningId === client.id
                        ? t('nutritionistDashboard.assigning')
                        : t('nutritionistDashboard.addToCare')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-emerald-400">
              ✏️ {t('nutritionistDashboard.editMealPlanModal')}
            </h3>
            <form onSubmit={handleSavePlanEdit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">{t('createMealPlanPage.planTitleLabel')} *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">{t('createMealPlanPage.startDateLabel')}</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">{t('createMealPlanPage.endDateLabel')}</label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 rounded-lg border border-slate-700 font-semibold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="w-1/2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {isSavingPlan ? t('common.loading') : t('common.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reportClient && (
        <HealthReportExportModal
          patientName={reportClient.fullName}
          patientEmail={reportClient.email}
          age={reportClient.age || 28}
          weightKg={reportClient.weightKg}
          heightCm={reportClient.heightCm || 175}
          tdee={clientAnalyticsMap[reportClient.id]?.tdee || 2100}
          bmr={clientAnalyticsMap[reportClient.id]?.bmr || 1650}
          adherence={clientAnalyticsMap[reportClient.id]?.adherence}
          plans={clientPlansMap[reportClient.id] || []}
          nutritionistName={nutritionistName}
          onClose={() => setReportClient(null)}
        />
      )}
    </div>
  );
}
