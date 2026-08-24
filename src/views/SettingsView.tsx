import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import {
  Settings as SettingsIcon,
  Clock,
  Database,
  RotateCcw,
  ShieldCheck,
  User as UserIcon,
  Lock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { resetToInitialData, getDubaiTime } from '../services/storageEngine';

export const SettingsView: React.FC = () => {
  const { session, role, refreshSession } = useAuth();
  const { success, error } = useToast();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleResetData = () => {
    try {
      resetToInitialData();
      setIsResetDialogOpen(false);
      refreshSession();
      success('Database Reset', 'Local simulation data has been reset to default clean seed records.');
    } catch (e: any) {
      error('Reset Failed', e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          System & Account Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configuration parameters, timezone specifications, and simulation database controls.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-500">
          Current Session Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase">User Name</span>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{session?.Name}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase">System Role</span>
            <div className="mt-1">
              <Badge variant="role" value={role!} />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Email</span>
            <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">{session?.Email}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase">User ID</span>
            <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">{session?.User_ID}</p>
          </div>
        </div>
      </div>

      {/* Mandatory Timezone Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Mandatory System Timezone: Asia/Dubai (GST)
          </h3>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
          <p>
            In strict compliance with architectural specifications, <strong>all system timestamps, campaign dates, and activity logs</strong> are synchronized to Asia/Dubai time (UTC+04:00, Gulf Standard Time).
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">
            Current Server Time (Dubai): {getDubaiTime()}
          </div>
        </div>
      </div>

      {/* Security Principles Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Security & Data Isolation Architecture
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
            <p className="font-bold text-emerald-900 dark:text-emerald-300">Server-Derived Identity</p>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              User_ID and Admin_ID are computed strictly from backend session tokens. Client cannot tamper with record ownership.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
            <p className="font-bold text-emerald-900 dark:text-emerald-300">Soft Deletion Guaranteed</p>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Deactivated vendors are never deleted from Google Sheets. Rows receive status 'INACTIVE' and historical campaigns remain available.
            </p>
          </div>
        </div>
      </div>

      {/* Super Admin Database Reset */}
      {role === 'SUPERADMIN' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/50 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-rose-600">
            <RotateCcw className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Reset Simulation Database
            </h3>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Re-seeds the simulation environment with clean default records across all 5 Google Sheets tables (SuperAdmin, 2 Admins, 4 Users, 6 Vendors, and sample campaigns).
          </p>

          <button
            id="reset-db-btn"
            onClick={() => setIsResetDialogOpen(true)}
            className="px-4 py-2 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-800 rounded-xl transition-all"
          >
            Reset Seed Data
          </button>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetData}
        title="Reset Simulation Database"
        message="This will overwrite local simulation tables with the default demo records. Do you wish to continue?"
        confirmText="Reset to Seed Data"
        variant="danger"
      />
    </div>
  );
};
