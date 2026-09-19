'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/nutriServices';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authService.login({ email, password });
      localStorage.setItem('nutriplan_jwt_token', res.token);
      localStorage.setItem('nutriplan_user_role', res.role);
      localStorage.setItem('nutriplan_user_id', res.userId);

      if (res.role === 'Nutritionist') {
        router.push('/dashboard/nutritionist');
      } else {
        router.push('/dashboard/client');
      }
    } catch (err: any) {
      let failureReason = '';
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error;
      const statusCode = err?.response?.status;

      if (err?.code === 'ERR_NETWORK' || !err?.response) {
        failureReason = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือสถานะบริการหลังบ้าน (Network Connection Error)';
      } else if (statusCode >= 500) {
        // Security protection: Hide internal server error stacktraces/codes from UI
        failureReason = 'ระบบเกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง หรือติดต่อผู้ดูแลระบบ (Internal System Error)';
      } else if (typeof serverMessage === 'string') {
        // Sanitize any accidental C# stacktraces or internal code messages
        const isInternalTrace = serverMessage.includes('Exception') || serverMessage.includes('at ') || serverMessage.includes('Npgsql') || serverMessage.includes('System.');
        if (isInternalTrace) {
          failureReason = 'ระบบเกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง (Internal System Error)';
        } else if (serverMessage.toLowerCase().includes('invalid email or password')) {
          failureReason = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง';
        } else {
          failureReason = serverMessage;
        }
      } else {
        failureReason = t('auth.loginFailed');
      }

      setError(failureReason);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-400">{t('auth.loginTitle')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/90 border border-red-500/80 text-red-200 text-xs rounded-xl p-4 flex items-start gap-3 shadow-lg">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <div className="flex-1">
              <h4 className="font-bold text-red-400 text-xs uppercase tracking-wider mb-1">
                {t('common.cancel') === 'Cancel' ? 'Login Failed' : 'เข้าสู่ระบบไม่สำเร็จ'}
              </h4>
              <p className="text-red-200/90 leading-relaxed font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
              {t('common.email')}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
              {t('common.password')}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950 py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          {t('auth.dontHaveAccount')}{' '}
          <a href="/register" className="text-emerald-400 hover:underline">
            {t('auth.registerHere')}
          </a>
        </p>
      </div>
    </div>
  );
}
