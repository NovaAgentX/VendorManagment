import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiClient } from '../services/api';
import { DashboardStats, Campaign } from '../types';
import { StatsCard } from '../components/common/StatsCard';
import { Badge } from '../components/common/Badge';
import { DuplicateVendorsWidget } from '../components/dashboard/DuplicateVendorsWidget';
import {
  Users,
  ShieldAlert,
  Building2,
  Megaphone,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlusCircle,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Completed': '#10b981',
  'In Progress': '#f59e0b',
  'Pending': '#0ea5e9',
  'Cancelled': '#64748b'
};

const PLATFORM_COLORS = ['#0ea5e9', '#10b981', '#ec4899', '#3b82f6', '#8b5cf6', '#64748b'];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { session, role } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [session]);

  const loadDashboard = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await ApiClient.getDashboard(session);
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.error('Failed to load dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {role === 'SUPERADMIN' && 'Super Admin Overview'}
              {role === 'ADMIN' && `${session?.Name} — Team Dashboard`}
              {role === 'USER' && `Welcome back, ${session?.Name}`}
            </h1>
            <Badge variant="role" value={role!} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {role === 'SUPERADMIN' && 'Real-time organization metrics, global teams, vendor distribution, and campaign results.'}
            {role === 'ADMIN' && 'Direct management of team operators, assigned vendor partners, and active marketing campaigns.'}
            {role === 'USER' && 'Your assigned vendor portfolio and live campaign execution pipeline.'}
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          {role === 'USER' && (
            <button
              id="dashboard-add-campaign-btn"
              onClick={() => onNavigate('add-campaign')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Campaign</span>
            </button>
          )}
          {role !== 'USER' && (
            <button
              id="dashboard-view-vendors-btn"
              onClick={() => onNavigate('vendors')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm transition-all"
            >
              <Building2 className="w-4 h-4" />
              <span>Manage Vendors</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Super Admin specific metrics */}
        {role === 'SUPERADMIN' && (
          <StatsCard
            id="stat-total-admins"
            title="Total Admins"
            value={stats.totalAdmins ?? 0}
            subtitle="System Administrators"
            icon={ShieldAlert}
            colorScheme="purple"
            onClick={() => onNavigate('admins')}
          />
        )}

        {/* Total Users / Team Users */}
        <StatsCard
          id="stat-total-users"
          title={role === 'SUPERADMIN' ? 'Total Users' : role === 'ADMIN' ? 'Team Operators' : 'My Account'}
          value={role === 'USER' ? 'Active' : stats.totalUsers}
          subtitle={role === 'USER' ? session?.Email : 'Campaign Operators'}
          icon={Users}
          colorScheme="blue"
          onClick={() => role !== 'USER' && onNavigate('users')}
        />

        {/* Total / My Vendors */}
        <StatsCard
          id="stat-total-vendors"
          title={role === 'USER' ? 'My Vendors' : 'Total Vendors'}
          value={stats.totalVendors}
          subtitle={`${stats.activeVendors} Active • ${stats.inactiveVendors} Inactive`}
          icon={Building2}
          colorScheme="emerald"
          onClick={() => onNavigate('vendors')}
        />

        {/* Total Campaigns */}
        <StatsCard
          id="stat-total-campaigns"
          title={role === 'USER' ? 'My Campaigns' : 'Total Campaigns'}
          value={stats.totalCampaigns}
          subtitle={`${stats.completedCampaigns} Completed • ${stats.inProgressCampaigns} In Progress`}
          icon={Megaphone}
          colorScheme="amber"
          onClick={() => onNavigate('campaigns')}
        />
      </div>

      {/* Secondary Status Breakdown Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.pendingCampaigns}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In Progress</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.inProgressCampaigns}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.completedCampaigns}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cancelled</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.cancelledCampaigns}</p>
          </div>
        </div>
      </div>

      {/* Duplicate Vendor & Cross-User Overlap Intelligence (Strictly SuperAdmin & Admin only, NOT for User role) */}
      {role !== 'USER' && stats.duplicateSummary && (
        <DuplicateVendorsWidget
          summary={stats.duplicateSummary}
          onNavigateToVendors={() => onNavigate('vendors')}
        />
      )}

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaigns by Status (Pie Chart) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Campaigns by Status
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current execution breakdown
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            {stats.campaignsByStatus.some(s => s.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.campaignsByStatus.filter(s => s.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.campaignsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No campaign data available
              </div>
            )}
          </div>
        </div>

        {/* Campaigns by Platform (Bar Chart) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Campaigns by Platform
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distribution across media channels
              </p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            {stats.campaignsByPlatform.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.campaignsByPlatform} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No platform data available
              </div>
            )}
          </div>
        </div>

        {/* SuperAdmin & Admin: Campaigns by User Breakdown */}
        {role !== 'USER' && stats.campaignsByUser && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Campaigns by Operator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Workload distribution per team member
                </p>
              </div>
              <Users className="w-4 h-4 text-slate-400" />
            </div>

            <div className="h-64 w-full">
              {stats.campaignsByUser.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.campaignsByUser} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No operator data available
                </div>
              )}
            </div>
          </div>
        )}

        {/* SuperAdmin: Campaigns by Admin Team */}
        {role === 'SUPERADMIN' && stats.campaignsByAdmin && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Campaigns by Admin Team
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Output comparison across admin divisions
                </p>
              </div>
              <ShieldAlert className="w-4 h-4 text-slate-400" />
            </div>

            <div className="h-64 w-full">
              {stats.campaignsByAdmin.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.campaignsByAdmin} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No admin data available
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Campaigns Table & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Campaigns (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {role === 'USER' ? 'My Recent Campaigns' : 'Recent Campaign Activities'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest records matching your permissions
              </p>
            </div>
            <button
              onClick={() => onNavigate('campaigns')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pr-4">ID</th>
                  <th className="pb-3 pr-4">Vendor</th>
                  <th className="pb-3 pr-4">Type / Platform</th>
                  {role !== 'USER' && <th className="pb-3 pr-4">Operator</th>}
                  <th className="pb-3 pr-4">Date (GST)</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {stats.recentCampaigns.length > 0 ? (
                  stats.recentCampaigns.map((c) => (
                    <tr key={c.Campaign_ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 pr-4 font-mono font-medium text-slate-500">
                        {c.Campaign_ID}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white max-w-[150px] truncate">
                        {c.Vendor_Name}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{c.Campaign_Type}</span>
                          <span className="text-slate-400">•</span>
                          <Badge variant="platform" value={c.Platform} className="text-[10px] py-0 px-1.5" />
                        </div>
                      </td>
                      {role !== 'USER' && (
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                          {c.User_Name}
                        </td>
                      )}
                      <td className="py-3 pr-4 font-mono text-slate-500 text-[11px]">
                        {c.Campaign_Date}
                      </td>
                      <td className="py-3">
                        <Badge variant="campaignStatus" value={c.Campaign_Status} className="text-[10px]" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No campaigns found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Logs Feed (1 col) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Activity Feed
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audit trail in Asia/Dubai time
              </p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((log) => (
                <div
                  key={log.Log_ID}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {log.User_Name}
                    </span>
                    <Badge variant="role" value={log.Role} className="text-[9px] py-0 px-1" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1 leading-snug text-[11px]">
                    {log.Description}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1.5">
                    {log.Timestamp} (GST)
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">
                No recent activity logs
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
