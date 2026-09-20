'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { userService } from '@/services/nutriServices';

interface UserHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
}

export function UserHeader({ title, subtitle, showBack, backHref }: UserHeaderProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const loadUserInfo = async () => {
      let storedName = localStorage.getItem('nutriplan_user_name');
      let storedRole = localStorage.getItem('nutriplan_user_role');
      const token = localStorage.getItem('nutriplan_jwt_token');

      if (storedName) setUserName(storedName);
      if (storedRole) setUserRole(storedRole);

      // If token exists but storedName is missing, fetch profile from backend
      if (token && (!storedName || storedName === 'undefined')) {
        try {
          const profile = await userService.getMyProfile();
          if (profile) {
            const name = profile.fullName || profile.email;
            setUserName(name);
            setUserRole(profile.role);
            localStorage.setItem('nutriplan_user_name', name);
            localStorage.setItem('nutriplan_user_role', profile.role);
            localStorage.setItem('nutriplan_user_email', profile.email);
          }
        } catch (err) {
          console.error('Failed to load user profile in header:', err);
        }
      }
    };

    loadUserInfo();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      const role = localStorage.getItem('nutriplan_user_role');
      router.push(role === 'Client' ? '/dashboard/client' : '/dashboard/nutritionist');
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'Nutritionist') return 'นักโภชนาการ';
    if (role === 'Client') return 'ผู้รับบริการ';
    if (role === 'Admin') return 'ผู้ดูแลระบบ';
    return role;
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 mb-8 gap-4">
      <div className="flex items-center gap-4">
        {showBack && (
          <button
            onClick={handleBack}
            className="text-xs font-semibold text-slate-300 hover:text-emerald-400 bg-slate-900 border border-slate-700 hover:border-emerald-500/50 px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
          >
            ← {t('common.backToDashboard')}
          </button>
        )}
        {title && (
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">{title}</h1>
            {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-end">
        {userName && (
          <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-100 leading-tight">{userName}</p>
              {userRole && (
                <p className="text-[10px] text-emerald-400/90 font-medium leading-none mt-0.5">
                  {getRoleLabel(userRole)}
                </p>
              )}
            </div>
          </div>
        )}

        <LanguageSwitcher />

        <button
          onClick={handleLogout}
          className="bg-slate-900 hover:bg-red-950/80 hover:border-red-500/60 text-slate-300 hover:text-red-200 text-xs px-3.5 py-2 rounded-lg border border-slate-700 font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          title="ออกจากระบบ / Logout"
        >
          <svg className="w-4 h-4 text-slate-400 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {t('common.logout')}
        </button>
      </div>
    </header>
  );
}
