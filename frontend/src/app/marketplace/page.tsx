'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { marketplaceService, MarketplaceNutritionistDto } from '@/services/nutriServices';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserHeader } from '@/components/UserHeader';

export default function MarketplacePage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const [nutritionists, setNutritionists] = useState<MarketplaceNutritionistDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');

  // Request Modal State
  const [selectedNutritionist, setSelectedNutritionist] = useState<MarketplaceNutritionistDto | null>(null);
  const [goalType, setGoalType] = useState('Weight Loss & Fat Reduction');
  const [targetWeight, setTargetWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    const fetchNutritionists = async () => {
      try {
        const data = await marketplaceService.getNutritionists();
        setNutritionists(data);
      } catch (err) {
        console.error('Failed to load marketplace nutritionists:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNutritionists();
  }, []);

  const specialties = useMemo(() => {
    const unique = Array.from(new Set(nutritionists.map(n => n.specialization).filter(Boolean)));
    return ['All', ...unique];
  }, [nutritionists]);

  const filteredNutritionists = useMemo(() => {
    const filtered = nutritionists.filter(n => {
      const matchQuery =
        n.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.bio.toLowerCase().includes(searchQuery.toLowerCase());

      const matchSpecialty = selectedSpecialty === 'All' || n.specialization === selectedSpecialty;

      return matchQuery && matchSpecialty;
    });

    // Priority Sort: Clinical Pro Specialists first, then by highest rating
    return filtered.sort((a, b) => {
      const aPro = Boolean(a.isPro);
      const bPro = Boolean(b.isPro);
      if (aPro && !bPro) return -1;
      if (!aPro && bPro) return 1;
      return b.rating - a.rating;
    });
  }, [nutritionists, searchQuery, selectedSpecialty]);

  const handleOpenRequestModal = (nutri: MarketplaceNutritionistDto) => {
    setSelectedNutritionist(nutri);
    setGoalType('Weight Loss & Fat Reduction');
    setTargetWeight('');
    setNotes('');
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNutritionist) return;

    const clientId = localStorage.getItem('nutriplan_user_id') || '22222222-2222-2222-2222-222222222222';
    setIsSubmitting(true);

    try {
      await marketplaceService.createConsultation({
        clientId,
        nutritionistId: selectedNutritionist.id,
        goalType,
        targetWeightKg: targetWeight ? parseFloat(targetWeight) : undefined,
        notes: notes.trim() || undefined
      });

      setSelectedNutritionist(null);
      setSuccessToast(t('marketplace.requestSuccess', 'Consultation request submitted! Your nutritionist will review it shortly.'));
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to submit consultation request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 md:p-8 overflow-x-hidden w-full max-w-full">
      <UserHeader
        title={t('marketplace.title', 'Nutritionist Marketplace')}
        subtitle={t('marketplace.subtitle', 'Browse certified dietitians & request personalized clinical consultation')}
        showBack
      />

      {/* Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-bounce">
          <span>🎉</span>
          <span>{successToast}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Marketplace Banner */}
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-blue-950/40 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 z-10">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
              ⭐ Two-Sided Nutrition Network
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100 mt-2">
              {isEn ? 'Work 1-on-1 with Certified Nutritionists' : 'รับการดูแลแบบ 1-ต่อ-1 โดยนักโภชนาการมืออาชีพ'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isEn
                ? 'Select a specialist tailored to your health goals, medical conditions, and lifestyle. Get customized meal plans and continuous progress tracking.'
                : 'เลือกผู้เชี่ยวชาญที่ตรงกับเป้าหมายสุขภาพ โรคประจำตัว หรือไลฟ์สไตล์ของคุณ เพื่อรับแผนโภชนาการเฉพาะบุคคลและการติดตามผลอย่างใกล้ชิด'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 z-10 w-full md:w-auto">
            <button
              onClick={() => router.push('/dashboard/client')}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition-all text-center"
            >
              ← {t('common.backToDashboard', 'Back to Dashboard')}
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-lg">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder={t('marketplace.searchNutritionist', 'Search nutritionist by name or specialty...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {specialties.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialty(spec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedSpecialty === spec
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {spec === 'All' ? t('marketplace.allSpecializations', 'All Specializations') : spec}
              </button>
            ))}
          </div>
        </div>

        {/* Nutritionists Grid */}
        {isLoading ? (
          <div className="text-center text-slate-400 py-16">{t('common.loading', 'Loading specialists...')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {filteredNutritionists.map((nutri) => {
              const isPro = Boolean(nutri.isPro);
              return (
                <div
                  key={nutri.id}
                  className={`relative rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group ${
                    isPro
                      ? 'bg-gradient-to-b from-amber-950/25 via-slate-900 to-slate-900 border-2 border-amber-500/50 hover:border-amber-400 ring-1 ring-amber-500/20 hover:shadow-amber-500/10 hover:shadow-2xl'
                      : 'bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:shadow-2xl'
                  }`}
                >
                  {/* Pro Badge on Top of Card */}
                  {isPro && (
                    <div className="absolute -top-3 left-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                      <span>👑</span>
                      <span>{isEn ? 'Clinical Pro Specialist' : 'ผู้เชี่ยวชาญระดับคลินิกโปร (PRO)'}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Top Avatar & Verified Badge */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl font-black text-lg flex items-center justify-center shadow-md ${
                            isPro
                              ? 'bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 text-slate-950 ring-2 ring-amber-400/40'
                              : 'bg-gradient-to-br from-emerald-400 to-blue-500 text-slate-950'
                          }`}
                        >
                          {nutri.fullName.charAt(0)}
                        </div>
                        <div>
                          <h3
                            className={`font-bold text-base transition-colors ${
                              isPro
                                ? 'text-slate-100 group-hover:text-amber-400'
                                : 'text-slate-100 group-hover:text-emerald-400'
                            }`}
                          >
                            {nutri.fullName}
                          </h3>
                          <p
                            className={`text-[11px] font-medium flex items-center gap-1 ${
                              isPro ? 'text-amber-400 font-semibold' : 'text-emerald-400'
                            }`}
                          >
                            <span>{isPro ? '🥇' : '🛡️'}</span>
                            <span>
                              {isPro
                                ? isEn
                                  ? 'Verified Gold Specialist'
                                  : 'ผู้เชี่ยวชาญ Gold ที่ได้รับการรับรอง'
                                : t('marketplace.verifiedSpecialist', 'Verified Specialist')}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs ${
                          isPro
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                            : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                        }`}
                      >
                        <span>★</span>
                        <span>{nutri.rating}</span>
                        <span className="text-[10px] text-slate-500 font-normal">({nutri.reviewCount})</span>
                      </div>
                    </div>

                    {/* Specialization & License Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                          isPro
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {nutri.specialization}
                      </span>
                      <span className="text-[10px] bg-slate-950 text-slate-400 font-mono px-2 py-0.5 rounded-md border border-slate-800">
                        {nutri.licenseNumber}
                      </span>
                    </div>

                    {/* Bio */}
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {nutri.bio}
                    </p>
                  </div>

                  {/* Bottom Stats & Action */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/80">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>
                        👥 {t('marketplace.activeClients', 'Active Patients')}:{' '}
                        <strong className="text-slate-200">{nutri.activeClientsCount}</strong>
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          isPro ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        ● {isEn ? 'Accepting Clients' : 'เปิดรับผู้รับบริการ'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenRequestModal(nutri)}
                      className={`w-full font-bold py-2.5 rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02] ${
                        isPro
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      }`}
                    >
                      <span>📅</span>
                      <span>{t('marketplace.requestConsultation', 'Request Consultation')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Consultation Request Modal */}
      {selectedNutritionist && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>📝</span>
                  <span>{t('marketplace.requestModalTitle', 'Request Dietary Consultation')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isEn ? 'Requesting care from' : 'ส่งคำขอรับคำปรึกษากับ'}: <strong className="text-emerald-400">{selectedNutritionist.fullName}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedNutritionist(null)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              {/* Primary Goal */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('marketplace.selectGoal', 'Primary Health Goal')}
                </label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
                >
                  <option value="Weight Loss & Fat Reduction">{isEn ? '🔥 Weight Loss & Fat Reduction' : '🔥 ลดน้ำหนักและไขมัน'}</option>
                  <option value="Muscle Hypertrophy & Strength">{isEn ? '💪 Muscle Hypertrophy & Strength' : '💪 เพิ่มกล้ามเนื้อและความแข็งแรง'}</option>
                  <option value="Clinical Glycemic & Diabetic Care">{isEn ? '🩺 Glycemic & Diabetic Care' : '🩺 ควบคุมน้ำตาลและเบาหวาน'}</option>
                  <option value="Ketogenic Metabolic Adaptation">{isEn ? '🥑 Ketogenic Adaptation' : '🥑 คีโตเจนิคและปรับสมดุลเผาผลาญ'}</option>
                  <option value="General Health & Wellness">{isEn ? '🥗 General Health & Longevity' : '🥗 สุขภาพดีและการกินคลีน'}</option>
                </select>
              </div>

              {/* Target Weight */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('marketplace.targetWeight', 'Target Weight (kg)')}
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 68.0"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              {/* Health notes & preferences */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('marketplace.healthNotes', 'Health Notes & Preferences')}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('marketplace.healthNotesPlaceholder', 'Describe your dietary lifestyle, allergies, medical conditions, or daily routine...')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedNutritionist(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
                >
                  {isSubmitting ? t('marketplace.sendingRequest', 'Submitting...') : t('marketplace.sendRequest', 'Submit Consultation Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
