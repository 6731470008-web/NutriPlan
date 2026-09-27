'use client';

import React from 'react';
import Link from 'next/link';

export interface NutriPlanLogoProps {
  variant?: 'full' | 'icon' | 'compact' | 'stacked';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light' | 'auto';
  showTagline?: boolean;
  linkToHome?: boolean;
  className?: string;
  onClick?: () => void;
}

export function NutriPlanLogo({
  variant = 'compact',
  size = 'md',
  theme = 'dark',
  showTagline = false,
  linkToHome = false,
  className = '',
  onClick,
}: NutriPlanLogoProps) {
  // Determine size dimensions for the icon mark
  const iconSizeMap = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 52,
    xl: 68,
  };

  const textClassMap = {
    xs: 'text-base',
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const taglineSizeMap = {
    xs: 'text-[8px] tracking-widest',
    sm: 'text-[9px] tracking-wider',
    md: 'text-[10px] tracking-widest',
    lg: 'text-xs tracking-widest',
    xl: 'text-sm tracking-[0.2em]',
  };

  const iconDim = iconSizeMap[size] || 40;
  const isLight = theme === 'light';

  // SVG Icon Vector Element
  const renderIconMark = () => (
    <svg
      width={iconDim}
      height={iconDim}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_2px_8px_rgba(16,185,129,0.25)]"
    >
      <defs>
        {/* Primary Leaf & Health Gradient */}
        <linearGradient id="np-icon-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="40%" stopColor="#10b981" />
          <stop offset="85%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>

        {/* Crown Leaf Tip Gradient */}
        <linearGradient id="np-icon-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Glass Base Gradient */}
        <linearGradient id="np-glass-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isLight ? '#f1f5f9' : '#0f172a'} />
          <stop offset="100%" stopColor={isLight ? '#e2e8f0' : '#020617'} />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Background */}
      <rect
        x="1"
        y="1"
        width="42"
        height="42"
        rx="12"
        fill="url(#np-glass-bg)"
        stroke={isLight ? '#cbd5e1' : '#1e293b'}
        strokeWidth="1.5"
      />

      {/* Ambient Radial Core Light */}
      <circle cx="22" cy="22" r="14" fill="#10b981" opacity={isLight ? 0.12 : 0.15} />

      {/* Monogram Symbol "N" + Nutrition Sprout */}
      <g transform="translate(7.5, 7.5)">
        {/* Left Vertical Stem */}
        <rect x="3" y="9.5" width="4.5" height="17" rx="2.25" fill="url(#np-icon-grad)" />

        {/* Diagonal Dynamic Bridge */}
        <path
          d="M5.5 10.5 C6.5 10.5 8 11.5 9.5 14 L18.5 24.5 C19.5 25.5 21 25.5 21.5 24.5 L21.5 11.5 C21.5 9.8 19.8 8.8 18.2 8.8 C16.5 8.8 15.5 9.8 15.5 11.5 L15.5 18 L10.5 10.5 C9 8.8 7.2 8.5 5.5 9 Z"
          fill="url(#np-icon-grad)"
        />

        {/* Right Vertical Stem */}
        <rect x="17.5" y="10.5" width="4.5" height="16" rx="2.25" fill="url(#np-icon-grad)" />

        {/* Sprouting Nutri-Leaf Crown */}
        <path
          d="M20 9.5 C20 3.5 26.5 1.5 27 1.5 C27 2 27 8.5 22 10.2 C21 10.4 20 10.1 20 9.5 Z"
          fill="url(#np-icon-leaf)"
        />
        <path
          d="M20.5 9 C23 7 25 5 26.5 2.5"
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* Nutrition Vitality Sparkle Dot */}
        <circle cx="5.25" cy="5.5" r="1.75" fill="#6ee7b7" />
        <circle cx="5.25" cy="5.5" r="0.75" fill="#ffffff" />
      </g>
    </svg>
  );

  // Text Typography
  const renderText = () => (
    <div className={`flex flex-col leading-none ${variant === 'stacked' ? 'items-center text-center mt-2.5' : ''}`}>
      <span className={`font-black tracking-tight ${textClassMap[size]}`}>
        <span className={isLight ? 'text-slate-900' : 'text-slate-100'}>Nutri</span>
        <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent ml-0.5">
          Plan
        </span>
      </span>
      {(showTagline || variant === 'full' || variant === 'stacked') && (
        <span
          className={`font-bold uppercase text-slate-400/90 mt-1 select-none ${taglineSizeMap[size]}`}
        >
          Nutrition &amp; Meal Planner
        </span>
      )}
    </div>
  );

  const content = (
    <div
      onClick={onClick}
      className={`inline-flex group select-none transition-all ${
        variant === 'stacked'
          ? 'flex-col items-center justify-center'
          : 'items-center gap-3'
      } ${className}`}
    >
      {renderIconMark()}
      {variant !== 'icon' && renderText()}
    </div>
  );

  if (linkToHome) {
    const getHomeHref = () => {
      if (typeof window === 'undefined') return '/login';
      const role = localStorage.getItem('nutriplan_user_role');
      if (role === 'Admin') return '/dashboard/admin';
      if (role === 'Nutritionist') return '/dashboard/nutritionist';
      if (role === 'Client') return '/dashboard/client';
      return '/login';
    };

    return (
      <Link href={getHomeHref()} className="inline-flex cursor-pointer focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}

export default NutriPlanLogo;
