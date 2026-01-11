import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import DataUpdater from './components/DataUpdater';
import NhanVien from './components/NhanVien';
import Settings from './components/Settings';
import { ChartPieIcon, UploadIcon, DocumentReportIcon, UsersIcon, CogIcon } from './components/Icons';
import { useSampleDataInitializer } from './hooks/useSampleDataInitializer';
import ThemeToggle from './components/ThemeToggle';
import { useIndexedDBState } from './hooks/useIndexedDBState';

interface NavLinkProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  isExpanded?: boolean;
}

const SidebarNavLink: React.FC<NavLinkProps> = ({ isActive, onClick, icon, children, isExpanded }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full text-sm font-bold rounded-2xl transition-all duration-300 py-3.5 group relative ${
      isExpanded ? 'px-4' : 'justify-center px-0'
    } ${
      isActive
        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
    }`}
  >
    <div className={`flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'w-full ml-3 opacity-100' : 'w-0 opacity-0'}`}>
      <span className="whitespace-nowrap tracking-tight">{children}</span>
    </div>
    {!isExpanded && isActive && (
      <div className="absolute right-0 w-1.5 h-6 bg-primary-400 rounded-l-full"></div>
    )}
  </button>
);

const MobileNavLink: React.FC<NavLinkProps> = ({ isActive, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center flex-1 flex-col gap-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
      isActive
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-slate-400 dark:text-slate-600'
    }`}
  >
    <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary-50 dark:bg-primary-900/30 scale-110' : 'bg-transparent'}`}>
      {icon}
    </div>
    <span>{children}</span>
  </button>
);

const App: React.FC = () => {
  const [activeView, setActiveView] = useIndexedDBState<'dashboard' | 'employee' | 'updater' | 'settings'>('main-active-view', 'dashboard');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const isDataInitialized = useSampleDataInitializer();

  if (!isDataInitialized) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-950 flex items-center justify-center z-50">
        <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-5xl shadow-2xl animate-slide-up">
          <div className="w-12 h-12 border-[3px] border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-lg font-black text-slate-800 dark:text-white tracking-tighter">BI PRO TOOLS</p>
        </div>
      </div>
    );
  }

  const navigationLinks = [
    { id: 'dashboard', icon: <ChartPieIcon className="h-5 w-5" />, label: 'Tổng quan' },
    { id: 'employee', icon: <UsersIcon className="h-5 w-5" />, label: 'Nhân viên' },
    { id: 'updater', icon: <UploadIcon className="h-5 w-5" />, label: 'Cập nhật' },
    { id: 'settings', icon: <CogIcon className="h-5 w-5" />, label: 'Hệ thống' },
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-slate-950 flex overflow-x-hidden">
      
      {/* --- Desktop Sidebar --- */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col hidden md:flex transition-all duration-500 ease-in-out shrink-0 shadow-sm ${
          isSidebarExpanded ? 'w-64' : 'w-20'
        }`}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <div className="flex items-center h-24 px-6 shrink-0 overflow-hidden">
          <div className="p-2 bg-primary-600 rounded-xl shadow-lg">
            <DocumentReportIcon className="h-6 w-6 text-white" />
          </div>
          <div className={`ml-4 transition-all duration-300 ${isSidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <h1 className="text-lg font-black text-slate-900 dark:text-white leading-none tracking-tight">TOOLS 910</h1>
            <p className="text-[9px] font-black text-primary-500 uppercase tracking-widest mt-1 opacity-80">Enterprise</p>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-2">
          {navigationLinks.map(link => (
            <SidebarNavLink
              key={link.id}
              isActive={activeView === link.id}
              onClick={() => setActiveView(link.id as any)}
              icon={link.icon}
              isExpanded={isSidebarExpanded}
            >
              {link.label}
            </SidebarNavLink>
          ))}
        </nav>
        
        <div className="p-4 mt-auto border-t border-slate-50 dark:border-slate-800/40">
          <div className={`flex items-center transition-all duration-300 ${isSidebarExpanded ? 'justify-between px-2' : 'justify-center px-0'}`}>
            <ThemeToggle />
            <div className={`overflow-hidden transition-all duration-300 ${isSidebarExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
              <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">V1.8 PRO</span>
            </div>
          </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ${isSidebarExpanded ? 'md:ml-64' : 'md:ml-20'}`}>
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-800/50 px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-xl">
              <DocumentReportIcon className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">TOOLS 910</h1>
          </div>
          <ThemeToggle />
        </header>

        {/* Scrollable Container with centered 800px content */}
        <main className="flex-1 w-full overflow-y-auto scroll-smooth py-6 md:py-10 px-4 sm:px-6">
          <div className="w-full max-w-[800px] mx-auto animate-slide-up space-y-8">
            <div style={{ display: activeView === 'dashboard' ? 'block' : 'none' }}>
              <Dashboard onNavigateToUpdater={() => setActiveView('updater')} />
            </div>
            <div style={{ display: activeView === 'employee' ? 'block' : 'none' }}>
              <NhanVien />
            </div>
            <div style={{ display: activeView === 'updater' ? 'block' : 'none' }}>
              <DataUpdater />
            </div>
            <div style={{ display: activeView === 'settings' ? 'block' : 'none' }}>
              <Settings />
            </div>
            
            <footer className="pt-10 pb-20 md:pb-10 text-center opacity-40">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">
                BI Enterprise Dashboard System &copy; 2026
              </p>
            </footer>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-t border-slate-200 dark:border-slate-800 sticky bottom-0 z-40 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {navigationLinks.map(link => (
            <MobileNavLink
              key={link.id}
              isActive={activeView === link.id}
              onClick={() => setActiveView(link.id as any)}
              icon={link.icon}
            >
              {link.label}
            </MobileNavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default App;