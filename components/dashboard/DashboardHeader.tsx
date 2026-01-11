
import React from 'react';
import { MainTab } from '../../utils/dashboardHelpers';
import { MainTabButton } from './DashboardWidgets';
import { LineChartIcon, ArchiveBoxIcon, SparklesIcon } from '../Icons';

interface DashboardHeaderProps {
    title: string;
    activeMainTab: MainTab;
    setActiveMainTab: (tab: MainTab) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, activeMainTab, setActiveMainTab }) => {
    return (
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-2">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-600 rounded-xl shadow-lg shadow-primary-500/20">
                        <SparklesIcon className="h-6 w-6 text-white" />
                    </div>
                    <h1 id="dashboard-title" className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                        {title}
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal ml-12">
                    Theo dõi hiệu suất kinh doanh thời gian thực và luỹ kế
                </p>
            </div>
            
            <div id="main-tabs-container" className="flex items-center p-1.5 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
                <MainTabButton 
                    icon={<LineChartIcon className="h-4 w-4" />} 
                    label="Realtime" 
                    isActive={activeMainTab === 'realtime'} 
                    onClick={() => setActiveMainTab('realtime')} 
                />
                <MainTabButton 
                    icon={<ArchiveBoxIcon className="h-4 w-4" />} 
                    label="Luỹ kế" 
                    isActive={activeMainTab === 'cumulative'} 
                    onClick={() => setActiveMainTab('cumulative')} 
                />
            </div>
        </header>
    );
};

export default DashboardHeader;
