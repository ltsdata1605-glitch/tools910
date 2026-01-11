
import React from 'react';
import { SubTab } from '../../utils/dashboardHelpers';
import { SubTabButton } from './DashboardWidgets';
import { ChartBarIcon, UsersIcon } from '../Icons';

interface DashboardToolbarProps {
    id: string;
    activeSubTab: SubTab;
    setActiveSubTab: (tab: SubTab) => void;
}

const DashboardToolbar: React.FC<DashboardToolbarProps> = ({ 
    id,
    activeSubTab, 
    setActiveSubTab, 
}) => {
    return (
        <div id={id} className="relative mb-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-start">
                <nav className="flex space-x-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm" aria-label="Tabs">
                    <button
                        onClick={() => setActiveSubTab('revenue')}
                        className={`
                            flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300
                            ${activeSubTab === 'revenue' 
                                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-700' 
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}
                        `}
                    >
                        <ChartBarIcon className="h-4 w-4" />
                        Doanh thu
                    </button>
                    <button
                        onClick={() => setActiveSubTab('competition')}
                        className={`
                            flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300
                            ${activeSubTab === 'competition' 
                                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-md ring-1 ring-slate-200 dark:ring-slate-700' 
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}
                        `}
                    >
                        <UsersIcon className="h-4 w-4" />
                        Thi đua
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default DashboardToolbar;
