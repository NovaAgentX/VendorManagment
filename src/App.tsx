import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { AdminsView } from './views/AdminsView';
import { UsersView } from './views/UsersView';
import { VendorsView } from './views/VendorsView';
import { CampaignsView } from './views/CampaignsView';
import { ActivityLogView } from './views/ActivityLogView';
import { DeploymentCenterView } from './views/DeploymentCenterView';
import { SettingsView } from './views/SettingsView';
import { OpeningSplashAnimation } from './components/common/OpeningSplashAnimation';

const MainAppContent: React.FC = () => {
  const { session, role, isLoading } = useAuth();
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    // Show opening animation on website entry
    return true;
  });

  // Opening animation
  if (showSplash) {
    return <OpeningSplashAnimation onComplete={() => setShowSplash(false)} />;
  }

  // If loading session, show clean loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Initializing Platform...
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, render the dedicated Login View
  if (!session || !role) {
    return (
      <LoginView onOpenDeploymentGuide={() => setActiveView('deployment')} />
    );
  }

  // Active view renderer
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView onNavigate={(view) => setActiveView(view)} />;
      case 'admins':
        return <AdminsView />;
      case 'users':
        return <UsersView />;
      case 'vendors':
        return <VendorsView onAddCampaignForVendor={() => setActiveView('campaigns')} />;
      case 'campaigns':
        return <CampaignsView />;
      case 'add-campaign':
        return <CampaignsView initialOpenAdd={true} />;
      case 'activity':
        return <ActivityLogView />;
      case 'deployment':
        return <DeploymentCenterView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={(view) => setActiveView(view)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex">
        {/* Responsive Role-Aware Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 min-w-0 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
