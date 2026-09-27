'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MealPlanDto } from '@/types';

export interface WeightLogEntry {
  id: string;
  date: string;
  weightKg: number;
  note?: string;
}

interface ProgressAnalyticsChartProps {
  clientId: string;
  initialWeight?: number;
  heightCm?: number;
  tdee?: number;
  plans?: MealPlanDto[];
  readOnly?: boolean;
}

export function ProgressAnalyticsChart({
  clientId,
  initialWeight = 70,
  heightCm = 175,
  tdee = 2000,
  plans = [],
  readOnly = false,
}: ProgressAnalyticsChartProps) {
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const [activeTab, setActiveTab] = useState<'weight' | 'calories' | 'projection'>('weight');
  const [weightLogs, setWeightLogs] = useState<WeightLogEntry[]>([]);
  const [targetWeight, setTargetWeight] = useState<number>(() => {
    return initialWeight > 65 ? initialWeight - 5 : initialWeight;
  });

  // Modal / Form state for adding weight
  const [showAddModal, setShowAddModal] = useState(false);
  const [inputDate, setInputDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [inputWeight, setInputWeight] = useState<string>('');
  const [inputNote, setInputNote] = useState<string>('');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; entry: WeightLogEntry } | null>(null);
  const [hoveredBar, setHoveredBar] = useState<{ x: number; y: number; day: string; actual: number; target: number } | null>(null);

  // Storage keys
  const logsStorageKey = `nutriplan_weight_logs_${clientId}`;
  const targetStorageKey = `nutriplan_target_weight_${clientId}`;

  // Load saved weight logs & target
  useEffect(() => {
    if (!clientId) return;

    const savedTarget = localStorage.getItem(targetStorageKey);
    if (savedTarget) {
      setTargetWeight(parseFloat(savedTarget));
    } else {
      setTargetWeight(initialWeight > 60 ? initialWeight - 4 : initialWeight);
    }

    const savedLogs = localStorage.getItem(logsStorageKey);
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWeightLogs(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse weight logs:', e);
      }
    }

    // Initialize with actual registered baseline weight
    const today = new Date();
    const initLog: WeightLogEntry[] = [
      {
        id: `init-${clientId}`,
        date: today.toISOString().split('T')[0],
        weightKg: +(initialWeight.toFixed(1)),
        note: isEn ? 'Starting weight' : 'น้ำหนักเริ่มต้นที่ลงทะเบียน',
      }
    ];
    setWeightLogs(initLog);
    localStorage.setItem(logsStorageKey, JSON.stringify(initLog));
  }, [clientId, initialWeight, logsStorageKey, targetStorageKey, isEn]);

  // Handle save new weight log
  const handleAddWeightLog = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(inputWeight);
    if (isNaN(w) || w <= 20 || w >= 300) return;

    const newEntry: WeightLogEntry = {
      id: `w-${Date.now()}`,
      date: inputDate || new Date().toISOString().split('T')[0],
      weightKg: +(w.toFixed(1)),
      note: inputNote.trim() || undefined,
    };

    const updated = [...weightLogs, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setWeightLogs(updated);
    localStorage.setItem(logsStorageKey, JSON.stringify(updated));

    setInputWeight('');
    setInputNote('');
    setShowAddModal(false);
  };

  const handleDeleteLog = (id: string) => {
    const updated = weightLogs.filter((l) => l.id !== id);
    setWeightLogs(updated);
    localStorage.setItem(logsStorageKey, JSON.stringify(updated));
  };

  const handleUpdateTargetWeight = (val: number) => {
    if (val <= 20 || val >= 300) return;
    setTargetWeight(val);
    localStorage.setItem(targetStorageKey, val.toString());
  };

  // Metrics computation
  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weightKg : initialWeight;
  const startWeight = weightLogs.length > 0 ? weightLogs[0].weightKg : initialWeight;
  const weightDiff = +(currentWeight - startWeight).toFixed(1);
  const toTargetDiff = +(currentWeight - targetWeight).toFixed(1);

  // BMI Calculation
  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? +(currentWeight / (heightM * heightM)).toFixed(1) : 22;
  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { label: isEn ? 'Underweight' : 'น้ำหนักต่ำกว่าเกณฑ์', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
    if (val < 25) return { label: isEn ? 'Normal Weight' : 'น้ำหนักสมส่วน', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
    if (val < 30) return { label: isEn ? 'Overweight' : 'น้ำหนักเกินเกณฑ์', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
    return { label: isEn ? 'Obese' : 'โรคอ้วน', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' };
  };
  const bmiCat = getBmiCategory(bmi);

  // Calorie history computation from plans or daily menus
  const dailyCalorieStats = useMemo(() => {
    const stats: { dayLabel: string; date: string; actual: number; target: number; deficit: number }[] = [];
    const today = new Date();

    if (plans && plans.length > 0) {
      const allMenus = plans.flatMap((p) => p.dailyMenus || []);
      if (allMenus.length > 0) {
        allMenus.slice(0, 10).forEach((menu, idx) => {
          const actual = menu.totalCalories || 0;
          const target = menu.targetCalories > 0 ? menu.targetCalories : tdee;
          const deficit = target - actual;
          stats.push({
            dayLabel: `${isEn ? 'Day' : 'วัน'} ${menu.dayNumber || idx + 1}`,
            date: `Day ${menu.dayNumber || idx + 1}`,
            actual: Math.round(actual),
            target: Math.round(target),
            deficit: Math.round(deficit),
          });
        });
      }
    }

    // Fallback recent 7 days if no plan days found
    if (stats.length === 0) {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayName = d.toLocaleDateString(isEn ? 'en-US' : 'th-TH', { weekday: 'short' });
        const target = tdee > 0 ? tdee : 2000;
        const actual = Math.round(target - (300 + Math.sin(i) * 150));
        stats.push({
          dayLabel: dayName,
          date: d.toISOString().split('T')[0],
          actual,
          target,
          deficit: target - actual,
        });
      }
    }
    return stats;
  }, [plans, tdee, isEn]);

  const avgDeficit = Math.round(
    dailyCalorieStats.reduce((acc, s) => acc + s.deficit, 0) / (dailyCalorieStats.length || 1)
  );

  // Goal projection calculation
  // 7700 kcal deficit = ~1 kg weight loss
  const weeklyLossKg = avgDeficit > 0 ? +((avgDeficit * 7) / 7700).toFixed(2) : 0.45;
  const kgRemaining = Math.max(0, currentWeight - targetWeight);
  const weeksToGoal = weeklyLossKg > 0 ? Math.ceil(kgRemaining / weeklyLossKg) : 8;
  const projectedGoalDate = new Date();
  projectedGoalDate.setDate(projectedGoalDate.getDate() + weeksToGoal * 7);

  // SVG Chart Dimensions for Weight Line Chart
  const svgWidth = 600;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;

  const chartInnerWidth = svgWidth - padLeft - padRight;
  const chartInnerHeight = svgHeight - padTop - padBottom;

  const weights = weightLogs.map((l) => l.weightKg);
  const allWeights = [...weights, targetWeight];
  const minW = Math.max(0, Math.floor(Math.min(...allWeights) - 2));
  const maxW = Math.ceil(Math.max(...allWeights) + 2);
  const rangeW = maxW - minW || 1;

  const points = weightLogs.map((entry, idx) => {
    const x = padLeft + (idx / Math.max(1, weightLogs.length - 1)) * chartInnerWidth;
    const y = padTop + chartInnerHeight - ((entry.weightKg - minW) / rangeW) * chartInnerHeight;
    return { x, y, entry };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x},${padTop + chartInnerHeight} L ${points[0].x},${padTop + chartInnerHeight} Z`
    : '';

  const targetY = padTop + chartInnerHeight - ((targetWeight - minW) / rangeW) * chartInnerHeight;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xl relative overflow-hidden">
      {/* Glow decorative effect */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>📈</span>
            <span>{t('analytics.title', 'Progress & Health Analytics')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('analytics.subtitle', 'Historical trends, weight milestones & caloric balance')}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('weight')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'weight'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📉 {t('analytics.weightTrend', 'Weight Trend')}
          </button>
          <button
            onClick={() => setActiveTab('calories')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'calories'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 {t('analytics.calorieBalance', 'Caloric Balance')}
          </button>
          <button
            onClick={() => setActiveTab('projection')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'projection'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎯 {t('analytics.goalProjection', 'Projection')}
          </button>
        </div>
      </div>

      {/* TAB 1: WEIGHT TREND */}
      {activeTab === 'weight' && (
        <div className="space-y-6">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {t('analytics.currentWeight', 'Current')}
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{currentWeight} <span className="text-xs font-normal text-slate-400">kg</span></p>
              <div className="mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${bmiCat.color} font-medium`}>
                  BMI {bmi} ({bmiCat.label})
                </span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {t('analytics.targetWeight', 'Target')}
              </p>
              <p className="text-xl sm:text-2xl font-black text-blue-400 mt-1">{targetWeight} <span className="text-xs font-normal text-slate-400">kg</span></p>
              <p className="text-[10px] text-slate-500 mt-1">
                {toTargetDiff > 0 ? `-${toTargetDiff} kg ${isEn ? 'to goal' : 'ถึงเป้า'}` : `🎯 ${isEn ? 'Goal reached!' : 'ถึงเป้าหมายแล้ว!'}`}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {t('analytics.weightChange', 'Total Change')}
              </p>
              <p className={`text-xl sm:text-2xl font-black mt-1 ${weightDiff <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {weightDiff > 0 ? `+${weightDiff}` : `${weightDiff}`} <span className="text-xs font-normal text-slate-400">kg</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {isEn ? 'From start' : 'จากเริ่มต้น'} ({startWeight} kg)
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center flex flex-col justify-center">
              {!readOnly ? (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full h-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg p-2 flex flex-col items-center justify-center transition-all group"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">➕</span>
                  <span className="text-xs font-bold mt-1">{t('analytics.logWeight', '+ Log Weight')}</span>
                </button>
              ) : (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">{t('analytics.daysLogged', 'Logged')}</p>
                  <p className="text-xl font-bold text-slate-200 mt-1">{weightLogs.length} {isEn ? 'records' : 'ครั้ง'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Interactive SVG Line Chart */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-5 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                {isEn ? 'Weight Progression Curve' : 'เส้นกราฟพัฒนาการน้ำหนัก'}
              </span>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-blue-400 inline-block border-b border-dashed border-blue-400" />
                  {t('analytics.targetWeight', 'Target')} ({targetWeight} kg)
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-48 sm:h-56 select-none">
                <defs>
                  <linearGradient id="weightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = padTop + chartInnerHeight * ratio;
                  const labelVal = Math.round(maxW - ratio * rangeW);
                  return (
                    <g key={i}>
                      <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#334155" strokeWidth="0.75" strokeDasharray="3,3" />
                      <text x={padLeft - 8} y={y + 3} fill="#64748b" fontSize="10" textAnchor="end">
                        {labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Target Weight Reference Line */}
                {targetY >= padTop && targetY <= padTop + chartInnerHeight && (
                  <g>
                    <line
                      x1={padLeft}
                      y1={targetY}
                      x2={svgWidth - padRight}
                      y2={targetY}
                      stroke="#60a5fa"
                      strokeWidth="1.5"
                      strokeDasharray="5,4"
                    />
                    <text x={svgWidth - padRight - 5} y={targetY - 5} fill="#60a5fa" fontSize="10" textAnchor="end" fontWeight="bold">
                      🎯 {targetWeight} kg
                    </text>
                  </g>
                )}

                {/* Area under curve */}
                {areaD && <path d={areaD} fill="url(#weightGrad)" />}

                {/* Line Path */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Points */}
                {points.map((pt, i) => (
                  <g key={i} className="cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill="#0f172a"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      className="hover:r-7 transition-all"
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {/* X-axis labels */}
                    <text
                      x={pt.x}
                      y={svgHeight - 12}
                      fill="#64748b"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      {new Date(pt.entry.date).toLocaleDateString(isEn ? 'en-US' : 'th-TH', { month: 'numeric', day: 'numeric' })}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Hover Tooltip */}
              {hoveredPoint && (
                <div
                  className="absolute bg-slate-900/95 border border-emerald-500/50 p-2 rounded-lg text-xs shadow-xl pointer-events-none z-10 -translate-x-1/2 -translate-y-full mb-2"
                  style={{
                    left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                    top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                  }}
                >
                  <p className="font-bold text-emerald-400">{hoveredPoint.entry.weightKg} kg</p>
                  <p className="text-[10px] text-slate-400">{hoveredPoint.entry.date}</p>
                  {hoveredPoint.entry.note && (
                    <p className="text-[10px] text-slate-300 italic mt-0.5">"{hoveredPoint.entry.note}"</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Historical Logs List & Target Modifier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Weight Logs Table */}
            <div className="md:col-span-2 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                📋 {t('analytics.weightLogs', 'Weight History')} ({weightLogs.length})
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {weightLogs.slice().reverse().map((log) => (
                  <div key={log.id} className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400">{log.date}</span>
                      <span className="font-bold text-emerald-400">{log.weightKg} kg</span>
                      {log.note && <span className="text-slate-500 italic text-[11px] truncate max-w-[140px]">{log.note}</span>}
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="text-slate-500 hover:text-rose-400 text-[11px] px-1.5 py-0.5 rounded transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Target Weight Quick Setter */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  🎯 {t('analytics.targetWeightLabel', 'Set Goal Weight')}
                </h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  {isEn ? 'Adjust your ideal target weight to recalculate timeline projection.' : 'ปรับเป้าหมายน้ำหนักเพื่อคำนวณระยะเวลาการบรรลุเป้าหมาย'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={targetWeight}
                    onChange={(e) => handleUpdateTargetWeight(parseFloat(e.target.value) || targetWeight)}
                    disabled={readOnly}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-bold text-center focus:border-blue-400 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 font-bold">kg</span>
                </div>
              </div>

              <div className="mt-4 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-300">
                💡 {isEn ? `Healthy target is 18.5 - 24.9 BMI range.` : `เกณฑ์สุขภาพดีอยู่ที่ช่วง BMI 18.5 - 24.9`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CALORIC BALANCE */}
      {activeTab === 'calories' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {t('analytics.targetCalLabel', isEn ? 'Daily Target' : 'เป้าหมายพลังงานต่อวัน')}
              </p>
              <p className="text-xl sm:text-2xl font-black text-blue-400 mt-1">{tdee} <span className="text-xs font-normal text-slate-400">kcal</span></p>
              <p className="text-[10px] text-slate-500 mt-1">{isEn ? 'Daily maintenance' : 'พลังงานเผาผลาญต่อวัน'}</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {t('analytics.dailyDeficit', 'Avg Deficit/Surplus')}
              </p>
              <p className={`text-xl sm:text-2xl font-black mt-1 ${avgDeficit >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {avgDeficit >= 0 ? `-${avgDeficit}` : `+${Math.abs(avgDeficit)}`} <span className="text-xs font-normal text-slate-400">kcal/d</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {avgDeficit >= 0 ? t('analytics.deficitLabel', 'Calorie Deficit') : t('analytics.surplusLabel', 'Calorie Surplus')}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {isEn ? 'Est. Fat Loss Rate' : 'อัตราการเผาผลาญไขมัน'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{weeklyLossKg} <span className="text-xs font-normal text-slate-400">kg/{t('analytics.weeks', 'wk')}</span></p>
              <p className="text-[10px] text-slate-500 mt-1">{isEn ? 'Based on caloric deficit' : 'คำนวณจากการขาดดุลพลังงาน'}</p>
            </div>
          </div>

          {/* Calorie Bar Chart */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-300">
                📊 {t('analytics.weeklyAvgIntake', 'Daily Caloric Balance vs Target')}
              </span>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-sm inline-block" />
                  {t('analytics.actualCalLabel', 'Intake')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-blue-400 rounded-sm inline-block" />
                  {t('analytics.targetCalLabel', 'Target')}
                </span>
              </div>
            </div>

            {/* SVG Bar Chart */}
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 600 200" className="w-full h-48 select-none">
                {/* Horizontal reference lines */}
                {[0, 0.33, 0.66, 1].map((ratio, i) => {
                  const y = 20 + 140 * ratio;
                  const maxCal = Math.max(3000, tdee * 1.3);
                  const calVal = Math.round(maxCal - ratio * maxCal);
                  return (
                    <g key={i}>
                      <line x1="45" y1={y} x2="570" y2={y} stroke="#334155" strokeWidth="0.75" strokeDasharray="3,3" />
                      <text x="38" y={y + 3} fill="#64748b" fontSize="9" textAnchor="end">
                        {calVal}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {dailyCalorieStats.map((stat, i) => {
                  const barGroupWidth = 525 / dailyCalorieStats.length;
                  const x = 50 + i * barGroupWidth;
                  const maxCal = Math.max(3000, tdee * 1.3);

                  const actualHeight = Math.min(140, (stat.actual / maxCal) * 140);
                  const targetHeight = Math.min(140, (stat.target / maxCal) * 140);

                  const actualY = 160 - actualHeight;
                  const targetY = 160 - targetHeight;

                  return (
                    <g key={i} className="cursor-pointer">
                      {/* Target Bar (Slim/Outlined) */}
                      <rect
                        x={x + 4}
                        y={targetY}
                        width={barGroupWidth * 0.35}
                        height={targetHeight}
                        fill="#3b82f6"
                        opacity="0.4"
                        rx="3"
                      />
                      {/* Actual Intake Bar */}
                      <rect
                        x={x + barGroupWidth * 0.4}
                        y={actualY}
                        width={barGroupWidth * 0.4}
                        height={actualHeight}
                        fill={stat.actual <= stat.target ? '#10b981' : '#f59e0b'}
                        rx="3"
                        onMouseEnter={() => setHoveredBar({ x: x + 20, y: actualY, day: stat.dayLabel, actual: stat.actual, target: stat.target })}
                        onMouseLeave={() => setHoveredBar(null)}
                      />
                      {/* Day Label */}
                      <text
                        x={x + barGroupWidth * 0.4}
                        y="180"
                        fill="#94a3b8"
                        fontSize="9"
                        textAnchor="middle"
                      >
                        {stat.dayLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {hoveredBar && (
                <div
                  className="absolute bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs shadow-xl pointer-events-none z-10 -translate-x-1/2 -translate-y-full mb-2"
                  style={{ left: `${(hoveredBar.x / 600) * 100}%`, top: `${(hoveredBar.y / 200) * 100}%` }}
                >
                  <p className="font-bold text-slate-100">{hoveredBar.day}</p>
                  <p className="text-emerald-400">Actual: {hoveredBar.actual} kcal</p>
                  <p className="text-blue-400">Target: {hoveredBar.target} kcal</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROJECTION & MILESTONES */}
      {activeTab === 'projection' && (
        <div className="space-y-6">
          {/* Milestone Banner */}
          <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                🎯 {t('analytics.projectedDate', 'Projected Target Date')}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-100 mt-1">
                {projectedGoalDate.toLocaleDateString(isEn ? 'en-US' : 'th-TH', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isEn
                  ? `At ~${weeklyLossKg} kg/week pace, you will reach your ${targetWeight} kg goal in approximately ${weeksToGoal} weeks.`
                  : `ด้วยอัตราลด ~${weeklyLossKg} กก./สัปดาห์ คุณจะถึงเป้าหมาย ${targetWeight} กก. ในเวลาประมาณ ${weeksToGoal} สัปดาห์`}
              </p>
            </div>

            <div className="text-center bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 min-w-[120px]">
              <p className="text-xs text-slate-400">{t('analytics.estTimeToGoal', 'Est. Timeline')}</p>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">{weeksToGoal}</p>
              <p className="text-[10px] text-slate-500">{t('analytics.weeks', 'weeks')}</p>
            </div>
          </div>

          {/* Gamified Health Milestones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-4 rounded-xl border ${weightLogs.length >= 3 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-slate-950/40 border-slate-800 text-slate-500'}`}>
              <div className="text-2xl mb-1">🔥</div>
              <h4 className="font-bold text-sm text-slate-100">{isEn ? 'Logging Habit' : 'วินัยการบันทึก'}</h4>
              <p className="text-xs mt-1 text-slate-400">
                {weightLogs.length >= 3 ? (isEn ? '✅ 3+ days recorded' : '✅ บันทึกต่อเนื่อง 3 ครั้งขึ้นไป') : (isEn ? 'Log 3 times to unlock' : 'บันทึกครบ 3 ครั้งเพื่อปลดล็อก')}
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${avgDeficit > 0 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-slate-950/40 border-slate-800 text-slate-500'}`}>
              <div className="text-2xl mb-1">⚖️</div>
              <h4 className="font-bold text-sm text-slate-100">{isEn ? 'Deficit Master' : 'คุมสมดุลพลังงาน'}</h4>
              <p className="text-xs mt-1 text-slate-400">
                {avgDeficit > 0 ? (isEn ? '✅ Maintained calorie deficit' : '✅ รักษาการขาดดุลพลังงานสม่ำเสมอ') : (isEn ? 'Maintain target' : 'คุมแคลอรี่ตามเป้าหมาย')}
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${toTargetDiff <= 0 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-slate-950/40 border-slate-800 text-slate-500'}`}>
              <div className="text-2xl mb-1">🏆</div>
              <h4 className="font-bold text-sm text-slate-100">{isEn ? 'Goal Champion' : 'แชมเปี้ยนเป้าหมาย'}</h4>
              <p className="text-xs mt-1 text-slate-400">
                {toTargetDiff <= 0 ? (isEn ? '🏆 Goal Weight Achieved!' : '🏆 บรรลุน้ำหนักเป้าหมายสำเร็จ!') : `${toTargetDiff} kg ${isEn ? 'remaining' : 'ที่เหลือ'}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Log Weight Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <span>⚖️</span>
                <span>{t('analytics.logWeight', '+ Log Weight')}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWeightLog} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('analytics.date', 'Date')}
                </label>
                <input
                  type="date"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {t('analytics.enterWeight', 'Weight (kg)')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 68.5"
                  value={inputWeight}
                  onChange={(e) => setInputWeight(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isEn ? 'Note (Optional)' : 'บันทึกเพิ่มเติม (ไม่บังคับ)'}
                </label>
                <input
                  type="text"
                  placeholder={isEn ? 'e.g. Morning fasting weight' : 'เช่น ชั่งตอนเช้าก่อนทานอาหาร'}
                  value={inputNote}
                  onChange={(e) => setInputNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
                >
                  {t('analytics.saveEntry', 'Save Entry')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
