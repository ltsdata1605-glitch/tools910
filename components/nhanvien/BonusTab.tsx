
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { XIcon, UsersIcon, UploadIcon, ChevronDownIcon } from '../Icons';
import { Employee, BonusMetrics } from '../../types/nhanVienTypes';
import { parseNumber, getYesterdayDateString } from '../../utils/nhanVienHelpers';
import { Switch } from '../dashboard/DashboardWidgets';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';

const AvatarDisplay: React.FC<{ employeeName: string; supermarketName: string; isHidden?: boolean }> = ({ employeeName, supermarketName, isHidden }) => {
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
    if (isHidden) return <div className="w-8 h-8 flex-shrink-0" />;
    return (
        <div className="relative group w-8 h-8 flex-shrink-0">
            {avatarSrc ? <img src={avatarSrc} alt={employeeName} className="w-full h-full rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-700" /> : <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ring-2 ring-slate-200 dark:ring-slate-600"><UsersIcon className="h-4 w-4 text-slate-400" /></div>}
            <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity no-print"><UploadIcon className="h-4 w-4 text-white" /></button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
    );
};

const MedalBadge: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank === 1) return <span className="flex items-center justify-center w-7 h-7 bg-yellow-400 text-white rounded-full shadow-sm text-sm" title="TOP 1">🥇</span>;
    if (rank === 2) return <span className="flex items-center justify-center w-7 h-7 bg-slate-300 text-white rounded-full shadow-sm text-sm" title="TOP 2">🥈</span>;
    if (rank === 3) return <span className="flex items-center justify-center w-7 h-7 bg-amber-600 text-white rounded-full shadow-sm text-sm" title="TOP 3">🥉</span>;
    return <span className="text-slate-400 font-bold w-7 text-center text-xs tabular-nums">#{rank}</span>;
};

export const BonusDataModal: React.FC<{ employee: Employee; onClose: (reason: any) => void; onSave: any; currentBonus?: any }> = ({ employee, onClose, onSave, currentBonus }) => {
    const [pastedData, setPastedData] = useState('');
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => { setPastedData(''); setError(null); textareaRef.current?.focus(); }, [employee.originalName]);

    const processAndSave = (data: string) => {
        const lines = data.split('\n').filter(l => l.trim());
        const totalLine = lines.find(l => l.startsWith('Tổng cộng'));
        if (!totalLine) { setError('Không tìm thấy dòng Tổng cộng.'); return false; }
        const parts = totalLine.split('\t');
        const erp = parseNumber(parts[2]) - parseNumber(parts[3]), tNong = parseNumber(parts[4]), tong = parseNumber(parts[8]);
        const dateRows = lines.filter(l => /^\d{2}\/\d{2}\/\d{4}/.test(l));
        if (dateRows.length === 0) { setError('Không xác định được số ngày.'); return false; }
        const dParts = dateRows[dateRows.length - 1].split('\t')[0].split('/');
        const daysInMonth = new Date(Number(dParts[2]), Number(dParts[1]), 0).getDate();
        onSave(employee.originalName, { erp, tNong, tong, dKien: (tong / dateRows.length) * daysInMonth, pNong: tong > 0 ? (tNong / tong) * 100 : 0, updatedAt: new Date().toLocaleString('vi-VN') });
        return true;
    };
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => onClose('close')}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between mb-4">
                    <h3 className="text-xl font-bold">Cập nhật thưởng: {employee.name}</h3>
                    <button onClick={() => onClose('close')}><XIcon className="h-6 w-6" /></button>
                </div>
                <textarea ref={textareaRef} value={pastedData} onChange={e => setPastedData(e.target.value)} onPaste={e => { const text = e.clipboardData.getData('text'); if (processAndSave(text)) onClose('save'); }} placeholder="Dán bảng HRM tại đây..." className="w-full h-64 p-4 border rounded-xl bg-slate-50 dark:bg-slate-900 font-mono text-xs" />
                {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
                <div className="mt-4 flex justify-end gap-2"><button onClick={() => onClose('cancel')} className="px-4 py-2 border rounded-lg">Hủy</button><button onClick={() => processAndSave(pastedData) && onClose('save')} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Lưu</button></div>
            </div>
        </div>
    );
};

export const BonusView: React.FC<{ employees: Employee[]; bonusData: any; revenueRows: any; supermarketName: string; onEmployeeClick: any; highlightedEmployees: Set<string>; setHighlightedEmployees: any; activeDepartments: string[] }> = ({ employees, bonusData, revenueRows, supermarketName, onEmployeeClick, highlightedEmployees, setHighlightedEmployees, activeDepartments }) => {
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
    const cardRef = useRef<HTMLDivElement>(null);
    const [sortField, setSortField] = useState<any>('tong'), [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc'), [showAll, setShowAll] = useState(true);

    const revenueMap = useMemo(() => {
        const m = new Map(); revenueRows.forEach((r: any) => r.type === 'employee' && m.set(r.originalName, r)); return m;
    }, [revenueRows]);

    const displayList = useMemo(() => {
        const isFiltering = !activeDepartments.includes('all');
        const depts = isFiltering ? activeDepartments : Array.from(new Set(employees.map(e => e.department))).sort();
        let out: any[] = [];
        depts.forEach(d => {
            let emps = employees.filter(e => e.department === d);
            emps.sort((a, b) => {
                const bA = bonusData[a.originalName], bB = bonusData[b.originalName], rA = revenueMap.get(a.originalName), rB = revenueMap.get(b.originalName);
                let vA = 0, vB = 0;
                if (sortField === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                if (sortField === 'dtqd') { vA = rA?.dtqd || 0; vB = rB?.dtqd || 0; }
                else if (sortField === 'hqqd') { vA = rA?.hieuQuaQD || 0; vB = rB?.hieuQuaQD || 0; }
                else { vA = bA?.[sortField] || 0; vB = bB?.[sortField] || 0; }
                return sortDir === 'asc' ? vA - vB : vB - vA;
            });
            if (emps.length > 0) { 
                if (depts.length > 1) out.push({ type: 'department', name: d }); 
                out.push(...emps.map((e, idx) => ({ ...e, rank: idx + 1 }))); 
            }
        });
        return out;
    }, [employees, activeDepartments, bonusData, revenueMap, sortField, sortDir]);

    const thresholds = useMemo(() => {
        const calculateThresholds = (key: string, isRevenueMap = false) => {
            const values = employees.map(e => isRevenueMap ? revenueMap.get(e.originalName)?.[key] || 0 : bonusData[e.originalName]?.[key] || 0).filter(v => v > 0).sort((a, b) => a - b);
            if (values.length === 0) return { top: Infinity, bottom: -Infinity };
            return { bottom: values[Math.max(0, Math.floor(values.length * 0.3))] || -Infinity, top: values[Math.max(0, Math.floor(values.length * 0.8))] || Infinity };
        };
        return { dtqd: calculateThresholds('dtqd', true), erp: calculateThresholds('erp'), tong: calculateThresholds('tong') };
    }, [employees, bonusData, revenueMap]);

    const getCellColor = (val: number, type: 'dtqd' | 'hqqd' | 'erp' | 'tnong' | 'tong' | 'pnong') => {
        if (val === 0 || isNaN(val)) return 'text-slate-700 dark:text-slate-300';
        switch (type) {
            case 'dtqd': return val >= thresholds.dtqd.top ? 'text-green-600' : (val <= thresholds.dtqd.bottom ? 'text-red-600' : 'text-slate-700 dark:text-slate-300');
            case 'hqqd': return val > 50 ? 'text-green-600' : (val < 40 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300');
            case 'erp': return val >= thresholds.erp.top ? 'text-green-600' : (val <= thresholds.erp.bottom ? 'text-red-600' : 'text-slate-700 dark:text-slate-300');
            case 'tnong': return 'text-[#980000]';
            case 'pnong':
                if (val > 60) return 'text-green-600';
                if (val > 50) return 'text-slate-900 dark:text-white';
                if (val < 50) return 'text-red-600';
                return 'text-amber-700';
            case 'tong':
                if (val >= thresholds.tong.top) return 'text-green-600';
                if (val <= thresholds.tong.bottom) return 'text-red-600';
                return 'text-slate-900 dark:text-white';
        }
        return 'text-slate-700 dark:text-slate-300';
    };

    const handleExportPNG = async () => {
        if (!cardRef.current || !(window as any).html2canvas) return;
        const original = cardRef.current;
        const clone = original.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute'; clone.style.left = '-9999px'; clone.style.width = 'max-content';
        clone.style.backgroundColor = document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff';
        if (document.documentElement.classList.contains('dark')) clone.classList.add('dark');
        
        clone.querySelectorAll('.no-print, .export-button-component').forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });

        const table = clone.querySelector('table');
        if (table) {
            table.style.width = 'max-content'; table.style.fontSize = '12px';
            table.querySelectorAll('th, td').forEach(el => { (el as HTMLElement).style.padding = '12px 8px'; (el as HTMLElement).style.whiteSpace = 'nowrap'; (el as HTMLElement).style.borderBottom = '1px solid #e2e8f0'; });
        }
        document.body.appendChild(clone);
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            const canvas = await (window as any).html2canvas(clone, { scale: 3, useCORS: true, backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff' });
            const link = document.createElement('a'); link.download = `Thuong_${supermarketName}.png`; link.href = canvas.toDataURL('image/png'); link.click();
        } finally { document.body.removeChild(clone); }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-md no-print border border-slate-200 dark:border-slate-700">
                <div className="flex gap-2 items-center">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Hiện tất cả</span>
                    <Switch checked={showAll} onChange={() => setShowAll(!showAll)} />
                </div>
                <div className="flex gap-2">
                    <ExportButton onExportPNG={handleExportPNG} />
                </div>
            </div>
            <div ref={cardRef}>
                <Card title={
                    <div className="flex flex-col items-start leading-none py-1">
                        <span className="text-3xl font-extrabold uppercase text-primary-700">HIỆU SUẤT LÀM VIỆC ĐẾN NGÀY {getYesterdayDateString()}</span>
                        <span className="text-sm italic text-slate-500 mt-2 font-medium">"Thời gian ai cũng có như nhau chỉ khác nhau ở sự nổ lực, và...Số tiền kiếm được!"</span>
                    </div>
                }>
                    <div className="mt-2 overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-none shadow-sm">
                        <table className="min-w-full text-[13px] border-collapse">
                            <thead className="bg-sky-600 text-white font-bold uppercase">
                                <tr>
                                    <th className="px-4 py-4 text-center border-r border-white/20 cursor-pointer" onClick={() => { setSortField('name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>Nhân viên</th>
                                    <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer" onClick={() => { setSortField('dtqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>DTQĐ</th>
                                    <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer" onClick={() => { setSortField('hqqd'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>HQQĐ</th>
                                    <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer" onClick={() => { setSortField('erp'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>ERP</th>
                                    <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer" onClick={() => { setSortField('tNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>T.NÓNG</th>
                                    <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer" onClick={() => { setSortField('pNong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>%T.NÓNG</th>
                                    <th className="px-3 py-4 text-center border-r border-white/20 cursor-pointer" onClick={() => { setSortField('tong'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>TỔNG</th>
                                    <th className="px-3 py-4 text-center bg-sky-700/50 cursor-pointer" onClick={() => { setSortField('dKien'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>THƯỞNG DK</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                                {displayList.map((item, idx) => {
                                    if (item.type === 'department') return <tr key={`dept-${idx}`} className="bg-slate-50 dark:bg-slate-900/50 font-black text-slate-700 dark:text-slate-300"><td colSpan={8} className="px-4 py-2 uppercase tracking-widest">{item.name}</td></tr>;
                                    const bonus = bonusData[item.originalName], rev = revenueMap.get(item.originalName);
                                    if (!showAll && !highlightedEmployees.has(item.originalName)) return null;
                                    
                                    const dtqdVal = rev?.dtqd || 0, hqqdVal = rev ? (rev.hieuQuaQD * 100) : 0, erpVal = bonus?.erp || 0, tnongVal = bonus?.tNong || 0, pnongVal = bonus?.pNong || 0, tongVal = bonus?.tong || 0, dkienVal = bonus?.dKien || 0;

                                    return (
                                        <tr key={item.originalName} className={`hover:bg-slate-50 transition-colors ${highlightedEmployees.has(item.originalName) ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`} onClick={() => onEmployeeClick(item)}>
                                            <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                                <MedalBadge rank={item.rank} />
                                                <AvatarDisplay employeeName={item.originalName} supermarketName={supermarketName} />
                                                <span className="font-bold text-primary-600 truncate">{item.name}</span>
                                            </td>
                                            <td className={`px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums font-bold ${getCellColor(dtqdVal, 'dtqd')}`}>{rev ? f.format(dtqdVal) : '-'}</td>
                                            <td className={`px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums font-bold ${getCellColor(hqqdVal, 'hqqd')}`}>{rev ? hqqdVal.toFixed(0) + '%' : '-'}</td>
                                            <td className={`px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums font-bold ${getCellColor(erpVal, 'erp')}`}>{bonus ? f.format(Math.ceil(erpVal / 1000)) : '-'}</td>
                                            <td className={`px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums font-bold ${getCellColor(tnongVal, 'tnong')}`}>{bonus ? f.format(Math.ceil(tnongVal / 1000)) : '-'}</td>
                                            <td className={`px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums font-bold ${getCellColor(pnongVal, 'pnong')}`}>{bonus ? pnongVal.toFixed(0) + '%' : '-'}</td>
                                            <td className={`px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 tabular-nums font-bold ${getCellColor(tongVal, 'tong')}`}>{bonus ? f.format(Math.ceil(tongVal / 1000)) : '-'}</td>
                                            <td className={`px-3 py-3 text-center bg-sky-50/20 tabular-nums font-black text-primary-600`}>{bonus ? f.format(Math.ceil(dkienVal / 1000)) : '-'}</td>
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
