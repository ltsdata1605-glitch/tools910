
import React, { useMemo, useRef, useState, useEffect } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { InstallmentRow } from '../../types/nhanVienTypes';
import { getYesterdayDateString, formatEmployeeName } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { UsersIcon, UploadIcon, CreditCardIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon } from '../Icons';
import { Switch } from '../dashboard/DashboardWidgets';

const MedalBadge: React.FC<{ rank?: number }> = ({ rank }) => {
    if (!rank) return <div className="w-7" />;
    if (rank === 1) return <span className="flex items-center justify-center w-7 h-7 bg-yellow-400 text-white rounded-full shadow-sm text-sm" title="TOP 1">🥇</span>;
    if (rank === 2) return <span className="flex items-center justify-center w-7 h-7 bg-slate-300 text-white rounded-full shadow-sm text-sm" title="TOP 2">🥈</span>;
    if (rank === 3) return <span className="flex items-center justify-center w-7 h-7 bg-amber-600 text-white rounded-full shadow-sm text-sm" title="TOP 3">🥉</span>;
    return <span className="text-slate-400 font-bold w-7 text-center text-xs tabular-nums">#{rank}</span>;
};

const AvatarUploader: React.FC<{ employeeName: string; supermarketName: string }> = ({ employeeName, supermarketName }) => {
    const dbKey = `avatar-${supermarketName}-${employeeName}`;
    const [avatarSrc, setAvatarSrc] = useIndexedDBState<string | null>(dbKey, null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setAvatarSrc(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="relative group w-8 h-8 flex-shrink-0">
            {avatarSrc ? (
                <img src={avatarSrc} alt={employeeName} className="w-full h-full rounded-full object-cover shadow-sm ring-1 ring-white dark:ring-slate-700" />
            ) : (
                <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center ring-1 ring-slate-300 dark:ring-slate-600">
                    <UsersIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
            )}
            <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity no-print"><UploadIcon className="h-3 w-3 text-white" /></button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
    );
};

const InstallmentTab: React.FC<{
    rows: InstallmentRow[];
    supermarketName: string;
    activeDepartments: string[];
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
}> = ({ rows, supermarketName, activeDepartments, highlightedEmployees, setHighlightedEmployees }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'totalPercent', direction: 'desc' });
    const [isHighlightFilterOpen, setIsHighlightFilterOpen] = useState(false);
    
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (highlightRef.current && !highlightRef.current.contains(event.target as Node)) setIsHighlightFilterOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSort = (key: string) => { setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' })); };

    const displayList = useMemo(() => {
        const isFiltering = !activeDepartments.includes('all');
        const list = rows.filter(r => r.type === 'employee').filter(r => !isFiltering || (r.department && activeDepartments.includes(r.department)));
        
        const sortedList = [...list].sort((a, b) => {
            let valA: any = 0, valB: any = 0;
            if (sortConfig.key === 'name') { valA = a.originalName || a.name; valB = b.originalName || b.name; }
            else if (sortConfig.key === 'totalDtSieuThi') { valA = a.totalDtSieuThi; valB = b.totalDtSieuThi; }
            else if (sortConfig.key === 'totalPercent') { valA = a.totalPercent; valB = b.totalPercent; }
            else if (sortConfig.key.startsWith('p-dt-')) {
                const idx = parseInt(sortConfig.key.replace('p-dt-', ''));
                valA = a.providers[idx]?.dt || 0; valB = b.providers[idx]?.dt || 0;
            } else if (sortConfig.key.startsWith('p-pct-')) {
                const idx = parseInt(sortConfig.key.replace('p-pct-', ''));
                valA = a.providers[idx]?.percent || 0; valB = b.providers[idx]?.percent || 0;
            }
            const compare = typeof valA === 'string' ? valA.localeCompare(valB) : (valA - valB);
            return sortConfig.direction === 'asc' ? compare : -compare;
        });

        // Chèn dòng bộ phận
        const finalOutput: any[] = [];
        const totalRow = rows.find(r => r.type === 'total');
        if (totalRow) finalOutput.push(totalRow);

        const currentDepts = Array.from(new Set(sortedList.map(r => r.department as string))).sort();
        currentDepts.forEach(deptName => {
            const deptEmps = sortedList.filter(r => r.department === deptName);
            if (deptEmps.length > 0) {
                finalOutput.push({ type: 'department', name: deptName });
                finalOutput.push(...deptEmps.map((emp, idx) => ({ ...emp, rank: idx + 1 })));
            }
        });

        return finalOutput;
    }, [rows, activeDepartments, sortConfig]);

    const handleExportPNG = async () => {
        if (!cardRef.current || !(window as any).html2canvas) return;
        const original = cardRef.current;
        const clone = original.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute'; clone.style.left = '-9999px'; clone.style.width = 'max-content'; clone.style.maxWidth = 'none';
        clone.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff';
        if (document.documentElement.classList.contains('dark')) clone.classList.add('dark');
        clone.querySelectorAll('.no-print, .export-button-component').forEach(el => (el as HTMLElement).style.display = 'none');
        const table = clone.querySelector('table');
        if (table) {
            table.style.width = 'max-content'; table.style.fontSize = '12px'; table.style.borderRadius = '0';
            table.querySelectorAll('th, td').forEach(el => { (el as HTMLElement).style.padding = '10px 6px'; (el as HTMLElement).style.whiteSpace = 'nowrap'; });
        }
        document.body.appendChild(clone);
        try {
            await new Promise(resolve => setTimeout(resolve, 200));
            const canvas = await (window as any).html2canvas(clone, { scale: 2.5, useCORS: true, backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff', width: clone.scrollWidth, height: clone.scrollHeight });
            const link = document.createElement('a'); link.download = `Installment_${supermarketName}.png`; link.href = canvas.toDataURL('image/png'); link.click();
        } finally { document.body.removeChild(clone); }
    };

    if (rows.length === 0) return <Card title="Phân tích Trả góp"><div className="py-20 text-center text-slate-500">Chưa có dữ liệu.</div></Card>;
    const providers = rows[0]?.providers || [];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 no-print">
                <div className="relative" ref={highlightRef}>
                    <button onClick={() => setIsHighlightFilterOpen(!isHighlightFilterOpen)} className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg border transition-all ${highlightedEmployees.size > 0 ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-300 text-slate-700'}`}>
                        <SparklesIcon className="h-4 w-4" /><span>Highlight ({highlightedEmployees.size})</span>
                    </button>
                    {isHighlightFilterOpen && (
                        <div className="absolute left-0 top-full mt-2 w-72 max-h-96 bg-white dark:bg-slate-800 rounded-xl shadow-xl border z-50 p-2 overflow-y-auto">
                            {rows.filter(r => r.type === 'employee').map(emp => (
                                <div key={emp.originalName} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer" onClick={() => setHighlightedEmployees(prev => { const n = new Set(prev); if (n.has(emp.originalName!)) n.delete(emp.originalName!); else n.add(emp.originalName!); return n; })}>
                                    <span className={`text-sm ${highlightedEmployees.has(emp.originalName!) ? 'font-bold' : ''}`}>{emp.name}</span>
                                    <Switch checked={highlightedEmployees.has(emp.originalName!)} onChange={() => {}} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <ExportButton onExportPNG={handleExportPNG} />
            </div>
            <div ref={cardRef}>
                <Card title={<div className="flex justify-center py-2 leading-none"><span className="text-3xl font-bold uppercase text-primary-700 dark:text-primary-400 text-center">BẢNG TRẢ GÓP NHÂN VIÊN ĐẾN NGÀY {getYesterdayDateString()}</span></div>}>
                    <div className="mt-2 w-full overflow-x-auto border border-slate-200 dark:border-slate-700 shadow-sm rounded-none">
                        <table className="min-w-full text-[13px] border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-sky-600 dark:bg-sky-800 text-white font-bold uppercase">
                                    <th rowSpan={2} onClick={() => handleSort('name')} className="px-4 py-4 text-center border-r border-sky-500/30 cursor-pointer hover:bg-sky-700 min-w-[200px]">NHÂN VIÊN</th>
                                    {providers.map(p => <th key={p.name} colSpan={2} className="px-1 py-2 text-center border-b border-sky-500/30 border-r border-sky-500/30 text-[11px] leading-tight">{p.shortName}</th>)}
                                    <th rowSpan={2} onClick={() => handleSort('totalDtSieuThi')} className="px-2 py-4 text-center border-r border-sky-500/30 bg-sky-700/40 cursor-pointer hover:bg-sky-700 text-[11px] leading-tight">DT SIÊU<br/>THỊ</th>
                                    <th rowSpan={2} onClick={() => handleSort('totalPercent')} className="px-2 py-4 text-center bg-sky-700/60 cursor-pointer hover:bg-sky-800 text-[11px] leading-tight">% TỔNG<br/>TG</th>
                                </tr>
                                <tr className="bg-sky-500 dark:bg-sky-900 text-white text-[10px] font-bold">
                                    {providers.map(p => <React.Fragment key={p.name}><th className="px-1 py-1.5 border-r border-sky-400/30 border-b border-sky-400/30 text-center">DT</th><th className="px-1 py-1.5 border-r border-sky-400/30 border-b border-sky-400/30 text-center">%</th></React.Fragment>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                {displayList.map((row, idx) => {
                                    if (row.type === 'department') return <tr key={`dept-${idx}`} className="bg-slate-50 dark:bg-slate-900/50"><td colSpan={100} className="px-4 py-2 font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{row.name}</td></tr>;
                                    const isTotal = row.type === 'total';
                                    const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                    return (
                                        <tr key={row.originalName || idx} onClick={() => !isTotal && setHighlightedEmployees(prev => { const n = new Set(prev); if (n.has(row.originalName!)) n.delete(row.originalName!); else n.add(row.originalName!); return n; })} className={`transition-all cursor-pointer ${isTotal ? 'bg-sky-50 dark:bg-sky-900/30 font-bold' : (isHighlighted ? 'bg-amber-100 dark:bg-amber-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40')}`}>
                                            <td className={`px-4 py-2 whitespace-nowrap border-r border-slate-100 dark:border-slate-700 ${isTotal ? 'bg-sky-50 dark:bg-sky-900' : 'bg-transparent'}`}>
                                                <div className="flex items-center gap-3">
                                                    <MedalBadge rank={row.rank} />
                                                    {!isTotal && <AvatarUploader employeeName={row.originalName!} supermarketName={supermarketName} />}
                                                    <span className={`font-medium ${isTotal ? 'text-sky-800 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>{row.name}</span>
                                                </div>
                                            </td>
                                            {row.providers.map((p, pIdx) => (
                                                <React.Fragment key={pIdx}>
                                                    <td className="px-1 py-2 text-center border-r border-slate-100 dark:border-slate-700 text-slate-500 font-normal tabular-nums">{p.dt > 0 ? f.format(p.dt) : '-'}</td>
                                                    <td className={`px-1 py-2 text-center border-r border-slate-100 dark:border-slate-700 font-normal tabular-nums ${p.percent >= 40 ? 'text-green-600' : 'text-slate-400'}`}>{p.percent > 0 ? `${f.format(p.percent)}%` : '-'}</td>
                                                </React.Fragment>
                                            ))}
                                            <td className="px-2 py-2 text-center border-r border-slate-100 dark:border-slate-700 font-normal text-slate-700 tabular-nums">{f.format(row.totalDtSieuThi)}</td>
                                            <td className={`px-2 py-2 text-center font-bold text-sm tabular-nums ${row.totalPercent >= 45 ? 'text-green-600' : (row.totalPercent < 40 ? 'text-red-500' : 'text-amber-600')}`}>{f.format(row.totalPercent)}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};
export default InstallmentTab;
