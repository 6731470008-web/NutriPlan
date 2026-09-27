'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { userService, authService } from '@/services/nutriServices';

interface UserProfileModalProps {
  onClose: () => void;
  onProfileUpdated?: (updatedName: string) => void;
}

export function UserProfileModal({ onClose, onProfileUpdated }: UserProfileModalProps) {
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [userRole, setUserRole] = useState<string>('Client');
  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  // Client metrics
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [age, setAge] = useState<number>(25);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [gender, setGender] = useState<string>('Male');
  const [activityLevel, setActivityLevel] = useState<string>('ModeratelyActive');
  const [healthConditions, setHealthConditions] = useState<string>('');
  const [foodAllergies, setFoodAllergies] = useState<string>('');

  // Nutritionist fields
  const [specialization, setSpecialization] = useState<string>('General Nutrition');
  const [licenseNumber, setLicenseNumber] = useState<string>('');

  // Security / Password fields
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);

  // States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await userService.getMyProfile();
        if (profile) {
          setUserRole(profile.role || 'Client');
          setEmail(profile.email || '');
          setFullName(profile.fullName || '');
          if (profile.age) setAge(profile.age);
          if (profile.dateOfBirth) setDateOfBirth(profile.dateOfBirth);
          if (profile.weightKg) setWeightKg(profile.weightKg);
          if (profile.heightCm) setHeightCm(profile.heightCm);
          if (profile.gender) setGender(profile.gender);
          if (profile.activityLevel) setActivityLevel(profile.activityLevel);
          if (profile.healthConditions) setHealthConditions(profile.healthConditions);
          if (profile.foodAllergies) setFoodAllergies(profile.foodAllergies);
          if (profile.specialization) setSpecialization(profile.specialization);
          if (profile.licenseNumber) setLicenseNumber(profile.licenseNumber);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        // Fallback to local storage
        const storedName = localStorage.getItem('nutriplan_user_name');
        const storedEmail = localStorage.getItem('nutriplan_user_email');
        const storedRole = localStorage.getItem('nutriplan_user_role');
        if (storedName) setFullName(storedName);
        if (storedEmail) setEmail(storedEmail);
        if (storedRole) setUserRole(storedRole);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    setDateOfBirth(dob);
    if (dob) {
      const birth = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 12 && calculatedAge <= 120) {
        setAge(calculatedAge);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToastMessage(null);

    try {
      await userService.updateMyProfile({
        fullName,
        age,
        weightKg,
        heightCm,
        gender,
        activityLevel,
        healthConditions,
        foodAllergies,
        dateOfBirth: dateOfBirth || undefined,
        specialization,
        licenseNumber
      });

      localStorage.setItem('nutriplan_user_name', fullName);
      if (onProfileUpdated) onProfileUpdated(fullName);

      setToastMessage({
        text: t('userProfile.saveSuccess', 'Profile updated successfully!'),
        type: 'success'
      });

      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || (isEn ? 'Failed to update profile.' : 'บันทึกข้อมูลไม่สำเร็จ');
      setToastMessage({ text: errMsg, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);

    if (newPassword !== confirmPassword) {
      setToastMessage({
        text: t('userProfile.passwordMismatch', 'New passwords do not match.'),
        type: 'error'
      });
      return;
    }

    if (newPassword.length < 8) {
      setToastMessage({
        text: isEn ? 'Password must be at least 8 characters long.' : 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร',
        type: 'error'
      });
      return;
    }

    setIsSaving(true);

    try {
      await authService.changePassword(currentPassword, newPassword);
      setToastMessage({
        text: t('userProfile.passwordSuccess', 'Password changed successfully!'),
        type: 'success'
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setToastMessage(null);
      }, 3500);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || (isEn ? 'Failed to change password.' : 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาตรวจสอบรหัสผ่านปัจจุบัน');
      setToastMessage({ text: errMsg, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const isNutritionist = userRole === 'Nutritionist';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl text-emerald-400">
              ⚙️
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                {t('userProfile.title', 'Profile & Account Settings')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('userProfile.subtitle', 'Manage your body metrics, dietary preferences & account security')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-3 gap-2">
          <button
            onClick={() => { setActiveTab('profile'); setToastMessage(null); }}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>👤</span>
            <span>{t('userProfile.profileTab', 'Personal Profile')}</span>
          </button>
          <button
            onClick={() => { setActiveTab('security'); setToastMessage(null); }}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'security'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🔒</span>
            <span>{t('userProfile.securityTab', 'Password & Security')}</span>
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className={`p-3 text-xs font-semibold flex items-center justify-between border-b ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}>
            <span>{toastMessage.type === 'success' ? '✅ ' : '⚠️ '}{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              {t('common.loading', 'Loading profile...')}
            </div>
          ) : activeTab === 'profile' ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('userProfile.fullName', 'Full Name')} <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('userProfile.email', 'Email Address')}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                      {t('userProfile.verified', 'Verified')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client Specific Profile */}
              {!isNutritionist ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {t('userProfile.dateOfBirth', 'Date of Birth')}
                      </label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={handleDobChange}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {t('userProfile.age', 'Age (yrs)')} <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="12"
                        max="120"
                        required
                        value={age}
                        onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {t('userProfile.weightKg', 'Weight (kg)')} <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="30"
                        max="350"
                        required
                        value={weightKg}
                        onChange={(e) => setWeightKg(parseFloat(e.target.value) || 70)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {t('userProfile.heightCm', 'Height (cm)')} <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="250"
                        required
                        value={heightCm}
                        onChange={(e) => setHeightCm(parseFloat(e.target.value) || 175)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {t('userProfile.gender', 'Gender')}
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Male">{t('userProfile.male', 'Male')}</option>
                        <option value="Female">{t('userProfile.female', 'Female')}</option>
                        <option value="Other">{t('userProfile.other', 'Other')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {t('userProfile.activityLevel', 'Activity Level')}
                      </label>
                      <select
                        value={activityLevel}
                        onChange={(e) => setActivityLevel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Sedentary">{t('userProfile.sedentary', 'Sedentary (Little or no exercise)')}</option>
                        <option value="LightlyActive">{t('userProfile.lightlyActive', 'Lightly Active (1-3 days/week)')}</option>
                        <option value="ModeratelyActive">{t('userProfile.moderatelyActive', 'Moderately Active (3-5 days/week)')}</option>
                        <option value="VeryActive">{t('userProfile.veryActive', 'Very Active (6-7 days/week)')}</option>
                        <option value="ExtraActive">{t('userProfile.extraActive', 'Extra Active (Physical job/training)')}</option>
                      </select>
                    </div>
                  </div>


                  {/* Health Conditions & Food Allergies */}
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        🎯 {t('userProfile.healthConditions', 'Health Considerations & Goals')}
                      </label>
                      <input
                        type="text"
                        value={healthConditions}
                        onChange={(e) => setHealthConditions(e.target.value)}
                        placeholder={t('userProfile.healthConditionsPlaceholder', 'e.g., Weight loss, low sodium, lactose intolerance...')}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        ⚠️ {t('userProfile.foodAllergies', 'Food Allergies & Exclusions')}
                      </label>
                      <input
                        type="text"
                        value={foodAllergies}
                        onChange={(e) => setFoodAllergies(e.target.value)}
                        placeholder={t('userProfile.foodAllergiesPlaceholder', 'e.g., Peanuts, shellfish, dairy...')}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Nutritionist Specific Profile */
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      🎓 {t('userProfile.specialization', 'Specialization')}
                    </label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      📜 {t('userProfile.licenseNumber', 'License Number / Specialist Code')}
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <span>💾</span>
                  <span>{isSaving ? t('userProfile.saving', 'Saving...') : t('userProfile.saveChanges', 'Save Profile Changes')}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Security & Password Tab */
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md mx-auto">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-1 text-slate-400 mb-2">
                <p className="font-bold text-slate-200">🛡️ {t('userProfile.securityTab', 'Password & Security Policy')}</p>
                <p>{t('userProfile.passwordRequirements', 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number.')}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t('userProfile.currentPassword', 'Current Password')} <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                  >
                    {showCurrentPass ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t('userProfile.newPassword', 'New Password')} <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                  >
                    {showNewPass ? '👁️' : '🙈'}
                  </button>
                </div>

                {/* Password strength visual indicators */}
                {newPassword && (
                  <div className="grid grid-cols-4 gap-1 mt-2 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded text-center font-semibold ${newPassword.length >= 8 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                      8+ chars
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-center font-semibold ${/[A-Z]/.test(newPassword) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                      Uppercase
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-center font-semibold ${/[a-z]/.test(newPassword) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                      Lowercase
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-center font-semibold ${/[0-9]/.test(newPassword) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
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
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔒</span>
                  <span>{isSaving ? t('userProfile.updatingPassword', 'Updating...') : t('userProfile.changePasswordBtn', 'Update Password')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
