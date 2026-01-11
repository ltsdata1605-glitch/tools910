
import React from 'react';
import { SpinnerIcon, CameraIcon } from '../Icons';
import { shortenSupermarketName } from '../../utils/dashboardHelpers';

export const Switch: React.FC<{ checked: boolean; onChange: () => void; id?: string }> = ({ checked, onChange, id }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={onChange}
      className={`${
        checked ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );

export const GaugeChart: React.FC<{ value: number; label: string; target: number; size?: number; strokeWidth?: number }> = ({ value, label, target, size = 90, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    
    const displayValue = Math.min(Math.max(value, 0), 100);
    const offset = circumference - (displayValue / 100) * circumference;

    const isAchieved = value >= target;
    let colorClass = 'text-red-500';
    if (isAchieved) colorClass = 'text-green-500';
    else if (value >= target * 0.9) colorClass = 'text-amber-500';

    const targetAngle = (target / 100) * 360 - 90;
    const targetRad = (targetAngle * Math.PI) / 180;
    
    const tickInnerR = radius - strokeWidth / 2 - 2;
    const tickOuterR = radius + strokeWidth / 2 + 2;
    
    const x1 = center + tickInnerR * Math.cos(targetRad);
    const y1 = center + tickInnerR * Math.sin(targetRad);
    const x2 = center + tickOuterR * Math.cos(targetRad);
    const y2 = center + tickOuterR * Math.sin(targetRad);

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        className="text-slate-100 dark:text-slate-800"
                    />
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        fill="transparent"
                        className={`transition-all duration-1000 ease-out ${colorClass}`}
                    />
                    {target > 0 && (
                        <line
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke={isAchieved ? "#16a34a" : "#475569"}
                            strokeWidth="3"
                            strokeLinecap="round"
                            className="drop-shadow-sm"
                        />
                    )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                    <span className={`text-2xl font-semibold tracking-tighter ${colorClass}`}>
                        {Math.ceil(value)}<span className="text-[10px] font-medium opacity-70">%</span>
                    </span>
                    <span className="text-[8px] font-medium text-slate-400 mt-0.5">
                        TGT: {target}%
                    </span>
                </div>
            </div>
            
            <div className="mt-2 text-center">
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-tighter inline-block mt-1 ${
                    isAchieved 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                    {isAchieved ? '✓ Đạt' : '⚠ Cố lên'}
                </span>
            </div>
        </div>
    );
};

export const KpiCard: React.FC<{ title: string; value: React.ReactNode; color: string; children?: React.ReactNode }> = ({ title, value, color, children }) => (
    <div className={`py-3 px-4 rounded-none border flex items-center gap-3 transition-all hover:scale-[1.01] duration-300 ${color} shadow-sm`}>
        <div className="flex-shrink-0">{children}</div>
        <div className="flex-1 min-w-0">
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate mb-0.5">{title}</p>
            <div className="text-lg font-semibold text-slate-900 dark:text-white leading-none flex items-baseline gap-1.5">{value}</div>
        </div>
    </div>
);

export const MainTabButton: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-xl transition-all duration-300
            ${isActive
                ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-lg shadow-black/5 ring-1 ring-slate-200 dark:ring-slate-600'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40'}
        `}
    >
        {icon}
        <span>{label}</span>
    </button>
);

export const SubTabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; icon?: React.ReactNode; }> = ({ label, isActive, onClick, icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${isActive ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:border-slate-300 dark:text-slate-400 dark:hover:border-slate-600'}`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.min(Math.max(value, 0), 200);
    const displayPercentage = Math.min(percentage, 100);

    let colorClass = 'bg-primary-500';
    if (value >= 100) colorClass = 'bg-green-500';
    else if (value < 85) colorClass = 'bg-yellow-500';
    if (value < 50) colorClass = 'bg-red-500';

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 my-1 relative overflow-hidden">
            <div
                className={`${colorClass} h-full rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${displayPercentage}%` }}
            ></div>
             {percentage > 100 && (
                <div 
                    className="absolute top-0 left-0 h-full bg-green-300 rounded-full"
                    style={{ width: `${Math.min(percentage - 100, 100)}%` }}
                ></div>
             )}
        </div>
    );
};

export const SupermarketNavBar: React.FC<{
    supermarkets: string[];
    activeSupermarket: string;
    setActiveSupermarket: (sm: string) => void;
    onBatchExport: () => void;
    isBatchExporting: boolean;
}> = ({ supermarkets, activeSupermarket, setActiveSupermarket, onBatchExport, isBatchExporting }) => {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap mt-2 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 w-full sm:w-auto scrollbar-hide">
                {['Tổng', ...supermarkets].map(sm => (
                    <button
                        key={sm}
                        onClick={() => setActiveSupermarket(sm)}
                        className={`
                            shrink-0 px-5 py-2 text-xs font-semibold rounded-full transition-all duration-300 border
                            ${activeSupermarket === sm
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 border-primary-500'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary-400 dark:hover:border-primary-500 border-slate-200 dark:border-slate-700'}
                        `}
                    >
                        {sm === 'Tổng' ? 'CỤM' : shortenSupermarketName(sm).toUpperCase()}
                    </button>
                ))}
            </div>
            <button
                onClick={onBatchExport}
                disabled={isBatchExporting}
                className="flex items-center gap-2 text-xs font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 transition-all duration-300 px-5 py-2.5 rounded-full disabled:opacity-50 disabled:cursor-wait ml-auto sm:ml-0 shadow-md active:scale-95"
                title="Xuất hàng loạt ảnh cho tất cả siêu thị"
            >
                {isBatchExporting ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}
                <span>{isBatchExporting ? 'ĐANG XUẤT ẢNH...' : 'Xuất All'}</span>
            </button>
        </div>
    );
};
