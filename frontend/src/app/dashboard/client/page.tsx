'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mealPlanService, trackingService, userService, marketplaceService, ConsultationRequestDto } from '@/services/nutriServices';
import { MealPlanDto, AdherenceReportDto } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserHeader } from '@/components/UserHeader';
import { ProgressAnalyticsChart } from '@/components/ProgressAnalyticsChart';
import { HealthReportExportModal } from '@/components/HealthReportExportModal';

interface ClientMetrics {
  bmr: number;
  tdee: number;
  weightKg: number;
  heightCm: number;
  age: number;
  gender: string;
  activityLevel: string;
}

interface NutritionSummary {
  totalMeals: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export default function ClientDashboard() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const [clientId, setClientId] = useState<string>('');
  const [plans, setPlans] = useState<MealPlanDto[]>([]);
  const [adherence, setAdherence] = useState<AdherenceReportDto | null>(null);
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics | null>(null);
  const [nutritionSummary, setNutritionSummary] = useState<NutritionSummary | null>(null);
  const [consultations, setConsultations] = useState<ConsultationRequestDto[]>([]);
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const storedClientId = localStorage.getItem('nutriplan_user_id');
      if (!storedClientId) {
        router.push('/login');
        return;
      }

      const storedName = localStorage.getItem('nutriplan_user_name');
      const storedEmail = localStorage.getItem('nutriplan_user_email');
      if (storedName) setClientName(storedName);
      if (storedEmail) setClientEmail(storedEmail);
      setClientId(storedClientId);

      try {
        const [planData, adherenceData, consultsData] = await Promise.all([
          mealPlanService.getByClient(storedClientId),
          trackingService.getAdherence(storedClientId),
          marketplaceService.getClientConsultations(storedClientId)
        ]);

        setPlans(planData);
        setAdherence(adherenceData);
        setConsultations(consultsData);

        // Feature 2: Fetch client metrics for TDEE/BMR display
        try {
          const clientData = await userService.getClientById(storedClientId);
          if (clientData) {
            if (clientData.fullName) setClientName(clientData.fullName);
            if (clientData.email) setClientEmail(clientData.email);
            setClientMetrics({
              bmr: clientData.bmr,
              tdee: clientData.tdee,
              weightKg: clientData.weightKg,
              heightCm: clientData.heightCm,
              age: clientData.age,
              gender: clientData.gender,
              activityLevel: clientData.activityLevel
            });

            // Calculate nutrition summary from meal plans or baseline TDEE
            if (planData.length > 0) {
              const allMenus = planData.flatMap(p => p.dailyMenus || []);
              const totalDays = allMenus.length || 1;
              
              const totalCalories = allMenus.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
              const totalProtein = allMenus.reduce((sum, m) => sum + (m.totalProteinGrams || 0), 0);
              const totalCarbs = allMenus.reduce((sum, m) => sum + (m.totalCarbsGrams || 0), 0);
              const totalFat = allMenus.reduce((sum, m) => sum + (m.totalFatGrams || 0), 0);
              const totalMeals = allMenus.reduce((sum, m) => sum + (m.entries?.length || 0), 0);

              const avgTargetCal = allMenus.reduce((sum, m) => sum + (m.targetCalories || 0), 0) / totalDays;
              const avgTargetP = allMenus.reduce((sum, m) => sum + (m.targetProteinGrams || 0), 0) / totalDays;
              const avgTargetC = allMenus.reduce((sum, m) => sum + (m.targetCarbsGrams || 0), 0) / totalDays;
              const avgTargetF = allMenus.reduce((sum, m) => sum + (m.targetFatGrams || 0), 0) / totalDays;

              setNutritionSummary({
                totalMeals,
                avgCalories: Math.round(totalCalories / totalDays),
                avgProtein: Math.round(totalProtein / totalDays),
                avgCarbs: Math.round(totalCarbs / totalDays),
                avgFat: Math.round(totalFat / totalDays),
                targetCalories: Math.round(avgTargetCal > 0 ? avgTargetCal : clientData.tdee),
                targetProtein: Math.round(avgTargetP > 0 ? avgTargetP : (clientData.tdee * 0.25) / 4),
                targetCarbs: Math.round(avgTargetC > 0 ? avgTargetC : (clientData.tdee * 0.50) / 4),
                targetFat: Math.round(avgTargetF > 0 ? avgTargetF : (clientData.tdee * 0.25) / 9)
              });
            } else {
              setNutritionSummary({
                totalMeals: 0,
                avgCalories: 0,
                avgProtein: 0,
                avgCarbs: 0,
                avgFat: 0,
                targetCalories: Math.round(clientData.tdee || 2000),
                targetProtein: Math.round(((clientData.tdee || 2000) * 0.25) / 4),
                targetCarbs: Math.round(((clientData.tdee || 2000) * 0.50) / 4),
                targetFat: Math.round(((clientData.tdee || 2000) * 0.25) / 9)
              });
            }
          }
        } catch {
          // Ignore client metrics fetch errors
        }
      } catch (err: unknown) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const getProgressColor = (percent: number) => {
    if (percent > 110) return 'bg-red-500';
    if (percent >= 90) return 'bg-emerald-400';
    if (percent >= 70) return 'bg-amber-400';
    return 'bg-blue-400';
  };

  const getProgressLabel = (percent: number) => {
    if (percent > 110) return t('clientDashboard.overTarget', 'Over Target');
    if (percent >= 90) return t('clientDashboard.nearTarget', 'Near Target');
    if (percent >= 70) return t('clientDashboard.onTrack', 'On Track');
    return t('clientDashboard.belowTarget', 'Below Target');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 md:p-8 overflow-x-hidden w-full max-w-full">
      <UserHeader
        title={t('clientDashboard.title')}
        subtitle={t('clientDashboard.subtitle')}
      />

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">{t('clientDashboard.loadingRecords')}</div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 w-full">

          {/* Feature 2: Nutrition Analytics Dashboard */}
          {nutritionSummary && clientMetrics && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                  📊 {t('clientDashboard.dailyNutritionSummary', 'Daily Nutrition Summary')}
                </h2>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span>📄</span>
                  <span>{t('healthReports.exportPdf', 'Export Clinical Report (PDF)')}</span>
                </button>
              </div>

              {/* Top Metrics Row: BMR / TDEE / Meals */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold">BMR</p>
                  <p className="text-base sm:text-xl font-bold text-blue-400 mt-1">{Math.round(clientMetrics.bmr)}</p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500">kcal/day</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold">TDEE</p>
                  <p className="text-base sm:text-xl font-bold text-emerald-400 mt-1">{Math.round(clientMetrics.tdee)}</p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500">kcal/day</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold truncate">{t('clientDashboard.totalMeals', 'Total Meals')}</p>
                  <p className="text-base sm:text-xl font-bold text-amber-400 mt-1">{nutritionSummary.totalMeals}</p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500">{t('clientDashboard.meals', 'meals')}</p>
                </div>
              </div>

              {/* Macro Progress Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Calories Card */}
                {(() => {
                  const pct = nutritionSummary.targetCalories > 0 ? Math.round((nutritionSummary.avgCalories / nutritionSummary.targetCalories) * 100) : 0;
                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-300 uppercase">🔥 {t('clientDashboard.avgEnergy', 'Avg Energy / Day')}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${pct > 110 ? 'bg-red-500/20 text-red-400' : pct >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {getProgressLabel(pct)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-400">{nutritionSummary.avgCalories}</span>
                        <span className="text-xs text-slate-400">/ {nutritionSummary.targetCalories} kcal</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${getProgressColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 text-right">{pct}%</p>
                    </div>
                  );
                })()}

                {/* Protein Card */}
                {(() => {
                  const pct = nutritionSummary.targetProtein > 0 ? Math.round((nutritionSummary.avgProtein / nutritionSummary.targetProtein) * 100) : 0;
                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-300 uppercase">💪 {t('clientDashboard.avgProtein', 'Avg Protein / Day')}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${pct > 110 ? 'bg-red-500/20 text-red-400' : pct >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {getProgressLabel(pct)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-blue-400">{nutritionSummary.avgProtein}g</span>
                        <span className="text-xs text-slate-400">/ {nutritionSummary.targetProtein}g</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${getProgressColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 text-right">{pct}%</p>
                    </div>
                  );
                })()}

                {/* Carbs Card */}
                {(() => {
                  const pct = nutritionSummary.targetCarbs > 0 ? Math.round((nutritionSummary.avgCarbs / nutritionSummary.targetCarbs) * 100) : 0;
                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-300 uppercase">🌾 {t('clientDashboard.avgCarbs', 'Avg Carbs / Day')}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${pct > 110 ? 'bg-red-500/20 text-red-400' : pct >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {getProgressLabel(pct)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-amber-400">{nutritionSummary.avgCarbs}g</span>
                        <span className="text-xs text-slate-400">/ {nutritionSummary.targetCarbs}g</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${getProgressColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 text-right">{pct}%</p>
                    </div>
                  );
                })()}

                {/* Fat Card */}
                {(() => {
                  const pct = nutritionSummary.targetFat > 0 ? Math.round((nutritionSummary.avgFat / nutritionSummary.targetFat) * 100) : 0;
                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-300 uppercase">🥑 {t('clientDashboard.avgFat', 'Avg Fat / Day')}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${pct > 110 ? 'bg-red-500/20 text-red-400' : pct >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {getProgressLabel(pct)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-rose-400">{nutritionSummary.avgFat}g</span>
                        <span className="text-xs text-slate-400">/ {nutritionSummary.targetFat}g</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${getProgressColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 text-right">{pct}%</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Interactive Progress & Analytics Chart */}
          {clientId && (
            <ProgressAnalyticsChart
              clientId={clientId}
              initialWeight={clientMetrics?.weightKg || 70}
              heightCm={clientMetrics?.heightCm || 175}
              tdee={clientMetrics?.tdee || 2000}
              plans={plans}
            />
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-lg font-semibold text-slate-200">
                {t('clientDashboard.activePlans')} ({plans.length})
              </h2>

              {plans.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-2xl">
                    🥗
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      {isEn ? 'No Active Meal Plans Yet' : 'ยังไม่มีแผนโภชนาการที่ได้รับมอบหมาย'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {isEn
                        ? 'Request a consultation from a specialist in the Marketplace or choose a meal plan template.'
                        : 'ท่านสามารถปรึกษานักโภชนาการในตลาดผู้เชี่ยวชาญ หรือดูคลังเทมเพลตแผนอาหารได้'}
                    </p>
                  </div>
                  <div className="flex justify-center gap-2 pt-2 flex-wrap">
                    <button
                      onClick={() => router.push('/marketplace')}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <span>🏪</span>
                      <span>{t('marketplace.findNutritionist', 'Find a Nutritionist')}</span>
                    </button>
                    <button
                      onClick={() => router.push('/templates')}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5"
                    >
                      <span>📚</span>
                      <span>{t('templates.browseTemplates', 'Browse Templates')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => router.push(`/meal-plans/${plan.id}`)}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex justify-between items-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all group"
                  >
                    <div>
                      <h3 className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">{plan.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {t('clientDashboard.duration')}: {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                      </p>
                      {plan.dailyMenus && plan.dailyMenus.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          📋 {plan.dailyMenus.length} {t('clientDashboard.days', 'days')} | 🔥 {Math.round(plan.totalCalories)} kcal {t('clientDashboard.totalKcal', 'total')}
                        </p>
                      )}
                    </div>
                    <span className="text-emerald-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-200">{t('clientDashboard.adherenceSummary')}</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                <div className="text-4xl font-extrabold text-emerald-400">
                  {adherence && (adherence.totalLogged ?? 0) > 0
                    ? `${adherence.adherenceRatePercent}%`
                    : '—'}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {adherence && (adherence.totalLogged ?? 0) > 0
                    ? (adherence.status === 'Excellent Compliance' ? t('clientDashboard.highCompliance') : adherence.status)
                    : t('clientDashboard.noTrackingData', 'No meal tracking data yet')}
                </p>
                {adherence && (adherence.totalLogged ?? 0) > 0 && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    {t('clientDashboard.loggedSummary', 'Logged')} {adherence.totalLogged} {t('clientDashboard.meals', 'meals')} | {t('clientDashboard.adheredSummary', 'Adhered')} {adherence.adheredCount} {t('clientDashboard.meals', 'meals')}
                  </p>
                )}
              </div>

              {/* Body Metrics Card */}
              {clientMetrics && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase">📏 {t('clientDashboard.bodyMetrics', 'Body Metrics')}</h3>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-blue-400">{clientMetrics.weightKg}</p>
                      <p className="text-[10px] text-slate-500">{t('clientDashboard.weightKg', 'Weight (kg)')}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-400">{clientMetrics.heightCm}</p>
                      <p className="text-[10px] text-slate-500">{t('clientDashboard.heightCm', 'Height (cm)')}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-400">{clientMetrics.age}</p>
                      <p className="text-[10px] text-slate-500">{t('clientDashboard.ageYrs', 'Age (yrs)')}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-400">{clientMetrics.gender === 'Male' ? t('clientDashboard.male', '♂ Male') : clientMetrics.gender === 'Female' ? t('clientDashboard.female', '♀ Female') : t('clientDashboard.other', '⚧ Other')}</p>
                      <p className="text-[10px] text-slate-500">{t('clientDashboard.gender', 'Gender')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Marketplace & Assigned Nutritionist Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase">🩺 {t('marketplace.myConsultations', 'My Specialist & Consultations')}</h3>
                </div>

                {consultations.length > 0 ? (
                  <div className="space-y-2">
                    {consultations.map((c) => (
                      <div key={c.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-200">{c.nutritionistName}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            c.status === 'Accepted'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : c.status === 'Declined'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {c.status === 'Accepted' ? t('marketplace.acceptedInCare', 'In Care') : c.status === 'Declined' ? t('marketplace.declined', 'Declined') : t('marketplace.pendingReview', 'Pending')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{c.goalType}</p>
                        {c.targetWeightKg && <p className="text-[10px] text-emerald-400">Target: {c.targetWeightKg} kg</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    {isEn ? 'No specialist assigned yet.' : 'ยังไม่มีนักโภชนาการประจำตัว'}
                  </p>
                )}

                <button
                  onClick={() => router.push('/marketplace')}
                  className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold py-2 px-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>🏪</span>
                  <span>{t('marketplace.findNutritionist', 'Find a Nutritionist')} →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showReportModal && (
        <HealthReportExportModal
          patientName={clientName}
          patientEmail={clientEmail}
          age={clientMetrics?.age || 26}
          weightKg={clientMetrics?.weightKg || 70}
          heightCm={clientMetrics?.heightCm || 175}
          tdee={clientMetrics?.tdee || 2100}
          bmr={clientMetrics?.bmr || 1650}
          adherence={adherence}
          plans={plans}
          nutritionistName={consultations.find(c => c.status === 'Accepted')?.nutritionistName || 'Dr. Sarah Connor, RDN'}
          onClose={() => setShowReportModal(false)}
        />
      )}

    </div>
  );
}
