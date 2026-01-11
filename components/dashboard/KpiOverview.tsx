
import React from 'react';
import { UsersIcon, DocumentReportIcon, FileTextIcon, ChevronUpIcon, ChevronDownIcon } from '../Icons';
import { GaugeChart, KpiCard } from './DashboardWidgets';
import { parseNumber, roundUp } from '../../utils/dashboardHelpers';

interface KpiOverviewProps {
    isRealtime: boolean;
    kpiData: Record<string, string>;
    targets: { quyDoi: number; traGop: number };
    supermarketDailyTargets: Record<string, number>;
    activeSupermarket: string;
}

const KpiOverview: React.FC<KpiOverviewProps> = ({ isRealtime, kpiData, targets, supermarketDailyTargets, activeSupermarket }) => {
    
    const dtlk = parseNumber(kpiData.dtlk);
    const dtqd = parseNumber(kpiData.dtqd);
    const hqqd = dtlk > 0 ? ((dtqd / dtlk) - 1) * 100 : 0;
    
    let totalVuotTroi = 0;
    let htTargetVuotTroi = 0;
    let htVuotTroiColorClass = 'text-red-600 dark:text-red-400';

    if (isRealtime) {
        totalVuotTroi = supermarketDailyTargets[activeSupermarket];
        if (activeSupermarket === 'Tổng') {
            totalVuotTroi = Object.values(supermarketDailyTargets).reduce<number>((sum, value) => sum + Number(value), 0);
        }
        htTargetVuotTroi = totalVuotTroi > 0 ? (dtqd / totalVuotTroi) * 100 : 0;
        
        if (htTargetVuotTroi >= 120) htVuotTroiColorClass = 'text-green-600 dark:text-green-400';
        else if (htTargetVuotTroi >= 100) htVuotTroiColorClass = 'text-blue-600 dark:text-blue-400';
    }

    const htTargetDuKienQD_c = parseNumber(kpiData.htTargetDuKienQD);

    const renderGrowth = (val: string | undefined) => {
        if (!val || val === 'N/A' || val === '0%') return null;
        const num = parseNumber(val);
        const isPositive = num >= 0;
        
        return (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold leading-none shadow-sm ${
                isPositive 
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' 
                : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
            }`}>
                {isPositive ? <ChevronUpIcon className="h-2.5 w-2.5" /> : <ChevronDownIcon className="h-2.5 w-2.5" />}
                {Math.abs(Math.ceil(num))}%
            </span>
        );
    };
    
    return (
        <div className="js-kpi-overview-container grid grid-cols-1 lg:grid-cols-12 gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl transition-all">
            <div className="lg:col-span-3 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-700 pb-4 lg:pb-0 lg:pr-4 text-center">
                <div className="mb-1 flex items-center gap-2">
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{isRealtime ? "T.HIỆN QĐ" : "DT QĐ LUỸ KẾ"}</p>
                    {!isRealtime && renderGrowth(kpiData.dtckThangQD)}
                </div>
                
                <p className="text-4xl font-semibold text-primary-600 dark:text-primary-400 tracking-tighter mb-3 leading-none truncate w-full tabular-nums" title={roundUp(dtqd).toLocaleString('vi-VN')}>
                    {roundUp(dtqd).toLocaleString('vi-VN')}
                </p>
                
                <div className="grid grid-cols-2 gap-4 w-full bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl">
                    <div className="min-w-0">
                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-tight truncate">{isRealtime ? "DT THỰC" : "DT THỰC L.KẾ"}</p>
                        <p className="text-base font-semibold text-[#980000] dark:text-red-400 leading-none truncate tabular-nums">
                            {roundUp(dtlk).toLocaleString('vi-VN')}
                        </p>
                    </div>
                    <div className="min-w-0 border-l border-slate-200 dark:border-slate-700">
                        {isRealtime ? (
                            <div className={`${htVuotTroiColorClass} truncate pl-2`}>
                                <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-tight truncate">%HT V.TRỘI</p>
                                <p className="text-base font-semibold leading-none tabular-nums">{Math.ceil(htTargetVuotTroi)}%</p>
                            </div>
                        ) : (
                            <div className={`${htTargetDuKienQD_c >= 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} truncate pl-2`}>
                                <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-tight truncate">%HT D.KIẾN</p>
                                <p className="text-base font-semibold leading-none tabular-nums">{Math.ceil(htTargetDuKienQD_c)}%</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-4 flex items-center justify-around border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-700 py-3 lg:py-0">
                <div className="flex-1 flex justify-center border-r border-slate-50 dark:border-slate-700/50">
                    <GaugeChart value={hqqd} label="H.QUẢ QĐ" target={targets.quyDoi} size={85} strokeWidth={7} />
                </div>
                <div className="flex-1 flex justify-center">
                    <GaugeChart value={parseNumber(kpiData.tyTrongTraGop)} label="DT T.CHẬM" target={targets.traGop} size={85} strokeWidth={7} />
                </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-2 pl-0 lg:pl-3">
                <KpiCard 
                    title="L.KHÁCH" 
                    value={
                        <div className="flex items-center gap-1.5 tabular-nums">
                            <span className="text-base font-semibold leading-none">{roundUp(parseNumber(kpiData.lkhach)).toLocaleString('vi-VN')}</span>
                            {renderGrowth(kpiData.luotKhachChange)}
                        </div>
                    } 
                    color="bg-blue-50/40 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20"
                >
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><UsersIcon className="h-4 w-4 text-blue-600 dark:text-blue-400"/></div>
                </KpiCard>
                
                <KpiCard 
                    title="TLPV" 
                    value={
                        <div className="flex items-center gap-1.5 tabular-nums">
                            <span className="text-base font-semibold leading-none">{`${Math.ceil(parseNumber(kpiData.tlpv))}%`}</span>
                            {renderGrowth(kpiData.tlpvChange)}
                        </div>
                    } 
                    color="bg-green-50/40 dark:bg-green-900/10 border-green-100 dark:border-green-900/20"
                >
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg"><DocumentReportIcon className="h-4 w-4 text-green-600 dark:text-green-400"/></div>
                </KpiCard>

                <KpiCard 
                    title={isRealtime ? "BILL BÁN" : "T.CHẬM (%)"} 
                    value={
                        <div className="flex items-center gap-1.5 tabular-nums">
                            <span className="text-base font-semibold leading-none">{isRealtime ? roundUp(parseNumber(kpiData.lbillBH)).toLocaleString('vi-VN') : `${Math.ceil(parseNumber(kpiData.tyTrongTraGop))}%`}</span>
                            {!isRealtime && renderGrowth(kpiData.traGopChange)}
                        </div>
                    } 
                    color="bg-orange-50/40 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/20"
                >
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg"><FileTextIcon className="h-4 w-4 text-orange-600 dark:text-orange-400"/></div>
                </KpiCard>

                <KpiCard title="BILL T.HỘ" value={kpiData.lbillTH ? roundUp(parseNumber(kpiData.lbillTH)).toLocaleString('vi-VN') : '0'} color="bg-slate-50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-700/20">
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg"><FileTextIcon className="h-4 w-4 text-slate-500 dark:text-slate-400"/></div>
                </KpiCard>
            </div>
        </div>
    );
};

export default KpiOverview;
