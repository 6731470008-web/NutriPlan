'use client';

import React, { useState, useEffect } from 'react';
import { fitnessService } from '@/services/nutriServices';
import { FitnessConnectionDto, DailyActivitySummaryDto } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface FitnessDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSynced?: () => void;
}

interface DeviceBrand {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  description: string;
}

const SUPPORTED_DEVICES: DeviceBrand[] = [
  { id: 'GARMIN', name: 'Garmin', category: 'GPS & Multisport', icon: '🧭', color: 'from-blue-600 to-cyan-600', description: 'Forerunner, Fenix, Epix, Venu' },
  { id: 'APPLE', name: 'Apple Watch', category: 'Apple Health', icon: '⌚', color: 'from-slate-700 to-slate-900', description: 'Series, Ultra, SE' },
  { id: 'SAMSUNG', name: 'Samsung Health', category: 'Galaxy Watch', icon: '⚡', color: 'from-indigo-600 to-blue-700', description: 'Galaxy Watch 4/5/6/7' },
  { id: 'COROS', name: 'Coros', category: 'Running & Trail', icon: '⛰️', color: 'from-orange-600 to-amber-600', description: 'Pace 2/3, Apex, Vertix' },
  { id: 'SUUNTO', name: 'Suunto', category: 'Outdoor & Dive', icon: '🧭', color: 'from-red-600 to-rose-700', description: 'Race, Vertical, 9 Peak' },
  { id: 'POLAR', name: 'Polar', category: 'Heart Rate & Sport', icon: '❤️', color: 'from-sky-600 to-blue-600', description: 'Vantage, Pacer, H10 Strap' },
  { id: 'FITBIT', name: 'Fitbit', category: 'Daily Steps & Sleep', icon: '🔋', color: 'from-teal-600 to-emerald-600', description: 'Sense, Versa, Charge, Inspire' },
  { id: 'WITHINGS', name: 'Withings', category: 'Smart Scale & Watch', icon: '⚖️', color: 'from-emerald-700 to-teal-800', description: 'Body Scan, ScanWatch' },
];

export function FitnessDevicesModal({ isOpen, onClose, onDataSynced }: FitnessDevicesModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [activeTab, setActiveTab] = useState<'free_bridges' | 'simulator' | 'guide'>('free_bridges');
  const [connections, setConnections] = useState<FitnessConnectionDto[]>([]);
  const [recentActivities, setRecentActivities] = useState<DailyActivitySummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Simulator Form State
  const [simDate, setSimDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [simSteps, setSimSteps] = useState<number>(8540);
  const [simActiveKcal, setSimActiveKcal] = useState<number>(460);
  const [simTotalKcal, setSimTotalKcal] = useState<number>(2150);
  const [simAvgHeartRate, setSimAvgHeartRate] = useState<number>(74);
  const [simSleepHours, setSimSleepHours] = useState<number>(7.5);
  const [simDevice, setSimDevice] = useState<string>('Garmin Forerunner 265');
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [connList, actList] = await Promise.all([
        fitnessService.getConnections(),
        fitnessService.getDailySummary()
      ]);
      setConnections(connList);
      setRecentActivities(actList);
    } catch (err) {
      console.error('Failed to load fitness data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectDirect = async (provider: 'strava' | 'fitbit') => {
    setIsConnecting(true);
    setStatusMessage(null);

    try {
      const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/client` : '';
      const res = await fitnessService.getOAuthUrl(provider, redirectUri);

      if (!res.isConfigured) {
        setStatusMessage({
          text: isEn
            ? `${res.note || 'API credentials not configured.'} Check the "Free Setup Guide" tab for 1-minute setup instructions, or test instantly in the "Sync Simulator" tab!`
            : `${res.note || 'ยังไม่ได้ระบุ Client ID ในระบบ'} ดูวิธีสมัครรับ Key ฟรี 100% ได้ที่แท็บ "วิธีตั้งค่าฟรี" หรือทดสอบได้ทันทีในแท็บ "ทดสอบจำลองส่งข้อมูล"!`,
          type: 'info'
        });
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch {
      setStatusMessage({
        text: isEn ? 'Failed to initiate OAuth connection.' : 'เกิดข้อผิดพลาดในการเชื่อมต่อ OAuth',
        type: 'error'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTriggerSync = async (provider: 'strava' | 'fitbit') => {
    setIsConnecting(true);
    try {
      const res = await fitnessService.triggerSync(provider);
      if (res.success) {
        setStatusMessage({
          text: isEn ? res.message : `ซิงก์ข้อมูลจาก ${provider.toUpperCase()} เรียบร้อยแล้ว!`,
          type: 'success'
        });
        await loadData();
        if (onDataSynced) onDataSynced();
      } else {
        setStatusMessage({
          text: isEn ? res.message : `ไม่สามารถซิงก์ได้: ${res.message}`,
          type: 'error'
        });
      }
    } catch {
      setStatusMessage({ text: isEn ? 'Sync request failed.' : 'เกิดข้อผิดพลาดในการซิงก์', type: 'error' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (connId: string) => {
    if (!confirm(isEn ? 'Disconnect this device from NutriPlan?' : 'ต้องการยกเลิกการเชื่อมต่ออุปกรณ์นี้ออกจาก NutriPlan ใช่หรือไม่?')) return;
    try {
      await fitnessService.disconnect(connId);
      setStatusMessage({ text: isEn ? 'Device disconnected.' : 'ยกเลิกการเชื่อมต่ออุปกรณ์เรียบร้อย', type: 'info' });
      await loadData();
      if (onDataSynced) onDataSynced();
    } catch {
      setStatusMessage({ text: isEn ? 'Failed to disconnect.' : 'ไม่สามารถยกเลิกการเชื่อมต่อได้', type: 'error' });
    }
  };

  const handleRunMockSync = async (mode: 'custom' | 'quick' | 'cardio' | 'rest') => {
    setIsSimulating(true);
    try {
      let payload = {
        date: simDate,
        steps: simSteps,
        activeCaloriesBurned: simActiveKcal,
        totalCaloriesBurned: simTotalKcal,
        averageHeartRate: simAvgHeartRate,
        restingHeartRate: 62,
        sleepHours: simSleepHours,
        distanceMeters: +(simSteps * 0.75).toFixed(1),
        sourceDevice: simDevice
      };

      if (mode === 'cardio') {
        payload = {
          ...payload,
          steps: 12500,
          activeCaloriesBurned: 720,
          totalCaloriesBurned: 2450,
          averageHeartRate: 88,
          sleepHours: 8.0,
          distanceMeters: 9400,
          sourceDevice: 'Garmin Forerunner (via Strava)'
        };
      } else if (mode === 'rest') {
        payload = {
          ...payload,
          steps: 3200,
          activeCaloriesBurned: 180,
          totalCaloriesBurned: 1850,
          averageHeartRate: 66,
          sleepHours: 8.5,
          distanceMeters: 2200,
          sourceDevice: 'Apple Watch Ultra'
        };
      }

      await fitnessService.mockSync(payload);
      setStatusMessage({
        text: isEn ? 'Data synced successfully! Dashboard updated.' : 'ซิงก์ข้อมูลสุขภาพสำเร็จ! แดชบอร์ดได้รับการอัปเดตแล้ว',
        type: 'success'
      });
      await loadData();
      if (onDataSynced) onDataSynced();
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: isEn ? 'Failed to sync data.' : 'เกิดข้อผิดพลาดในการซิงก์ข้อมูล', type: 'error' });
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) return null;

  const stravaConn = connections.find(c => c.deviceProvider === 'STRAVA' && c.isActive);
  const fitbitConn = connections.find(c => c.deviceProvider === 'FITBIT' && c.isActive);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-500 flex items-center justify-center text-xl shadow-lg shadow-orange-500/20">
              ⌚
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {isEn ? 'Smartwatch & Fitness Wearables' : 'อุปกรณ์และนาฬิกาออกกำลังกาย'}
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  100% Free
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isEn 
                  ? 'Connect Garmin, Apple Watch, Samsung, Fitbit & more without paid subscriptions' 
                  : 'เชื่อมต่อ Garmin, Apple Watch, Samsung, Fitbit ฟรีตลอดชีพโดยไม่ต้องเสียค่าบริการ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('free_bridges')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'free_bridges'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🌐</span>
            <span>{isEn ? 'Universal Free Bridges' : 'สะพานเชื่อมฟรี (Free Bridges)'}</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full font-bold">Recommended</span>
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'simulator'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🧪</span>
            <span>{isEn ? 'Sync Simulator' : 'ทดสอบจำลองส่งข้อมูล'}</span>
            <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.2 rounded-full font-bold">Instant</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📖</span>
            <span>{isEn ? 'Free Setup Guide' : 'วิธีตั้งค่าฟรี 1 นาที'}</span>
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`mx-4 mt-3 p-3 rounded-xl text-xs flex items-center justify-between border ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
              : statusMessage.type === 'error'
              ? 'bg-red-950/40 border-red-500/30 text-red-300'
              : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
          }`}>
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {activeTab === 'free_bridges' ? (
            <div className="space-y-4">
              
              {/* Highlight Card 1: STRAVA (Universal Multisport Bridge) */}
              <div className="bg-gradient-to-br from-orange-950/40 via-slate-900 to-slate-950 border border-orange-500/30 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-2xl text-white shadow-lg shadow-orange-600/30 shrink-0">
                      🚴
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white">Strava Open API</h3>
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold">
                          Universal Bridge (ฟรี 100%)
                        </span>
                      </div>
                      <p className="text-xs text-orange-200/80 mt-1 font-medium">
                        {isEn
                          ? 'Covers Garmin, Apple Watch, Samsung Galaxy Watch, Coros, Suunto & Polar'
                          : 'รองรับทั้ง Garmin, Apple Watch, Samsung, Coros, Suunto, Polar ผ่านการซิงก์อัตโนมัติ'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        {isEn
                          ? 'Syncs actual workout calories, heart rate, distance, and duration directly into NutriPlan.'
                          : 'ดึงแคลอรี่ที่เผาผลาญจริงจากการวิ่ง ปั่น ปั่นจักรยาน เวทเทรนนิ่ง และคาร์ดิโอ มาคำนวณ TDEE แบบแม่นยำ'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                    {stravaConn ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          Connected
                        </span>
                        <button
                          onClick={() => handleTriggerSync('strava')}
                          disabled={isConnecting}
                          className="text-xs px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all shadow"
                        >
                          {isConnecting ? '...' : (isEn ? 'Sync Now' : 'ซิงก์เดี๋ยวนี้')}
                        </button>
                        <button
                          onClick={() => handleDisconnect(stravaConn.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-medium ml-1"
                        >
                          {isEn ? 'Disconnect' : 'ยกเลิก'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConnectDirect('strava')}
                        disabled={isConnecting}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2"
                      >
                        <span>🔗</span>
                        <span>{isEn ? 'Connect with Strava' : 'เชื่อมต่อด้วย Strava (ฟรี)'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                  <span>รองรับ: Garmin Connect, Apple Health, Samsung Health, Coros App</span>
                  <button onClick={() => setActiveTab('guide')} className="text-orange-400 hover:underline">
                    {isEn ? 'How to get free API keys →' : 'วิธีรับ API Key ฟรี 100% →'}
                  </button>
                </div>
              </div>

              {/* Highlight Card 2: FITBIT / GOOGLE HEALTH (24/7 Steps & Sleep) */}
              <div className="bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-950 border border-teal-500/30 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-2xl text-white shadow-lg shadow-teal-600/30 shrink-0">
                      🔋
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white">Fitbit / Google Health API</h3>
                        <span className="text-[10px] bg-teal-500/20 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold">
                          Daily Steps & Sleep (ฟรี 100%)
                        </span>
                      </div>
                      <p className="text-xs text-teal-200/80 mt-1 font-medium">
                        {isEn
                          ? 'Covers Fitbit Trackers, Google Pixel Watch & WearOS'
                          : 'สำหรับอุปกรณ์ Fitbit ทุกรุ่น, Google Pixel Watch และสมาร์ตวอทช์ Wear OS'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        {isEn
                          ? 'Syncs all-day step counts, resting heart rate, and sleep duration for complete lifestyle tracking.'
                          : 'ซิงก์จำนวนก้าวเดิน 24 ชม., อัตราการเต้นหัวใจขณะพัก และคุณภาพการนอนหลับ'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                    {fitbitConn ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          Connected
                        </span>
                        <button
                          onClick={() => handleTriggerSync('fitbit')}
                          disabled={isConnecting}
                          className="text-xs px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow"
                        >
                          {isConnecting ? '...' : (isEn ? 'Sync Now' : 'ซิงก์เดี๋ยวนี้')}
                        </button>
                        <button
                          onClick={() => handleDisconnect(fitbitConn.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-medium ml-1"
                        >
                          {isEn ? 'Disconnect' : 'ยกเลิก'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConnectDirect('fitbit')}
                        disabled={isConnecting}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-2"
                      >
                        <span>🔗</span>
                        <span>{isEn ? 'Connect with Fitbit' : 'เชื่อมต่อด้วย Fitbit (ฟรี)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Supported Device Matrix */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-2">
                  <span>📱</span>
                  <span>{isEn ? 'Devices Supported Through These Free Bridges' : 'อุปกรณ์ที่รองรับผ่านระบบเชื่อมต่อฟรีนี้'}</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SUPPORTED_DEVICES.map(d => (
                    <div key={d.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 flex items-center gap-2">
                      <span className="text-lg">{d.icon}</span>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-200 truncate">{d.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{d.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : activeTab === 'simulator' ? (
            /* Simulator Tab */
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>{isEn ? 'Interactive Watch Simulator (1-Click Test)' : 'เครื่องจำลองกิจกรรมนาฬิกา (ทดสอบระบบได้ทันที)'}</span>
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isEn
                    ? 'Test your dashboard right now without connecting external APIs! Click a preset below to see how NutriPlan recalculates your Dynamic TDEE based on workout burn.'
                    : 'ทดสอบระบบได้ทันทีโดยไม่ต้องผูกบัญชีจริง! กดเลือกกิจกรรมด้านล่างเพื่อดูระบบคำนวณ Dynamic TDEE และแสดงกราฟกิจกรรม'}
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-medium">{isEn ? 'Presets:' : 'กิจกรรมสำเร็จรูป:'}</span>
                <button
                  type="button"
                  onClick={() => handleRunMockSync('cardio')}
                  disabled={isSimulating}
                  className="px-3 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-xs text-orange-300 border border-orange-500/40 font-semibold transition-all"
                >
                  🏃 {isEn ? 'Heavy Run (12.5k steps, 720 kcal)' : 'วิ่งมาราธอน/คาร์ดิโอ (12,500 ก้าว, +720 kcal)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRunMockSync('rest')}
                  disabled={isSimulating}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-xs text-blue-300 border border-blue-500/40 font-semibold transition-all"
                >
                  🛋️ {isEn ? 'Rest Day (3.2k steps, 180 kcal)' : 'วันพักผ่อนทั่วไป (3,200 ก้าว, +180 kcal)'}
                </button>
              </div>

              {/* Custom Form */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{isEn ? 'Date' : 'วันที่'}</label>
                  <input
                    type="date"
                    value={simDate}
                    onChange={(e) => setSimDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{isEn ? 'Device Name' : 'ชื่ออุปกรณ์'}</label>
                  <input
                    type="text"
                    value={simDevice}
                    onChange={(e) => setSimDevice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{isEn ? 'Steps Count' : 'จำนวนก้าวเดิน'}</label>
                  <input
                    type="number"
                    value={simSteps}
                    onChange={(e) => setSimSteps(+e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{isEn ? 'Active Burned (kcal)' : 'แคลอรี่เผาผลาญ (kcal)'}</label>
                  <input
                    type="number"
                    value={simActiveKcal}
                    onChange={(e) => setSimActiveKcal(+e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{isEn ? 'Average Heart Rate (bpm)' : 'ชีพจรเฉลี่ย (bpm)'}</label>
                  <input
                    type="number"
                    value={simAvgHeartRate}
                    onChange={(e) => setSimAvgHeartRate(+e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{isEn ? 'Sleep (Hours)' : 'เวลานอนหลับ (ชม.)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={simSleepHours}
                    onChange={(e) => setSimSleepHours(+e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRunMockSync('custom')}
                disabled={isSimulating}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>{isSimulating ? (isEn ? 'Syncing...' : 'กำลังส่งข้อมูล...') : (isEn ? 'Send Data to NutriPlan' : 'ส่งข้อมูลเข้าสู่ระบบ')}</span>
              </button>
            </div>
          ) : (
            /* Guide Tab */
            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-orange-400 flex items-center gap-2">
                  <span>🚴</span> 1. วิธีรับ Strava API Key (ฟรี 100% ใน 1 นาที)
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                  <li>เข้าเว็บ <a href="https://developers.strava.com" target="_blank" rel="noreferrer" className="text-orange-400 underline font-semibold">developers.strava.com</a> แล้วล็อกอินด้วยบัญชี Strava ของคุณ</li>
                  <li>คลิกปุ่ม <b>"Create App"</b></li>
                  <li>กรอกชื่อแอป เช่น <code>NutriPlan</code></li>
                  <li>ระบุ <b>Authorization Callback Domain:</b> <code>localhost</code> (หรือโดเมนเว็บจริงของคุณ)</li>
                  <li>ระบบจะให้ <b>Client ID</b> และ <b>Client Secret</b> ทันที (ฟรีตลอดชีพ ไม่ต้องกรอกบัตรเครดิต)</li>
                  <li>นำค่ามาใส่ในไฟล์ <code>.env</code> ของ NutriPlan:</li>
                </ol>
                <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-[11px] text-emerald-400 border border-slate-800">
                  STRAVA_CLIENT_ID=your_client_id<br/>
                  STRAVA_CLIENT_SECRET=your_client_secret
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-teal-400 flex items-center gap-2">
                  <span>🔋</span> 2. วิธีรับ Fitbit API Key (ฟรี 100%)
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                  <li>เข้าเว็บ <a href="https://dev.fitbit.com/apps/new" target="_blank" rel="noreferrer" className="text-teal-400 underline font-semibold">dev.fitbit.com/apps/new</a></li>
                  <li>เลือก OAuth 2.0 Application Type เป็น <b>Personal</b> (ฟรี ไม่จำกัด)</li>
                  <li>ใส่ Callback URL: <code>http://localhost:3000/dashboard/client</code></li>
                  <li>คัดลอก Client ID & Secret ใส่ใน <code>.env</code>:</li>
                </ol>
                <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-[11px] text-emerald-400 border border-slate-800">
                  FITBIT_CLIENT_ID=your_fitbit_client_id<br/>
                  FITBIT_CLIENT_SECRET=your_fitbit_client_secret
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex justify-between items-center text-[11px] text-slate-500">
          <span>Zero-Cost Architecture • OAuth 2.0 Direct Bridge</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            {isEn ? 'Close' : 'ปิด'}
          </button>
        </div>

      </div>
    </div>
  );
}
