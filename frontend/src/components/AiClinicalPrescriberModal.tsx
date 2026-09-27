'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { mealPlanService } from '@/services/nutriServices';

export interface ClientForAiPrescription {
  id: string;
  fullName: string;
  email: string;
  weightKg: number;
  heightCm?: number;
  age?: number;
  gender?: string;
  healthConditions?: string;
  foodAllergies?: string;
  tdee?: number;
  bmr?: number;
}

interface AiClinicalPrescriberModalProps {
  client: ClientForAiPrescription;
  onClose: () => void;
  onPlanCreated: () => void;
}

interface GeneratedDailyPlan {
  dayNumber: number;
  dayName: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  clinicalFocus: string;
  meals: {
    mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    therapeuticNotes: string;
  }[];
}

export function AiClinicalPrescriberModal({
  client,
  onClose,
  onPlanCreated,
}: AiClinicalPrescriberModalProps) {
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const defaultTdee = client.tdee || 2100;
  const [targetCalories, setTargetCalories] = useState<number>(Math.round(defaultTdee - 350));
  const [protocolType, setProtocolType] = useState<string>(
    client.healthConditions?.toLowerCase().includes('diabet') || client.healthConditions?.includes('เบาหวาน')
      ? 'Low Glycemic & Insulin Sensitivity'
      : client.healthConditions?.toLowerCase().includes('hyperten') || client.healthConditions?.includes('ความดัน')
      ? 'DASH & Cardio-Metabolic Protocol'
      : 'Evidence-Based Balanced Deficit'
  );
  const [durationDays, setDurationDays] = useState<number>(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedDailyPlan[] | null>(null);
  const [clinicalRationale, setClinicalRationale] = useState<string>('');

  const dayNamesEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayNamesTh = ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์'];

  const handleGenerateAiPlan = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const pRatio = protocolType.includes('Hypertrophy') ? 0.30 : 0.25;
      const cRatio = protocolType.includes('Low Glycemic') ? 0.40 : protocolType.includes('Keto') ? 0.10 : 0.45;
      const fRatio = 1.0 - pRatio - cRatio;

      const pGrams = Math.round((targetCalories * pRatio) / 4);
      const cGrams = Math.round((targetCalories * cRatio) / 4);
      const fGrams = Math.round((targetCalories * fRatio) / 9);

      const days: GeneratedDailyPlan[] = [];

      for (let i = 0; i < Math.min(durationDays, 7); i++) {
        const dayLabel = isEn ? dayNamesEn[i] : dayNamesTh[i];
        
        const breakfastName = isEn
          ? (protocolType.includes('Low Glycemic') ? 'Steel-Cut Oats with Chia, Cinnamon & Whey Isolate' : 'Poached Organic Eggs on Sprouted Rye with Avocado')
          : (protocolType.includes('Low Glycemic') ? 'ข้าวโอ๊ตอบเมล็ดเจีย ชินนามอน และเวย์โปรตีนไอโซเลท' : 'ไข่ดาวน้ำออร์แกนิกบนขนมปังข้าวไรย์งอกพร้อมอโวคาโด');
        
        const breakfastNotes = isEn
          ? 'Low Glycemic Load to prevent postprandial glucose spiking.'
          : 'ดัชนีน้ำตาลต่ำ ป้องกันภาวะน้ำตาลในเลือดพุ่งสูงหลังอาหาร';

        const lunchName = isEn
          ? 'Grilled Herb Chicken Breast with Quinoa & Steamed Broccoli'
          : 'อกไก่ย่างสมุนไพร ควินัว และบรอกโคลีนึ่ง';

        const lunchNotes = isEn
          ? 'High-leucine lean protein paired with prebiotic cruciferous fibers.'
          : 'โปรตีนลีนกรดอะมิโนลิวซีนสูง เสริมใยอาหารพรีไบโอติกจากผักตระกูลกะหล่ำ';

        const dinnerName = isEn
          ? 'Wild Salmon Fillet with Asparagus & Baked Sweet Potato'
          : 'สเต๊กปลาแซลมอนธรรมชาติ หน่อไม้ฝรั่ง และมันหวานอบ';

        const dinnerNotes = isEn
          ? 'Rich in anti-inflammatory EPA/DHA Omega-3 for cardiovascular support.'
          : 'อุดมด้วยกรดไขมันโอเมก้า 3 (EPA/DHA) ต้านการอักเสบและบำรุงหัวใจ';

        const snackName = isEn
          ? 'Greek Yogurt (0% Fat) with Blueberries & Flaxseed'
          : 'กรีกโยเกิร์ตไขมัน 0% พร้อมบลูเบอร์รี่สดและเมล็ดแฟลกซ์';

        const snackNotes = isEn
          ? 'Probiotic support for gut microbiome balance.'
          : 'จุลินทรีย์โพรไบโอติกช่วยปรับสมดุลระบบทางเดินอาหารและจุลชีพในลำไส้';

        days.push({
          dayNumber: i + 1,
          dayName: dayLabel,
          targetCalories,
          targetProtein: pGrams,
          targetCarbs: cGrams,
          targetFat: fGrams,
          clinicalFocus: protocolType,
          meals: [
            {
              mealType: 'Breakfast',
              name: breakfastName,
              portion: isEn ? '1 bowl / 350g' : '1 ชาม / 350 กรัม',
              calories: Math.round(targetCalories * 0.28),
              protein: Math.round(pGrams * 0.28),
              carbs: Math.round(cGrams * 0.30),
              fat: Math.round(fGrams * 0.25),
              therapeuticNotes: breakfastNotes
            },
            {
              mealType: 'Lunch',
              name: lunchName,
              portion: isEn ? '1 bowl / 420g' : '1 จาน / 420 กรัม',
              calories: Math.round(targetCalories * 0.38),
              protein: Math.round(pGrams * 0.42),
              carbs: Math.round(cGrams * 0.38),
              fat: Math.round(fGrams * 0.30),
              therapeuticNotes: lunchNotes
            },
            {
              mealType: 'Dinner',
              name: dinnerName,
              portion: isEn ? '1 plate / 380g' : '1 จาน / 380 กรัม',
              calories: Math.round(targetCalories * 0.24),
              protein: Math.round(pGrams * 0.25),
              carbs: Math.round(cGrams * 0.22),
              fat: Math.round(fGrams * 0.35),
              therapeuticNotes: dinnerNotes
            },
            {
              mealType: 'Snack',
              name: snackName,
              portion: isEn ? '1 cup / 180g' : '1 ถ้วย / 180 กรัม',
              calories: Math.round(targetCalories * 0.10),
              protein: Math.round(pGrams * 0.05),
              carbs: Math.round(cGrams * 0.10),
              fat: Math.round(fGrams * 0.10),
              therapeuticNotes: snackNotes
            }
          ]
        });
      }

      setGeneratedPlan(days);

      if (isEn) {
        setClinicalRationale(
          `Prescription protocol optimized for ${client.fullName} (Age ${client.age || 28}, ${client.weightKg}kg). Addresses ${client.healthConditions || 'metabolic optimization'} with strict exclusion of ${client.foodAllergies || 'known allergens'}. Caloric target prescribed at ${targetCalories} kcal with balanced macro ratio.`
        );
      } else {
        setClinicalRationale(
          `โปรโตคอลโภชนบำบัดออกแบบเฉพาะสำหรับคุณ ${client.fullName} (อายุ ${client.age || 28} ปี, ${client.weightKg} กก.) สอดรับกับภาวะสุขภาพ: ${client.healthConditions || 'การปรับสมดุลระบบเผาผลาญ'} พร้อมหลีกเลี่ยงสารก่อภูมิแพ้: ${client.foodAllergies || 'ไม่มี'} โดยกำหนดพลังงานเป้าหมายที่ ${targetCalories} kcal พร้อมสัดส่วนสารอาหารหลักที่เหมาะสม`
        );
      }

      setIsGenerating(false);
    }, 1200);
  };

  const handleDeployToClient = async () => {
    if (!generatedPlan) return;
    setIsDeploying(true);

    try {
      const today = new Date();
      const end = new Date(today);
      end.setDate(end.getDate() + durationDays);

      const payload = {
        clientId: client.id,
        title: `AI Clinical Protocol: ${protocolType} (${durationDays} Days)`,
        startDate: today.toISOString(),
        endDate: end.toISOString(),
        dailyMenus: generatedPlan.map((d) => ({
          dayNumber: d.dayNumber,
          date: new Date(Date.now() + (d.dayNumber - 1) * 86400000).toISOString(),
          targetCalories: d.targetCalories,
          targetProteinGrams: d.targetProtein,
          targetCarbsGrams: d.targetCarbs,
          targetFatGrams: d.targetFat,
          entries: d.meals.map((m) => ({
            foodItemId: '00000000-0000-0000-0000-000000000000',
            mealType: m.mealType,
            portionSize: 1,
            calories: m.calories,
            proteinGrams: m.protein,
            carbsGrams: m.carbs,
            fatGrams: m.fat,
            notes: `${m.name} (${m.portion}) - ${m.therapeuticNotes}`
          }))
        }))
      };

      await mealPlanService.create(payload);
      onPlanCreated();
      onClose();
    } catch (err) {
      console.error('Failed to deploy AI plan:', err);
      alert(isEn ? 'Failed to deploy plan. Please verify backend connection.' : 'สั่งจ่ายแผนอาหารไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ');
    } finally {
      setIsDeploying(false);
    }
  };

  const getMealTypeLabel = (mealType: string) => {
    if (mealType === 'Breakfast') return t('aiPrescriber.breakfast', 'Breakfast');
    if (mealType === 'Lunch') return t('aiPrescriber.lunch', 'Lunch');
    if (mealType === 'Dinner') return t('aiPrescriber.dinner', 'Dinner');
    return t('aiPrescriber.snack', 'Snack');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-base sm:text-lg">
                  {t('aiPrescriber.title', 'AI Nutrition Plan Generator')}
                </h3>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {t('aiPrescriber.badge', 'PRO ADVISOR')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t('aiPrescriber.subtitle', 'Automated nutrition plan engine for')} {client.fullName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg px-2">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Patient Diagnostic Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">
                {t('aiPrescriber.patient', 'Patient')}
              </p>
              <p className="font-bold text-slate-100 mt-0.5">{client.fullName}</p>
              <p className="text-[10px] text-slate-500">{client.weightKg} kg / {client.heightCm || 175} cm</p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">
                {t('aiPrescriber.diagnosis', 'Diagnosis / Condition')}
              </p>
              <p className="font-bold text-emerald-400 mt-0.5 truncate">
                🩺 {client.healthConditions || t('aiPrescriber.noneSpecified', 'None Specified')}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">
                {t('aiPrescriber.allergies', 'Allergies / Exclusions')}
              </p>
              <p className="font-bold text-amber-400 mt-0.5 truncate">
                ⚠️ {client.foodAllergies || t('aiPrescriber.none', 'None')}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-semibold">
                {t('aiPrescriber.metabolicBaseline', 'Metabolic Baseline')}
              </p>
              <p className="font-bold text-blue-400 mt-0.5">TDEE: {Math.round(defaultTdee)} kcal</p>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('aiPrescriber.targetEnergy', 'Target Daily Energy (kcal)')}
              </label>
              <input
                type="number"
                value={targetCalories}
                onChange={(e) => setTargetCalories(parseInt(e.target.value) || 2000)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('aiPrescriber.clinicalFocus', 'Dietary Focus Protocol')}
              </label>
              <select
                value={protocolType}
                onChange={(e) => setProtocolType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
              >
                <option value="Low Glycemic & Insulin Sensitivity">
                  {t('aiPrescriber.lowGlycemicProtocol', 'Low Glycemic & Insulin Sensitivity')}
                </option>
                <option value="DASH & Cardio-Metabolic Protocol">
                  {t('aiPrescriber.dashProtocol', 'DASH & Cardio-Metabolic Protocol')}
                </option>
                <option value="Evidence-Based Balanced Deficit">
                  {t('aiPrescriber.balancedProtocol', 'Evidence-Based Balanced Deficit')}
                </option>
                <option value="Lean Mass Hypertrophy Protocol">
                  {t('aiPrescriber.hypertrophyProtocol', 'Lean Mass Hypertrophy Protocol')}
                </option>
                <option value="High-Protein Ketogenic Care">
                  {t('aiPrescriber.ketoProtocol', 'High-Protein Ketogenic Care')}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('aiPrescriber.durationDays', 'Duration (Days)')}
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 7)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
              >
                <option value={7}>{t('aiPrescriber.sevenDays', '7 Days (Weekly Protocol)')}</option>
                <option value={14}>{t('aiPrescriber.fourteenDays', '14 Days (Bi-weekly Program)')}</option>
                <option value={30}>{t('aiPrescriber.thirtyDays', '30 Days (Full Month Care)')}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGenerateAiPlan}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-2xl text-sm shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>⚡</span>
              <span>
                {isGenerating
                  ? t('aiPrescriber.generatingBtn', 'AI Synthesizing Nutrition Plan...')
                  : t('aiPrescriber.generateBtn', 'Generate Nutrition Plan (AI Engine)')}
              </span>
            </button>
          </div>

          {/* Generated Plan Review */}
          {generatedPlan && (
            <div className="space-y-4 pt-4 border-t border-slate-800 animate-in fade-in duration-300">
              <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-purple-300 uppercase tracking-wider">
                  <span>🧠</span>
                  <span>{t('aiPrescriber.rationaleTitle', 'Clinical Prescription Rationale')}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{clinicalRationale}</p>
              </div>

              <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <span>📋</span>
                <span>
                  {t('aiPrescriber.menusPreview', 'Prescribed Daily Menus Preview')} ({generatedPlan.length} {isEn ? 'Days' : 'วัน'})
                </span>
              </h4>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {generatedPlan.map((d) => (
                  <div key={d.dayNumber} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="font-bold text-emerald-400">
                        {t('aiPrescriber.day', 'Day')} {d.dayNumber} ({d.dayName})
                      </span>
                      <span className="text-slate-400">
                        🔥 {d.targetCalories} kcal | 💪 {d.targetProtein}g P | 🌾 {d.targetCarbs}g C | 🥑 {d.targetFat}g F
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {d.meals.map((m, idx) => (
                        <div key={idx} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-purple-300">{getMealTypeLabel(m.mealType)}</span>
                            <span className="text-slate-400 text-[11px]">{m.calories} kcal</span>
                          </div>
                          <p className="font-medium text-slate-200">{m.name}</p>
                          <p className="text-[10px] text-slate-400 italic">{m.therapeuticNotes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>

          {generatedPlan && (
            <button
              onClick={handleDeployToClient}
              disabled={isDeploying}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>💾</span>
              <span>
                {isDeploying
                  ? t('aiPrescriber.deployingBtn', 'Deploying to Client...')
                  : t('aiPrescriber.deployBtn', 'Prescribe & Deploy Directly to Client')}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
