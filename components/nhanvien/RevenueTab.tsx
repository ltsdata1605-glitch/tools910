
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { SpinnerIcon, ChevronDownIcon, UsersIcon, UploadIcon, SaveIcon, TrashIcon, CogIcon, XIcon, CheckCircleIcon } from '../Icons';
import { RevenueRow, Employee, PerformanceChange, SnapshotData, SnapshotMetadata } from '../../types/nhanVienTypes';
import { roundUp, getYesterdayDateString, parseNumber } from '../../utils/nhanVienHelpers';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import * as db from '../../utils/db';
import { parseRevenueData } from '../../utils/nhanVienHelpers';

const MedalBadge: React.FC<{ rank?: number }> = ({ rank }) => {
    if (!rank) return <div className="w-7" />;
    if (rank === 1) return <span className="flex items-center justify-center w-7 h-7 bg-yellow-400 text-white rounded-full shadow-sm text-sm" title="TOP 1">🥇</span>;
    if (rank === 2) return <span className="flex items-center justify-center w-7 h-7 bg-slate-300 text-white rounded-full shadow-sm text-sm" title="TOP 2">🥈</span>;
    if (rank === 3) return <span className="flex items-center justify-center w-7 h-7 bg-amber-600 text-white rounded-full shadow-sm text-sm" title="TOP 3">🥉</span>;
    return <span className="text-slate-400 font-bold w-7 text-center text-xs tabular-nums">#{rank}</span>;
};

// --- Vivid/Hot Color Palette ---
const VIVID_COLORS = [
    { hex: '#22c55e', name: 'Xanh lá' },
    { hex: '#3b82f6', name: 'Xanh dương' },
    { hex: '#06b6d4', name: 'Xanh lơ' },
    { hex: '#eab308', name: 'Vàng' },
    { hex: '#f97316', name: 'Cam' },
    { hex: '#ef4444', name: 'Đỏ' },
    { hex: '#ec4899', name: 'Hồng' },
    { hex: '#a855f7', name: 'Tím' },
    { hex: '#475569', name: 'Xám' },
];

interface RangeConfig {
    threshold: number;
    color: string;
}

interface CriterionConfig {
    good: RangeConfig;
    average: RangeConfig;
    bad: { color: string };
}

interface ColorSettings {
    ht: CriterionConfig;
    hqqd: CriterionConfig;
    tragop: CriterionConfig;
    dtqd: CriterionConfig;
    dtthuc: CriterionConfig;
}

const DEFAULT_COLOR_SETTINGS: ColorSettings = {
    ht: { good: { threshold: 100, color: '#22c55e' }, average: { threshold: 85, color: '#eab308' }, bad: { color: '#ef4444' } },
    hqqd: { good: { threshold: 35, color: '#22c55e' }, average: { threshold: 30, color: '#eab308' }, bad: { color: '#ef4444' } },
    tragop: { good: { threshold: 45, color: '#22c55e' }, average: { threshold: 40, color: '#eab308' }, bad: { color: '#ef4444' } },
    dtqd: { good: { threshold: 50, color: '#3b82f6' }, average: { threshold: 20, color: '#eab308' }, bad: { color: '#ef4444' } },
    dtthuc: { good: { threshold: 50, color: '#475569' }, average: { threshold: 20, color: '#eab308' }, bad: { color: '#ef4444' } },
};

const CompactColorPicker: React.FC<{ selected: string; onSelect: (hex: string) => void }> = ({ selected, onSelect }) => (
    <div className="flex gap-1">
        {VIVID_COLORS.map(c => (
            <button
                key={c.hex}
                onClick={() => onSelect(c.hex)}
                className={`w-5 h-5 rounded-full border transition-transform ${selected === c.hex ? 'border-slate-900 dark:border-white scale-125 z-10' : 'border-transparent hover:scale-110'}`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
            />
        ))}
    </div>
);

const ColorSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    settings: ColorSettings;
    onSave: (s: ColorSettings) => void;
}> = ({ isOpen, onClose, settings, onSave }) => {
    const [temp, setTemp] = useState<ColorSettings>(settings);
    useEffect(() => { if (isOpen) setTemp(settings); }, [settings, isOpen]);

    if (!isOpen) return null;

    const renderRow = (label: string, key: keyof ColorSettings, isCurrency = false) => (
        <div className="py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <p className="text-[11px] font-black text-primary-600 uppercase mb-2 tracking-wider">{label} {isCurrency ? '(Tr)' : '(%)'}</p>
            <div className="space-y-3">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[100px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Tốt (≥)</span>
                        <input type="number" value={temp[key].good.threshold} onChange={e => setTemp({...temp, [key]: {...temp[key], good: {...temp[key].good, threshold: Number(e.target.value)}}})} className="w-12 p-1 text-xs border rounded bg-white dark:bg-slate-800" />
                    </div>
                    <CompactColorPicker selected={temp[key].good.color} onSelect={hex => setTemp({...temp, [key]: {...temp[key], good: {...temp[key].good, color: hex}}})} />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[100px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">TB (≥)</span>
                        <input type="number" value={temp[key].average.threshold} onChange={e => setTemp({...temp, [key]: {...temp[key], average: {...temp[key].average, threshold: Number(e.target.value)}}})} className="w-12 p-1 text-xs border rounded bg-white dark:bg-slate-800" />
                    </div>
                    <CompactColorPicker selected={temp[key].average.color} onSelect={hex => setTemp({...temp, [key]: {...temp[key], average: {...temp[key].average, color: hex}}})} />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[100px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Yếu (&lt;)</span>
                        <div className="w-12 text-[10px] text-slate-400 italic">Auto</div>
                    </div>
                    <CompactColorPicker selected={temp[key].bad.color} onSelect={hex => setTemp({...temp, [key]: {...temp[key], bad: {...temp[key].bad, color: hex}}})} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 w-full max-w-lg border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><CogIcon className="h-5 w-5 text-primary-500" />Cấu hình màu hiển thị</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><XIcon className="h-5 w-5 text-slate-500" /></button>
                </div>
                <div className="overflow-y-auto pr-2 flex-1 scrollbar-thin">
                    {renderRow("% Hoàn thành", "ht")}
                    {renderRow("Hiệu quả quy đổi", "hqqd")}
                    {renderRow("% Trả góp", "tragop")}
                    {renderRow("Doanh thu quy đổi", "dtqd", true)}
                    {renderRow("Doanh thu thực", "dtthuc", true)}
                </div>
                <div className="mt-5 flex gap-3 flex-shrink-0">
                    <button onClick={() => setTemp(DEFAULT_COLOR_SETTINGS)} className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-lg hover:bg-slate-50">Mặc định</button>
                    <button onClick={() => { onSave(temp); onClose(); }} className="flex-1 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 active:scale-95 transition-all">Lưu cấu hình</button>
                </div>
            </div>
        </div>
    );
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
            {avatarSrc ? <img src={avatarSrc} alt={employeeName} className="w-full h-full rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-700" /> : <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center ring-2 ring-slate-300 dark:border-slate-600"><UsersIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" /></div>}
            <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity no-print"><UploadIcon className="h-4 w-4 text-white" /></button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
    );
};

const RevenueView: React.FC<{
    rows: RevenueRow[];
    supermarketName: string;
    departmentNames: string[];
    performanceChanges: Map<string, PerformanceChange>;
    onViewTrend: (employee: Employee) => void;
    highlightedEmployees: Set<string>;
    setHighlightedEmployees: React.Dispatch<React.SetStateAction<Set<string>>>;
    snapshotId?: string | null;
    setSnapshotId: (id: string | null) => void;
    snapshots: SnapshotMetadata[];
    handleSaveSnapshot: () => void;
    handleDeleteSnapshot: (id: string, name: string) => void;
    supermarketTarget: number;
    departmentWeights: Record<string, number>;
    deptEmployeeCounts: Record<string, number>;
    employeeInstallmentMap: Map<string, number>;
}> = ({ 
    rows, supermarketName, departmentNames, performanceChanges, onViewTrend, 
    highlightedEmployees, setHighlightedEmployees, snapshotId, setSnapshotId,
    snapshots, handleSaveSnapshot, handleDeleteSnapshot,
    supermarketTarget, departmentWeights, deptEmployeeCounts, employeeInstallmentMap
}) => {
    const [isLoading, setIsLoading] = useState(supermarketName && rows.length === 0);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dtqd', direction: 'desc' });
    const [snapshotRows, setSnapshotRows] = useState<RevenueRow[]>([]);
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorSettings, setColorSettings] = useIndexedDBState<ColorSettings>('rev-colors-v4', DEFAULT_COLOR_SETTINGS);

    const cardRef = useRef<HTMLDivElement>(null);
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

    useEffect(() => {
        const loadSnapshotData = async () => {
            if (snapshotId && supermarketName) {
                const data: SnapshotData | undefined = await db.get(`snapshot-data-${supermarketName}-${snapshotId}`);
                if (data?.danhSachData) setSnapshotRows(parseRevenueData(data.danhSachData));
            } else setSnapshotRows([]);
        };
        loadSnapshotData();
    }, [snapshotId, supermarketName]);

    useEffect(() => { setIsLoading(!!(supermarketName && rows.length === 0)); }, [rows, supermarketName]);

    const displayList = useMemo(() => {
        const isFiltering = !departmentNames.includes('all');
        const allDepts = Array.from(new Set(rows.filter(r => r.type === 'employee' && r.department).map(r => r.department as string))).sort();
        const deptsToProcess = isFiltering ? departmentNames : allDepts;
        let finalOutput: any[] = [];

        deptsToProcess.forEach(deptName => {
            let deptEmployees = rows.filter(r => r.type === 'employee' && r.department === deptName).map(e => {
                const weight = (departmentWeights[deptName] || 0) / 100;
                const empCount = deptEmployeeCounts[deptName] || 1;
                const empTarget = supermarketTarget > 0 ? (supermarketTarget * weight) / empCount : 0;
                return { 
                    ...e, 
                    calculatedTarget: empTarget, 
                    calculatedCompletion: empTarget > 0 ? (e.dtqd / empTarget) * 100 : 0, 
                    calculatedInstallment: employeeInstallmentMap.get(e.originalName || '') || 0 
                };
            });

            deptEmployees.sort((a, b) => {
                let valA: any, valB: any;
                if (sortConfig.key === 'name') { valA = a.originalName || a.name; valB = b.originalName || b.name; }
                else if (sortConfig.key === 'target') { valA = a.calculatedTarget; valB = b.calculatedTarget; }
                else if (sortConfig.key === 'completion') { valA = a.calculatedCompletion; valB = b.calculatedCompletion; }
                else if (sortConfig.key === 'installment') { valA = a.calculatedInstallment; valB = b.calculatedInstallment; }
                else if (sortConfig.key === 'hqqd') { valA = a.hieuQuaQD; valB = b.hieuQuaQD; }
                else { valA = (a as any)[sortConfig.key]; valB = (b as any)[sortConfig.key]; }
                const compare = typeof valA === 'string' && typeof valB === 'string' ? valA.localeCompare(valB) : (valA || 0) - (valB || 0);
                return sortConfig.direction === 'asc' ? compare : -compare;
            });

            if (deptEmployees.length > 0) {
                if (deptsToProcess.length > 1) finalOutput.push({ type: 'department', name: deptName });
                finalOutput.push(...deptEmployees.map((emp, index) => {
                    let snapshotChange;
                    if (snapshotId && emp.originalName) {
                        const old = snapshotRows.find(sr => sr.originalName === emp.originalName);
                        if (old && old.dtqd > 0) {
                            const diff = ((emp.dtqd - old.dtqd) / old.dtqd) * 100;
                            if (Math.abs(diff) >= 1) snapshotChange = { change: diff, direction: diff >= 0 ? 'up' : 'down' };
                        }
                    }
                    return { ...emp, rank: index + 1, snapshotChange };
                }));
            }
        });
        return finalOutput;
    }, [rows, departmentNames, sortConfig, snapshotId, snapshotRows, departmentWeights, deptEmployeeCounts, supermarketTarget, employeeInstallmentMap]);

    const handleSort = (key: string) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'desc' ? 'asc' : 'desc' }));

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
            table.style.width = 'max-content'; table.style.borderRadius = '0';
            table.querySelectorAll('th, td').forEach(el => { (el as HTMLElement).style.padding = '12px 10px'; (el as HTMLElement).style.whiteSpace = 'nowrap'; });
        }
        document.body.appendChild(clone);
        try {
            await new Promise(resolve => setTimeout(resolve, 150));
            const titleElement = clone.querySelector('.card-title-text') as HTMLElement;
            if (titleElement) {
                titleElement.style.width = '100%'; titleElement.style.display = 'flex'; titleElement.style.justifyContent = 'center'; titleElement.style.textAlign = 'center';
                const span = titleElement.querySelector('span');
                if (span) { span.style.fontSize = '32px'; span.style.fontWeight = '900'; span.style.display = 'block'; span.style.width = '100%'; span.style.textAlign = 'center'; }
            }
            const canvas = await (window as any).html2canvas(clone, { scale: 3, useCORS: true, backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff', width: clone.scrollWidth, height: clone.scrollHeight });
            const link = document.createElement('a'); link.download = `DT_NhanVien_${supermarketName}.png`; link.href = canvas.toDataURL('image/png'); link.click();
        } finally { document.body.removeChild(clone); }
    };
    
    const cardTitle = (
        <div className="card-title-text flex flex-col items-center justify-center w-full">
            <span className="text-3xl font-bold uppercase text-primary-700 dark:text-primary-400 text-center leading-none py-1">
                BẢNG DOANH THU NHÂN VIÊN ĐẾN NGÀY {getYesterdayDateString()}
            </span>
        </div>
    );

    const getDynamicColor = (val: number, config: CriterionConfig) => {
        if (val >= config.good.threshold) return config.good.color;
        if (val >= config.average.threshold) return config.average.color;
        return config.bad.color;
    };

    if (!supermarketName) return <Card title="Phân tích Nhân viên"><div className="py-12 text-center text-slate-500">Vui lòng chọn siêu thị.</div></Card>;
    if (isLoading) return <Card title={cardTitle}><div className="flex items-center justify-center py-20"><SpinnerIcon className="h-12 w-12 text-primary-500 animate-spin" /></div></Card>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 no-print">
                <div className="flex items-center gap-3">
                    <UsersIcon className="h-4 w-4 text-slate-400" />
                    <select value={snapshotId || ''} onChange={(e) => setSnapshotId(e.target.value || null)} className="pl-3 pr-8 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg outline-none min-w-[180px] appearance-none cursor-pointer">
                        <option value="">So sánh: Hiện tại</option>
                        {snapshots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleSaveSnapshot} className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-sm font-bold rounded-lg border border-primary-200 dark:border-primary-800 hover:bg-primary-100 transition-all active:scale-95"><SaveIcon className="h-4 w-4" /><span>Snapshot</span></button>
                    <button onClick={() => setIsColorModalOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors" title="Cấu hình màu"><CogIcon className="h-4 w-4" /></button>
                    <ExportButton onExportPNG={handleExportPNG} />
                </div>
            </div>

            <div ref={cardRef}>
                <Card title={cardTitle}>
                    <div className="mt-2 w-full overflow-x-auto border border-slate-200 dark:border-slate-700 shadow-sm rounded-none">
                        <table className="min-w-full text-[13px]">
                            <thead className="bg-sky-600 dark:bg-sky-800 text-white font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-4 text-center cursor-pointer select-none border-r border-sky-500/30" onClick={() => handleSort('name')}>Nhân viên</th>
                                    <th className="px-3 py-4 text-center cursor-pointer select-none border-r border-sky-500/30 bg-sky-700/40" onClick={() => handleSort('dtlk')}>DT THỰC</th>
                                    <th className="px-3 py-4 text-center cursor-pointer select-none border-r border-sky-500/30 bg-sky-700/40" onClick={() => handleSort('dtqd')}>DTQĐ</th>
                                    <th className="px-3 py-4 text-center cursor-pointer select-none border-r border-sky-500/30 bg-sky-700/50" onClick={() => handleSort('target')}>M.TIÊU</th>
                                    <th className="px-3 py-4 text-center cursor-pointer select-none border-r border-sky-500/30 bg-sky-700/50" onClick={() => handleSort('completion')}>%HT</th>
                                    <th className="px-3 py-4 text-center cursor-pointer select-none border-r border-sky-500/30" onClick={() => handleSort('hqqd')}>HQQĐ</th>
                                    <th className="px-3 py-4 text-center cursor-pointer select-none" onClick={() => handleSort('installment')}>%T.GÓP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                {displayList.map((row, idx) => {
                                    if (row.type === 'department') return <tr key={`dept-${idx}`} className="bg-slate-100 dark:bg-slate-900/80"><td colSpan={7} className="px-4 py-2 font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{row.name}</td></tr>;
                                    const isHighlighted = highlightedEmployees.has(row.originalName || '');
                                    return (
                                        <tr key={row.originalName} onClick={() => setHighlightedEmployees(prev => { const n = new Set(prev); if (n.has(row.originalName!)) n.delete(row.originalName!); else n.add(row.originalName!); return n; })} className={`transition-all group cursor-pointer ${isHighlighted ? 'bg-amber-100 dark:bg-amber-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                            <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 dark:border-slate-700 min-w-[240px]">
                                                <div className="flex items-center gap-3">
                                                    <MedalBadge rank={row.rank} />
                                                    <AvatarUploader employeeName={row.originalName!} supermarketName={supermarketName} />
                                                    <div className="flex flex-col min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={(e) => { e.stopPropagation(); onViewTrend(row as Employee); }} className="text-left font-bold text-primary-600 dark:text-primary-400 hover:underline truncate">{row.name}</button>
                                                            {row.snapshotChange && <div className={`flex items-center gap-1 text-[10px] font-bold ${row.snapshotChange.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>{row.snapshotChange.direction === 'down' && <ChevronDownIcon className="h-2.5 w-2.5" />}{row.snapshotChange.change.toFixed(0)}%</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 font-semibold" style={{ color: getDynamicColor(row.dtlk, colorSettings.dtthuc) }}>{f.format(roundUp(row.dtlk))}</td>
                                            <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 font-bold" style={{ color: getDynamicColor(row.dtqd, colorSettings.dtqd) }}>{f.format(roundUp(row.dtqd))}</td>
                                            <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 bg-sky-50/20 italic font-bold text-slate-500 dark:text-slate-400">{f.format(roundUp(row.calculatedTarget || 0))}</td>
                                            <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 bg-sky-50/20 font-black" style={{ color: getDynamicColor(row.calculatedCompletion, colorSettings.ht) }}>{roundUp(row.calculatedCompletion)}%</td>
                                            <td className="px-3 py-3 text-center border-r border-slate-100 dark:border-slate-700 font-bold" style={{ color: getDynamicColor(row.hieuQuaQD * 100, colorSettings.hqqd) }}>{(row.hieuQuaQD * 100).toFixed(0)}%</td>
                                            <td className="px-3 py-3 text-center font-black" style={{ color: getDynamicColor(row.calculatedInstallment, colorSettings.tragop) }}>{roundUp(row.calculatedInstallment)}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            <ColorSettingsModal isOpen={isColorModalOpen} onClose={() => setIsColorModalOpen(false)} settings={colorSettings} onSave={setColorSettings} />
        </div>
    );
};

export default RevenueView;
