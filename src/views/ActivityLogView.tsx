import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiClient } from '../services/api';
import { ActivityLog } from '../types';
import { Badge } from '../components/common/Badge';
import { useToast } from '../context/ToastContext';
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  User as UserIcon,
  Clock,
  Layers,
  ArrowUpDown
} from 'lucide-react';

export const ActivityLogView: React.FC = () => {
  const { session, role } = useAuth();
  const { error } = useToast();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  useEffect(() => {
    loadLogs();
  }, [session]);

  const loadLogs = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await ApiClient.getActivityLogs(session);
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (e: any) {
      error('Failed to load logs', e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.Description.toLowerCase().includes(search.toLowerCase()) ||
      log.User_Name.toLowerCase().includes(search.toLowerCase()) ||
      log.Action.toLowerCase().includes(search.toLowerCase()) ||
      (log.Target_ID && log.Target_ID.toLowerCase().includes(search.toLowerCase()));

    const matchModule = moduleFilter === 'ALL' || log.Module === moduleFilter;

    return matchSearch && matchModule;
  });

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800';
    if (action.includes('DEACTIVATE') || action.includes('DELETE')) return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800';
    if (action.includes('LOGIN') || action.includes('SWITCH')) return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800';
    return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Audit & Activity Logs
            </h1>
            <Badge variant="role" value={role!} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Immutable transaction records stored in Google Sheets • All timestamps recorded in Asia/Dubai timezone (GST).
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span>Asia/Dubai Timezone (UTC+04:00)</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-logs-input"
            type="text"
            placeholder="Search description, user, action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            id="filter-log-module-select"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Modules</option>
            <option value="AUTH">AUTH</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
            <option value="VENDOR">VENDOR</option>
            <option value="CAMPAIGN">CAMPAIGN</option>
          </select>

          <div className="text-xs text-slate-500 font-medium ml-auto sm:ml-2">
            Total: <span className="font-bold text-slate-900 dark:text-white">{filteredLogs.length}</span> Events
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Log ID</th>
                <th className="py-3.5 px-4">Timestamp (Dubai GST)</th>
                <th className="py-3.5 px-4">Operator</th>
                <th className="py-3.5 px-4">Action & Module</th>
                <th className="py-3.5 px-4">Target Record</th>
                <th className="py-3.5 px-4">Event Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.Log_ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      {log.Log_ID}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {log.Timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {log.User_Name}
                        </span>
                        <Badge variant="role" value={log.Role} className="text-[9px] py-0 px-1" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.User_ID}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getActionColor(log.Action)}`}>
                          {log.Action}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {log.Module}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {log.Target_ID || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {log.Description}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
