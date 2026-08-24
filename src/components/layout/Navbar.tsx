import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { 
  LogOut, 
  Clock, 
  Database, 
  ShieldCheck, 
  User as UserIcon, 
  ChevronDown, 
  Menu,
  Lock,
  UserCheck
} from 'lucide-react';
import { getDubaiTime } from '../../services/storageEngine';
import { Role } from '../../types';

interface NavbarProps {
  onToggleSidebar?: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, activeView, setActiveView }) => {
  const { session, role, logout, quickSwitch, isLiveMode } = useAuth();
  const [dubaiTime, setDubaiTime] = useState<string>(getDubaiTime());
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setDubaiTime(getDubaiTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRoleSwitch = async (targetRole: Role, targetUserId?: string) => {
    setShowRoleSwitcher(false);
    await quickSwitch(targetRole, targetUserId);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-menu-btn"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-600/20">
              VT
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight leading-none text-base">
                Vendor & Campaign Tracker
              </span>
              <span className="hidden sm:inline-block text-[11px] text-slate-500 dark:text-slate-400 font-medium ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                Google Sheets Database
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-3">
          {/* Dubai Clock */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium border border-slate-200/60 dark:border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>{dubaiTime} (GST)</span>
          </div>

          {/* Database Mode Pill */}
          <button
            id="deployment-center-pill-btn"
            onClick={() => setActiveView('deployment')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isLiveMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800 hover:bg-indigo-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isLiveMode ? 'Google Apps Script (Live)' : 'Apps Script / Sheets Setup'}</span>
          </button>

          {/* User Account & Role Controls */}
          {session && (
            <div className="relative">
              <button
                id="role-switcher-dropdown-btn"
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-left"
              >
                <div className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs ${
                  role === 'SUPERADMIN'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                    : role === 'ADMIN'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                }`}>
                  {session.Name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[130px]">
                      {session.Name}
                    </span>
                    <Badge variant="role" value={session.Role} className="text-[10px] py-0 px-1.5" />
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {session.User_ID}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* User / Admin Dropdown Menu */}
              {showRoleSwitcher && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Account Header */}
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {session.Name}
                      </p>
                      <Badge variant="role" value={session.Role} className="text-[10px]" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {session.Email}
                    </p>
                    {role === 'USER' && session.Admin_ID && (
                      <p className="text-[10px] text-slate-400 font-mono mt-1">
                        Assigned to Division: {session.Admin_ID}
                      </p>
                    )}
                  </div>

                  {/* If user is SuperAdmin or Admin: show administrative team inspection tools */}
                  {role !== 'USER' ? (
                    <div className="py-1 space-y-1">
                      <div className="px-3 py-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Administrative Workspace Switcher
                        </p>
                      </div>

                      {/* Super Admin */}
                      <button
                        id="switch-to-superadmin-btn"
                        onClick={() => handleRoleSwitch('SUPERADMIN')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                          session.Role === 'SUPERADMIN'
                            ? 'bg-purple-50 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <div>
                            <p className="font-bold text-xs">Super Admin</p>
                            <p className="text-[10px] text-slate-500">Executive Master View</p>
                          </div>
                        </div>
                      </button>

                      {/* Admin 1 */}
                      <button
                        id="switch-to-admin1-btn"
                        onClick={() => handleRoleSwitch('ADMIN', 'ADM-0001')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                          session.User_ID === 'ADM-0001'
                            ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="font-bold text-xs">Sarah (Admin 1)</p>
                            <p className="text-[10px] text-slate-500">MENA Team (Users 1 & 2)</p>
                          </div>
                        </div>
                      </button>

                      {/* Admin 2 */}
                      <button
                        id="switch-to-admin2-btn"
                        onClick={() => handleRoleSwitch('ADMIN', 'ADM-0002')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                          session.User_ID === 'ADM-0002'
                            ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="font-bold text-xs">Tariq (Admin 2)</p>
                            <p className="text-[10px] text-slate-500">GCC Team (Users 3 & 4)</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  ) : (
                    /* If role === 'USER': Show only safe operator account information without any admin switchers */
                    <div className="py-2 px-3 text-xs space-y-2 text-slate-600 dark:text-slate-300">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Protected Operator Session</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          You are viewing only your assigned vendor data. Master vendor editing is restricted to your Team Admin.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sign Out Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      id="logout-btn"
                      onClick={() => {
                        setShowRoleSwitcher(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
