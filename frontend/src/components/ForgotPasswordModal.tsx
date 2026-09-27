'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { authService } from '@/services/nutriServices';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function ForgotPasswordModal({ onClose, onSuccess }: ForgotPasswordModalProps) {
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const [step, setStep] = useState<'verifyEmail' | 'setNewPassword' | 'success'>('verifyEmail');
  const [email, setEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setStep('setNewPassword');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || (isEn ? 'No account found with this email address.' : 'ไม่พบบัญชีผู้ใช้ที่ลงทะเบียนด้วยอีเมลนี้');
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg(t('userProfile.passwordMismatch', 'New passwords do not match.'));
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg(isEn ? 'Password must be at least 8 characters long.' : 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(email.trim().toLowerCase(), newPassword);
      setStep('success');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || (isEn ? 'Failed to reset password.' : 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-7 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-lg text-emerald-400">
              🔑
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">
                {t('userProfile.resetPasswordTitle', 'Reset Your Password')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {step === 'verifyEmail'
                  ? t('userProfile.resetPasswordSubtitle', 'Enter your email to verify and set a new password')
                  : step === 'setNewPassword'
                  ? (isEn ? 'Create a strong new password for your account' : 'กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ')
                  : (isEn ? 'Password updated successfully' : 'อัปเดตรหัสผ่านใหม่เรียบร้อยแล้ว')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl mb-4 flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Step 1: Verify Email */}
        {step === 'verifyEmail' && (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('userProfile.email', 'Email Address')} <span className="text-emerald-400">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., user@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🔍</span>
                <span>{isLoading ? t('userProfile.verifyingEmail', 'Verifying...') : t('userProfile.verifyEmail', 'Verify Email')}</span>
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Set New Password */}
        {step === 'setNewPassword' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs flex items-center justify-between">
              <span className="text-slate-400 truncate">{email}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                ✓ {t('userProfile.verified', 'Verified')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('userProfile.newPassword', 'New Password')} <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                >
                  {showPass ? '👁️' : '🙈'}
                </button>
              </div>

              {/* Password strength indicators */}
              {newPassword && (
                <div className="grid grid-cols-4 gap-1 mt-1.5 text-[10px]">
                  <span className={`px-1 py-0.5 rounded text-center font-semibold ${newPassword.length >= 8 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                    8+ chars
                  </span>
                  <span className={`px-1 py-0.5 rounded text-center font-semibold ${/[A-Z]/.test(newPassword) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                    Uppercase
                  </span>
                  <span className={`px-1 py-0.5 rounded text-center font-semibold ${/[a-z]/.test(newPassword) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                    Lowercase
                  </span>
                  <span className={`px-1 py-0.5 rounded text-center font-semibold ${/[0-9]/.test(newPassword) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                    Number
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('userProfile.confirmPassword', 'Confirm New Password')} <span className="text-emerald-400">*</span>
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setStep('verifyEmail')}
                className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                ← {isEn ? 'Back' : 'ย้อนกลับ'}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🔒</span>
                <span>{isLoading ? t('userProfile.resetting', 'Resetting...') : t('userProfile.resetBtn', 'Set New Password')}</span>
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success State */}
        {step === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-2xl rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-bounce">
              ✓
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-100">
                {isEn ? 'Password Reset Complete!' : 'รีเซ็ตรหัสผ่านสำเร็จ!'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {t('userProfile.resetSuccess', 'Password reset successfully! You can now sign in with your new password.')}
              </p>
            </div>
            <button
              onClick={() => {
                if (onSuccess) onSuccess();
                onClose();
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg cursor-pointer"
            >
              {isEn ? 'Sign In Now →' : 'เข้าสู่ระบบตอนนี้ →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
