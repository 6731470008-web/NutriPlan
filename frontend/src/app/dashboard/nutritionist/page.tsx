'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { userService, mealPlanService } from '@/services/nutriServices';
import { MealPlanDto } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserHeader } from '@/components/UserHeader';

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
  const { t } = useLanguage();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [unassignedClients, setUnassignedClients] = useState<ClientItem[]>([]);
  const [clientPlansMap, setClientPlansMap] = useState<Record<string, MealPlanDto[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit plan modal state
  const [editingPlan, setEditingPlan] = useState<MealPlanDto | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    const nutritionistId = localStorage.getItem('nutriplan_user_id');
    if (!nutritionistId) {
      router.push('/login');
      return;
    }

    try {
      const [assignedData, unassignedData] = await Promise.all([
        userService.getMyClients(nutritionistId),
        userService.getUnassignedClients()
      ]);
      setClients(assignedData);
      setUnassignedClients(unassignedData);

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
    if (!confirm(`คุณต้องการลบแผนอาหารนี้ใช่หรือไม่? / Delete meal plan for ${clientName}?`)) {
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

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <UserHeader
        title={t('nutritionistDashboard.title')}
        subtitle={t('nutritionistDashboard.subtitle')}
      />

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-slate-400 py-12">{t('nutritionistDashboard.loadingRoster')}</div>
      ) : (
        <div className="space-y-10">
          {/* Section 1: Assigned Client Roster */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-200">
                {t('nutritionistDashboard.assignedRoster')} ({clients.length})
              </h2>
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
                                  ⚠️ แพ้: {client.foodAllergies}
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
                            📋 แผนอาหารที่บันทึกไว้ ({plans.length})
                          </h4>
                        </div>

                        {plans.length === 0 ? (
                          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 text-center text-xs text-slate-500 italic">
                            ยังไม่มีแผนอาหารในระบบ / No saved meal plans
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
                                    title="แก้ไขแผน / Edit plan"
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
                                    title="ลบแผน / Delete plan"
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

                      <div className="pt-2">
                        <button
                          onClick={() => router.push(`/meal-plans/new?clientId=${client.id}`)}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 shadow-md"
                        >
                          + {t('nutritionistDashboard.createMealPlan')}
                        </button>
                      </div>
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
              ✏️ แก้ไขแผนอาหาร / Edit Meal Plan
            </h3>
            <form onSubmit={handleSavePlanEdit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">ชื่อแผนอาหาร / Plan Title *</label>
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
                  <label className="block text-xs text-slate-300 mb-1">วันเริ่มต้น / Start Date</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">วันสิ้นสุด / End Date</label>
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
                  {isSavingPlan ? t('common.loading') : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
