import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Building2,
  Megaphone,
  History,
  FileCode2,
  Settings,
  LogOut,
  PlusCircle,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeView,
  setActiveView
}) => {
  const { role, session, logout } = useAuth();

  // Role-Specific Navigation items strictly matching section 15 of specs
  const getNavItems = () => {
    if (role === 'SUPERADMIN') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'admins', label: 'Admins', icon: ShieldAlert },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'vendors', label: 'Vendors', icon: Building2 },
        { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
        { id: 'activity', label: 'Activity Logs', icon: History },
        { id: 'deployment', label: 'Apps Script & Sheets', icon: FileCode2 },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    } else if (role === 'ADMIN') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Team Users', icon: Users },
        { id: 'vendors', label: 'Team Vendors', icon: Building2 },
        { id: 'campaigns', label: 'Team Campaigns', icon: Megaphone },
        { id: 'activity', label: 'Activity Logs', icon: History },
        { id: 'deployment', label: 'Apps Script & Sheets', icon: FileCode2 },
      ];
    } else {
      // USER
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'vendors', label: 'My Vendors', icon: Building2 },
        { id: 'campaigns', label: 'My Campaigns', icon: Megaphone },
        { id: 'add-campaign', label: 'Add Campaign', icon: PlusCircle },
        { id: 'deployment', label: 'Apps Script & Sheets', icon: FileCode2 },
      ];
    }
  };

  const navItems = getNavItems();

  const handleSelect = (id: string) => {
    setActiveView(id);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding (Mobile Header) */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              VT
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              Vendor Tracker
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Scope Info Banner */}
        <div className="px-4 py-3 mx-3 mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Active Scope
          </p>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
            {role === 'SUPERADMIN'
              ? 'Global Enterprise'
              : role === 'ADMIN'
              ? `Team: ${session?.Name}`
              : `Operator: ${session?.Name}`}
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <button
            id="sidebar-logout-btn"
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
