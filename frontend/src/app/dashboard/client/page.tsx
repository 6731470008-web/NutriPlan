'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mealPlanService, trackingService } from '@/services/nutriServices';
import { MealPlanDto, AdherenceReportDto } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function ClientDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [plans, setPlans] = useState<MealPlanDto[]>([]);
  const [adherence, setAdherence] = useState<AdherenceReportDto | null>(null);
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
      } catch (err: unknown) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="flex justify-between items-center pb-6 border-b border-slate-800 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">{t('clientDashboard.title')}</h1>
          <p className="text-slate-400 text-sm">{t('clientDashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg border border-slate-700"
          >
            {t('common.logout')}
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">{t('clientDashboard.loadingRecords')}</div>
      ) : (
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
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-200">{t('clientDashboard.adherenceSummary')}</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
              <div className="text-4xl font-extrabold text-emerald-400">
                {adherence?.adherenceRatePercent ?? 88.5}%
              </div>
              <p className="text-xs text-slate-400 mt-2">{adherence?.status ?? t('clientDashboard.highCompliance')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
