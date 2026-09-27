'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SubscriptionModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function SubscriptionModal({ onClose, onSuccess }: SubscriptionModalProps) {
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const [isPro, setIsPro] = useState(false);
  const [userRole, setUserRole] = useState<string>('Client');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const tier = localStorage.getItem('nutriplan_sub_tier');
    const role = localStorage.getItem('nutriplan_user_role') || 'Client';
    setIsPro(tier === 'pro');
    setUserRole(role);
  }, []);

  const isNutritionist = userRole === 'Nutritionist';

  const handleToggleTier = () => {
    const newTier = isPro ? 'free' : 'pro';
    localStorage.setItem('nutriplan_sub_tier', newTier);
    setIsPro(!isPro);
    const msg = !isPro
      ? (isNutritionist
          ? (isEn ? '🎉 Upgraded to Clinical Pro Specialist Suite!' : '🎉 อัปเกรดเป็นแพ็กเกจ Clinical Pro Suite เรียบร้อยแล้ว!')
          : (isEn ? '🎉 Upgraded to NutriPlan Pro Wellness Tier!' : '🎉 อัปเกรดเป็นแพ็กเกจ NutriPlan Pro เรียบร้อยแล้ว!'))
      : (isNutritionist
          ? (isEn ? 'Switched to Standard Practitioner.' : 'เปลี่ยนเป็นแพ็กเกจ Standard Practitioner เรียบร้อยแล้ว')
          : (isEn ? 'Switched to Free Starter Tier.' : 'เปลี่ยนเป็นแพ็กเกจ Free เรียบร้อยแล้ว'));
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      if (onSuccess) onSuccess();
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{isNutritionist ? '🩺' : '⭐'}</span>
              <h3 className="text-lg font-bold text-slate-100">
                {isNutritionist ? t('subscriptions.practitionerTitle', 'Clinical Practice & Specialist Suite') : t('subscriptions.title', 'Membership & Tier Management')}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isNutritionist ? t('subscriptions.practitionerSubtitle', 'Empower your dietary practice with automated AI clinical prescribing, unlimited capacity & patient risk alerts') : t('subscriptions.subtitle', 'Unlock advanced clinical features and AI-powered insights')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="bg-emerald-500 text-slate-950 font-bold p-3 rounded-xl text-center text-xs shadow-lg animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* Tier Cards Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Free / Standard Tier */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
            !isPro
              ? 'bg-slate-950 border-slate-700 shadow-md ring-1 ring-slate-600'
              : 'bg-slate-950/40 border-slate-800 opacity-60'
          }`}>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Basic</span>
                <h4 className="font-bold text-slate-200 text-base mt-0.5">
                  {isNutritionist ? t('subscriptions.practitionerFreeTier', 'Standard Practitioner') : t('subscriptions.freeTier', 'Free Starter Tier')}
                </h4>
                <p className="text-2xl font-black text-slate-100 mt-2">$0 <span className="text-xs text-slate-500 font-normal">/ month</span></p>
              </div>

              <ul className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-800">
                {isNutritionist ? (
                  <>
                    <li className="flex items-center gap-2">✓ 3 Active Patients Limit</li>
                    <li className="flex items-center gap-2">✓ Manual Meal Plan Builder</li>
                    <li className="flex items-center gap-2">✓ Basic Progress Analytics</li>
                    <li className="flex items-center gap-2 text-slate-600">✕ AI Clinical Diet Prescriber</li>
                    <li className="flex items-center gap-2 text-slate-600">✕ High-Risk Patient Alert Radar</li>
                    <li className="flex items-center gap-2 text-slate-600">✕ Custom Branded Clinic Reports</li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-2">✓ 1 Active Meal Plan</li>
                    <li className="flex items-center gap-2">✓ Daily Calorie Counter</li>
                    <li className="flex items-center gap-2 text-slate-600">✕ AI Food Vision Scanner</li>
                    <li className="flex items-center gap-2 text-slate-600">✕ PDF Clinical Export</li>
                  </>
                )}
              </ul>
            </div>

            {!isPro && (
              <span className="text-center text-xs font-bold text-slate-400 py-1 bg-slate-900 rounded-lg">
                ● {t('subscriptions.currentPlan', 'Current Plan')}
              </span>
            )}
          </div>

          {/* Pro Specialist Tier */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 relative transition-all ${
            isPro
              ? 'bg-gradient-to-b from-amber-950/40 to-slate-900 border-amber-500/50 shadow-xl ring-2 ring-amber-500/30'
              : 'bg-slate-900 border-amber-500/30 hover:border-amber-500/60'
          }`}>
            <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-md uppercase">
              RECOMMENDED
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  {isNutritionist ? '👑 Clinical Specialist Suite' : '👑 Full Platform Access'}
                </span>
                <h4 className="font-bold text-slate-100 text-base mt-0.5">
                  {isNutritionist ? t('subscriptions.practitionerProTier', 'Clinical Pro Specialist Suite') : t('subscriptions.proTier', 'Pro Wellness Tier')}
                </h4>
                <p className="text-2xl font-black text-amber-400 mt-2">
                  {isNutritionist ? '$49' : '$19'} <span className="text-xs text-slate-400 font-normal">/ month</span>
                </p>
              </div>

              <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                {isNutritionist ? (
                  <>
                    <li className="flex items-center gap-2 text-emerald-400">✓ {t('subscriptions.unlimitedPatients', 'Unlimited Active Patients Capacity')}</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ {t('subscriptions.aiPrescriber', 'AI Clinical Diet Prescriber')}</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ {t('subscriptions.riskAlertRadar', 'High-Risk Patient & Deficit Radar')}</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ {t('subscriptions.customBrandedPdf', 'Custom Clinic Branded PDF Reports')}</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ {t('subscriptions.verifiedGoldBadge', 'Verified Gold Specialist Badge')}</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ {t('subscriptions.templateAuthoring', 'Template Library Publishing')}</li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-2 text-emerald-400">✓ {t('subscriptions.unlimitedPlans', 'Unlimited Meal Plans')}</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ {t('subscriptions.aiScanner', 'Gemini Vision AI Scanner')}</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ {t('subscriptions.marketplaceAccess', 'Nutritionist Marketplace')}</li>
                    <li className="flex items-center gap-2 text-emerald-400">✓ {t('subscriptions.clinicalReports', 'PDF Health Progress Exports')}</li>
                  </>
                )}
              </ul>
            </div>

            {isPro ? (
              <span className="text-center text-xs font-bold text-amber-400 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                ✨ Active Pro Subscriber
              </span>
            ) : (
              <button
                onClick={handleToggleTier}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold py-2 rounded-xl text-xs shadow-lg transition-all"
              >
                {t('subscriptions.upgradePro', '⚡ Upgrade to Pro')}
              </button>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <button
            onClick={handleToggleTier}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            {isPro ? 'Switch to Free Tier' : 'Simulate Pro Activation'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors"
          >
            {t('common.cancel', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
