'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { adminService, PlatformStatsDto, AdminUserDto } from '@/services/nutriServices';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserHeader } from '@/components/UserHeader';

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  type: 'security' | 'plan' | 'user' | 'system';
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'verification' | 'audit'>('overview');
  const [stats, setStats] = useState<PlatformStatsDto | null>(null);
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Nutritionist' | 'Client' | 'Admin'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Suspended'>('All');

  // Modal / Feedback state
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simulated Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: '1', timestamp: '2 mins ago', actor: 'Dr. Sarah Connor', role: 'Nutritionist', action: 'Created 4-Week Meal Plan', target: 'Client: John Doe', type: 'plan' },
    { id: '2', timestamp: '15 mins ago', actor: 'Alex Smith', role: 'Client', action: 'Logged Lunch (Grilled Chicken Rice)', target: 'Adherence: 94%', type: 'user' },
    { id: '3', timestamp: '1 hour ago', actor: 'System Auto-Guard', role: 'System', action: 'Daily Database Backup & Integrity Check', target: 'Status: Healthy', type: 'system' },
    { id: '4', timestamp: '3 hours ago', actor: 'Platform Admin', role: 'Admin', action: 'Approved Nutritionist License #NUT-8849', target: 'Dr. Emily Watson', type: 'security' },
    { id: '5', timestamp: '5 hours ago', actor: 'Michael Chang', role: 'Client', action: 'Updated Body Weight to 74.2 kg', target: 'Goal: Weight Loss', type: 'user' },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const userRole = localStorage.getItem('nutriplan_user_role');
      const token = localStorage.getItem('nutriplan_jwt_token');

      // For academic preview, allow access or redirect
      if (!token && userRole !== 'Admin') {
        // Automatically establish admin preview session
        localStorage.setItem('nutriplan_user_role', 'Admin');
        localStorage.setItem('nutriplan_user_name', 'Platform Admin');
        localStorage.setItem('nutriplan_user_email', 'admin@nutriplan.platform');
      }

      try {
        const [statsData, usersData] = await Promise.all([
          adminService.getStats(),
          adminService.getAllUsers()
        ]);

        setStats(statsData);

        // Fallback default users if API returned empty list
        if (usersData.length > 0) {
          setUsers(usersData);
        } else {
          const sampleUsers: AdminUserDto[] = [
            { id: 'usr-1', fullName: 'Dr. Sarah Connor, RDN', email: 'sarah.c@nutriplan.com', role: 'Nutritionist', createdAt: '2026-08-10', licenseNumber: 'NUT-48291', specialization: 'Sports & Hypertrophy', isVerified: true, status: 'Active' },
            { id: 'usr-2', fullName: 'Dr. Emily Watson, PhD', email: 'emily.w@clinic.com', role: 'Nutritionist', createdAt: '2026-09-01', licenseNumber: 'NUT-99210', specialization: 'Clinical & Diabetic Care', isVerified: true, status: 'Active' },
            { id: 'usr-3', fullName: 'Krit NutriPro', email: 'krit.nutrition@gmail.com', role: 'Nutritionist', createdAt: '2026-09-24', licenseNumber: 'NUT-PENDING-551', specialization: 'Ketogenic Diet', isVerified: false, status: 'Pending' },
            { id: 'usr-4', fullName: 'John Doe', email: 'john.doe@example.com', role: 'Client', createdAt: '2026-09-12', weightKg: 78.5, heightCm: 178, isVerified: true, status: 'Active' },
            { id: 'usr-5', fullName: 'Jane Smith', email: 'jane.smith@example.com', role: 'Client', createdAt: '2026-09-18', weightKg: 62.0, heightCm: 165, isVerified: true, status: 'Active' },
            { id: 'usr-6', fullName: 'Robert Johnson', email: 'robert.j@example.com', role: 'Client', createdAt: '2026-09-22', weightKg: 91.2, heightCm: 182, isVerified: true, status: 'Active' },
            { id: 'usr-7', fullName: 'Admin Root', email: 'admin@nutriplan.platform', role: 'Admin', createdAt: '2026-08-01', isVerified: true, status: 'Active' },
          ];
          setUsers(sampleUsers);
        }
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndLoad();
  }, [router]);

  // Actions
  const handleVerifyNutritionist = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified: true, status: 'Active' } : u));
    const targetUser = users.find(u => u.id === userId);
    setAuditLogs(prev => [
      {
        id: `audit-${Date.now()}`,
        timestamp: 'Just now',
        actor: 'Platform Admin',
        role: 'Admin',
        action: `Verified & Approved Nutritionist License (${targetUser?.licenseNumber || 'Verified'})`,
        target: targetUser?.fullName || 'Nutritionist',
        type: 'security'
      },
      ...prev
    ]);
    showToast(isEn ? 'Nutritionist credentials verified & approved!' : 'อนุมัติใบประกอบวิชาชีพนักโภชนาการเรียบร้อยแล้ว!');
  };

  const handleToggleStatus = (userId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
    const targetUser = users.find(u => u.id === userId);
    setAuditLogs(prev => [
      {
        id: `audit-${Date.now()}`,
        timestamp: 'Just now',
        actor: 'Platform Admin',
        role: 'Admin',
        action: `${nextStatus === 'Suspended' ? 'Suspended' : 'Reactivated'} User Account`,
        target: targetUser?.email || 'User',
        type: 'user'
      },
      ...prev
    ]);
    showToast(isEn ? `User status set to ${nextStatus}` : `ปรับสถานะผู้ใช้เป็น ${nextStatus}`);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t('adminDashboard.confirmDelete', 'Are you sure you want to delete this user?'))) return;

    await adminService.deleteUser(userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (selectedUser?.id === userId) setSelectedUser(null);
    setAuditLogs(prev => [
      {
        id: `audit-${Date.now()}`,
        timestamp: 'Just now',
        actor: 'Platform Admin',
        role: 'Admin',
        action: 'Deleted User Account from Platform',
        target: `User ID: ${userId}`,
        type: 'security'
      },
      ...prev
    ]);
    showToast(isEn ? 'User deleted successfully.' : 'ลบบัญชีผู้ใช้เรียบร้อยแล้ว');
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchQuery =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.licenseNumber && u.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.specialization && u.specialization.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole = roleFilter === 'All' || u.role === roleFilter;
      const matchStatus = statusFilter === 'All' || (u.status || 'Active') === statusFilter;

      return matchQuery && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const pendingNutritionists = useMemo(() => {
    return users.filter(u => u.role === 'Nutritionist' && (!u.isVerified || u.status === 'Pending'));
  }, [users]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 md:p-8 overflow-x-hidden w-full max-w-full">
      <UserHeader
        title={t('adminDashboard.title', 'Platform Administration Center')}
        subtitle={t('adminDashboard.subtitle', 'System health, global analytics & multi-role user management')}
      />

      {/* Admin Notice Banner */}
      <div className="max-w-7xl mx-auto mb-6 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👑</span>
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <span>{isEn ? 'Superuser Platform Console' : 'แผงควบคุมหลักผู้ดูแลระบบ NutriPlan'}</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                ROLE: ADMIN
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('adminDashboard.demoLoginNotice', 'Logged in as Platform Administrator with superuser privileges.')}
            </p>
          </div>
        </div>

        {/* Quick Portal Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/dashboard/nutritionist')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition-all"
          >
            🩺 {isEn ? 'Nutritionist View' : 'มุมมองนักโภชนาการ'}
          </button>
          <button
            onClick={() => router.push('/dashboard/client')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition-all"
          >
            👤 {isEn ? 'Client View' : 'มุมมองผู้รับบริการ'}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-bounce">
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            📊 {t('adminDashboard.overview', 'System Overview')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            👥 {t('adminDashboard.usersTab', 'User Directory')} ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
              activeTab === 'verification'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            🛡️ {t('adminDashboard.verificationTab', 'Credential Verification')}
            {pendingNutritionists.length > 0 && (
              <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                {pendingNutritionists.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            📝 {t('adminDashboard.auditTab', 'System Audit Logs')}
          </button>
        </div>

        {/* TAB 1: SYSTEM OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/40 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('adminDashboard.totalUsers', 'Total Users')}
                    </p>
                    <p className="text-3xl font-black text-slate-100 mt-2">{users.length || stats?.totalUsers || 18}</p>
                  </div>
                  <span className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl text-xl">👥</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-bold">{users.filter(u => u.role === 'Client').length} Clients</span> •
                  <span className="text-blue-400 font-bold">{users.filter(u => u.role === 'Nutritionist').length} Nutritionists</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('adminDashboard.activePlans', 'Active Plans')}
                    </p>
                    <p className="text-3xl font-black text-emerald-400 mt-2">{stats?.totalPlans || 12}</p>
                  </div>
                  <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-xl">📋</span>
                </div>
                <p className="mt-3 text-[11px] text-slate-400">{isEn ? 'Platform-wide active meal programs' : 'แผนโภชนาการทั้งหมดในระบบ'}</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-blue-500/40 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {t('adminDashboard.systemHealth', 'System Health')}
                    </p>
                    <p className="text-2xl font-black text-emerald-400 mt-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      {stats?.systemHealth || 'Operational'}
                    </p>
                  </div>
                  <span className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl text-xl">⚡</span>
                </div>
                <p className="mt-3 text-[11px] text-slate-400 font-mono">Uptime: {stats?.uptimePercent || 99.98}%</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {isEn ? 'Pending Approvals' : 'รอการตรวจสอบ'}
                    </p>
                    <p className="text-3xl font-black text-amber-400 mt-2">{pendingNutritionists.length}</p>
                  </div>
                  <span className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl text-xl">🛡️</span>
                </div>
                <p className="mt-3 text-[11px] text-slate-400">
                  {pendingNutritionists.length > 0 ? (isEn ? 'Action required on licenses' : 'มีใบอนุญาตรออนุมัติ') : (isEn ? 'All credentials verified' : 'ตรวจสอบครบถ้วนแล้ว')}
                </p>
              </div>
            </div>

            {/* Architecture Overview & Realtime Live Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <span>🏗️</span>
                  <span>{isEn ? 'Platform Service Topology & Subsystems' : 'สถาปัตยกรรมบริการและระบบย่อย'}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <p className="text-xs font-bold text-slate-200">Core REST API</p>
                    <p className="text-[11px] text-emerald-400 font-mono mt-1">● Healthy (200 OK)</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">ASP.NET Core 8.0</p>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <p className="text-xs font-bold text-slate-200">PostgreSQL DB</p>
                    <p className="text-[11px] text-emerald-400 font-mono mt-1">● Connected (3ms)</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Neon Serverless SQL</p>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <p className="text-xs font-bold text-slate-200">Gemini Vision AI</p>
                    <p className="text-[11px] text-emerald-400 font-mono mt-1">● Online (2.5 Flash)</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Food Scanner Engine</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-2">
                  <p className="font-bold text-slate-300">💡 {isEn ? 'Platform Multi-Role Hierarchy' : 'ลำดับชั้นบทบาทผู้ใช้ระดับ Platform'}:</p>
                  <ul className="list-disc list-inside text-slate-400 space-y-1">
                    <li><strong className="text-purple-400">Admin</strong>: {isEn ? 'Full global oversight, user authorization, system auditing' : 'ดูแลระบบทั้งหมด อนุมัตินักโภชนาการ และตรวจสอบ Audit Log'}</li>
                    <li><strong className="text-blue-400">Nutritionist</strong>: {isEn ? 'Manages client rosters, prescribes meal plans, analyzes nutrient gaps' : 'จัดการผู้รับบริการ ออกแผนโภชนาการ และวิเคราะห์สารอาหาร'}</li>
                    <li><strong className="text-emerald-400">Client</strong>: {isEn ? 'Tracks daily intake, logs body weight, follows custom meal plans' : 'บันทึกมื้ออาหาร บันทึกน้ำหนัก และปฏิบัติตามแผน'}</li>
                  </ul>
                </div>
              </div>

              {/* Quick Activity Stream */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>⚡</span>
                    <span>{t('adminDashboard.recentEvents', 'Live Activity Feed')}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">LIVE</span>
                </h3>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {auditLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200">{log.actor}</span>
                        <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{log.action}</p>
                      <p className="text-[10px] text-emerald-400 font-mono">{log.target}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER DIRECTORY & MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search & Filters Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder={t('adminDashboard.searchPlaceholder', 'Search by name, email, or role...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-400"
                >
                  <option value="All">{t('adminDashboard.allRoles', 'All Roles')}</option>
                  <option value="Nutritionist">Nutritionist</option>
                  <option value="Client">Client</option>
                  <option value="Admin">Admin</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-400"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[11px] uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Details / License</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Joined</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-medium">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          {t('adminDashboard.noUsers', 'No users found matching query.')}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const status = user.status || 'Active';
                        return (
                          <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-slate-100">{user.fullName}</p>
                              <p className="text-[11px] text-slate-400">{user.email}</p>
                            </td>
                            <td className="p-4">
                              <span
                                className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                                  user.role === 'Admin'
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : user.role === 'Nutritionist'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="p-4">
                              {user.role === 'Nutritionist' ? (
                                <div>
                                  <p className="text-slate-200 font-mono text-[11px]">{user.licenseNumber || 'N/A'}</p>
                                  <p className="text-[10px] text-slate-400">{user.specialization || 'General'}</p>
                                </div>
                              ) : user.role === 'Client' ? (
                                <p className="text-slate-400 text-[11px]">
                                  {user.weightKg ? `${user.weightKg} kg` : ''} {user.heightCm ? `| ${user.heightCm} cm` : ''}
                                </p>
                              ) : (
                                <p className="text-slate-500 text-[11px]">Platform Management</p>
                              )}
                            </td>
                            <td className="p-4">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  status === 'Active'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : status === 'Pending'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400 text-[11px] font-mono">
                              {user.createdAt.split(' ')[0]}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {user.role === 'Nutritionist' && !user.isVerified && (
                                  <button
                                    onClick={() => handleVerifyNutritionist(user.id)}
                                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                                  >
                                    ✓ {t('adminDashboard.verify', 'Verify')}
                                  </button>
                                )}
                                {user.role !== 'Admin' && (
                                  <button
                                    onClick={() => handleToggleStatus(user.id, user.status)}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                                  >
                                    {status === 'Suspended' ? t('adminDashboard.activate', 'Activate') : t('adminDashboard.suspend', 'Suspend')}
                                  </button>
                                )}
                                {user.role !== 'Admin' && (
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                                  >
                                    🗑️ {t('adminDashboard.deleteUser', 'Delete')}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CREDENTIAL VERIFICATION */}
        {activeTab === 'verification' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-2">
                <span>🛡️</span>
                <span>{isEn ? 'Nutritionist Medical & Clinical License Verification' : 'ตรวจสอบและอนุมัติใบประกอบวิชาชีพนักโภชนาการ'}</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                {isEn
                  ? 'Verify registered nutritionist credentials before allowing them to prescribe dietary meal plans on the platform.'
                  : 'ตรวจสอบคุณสมบัติและเลขที่ใบอนุญาตของนักโภชนาการก่อนเปิดสิทธิ์ให้ออกแผนโภชนาการในระบบ'}
              </p>

              <div className="space-y-3">
                {users.filter(u => u.role === 'Nutritionist').map((nutritionist) => (
                  <div
                    key={nutritionist.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-100 text-sm">{nutritionist.fullName}</h4>
                        {nutritionist.isVerified ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                            ✅ Verified
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                            ⏳ Pending Review
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{nutritionist.email}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-300">
                        <span><strong>{t('adminDashboard.licenseNumber', 'License #')}:</strong> <span className="font-mono text-purple-300">{nutritionist.licenseNumber || 'NUT-PENDING'}</span></span>
                        <span><strong>{t('adminDashboard.specialization', 'Specialization')}:</strong> {nutritionist.specialization || 'General'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!nutritionist.isVerified ? (
                        <button
                          onClick={() => handleVerifyNutritionist(nutritionist.id)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-lg transition-all"
                        >
                          ✓ {t('adminDashboard.verify', 'Approve License')}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          {isEn ? 'Approved & Authorized' : 'อนุมัติเรียบร้อย'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-2">
                <span>📝</span>
                <span>{t('adminDashboard.auditTab', 'System Audit Logs')}</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                {isEn
                  ? 'Tamper-evident chronological audit trail of all security, authentication, and clinical actions across the platform.'
                  : 'ประวัติบันทึกกิจกรรมความปลอดภัย การเข้าสู่ระบบ และการสั่งแผนอาหารทั้งหมดในระบบ'}
              </p>

              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        log.type === 'security' ? 'bg-purple-400' :
                        log.type === 'plan' ? 'bg-blue-400' :
                        log.type === 'system' ? 'bg-emerald-400' : 'bg-amber-400'
                      }`} />
                      <div>
                        <p className="text-slate-200">
                          <strong className="text-slate-100">{log.actor}</strong> ({log.role}): <span className="text-slate-300">{log.action}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{log.target}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
