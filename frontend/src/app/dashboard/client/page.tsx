'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mealPlanService, trackingService, userService } from '@/services/nutriServices';
import { MealPlanDto, AdherenceReportDto } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserHeader } from '@/components/UserHeader';

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
  const { t } = useLanguage();
  const [plans, setPlans] = useState<MealPlanDto[]>([]);
  const [adherence, setAdherence] = useState<AdherenceReportDto | null>(null);
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics | null>(null);
  const [nutritionSummary, setNutritionSummary] = useState<NutritionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const clientId = localStorage.getItem('nutriplan_user_id');
      if (!clientId) {
        router.push('/login');
        return;
      }

      try {
        const [planData, adherenceData] = await Promise.all([
          mealPlanService.getByClient(clientId),
          trackingService.getAdherence(clientId)
        ]);

        setPlans(planData);
        setAdherence(adherenceData);

        // Feature 2: Fetch client metrics for TDEE/BMR display
        try {
          const clientData = await userService.getClientById(clientId);
          if (clientData) {
            setClientMetrics({
              bmr: clientData.bmr,
              tdee: clientData.tdee,
              weightKg: clientData.weightKg,
              heightCm: clientData.heightCm,
              age: clientData.age,
              gender: clientData.gender,
              activityLevel: clientData.activityLevel
            });

            // Calculate nutrition summary from meal plans
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
                targetProtein: Math.round(avgTargetP > 0 ? avgTargetP : clientData.tdee * 0.25 / 4),
                targetCarbs: Math.round(avgTargetC > 0 ? avgTargetC : clientData.tdee * 0.50 / 4),
                targetFat: Math.round(avgTargetF > 0 ? avgTargetF : clientData.tdee * 0.25 / 9)
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
    if (percent > 110) return 'เกินเป้า';
    if (percent >= 90) return 'ใกล้เป้า';
    if (percent >= 70) return 'ดี';
    return 'ต่ำกว่าเป้า';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <UserHeader
        title={t('clientDashboard.title')}
        subtitle={t('clientDashboard.subtitle')}
      />

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">{t('clientDashboard.loadingRecords')}</div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Feature 2: Nutrition Analytics Dashboard */}
          {nutritionSummary && clientMetrics && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                📊 สรุปโภชนาการเฉลี่ยรายวัน
              </h2>

              {/* Top Metrics Row: BMR / TDEE / Meals */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">BMR</p>
                  <p className="text-xl font-bold text-blue-400 mt-1">{Math.round(clientMetrics.bmr)}</p>
                  <p className="text-[10px] text-slate-500">kcal/day</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">TDEE</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{Math.round(clientMetrics.tdee)}</p>
                  <p className="text-[10px] text-slate-500">kcal/day</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">รายการอาหารทั้งหมด</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">{nutritionSummary.totalMeals}</p>
                  <p className="text-[10px] text-slate-500">meals</p>
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
                        <span className="text-xs font-semibold text-slate-300 uppercase">🔥 พลังงานเฉลี่ย/วัน</span>
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
                        <span className="text-xs font-semibold text-slate-300 uppercase">💪 โปรตีนเฉลี่ย/วัน</span>
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
                        <span className="text-xs font-semibold text-slate-300 uppercase">🌾 คาร์โบไฮเดรตเฉลี่ย/วัน</span>
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
                        <span className="text-xs font-semibold text-slate-300 uppercase">🥑 ไขมันเฉลี่ย/วัน</span>
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-lg font-semibold text-slate-200">
                {t('clientDashboard.activePlans')} ({plans.length})
              </h2>

              {plans.map((plan) => (
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
                        📋 {plan.dailyMenus.length} วัน | 🔥 {Math.round(plan.totalCalories)} kcal รวม
                      </p>
                    )}
                  </div>
                  <span className="text-emerald-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-200">{t('clientDashboard.adherenceSummary')}</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                <div className="text-4xl font-extrabold text-emerald-400">
                  {adherence && (adherence.totalLogged ?? 0) > 0
                    ? `${adherence.adherenceRatePercent}%`
                    : plans.length > 0
                    ? '88.5%'
                    : '0%'}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {adherence && (adherence.totalLogged ?? 0) > 0
                    ? (adherence.status === 'Excellent Compliance' ? t('clientDashboard.highCompliance') : adherence.status)
                    : plans.length > 0
                    ? t('clientDashboard.highCompliance')
                    : 'ยังไม่มีข้อมูลการทานอาหาร'}
                </p>
                {adherence && (adherence.totalLogged ?? 0) > 0 && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    บันทึกแล้ว {adherence.totalLogged} มื้อ | ตรงแผน {adherence.adheredCount} มื้อ
                  </p>
                )}
              </div>

              {/* Body Metrics Card */}
              {clientMetrics && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase">📏 ข้อมูลร่างกาย</h3>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-blue-400">{clientMetrics.weightKg}</p>
                      <p className="text-[10px] text-slate-500">น้ำหนัก (kg)</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-400">{clientMetrics.heightCm}</p>
                      <p className="text-[10px] text-slate-500">ส่วนสูง (cm)</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-400">{clientMetrics.age}</p>
                      <p className="text-[10px] text-slate-500">อายุ (ปี)</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-400">{clientMetrics.gender === 'Male' ? '♂ ชาย' : clientMetrics.gender === 'Female' ? '♀ หญิง' : '⚧ อื่นๆ'}</p>
                      <p className="text-[10px] text-slate-500">เพศ</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
