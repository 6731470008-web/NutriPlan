'use client';

import { useState, useRef, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mealPlanService } from '@/services/nutriServices';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function CreateMealPlanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  const clientId = searchParams.get('clientId') ?? '';
  const [title, setTitle] = useState('');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(thirtyDaysLater);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Client ID is missing.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const created = await mealPlanService.create({
        clientId,
        title,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });

      router.push(`/meal-plans/${created.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || t('createMealPlanPage.failedToCreate'));
      } else {
        setError(t('createMealPlanPage.failedToCreate'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-emerald-400">{t('createMealPlanPage.title')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('createMealPlanPage.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/50 border border-red-500 text-red-200 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
            {t('createMealPlanPage.planTitleLabel')}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('createMealPlanPage.planTitlePlaceholder')}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
              {t('createMealPlanPage.startDateLabel')}
            </label>
            <div className="relative">
              <input
                ref={startDateRef}
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch {}
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer [color-scheme:dark]"
              />
              <button
                type="button"
                onClick={() => startDateRef.current?.showPicker?.()}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-emerald-400 text-sm"
                title="Open Calendar / เปิดปฏิทิน"
              >
                📅
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
              {t('createMealPlanPage.endDateLabel')}
            </label>
            <div className="relative">
              <input
                ref={endDateRef}
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch {}
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer [color-scheme:dark]"
              />
              <button
                type="button"
                onClick={() => endDateRef.current?.showPicker?.()}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-emerald-400 text-sm"
                title="Open Calendar / เปิดปฏิทิน"
              >
                📅
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              const role = typeof window !== 'undefined' ? localStorage.getItem('nutriplan_user_role') : null;
              router.push(role === 'Client' ? '/dashboard/client' : '/dashboard/nutritionist');
            }}
            className="w-1/3 bg-slate-800 hover:bg-slate-700 font-semibold text-slate-300 py-3 rounded-lg text-xs border border-slate-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-2/3 bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950 py-3 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            {isLoading ? t('createMealPlanPage.creatingBtn') : t('createMealPlanPage.createBtn')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateMealPlanPage() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-lg flex justify-between items-center mb-8">
        <button
          onClick={() => {
            const role = typeof window !== 'undefined' ? localStorage.getItem('nutriplan_user_role') : null;
            router.push(role === 'Client' ? '/dashboard/client' : '/dashboard/nutritionist');
          }}
          className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1"
        >
          ← {t('common.backToDashboard')}
        </button>
        <LanguageSwitcher />
      </div>

      <Suspense fallback={<div className="text-slate-400 py-12">{t('common.loading')}</div>}>
        <CreateMealPlanForm />
      </Suspense>
    </div>
  );
}
