'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { templateService, userService, MealPlanTemplateDto } from '@/services/nutriServices';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserHeader } from '@/components/UserHeader';

interface ClientOption {
  id: string;
  fullName: string;
  email: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const [templates, setTemplates] = useState<MealPlanTemplateDto[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Clone Modal State
  const [cloningTemplate, setCloningTemplate] = useState<MealPlanTemplateDto | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [customPlanTitle, setCustomPlanTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCloning, setIsCloning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const nutritionistId = localStorage.getItem('nutriplan_user_id') || '';
      try {
        const [templatesData, clientsData] = await Promise.all([
          templateService.getTemplates(),
          nutritionistId ? userService.getMyClients(nutritionistId) : userService.getUnassignedClients()
        ]);
        setTemplates(templatesData);
        setClients(clientsData);
        if (clientsData.length > 0) {
          setSelectedClientId(clientsData[0].id);
        }
      } catch (err) {
        console.error('Failed to load templates or clients:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(templates.map(t => t.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(tpl => {
      const matchQuery =
        tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.dietType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.suitableFor.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = selectedCategory === 'All' || tpl.category === selectedCategory;

      return matchQuery && matchCat;
    });
  }, [templates, searchQuery, selectedCategory]);

  const handleOpenCloneModal = (tpl: MealPlanTemplateDto) => {
    setCloningTemplate(tpl);
    setCustomPlanTitle(`${tpl.title} (${isEn ? 'Prescribed' : 'กำหนดเฉพาะบุคคล'})`);
    setStartDate(new Date().toISOString().split('T')[0]);
  };

  const handleExecuteClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloningTemplate) return;

    const targetClientId = selectedClientId || (clients.length > 0 ? clients[0].id : '22222222-2222-2222-2222-222222222222');
    setIsCloning(true);

    try {
      const sDate = new Date(startDate);
      const eDate = new Date(sDate);
      eDate.setDate(eDate.getDate() + (cloningTemplate.daysCount || 14));

      const res = await templateService.cloneTemplate(cloningTemplate.id, {
        clientId: targetClientId,
        customTitle: customPlanTitle,
        startDate: sDate.toISOString(),
        endDate: eDate.toISOString()
      });

      setCloningTemplate(null);
      setToastMessage(t('templates.cloneSuccess', 'Meal plan template successfully cloned and assigned to client!'));
      setTimeout(() => setToastMessage(null), 4000);

      // Navigate to nutritionist dashboard or meal plan detail if available
      if (res && res.id && !res.id.startsWith('plan-tpl-')) {
        router.push(`/meal-plans/${res.id}`);
      }
    } catch (err) {
      console.error('Failed to clone template:', err);
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 md:p-8 overflow-x-hidden w-full max-w-full">
      <UserHeader
        title={t('templates.title', 'Clinical & Lifestyle Meal Plan Templates')}
        subtitle={t('templates.subtitle', 'Evidence-based pre-built nutrition protocols ready to prescribe or customize')}
        showBack
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-bounce">
          <span>🎉</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-teal-950/60 via-slate-900 to-indigo-950/40 border border-teal-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 z-10">
            <span className="text-[11px] font-black uppercase tracking-widest text-teal-400 bg-teal-500/10 border border-teal-500/30 px-3 py-1 rounded-full">
              📚 Reusable Clinical Protocols
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 mt-2">
              {isEn ? 'Standardized Nutritional Templates' : 'คลังแผนโภชนาการมาตรฐานระดับสากล'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isEn
                ? 'Accelerate client care with validated macro allocations. 1-click clone full 14-day and 28-day daily menus directly into any client portfolio.'
                : 'ช่วยให้นักโภชนาการออกแผนอาหารได้อย่างรวดเร็ว ถูกต้องตามหลักโภชนบำบัด พร้อมฟังก์ชันคัดลอกทั้งโปรแกรม 14-28 วันเข้าสู่บัญชีผู้รับบริการได้ใน 1 คลิก'}
            </p>
          </div>

          <div className="flex gap-3 z-10">
            <button
              onClick={() => router.push('/dashboard/nutritionist')}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition-all text-center"
            >
              ← {t('common.backToDashboard', 'Back to Dashboard')}
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-lg">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder={t('templates.searchTemplate', 'Search templates (e.g. Keto, Clean, Hypertrophy)...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat === 'All' ? t('templates.allCategories', 'All Categories') : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="text-center text-slate-400 py-16">{t('common.loading', 'Loading templates...')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl hover:shadow-2xl transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 rounded-full font-bold">
                        {tpl.category}
                      </span>
                      <h3 className="font-bold text-slate-100 text-lg mt-1 group-hover:text-teal-400 transition-colors">
                        {tpl.title}
                      </h3>
                    </div>
                    <span className="text-xs bg-slate-950 text-slate-300 px-3 py-1 rounded-xl border border-slate-800 font-mono font-bold">
                      ⏱️ {tpl.daysCount} {t('templates.days', 'days')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {tpl.description}
                  </p>

                  {/* Target Macros Breakdown */}
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">{t('templates.targetCalories', 'Daily Energy')}:</span>
                      <span className="text-emerald-400 font-black text-sm">{tpl.targetCalories} kcal</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 border-t border-slate-800/80">
                      <div className="bg-slate-900 p-1.5 rounded-lg">
                        <p className="text-slate-400 text-[10px]">Protein</p>
                        <p className="text-blue-400 font-bold">{tpl.targetProtein}g</p>
                      </div>
                      <div className="bg-slate-900 p-1.5 rounded-lg">
                        <p className="text-slate-400 text-[10px]">Carbs</p>
                        <p className="text-amber-400 font-bold">{tpl.targetCarbs}g</p>
                      </div>
                      <div className="bg-slate-900 p-1.5 rounded-lg">
                        <p className="text-slate-400 text-[10px]">Fat</p>
                        <p className="text-rose-400 font-bold">{tpl.targetFat}g</p>
                      </div>
                    </div>
                  </div>

                  {/* Suitable for & Highlight Foods */}
                  <div className="space-y-1.5 text-xs">
                    <p className="text-slate-400">
                      <strong>🎯 {t('templates.suitableFor', 'Audience')}:</strong> {tpl.suitableFor}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {tpl.highlightFoods.map((food, i) => (
                        <span key={i} className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-md">
                          🥗 {food}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Clone Action Button */}
                <div className="pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => handleOpenCloneModal(tpl)}
                    className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 group-hover:scale-[1.01]"
                  >
                    <span>📋</span>
                    <span>{t('templates.clonePlan', 'Prescribe & Clone to Client')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clone to Client Modal */}
      {cloningTemplate && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>📋</span>
                  <span>{t('templates.selectClientModal', 'Prescribe Template to Client')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {cloningTemplate.title} ({cloningTemplate.daysCount} {t('templates.days', 'days')})
                </p>
              </div>
              <button
                onClick={() => setCloningTemplate(null)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteClone} className="space-y-4">
              {/* Select Client */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('templates.selectClientLabel', 'Select Assigned Client')}
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:border-teal-400 focus:outline-none"
                >
                  {clients.length === 0 ? (
                    <option value="22222222-2222-2222-2222-222222222222">John Doe (Demo Client)</option>
                  ) : (
                    clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.email})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Plan Title */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {isEn ? 'Prescribed Plan Name' : 'ชื่อแผนอาหารที่สั่งจ่าย'}
                </label>
                <input
                  type="text"
                  value={customPlanTitle}
                  onChange={(e) => setCustomPlanTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:border-teal-400 focus:outline-none"
                  required
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {isEn ? 'Start Date' : 'วันที่เริ่มต้น'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:border-teal-400 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCloningTemplate(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCloning}
                  className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
                >
                  {isCloning ? t('templates.cloning', 'Cloning...') : t('templates.clonePlan', 'Prescribe & Clone Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
