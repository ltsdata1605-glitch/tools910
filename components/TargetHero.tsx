
import React, { useMemo, useState, useEffect } from 'react';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import Card from './Card';
import { ChevronDownIcon, XIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon } from './Icons';
import Slider from './Slider';
import { ManualDeptMapping } from '../types/nhanVienTypes';

type UpdateCategory = 'BC Tổng hợp' | 'Thi Đua Cụm' | 'Thiết lập và cập nhật dữ liệu cho siêu thị';

interface TargetHeroProps {
    supermarketName: string;
    addUpdate: (id: string, message: string, category: UpdateCategory) => void;
    departments: { name: string; employeeCount: number }[];
    summaryLuyKeData: string;
}

const CreateDeptModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (name: string, employeeNames: string[]) => void;
    allEmployees: { name: string; originalName: string }[];
    existingMapping: ManualDeptMapping;
    editingDept?: { name: string; employees: string[] } | null;
}> = ({ isOpen, onClose, onSave, allEmployees, existingMapping, editingDept }) => {
    const [name, setName] = useState('');
    const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingDept) {
                setName(editingDept.name);
                setSelectedEmps(new Set(editingDept.employees));
            } else {
                setName('');
                setSelectedEmps(new Set());
            }
            setSearchTerm('');
        }
    }, [isOpen, editingDept]);

    if (!isOpen) return null;

    // Lấy danh sách nhân viên đã được gán cho các bộ phận khác
    const assignedInOtherDepts = new Set(
        Object.entries(existingMapping)
            .filter(([deptName]) => deptName !== editingDept?.name)
            .flatMap(([_, emps]) => emps)
    );

    const availableEmps = allEmployees.filter(emp => !assignedInOtherDepts.has(emp.originalName));
    const filteredEmps = availableEmps.filter(emp => emp.originalName.toLowerCase().includes(searchTerm.toLowerCase()));

    const toggleEmp = (originalName: string) => {
        const next = new Set(selectedEmps);
        if (next.has(originalName)) next.delete(originalName);
        else next.add(originalName);
        setSelectedEmps(next);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg">{editingDept ? 'Sửa bộ phận' : 'Tạo Bộ phận mới'}</h3>
                    <button onClick={onClose}><XIcon className="h-5 w-5 text-slate-400" /></button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên bộ phận</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Nhóm Online, BP Kho..." className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between">
                            <span>Chọn nhân viên ({selectedEmps.size})</span>
                        </label>
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm tên nhân viên..." className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 text-sm mb-2" />
                        <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2 bg-slate-50 dark:bg-slate-900/50">
                            {filteredEmps.length > 0 ? filteredEmps.map(emp => (
                                <label key={emp.originalName} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                    <input type="checkbox" checked={selectedEmps.has(emp.originalName)} onChange={() => toggleEmp(emp.originalName)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4" />
                                    <span className="text-sm">{emp.originalName}</span>
                                </label>
                            )) : <p className="text-center text-xs text-slate-400 py-4 italic">Không còn nhân viên trống</p>}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t dark:border-slate-700 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-sm font-bold">Hủy</button>
                    <button 
                        disabled={!name.trim() || selectedEmps.size === 0}
                        onClick={() => { onSave(name.trim(), Array.from(selectedEmps)); onClose(); }}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                    >Lưu bộ phận</button>
                </div>
            </div>
        </div>
    );
};

const TargetHero: React.FC<TargetHeroProps> = ({ supermarketName, addUpdate, departments, summaryLuyKeData }) => {
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
    const [traGop, setTraGop] = useIndexedDBState<number>(`targethero-${supermarketName}-tragop`, 45);
    const [quyDoi, setQuyDoi] = useIndexedDBState<number>(`targethero-${supermarketName}-quydoi`, 40);
    const [totalTarget, setTotalTarget] = useIndexedDBState<number>(`targethero-${supermarketName}-total`, 100);
    const [departmentWeights, setDepartmentWeights] = useIndexedDBState<Record<string, number>>(`targethero-${supermarketName}-departmentweights`, {});
    const [manualMapping, setManualMapping] = useIndexedDBState<ManualDeptMapping>(`manual-dept-mapping-${supermarketName}`, {});
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<{ name: string; employees: string[] } | null>(null);

    const [allEmployeesRaw] = useIndexedDBState<string>(`config-${supermarketName}-danhsach`, '');
    const allEmployees = useMemo(() => {
        if (!allEmployeesRaw) return [];
        return allEmployeesRaw.split('\n')
            .map(l => l.trim())
            .filter(l => l.includes(' - ') && !l.startsWith('BP '))
            .map(l => ({ originalName: l.split('\t')[0], name: l.split('\t')[0] }));
    }, [allEmployeesRaw]);

    const baseTargetQuyDoi = useMemo(() => {
        if (!summaryLuyKeData) return null;
        const lines = String(summaryLuyKeData).split('\n');
        const supermarketLine = lines.find(line => line.trim().startsWith(supermarketName));
        if (!supermarketLine) return null;
        const columns = supermarketLine.split('\t');
        const dtDuKienQd = parseFloat(columns[5]?.replace(/,/g, '') || '0');
        const htTargetPercent = parseFloat(columns[6]?.replace('%', '') || '0');
        if (isNaN(dtDuKienQd) || isNaN(htTargetPercent) || htTargetPercent === 0) return null;
        return dtDuKienQd / (htTargetPercent / 100);
    }, [summaryLuyKeData, supermarketName]);

    const adjustedTarget = useMemo(() => baseTargetQuyDoi === null ? null : baseTargetQuyDoi * (totalTarget / 100), [baseTargetQuyDoi, totalTarget]);

    const combinedDepts = useMemo(() => {
        const manualNames = Object.keys(manualMapping);
        
        // Nếu chưa có bộ phận thủ công -> Hiện mặc định
        if (manualNames.length === 0) {
            return departments.map(d => ({ ...d, isManual: false }));
        }

        // Nếu đã có bộ phận thủ công -> Ẩn mặc định, Hiện các bộ phận mới + BP Khác
        const manualList = manualNames.map(name => ({
            name,
            employeeCount: manualMapping[name].length,
            isManual: true
        }));

        const assignedEmps = new Set(Object.values(manualMapping).flat());
        const otherEmpsCount = allEmployees.filter(e => !assignedEmps.has(e.originalName)).length;

        if (otherEmpsCount > 0) {
            manualList.push({
                name: 'BP Khác',
                employeeCount: otherEmpsCount,
                isManual: false
            });
        }

        return manualList.sort((a,b) => {
            if (a.name === 'BP Khác') return 1;
            if (b.name === 'BP Khác') return -1;
            return a.name.localeCompare(b.name);
        });
    }, [departments, manualMapping, allEmployees]);

    const effectiveWeights = useMemo(() => {
        const weights: Record<string, number> = { ...departmentWeights };
        const validNames = new Set(combinedDepts.map(d => d.name));
        
        // Dọn dẹp các bộ phận rác
        Object.keys(weights).forEach(k => { if (!validNames.has(k)) delete weights[k]; });

        let missing = (combinedDepts as any[]).filter(d => weights[d.name] === undefined);
        if (missing.length > 0) {
            const currentTotal = (combinedDepts as any[]).reduce((sum: number, d: any) => sum + (weights[d.name] || 0), 0);
            const share = Math.max(0, 100 - currentTotal) / missing.length;
            missing.forEach(d => { weights[d.name] = share; });
        }
        return weights;
    }, [departmentWeights, combinedDepts]);

    const handleDepartmentSliderChange = (deptName: string) => (newValue: number) => {
        // Fix: Explicitly type weights objects and reduce operations to avoid 'unknown' type errors
        const oldWeights: Record<string, number> = { ...effectiveWeights };
        const oldValue = oldWeights[deptName] || 0;
        const diff = newValue - oldValue;
        const newWeights: Record<string, number> = { ...oldWeights, [deptName]: newValue };
        const otherDepts = combinedDepts.filter(d => d.name !== deptName);
        if (otherDepts.length > 0) {
            const totalOtherWeight = otherDepts.reduce((sum: number, d) => sum + (oldWeights[d.name] || 0), 0);
            if (totalOtherWeight > 0.1) {
                otherDepts.forEach(d => {
                    const currentWeight = oldWeights[d.name] || 0;
                    newWeights[d.name] = Math.max(0, currentWeight - diff * (currentWeight / totalOtherWeight));
                });
            } else {
                otherDepts.forEach(d => { newWeights[d.name] = Math.max(0, (oldWeights[d.name] || 0) - diff / otherDepts.length); });
            }
        }
        // Fix: Cast Object.values to number[] to ensure reduce works correctly and type total as number
        const total = (Object.values(newWeights) as number[]).reduce((a: number, b: number) => a + b, 0);
        // Fix: total is now guaranteed to be number, allowing arithmetic operations
        if (total > 0) Object.keys(newWeights).forEach(k => {
            newWeights[k] = (newWeights[k] / total) * 100;
        });
        setDepartmentWeights(newWeights);
    };

    const handleDeleteManualDept = (name: string) => {
        if (!confirm(`Xác nhận xóa bộ phận "${name}"? Các nhân viên này sẽ được trả về nhóm "BP Khác".`)) return;
        const nextMapping = { ...manualMapping };
        delete nextMapping[name];
        setManualMapping(nextMapping);
        const nextWeights = { ...departmentWeights };
        delete nextWeights[name];
        setDepartmentWeights(nextWeights);
    };

    const handleEditManualDept = (name: string) => {
        setEditingDept({ name, employees: manualMapping[name] || [] });
        setIsModalOpen(true);
    };

    const handleSaveDept = (name: string, emps: string[]) => {
        const nextMapping = { ...manualMapping };
        if (editingDept && editingDept.name !== name) {
            delete nextMapping[editingDept.name];
        }
        nextMapping[name] = emps;
        setManualMapping(nextMapping);
    };

    return (
        <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cấu hình Target & Tỷ trọng</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <Card title="Điều chỉnh Target">
                        <div className="space-y-6 py-2">
                            <Slider label="% Target Tổng" value={totalTarget} onChange={v => setTotalTarget(v)} onReset={() => setTotalTarget(100)} max={300} unit="%" />
                            <Slider label="% Target Trả góp" value={traGop} onChange={v => setTraGop(v)} onReset={() => setTraGop(45)} max={100} unit="%" />
                            <Slider label="% Target Quy đổi" value={quyDoi} onChange={v => setQuyDoi(v)} onReset={() => setQuyDoi(40)} max={100} unit="%" />
                        </div>
                    </Card>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Phân bổ theo Bộ phận</h3>
                        <button onClick={() => { setEditingDept(null); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-all shadow-md active:scale-95">
                            <PlusIcon className="h-3.5 w-3.5" /><span>Tạo bộ phận</span>
                        </button>
                    </div>
                    <div className="space-y-4">
                        {combinedDepts.length > 0 ? combinedDepts.map(dept => {
                            const weight = effectiveWeights[dept.name] ?? 0;
                            const allocated = adjustedTarget !== null ? adjustedTarget * (weight / 100) : 0;
                            const perEmployee = dept.employeeCount > 0 ? allocated / dept.employeeCount : 0;
                            const isManual = (dept as any).isManual;
                            return (
                                <div key={dept.name} className="relative group p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all">
                                    <Slider 
                                        label={<div className="flex items-center gap-2">
                                            <span className={`font-bold ${isManual ? 'text-primary-600' : 'text-slate-700 dark:text-slate-200'}`}>{dept.name}</span>
                                            {isManual && <span className="text-[9px] bg-primary-50 dark:bg-primary-900/30 text-primary-600 px-1.5 rounded border border-primary-100">MANUAL</span>}
                                            <span className="text-[10px] text-slate-400 font-normal">({dept.employeeCount} bạn)</span>
                                        </div>}
                                        value={weight}
                                        onChange={handleDepartmentSliderChange(dept.name)}
                                        displayValue={
                                            <div className="text-right">
                                                <div className="flex items-baseline justify-end gap-1.5">
                                                    <span className="font-bold text-slate-800 dark:text-white">{weight.toFixed(1)}%</span>
                                                    <span className="text-[11px] text-primary-600 font-bold">{f.format(allocated)} Tr</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    (Chia mỗi bạn: <span className="text-slate-500 dark:text-slate-300 font-bold">{f.format(perEmployee)} Tr</span>)
                                                </div>
                                            </div>
                                        }
                                        max={100} step={0.1} unit="%"
                                    />
                                    {isManual && (
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditManualDept(dept.name)} className="p-1 text-slate-400 hover:text-primary-600"><CogIcon className="h-4 w-4" /></button>
                                            <button onClick={() => handleDeleteManualDept(dept.name)} className="p-1 text-slate-400 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
                                        </div>
                                    )}
                                </div>
                            );
                        }) : <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">Chưa có dữ liệu phân bổ</div>}
                    </div>
                </div>
            </div>
            <CreateDeptModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setEditingDept(null); }} 
                onSave={handleSaveDept}
                allEmployees={allEmployees}
                existingMapping={manualMapping}
                editingDept={editingDept}
            />
        </section>
    );
};
export default TargetHero;
