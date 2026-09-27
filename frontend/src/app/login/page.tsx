'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/nutriServices';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authService.login({ email, password });
      localStorage.setItem('nutriplan_jwt_token', res.token);
      localStorage.setItem('nutriplan_user_role', res.role);
      localStorage.setItem('nutriplan_user_id', res.userId);
      localStorage.setItem('nutriplan_user_name', res.fullName || res.email);
      localStorage.setItem('nutriplan_user_email', res.email || '');

      if (res.role === 'Admin') {
        router.push('/dashboard/admin');
      } else if (res.role === 'Nutritionist') {
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

  const handleDemoLogin = async (role: 'Admin' | 'Nutritionist' | 'Client') => {
    setIsLoading(true);
    setError(null);

    const credentials = {
      Admin: {
        email: 'admin@admin.com',
        password: '00000000',
        id: 'admin-0000-0000-0000',
        name: 'ดร. สมชาย ภักดีโภชน (System Admin)',
        route: '/dashboard/admin'
      },
      Nutritionist: {
        email: 'nutritionist@test.com',
        password: '00000000',
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Dr. Sarah Connor, RDN',
        route: '/dashboard/nutritionist'
      },
      Client: {
        email: 'client@test.com',
        password: '00000000',
        id: '22222222-2222-2222-2222-222222222222',
        name: 'สมศักดิ์ สุขภาพดี (John Doe)',
        route: '/dashboard/client'
      }
    }[role];

    try {
      const res = await authService.login({ email: credentials.email, password: credentials.password });
      localStorage.setItem('nutriplan_jwt_token', res.token);
      localStorage.setItem('nutriplan_user_role', res.role);
      localStorage.setItem('nutriplan_user_id', res.userId);
      localStorage.setItem('nutriplan_user_name', res.fullName || credentials.name);
      localStorage.setItem('nutriplan_user_email', res.email || credentials.email);
      if (role === 'Nutritionist') {
        localStorage.setItem('nutriplan_sub_tier', 'pro');
      }

      router.push(credentials.route);
    } catch {
      // ✅ Security Fix: No offline bypass — require valid server authentication
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อหรือสถานะบริการหลังบ้าน (Server Connection Error)');
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
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
              >
                {t('auth.forgotPassword', 'Forgot password?')}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950 py-3 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        {/* 1-Click Quick Academic Role Switchers */}
        <div className="mt-6 pt-6 border-t border-slate-700/80">
          <p className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            ⚡ Quick Academic Evaluation Login
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleDemoLogin('Admin')}
              className="bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 text-xs py-2 px-1 rounded-lg font-bold transition-all text-center"
            >
              👑 Admin
            </button>
            <button
              onClick={() => handleDemoLogin('Nutritionist')}
              className="bg-blue-950/60 hover:bg-blue-900/80 border border-blue-500/40 text-blue-300 text-xs py-2 px-1 rounded-lg font-bold transition-all text-center"
            >
              🩺 Nutritionist
            </button>
            <button
              onClick={() => handleDemoLogin('Client')}
              className="bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs py-2 px-1 rounded-lg font-bold transition-all text-center"
            >
              👤 Client
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          {t('auth.dontHaveAccount')}{' '}
          <a href="/register" className="text-emerald-400 hover:underline">
            {t('auth.registerHere')}
          </a>
        </p>
      </div>

      {showForgotModal && (
        <ForgotPasswordModal
          onClose={() => setShowForgotModal(false)}
          onSuccess={() => {
            // Optional callback
          }}
        />
      )}
    </div>
  );
}

