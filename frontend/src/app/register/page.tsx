'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/nutriServices';
import { UserRole, ActivityLevel, Gender } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [role, setRole] = useState<UserRole>('Client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('1999-05-15');
  const [weightKg, setWeightKg] = useState<number>(70);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [gender, setGender] = useState<Gender>('Male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('ModeratelyActive');
  const [healthConditions, setHealthConditions] = useState('');
  const [foodAllergies, setFoodAllergies] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('Sports Nutrition');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to calculate age automatically from Date of Birth
  const calculateAgeFromDOB = (dobString: string): number => {
    if (!dobString) return 25;
    const birthDate = new Date(dobString);
    const today = new Date();
    let computedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      computedAge--;
    }
    return Math.max(0, computedAge);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const calculatedAge = calculateAgeFromDOB(dateOfBirth);
      const payload = {
        email,
        password,
        fullName,
        role,
        ...(role === 'Client' ? { age: calculatedAge, dateOfBirth, weightKg, heightCm, activityLevel, gender, healthConditions, foodAllergies } : { licenseNumber, specialization })
      };

      const res = await authService.register(payload);
      localStorage.setItem('nutriplan_jwt_token', res.token);
      localStorage.setItem('nutriplan_user_role', res.role);
      localStorage.setItem('nutriplan_user_id', res.userId);
      localStorage.setItem('nutriplan_user_name', res.fullName || res.email);
      localStorage.setItem('nutriplan_user_email', res.email || '');

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
        failureReason = 'ระบบเกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง หรือติดต่อผู้ดูแลระบบ (Internal System Error)';
      } else if (typeof serverMessage === 'string') {
        const isInternalTrace = serverMessage.includes('Exception') || serverMessage.includes('at ') || serverMessage.includes('Npgsql') || serverMessage.includes('System.');
        if (isInternalTrace) {
          failureReason = 'ระบบเกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง (Internal System Error)';
        } else if (serverMessage.toLowerCase().includes('already registered')) {
          failureReason = 'อีเมลนี้ถูกลงทะเบียนแล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ';
        } else {
          failureReason = serverMessage;
        }
      } else {
        failureReason = t('auth.registrationFailed');
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

      <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <a
            href="/login"
            className="inline-flex items-center text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors bg-slate-900/80 hover:bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 shadow-sm"
          >
            <svg className="w-3.5 h-3.5 mr-1.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('auth.backToLogin')}
          </a>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-emerald-400">{t('auth.registerTitle')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('auth.registerSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/90 border border-red-500/80 text-red-200 text-xs rounded-xl p-4 flex items-start gap-3 shadow-lg">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <div className="flex-1">
              <h4 className="font-bold text-red-400 text-xs uppercase tracking-wider mb-1">
                {t('common.cancel') === 'Cancel' ? 'Registration Failed' : 'ลงทะเบียนไม่สำเร็จ'}
              </h4>
              <p className="text-red-200/90 leading-relaxed font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">{t('auth.accountRole')}</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="Client">{t('auth.clientRole')}</option>
              <option value="Nutritionist">{t('auth.nutritionistRole')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">{t('auth.fullName')}</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">{t('common.email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">{t('common.password')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm"
            />
          </div>

          {role === 'Client' ? (
            <div className="space-y-3 border-t border-slate-700 pt-3">
              <p className="text-xs text-emerald-400 font-semibold uppercase">
                {t('common.cancel') === 'Cancel' ? 'Client Body Metrics & Activity' : 'ข้อมูลทางกายภาพและระดับกิจกรรม'}
              </p>
              
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] text-slate-400">
                      {t('common.cancel') === 'Cancel' ? '🎂 Date of Birth' : '🎂 วัน/เดือน/ปีเกิด'}
                    </label>
                    {dateOfBirth && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                        อายุ {calculateAgeFromDOB(dateOfBirth)} ปี
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t('auth.weightKg')}</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{t('auth.heightCm')}</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {t('common.cancel') === 'Cancel' ? 'Gender' : 'เพศ'}
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Male">{t('common.cancel') === 'Cancel' ? 'Male' : '👨 ชาย'}</option>
                    <option value="Female">{t('common.cancel') === 'Cancel' ? 'Female' : '👩 หญิง'}</option>
                    <option value="Other">{t('common.cancel') === 'Cancel' ? 'Other' : '👤 อื่นๆ'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  {t('common.cancel') === 'Cancel' ? 'Activity Level' : 'ระดับการออกกำลังกาย / กิจกรรมประจำวัน'}
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="Sedentary">
                    {t('common.cancel') === 'Cancel' ? '🛋️ Sedentary / Desk Job' : '🛋️ นั่งทำงานอยู่กับที่ / ไม่ค่อยออกกำลังกาย'}
                  </option>
                  <option value="LightlyActive">
                    {t('common.cancel') === 'Cancel' ? '🚶 Lightly Active (1-3 days/week)' : '🚶 ออกกำลังกายเบาๆ 1-3 วัน/สัปดาห์'}
                  </option>
                  <option value="ModeratelyActive">
                    {t('common.cancel') === 'Cancel' ? '🏃 Moderately Active (3-5 days/week)' : '🏃 ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์'}
                  </option>
                  <option value="VeryActive">
                    {t('common.cancel') === 'Cancel' ? '🏋️ Very Active (6-7 days/week)' : '🏋️ ออกกำลังกายหนัก 6-7 วัน/สัปดาห์'}
                  </option>
                  <option value="ExtraActive">
                    {t('common.cancel') === 'Cancel' ? '🚴 Extra Active / Heavy Training' : '🚴 ออกกำลังกายหนักมาก / นักกีฬา'}
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">
                    {t('common.cancel') === 'Cancel' ? 'Medical / Health Conditions' : '🩺 โรคประจำตัว (ถ้ามี)'}
                  </label>
                  <input
                    type="text"
                    value={healthConditions}
                    onChange={(e) => setHealthConditions(e.target.value)}
                    placeholder="เช่น เบาหวาน, ความดันสูง, เกาต์..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-amber-400 font-medium mb-1">
                    {t('common.cancel') === 'Cancel' ? 'Food Allergies & Sensitivities' : '⚠️ อาหาร/สารอาหารที่แพ้ (ถ้ามี)'}
                  </label>
                  <input
                    type="text"
                    value={foodAllergies}
                    onChange={(e) => setFoodAllergies(e.target.value)}
                    placeholder="เช่น ถั่วลิสง, อาหารทะเล, นมวัว, กุ้ง..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 border-t border-slate-700 pt-3">
              <p className="text-xs text-emerald-400 font-semibold uppercase">{t('auth.nutritionistCredentials')}</p>
              <div>
                <label className="block text-xs text-slate-400">{t('auth.licenseNumber')}</label>
                <input
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
                  placeholder="LIC-998877"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400">{t('auth.specialization')}</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 text-sm"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 font-semibold text-slate-950 py-3 rounded-lg transition-colors mt-4"
          >
            {isLoading ? t('auth.creatingAccount') : t('auth.register')}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          {t('auth.alreadyHaveAccount')}{' '}
          <a href="/login" className="text-emerald-400 hover:underline font-semibold">
            {t('auth.loginHere')}
          </a>
        </p>
      </div>
    </div>
  );
}
