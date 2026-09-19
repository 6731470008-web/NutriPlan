'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center p-1 bg-slate-900 border border-slate-700/80 rounded-xl shadow-inner text-xs font-medium">
      <button
        type="button"
        onClick={() => setLanguage('th')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-200 ${
          language === 'th'
            ? 'bg-emerald-500 text-slate-950 font-bold shadow'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
        title="ภาษาไทย"
      >
        <span>🇹🇭</span>
        <span>TH</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-200 ${
          language === 'en'
            ? 'bg-emerald-500 text-slate-950 font-bold shadow'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
        title="English"
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
}
