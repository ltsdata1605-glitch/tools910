import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from './Card';
import { LineChartIcon, ArchiveBoxIcon, UsersIcon, XIcon, BuildingStorefrontIcon, ChevronDownIcon, CheckCircleIcon, FilterIcon, CreditCardIcon, SparklesIcon } from './Icons';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import TrendChart, { TrendDataPoint } from './TrendChart';
import * as db from '../utils/db';
import { RevenueRow, Employee, BonusMetrics, SnapshotMetadata, SnapshotData, Tab, CompetitionDataForCriterion, Criterion, ManualDeptMapping, CompetitionHeader } from '../types/nhanVienTypes';
import { parseRevenueData, parseCompetitionData, formatEmployeeName, parseInstallmentData, parseNumber } from '../utils/nhanVienHelpers';
import RevenueView from './nhanvien/RevenueTab';
import InstallmentTab from './nhanvien/InstallmentTab';
import { BonusView, BonusDataModal } from './nhanvien/BonusTab';
import AiAssistant from './nhanvien/AiAssistant';
import { CompetitionTab } from './nhanvien/CompetitionTab';
import { shortenSupermarketName } from '../utils/dashboardHelpers';
import { Switch } from './dashboard/DashboardWidgets';

const NavTabButton: React.FC<{ tab: Tab; children: React.ReactNode; activeTab: Tab; setActiveTab: (t: Tab) => void; icon: React.ReactNode; }> = ({ tab, children, activeTab, setActiveTab, icon }) => (
    <button 
        onClick={() => setActiveTab(tab)} 
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold rounded-full transition-all duration-300 whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-400 ${
            activeTab === tab 
                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`} 
        aria-current={activeTab === tab ? 'page' : undefined}
    >
        <div className="shrink-0">{icon}</div>
        <span>{children}</span>
    </button>
);

export const NhanVien: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('revenue');
    const [supermarkets] = useIndexedDBState<string[]>('supermarket-list', []);
    const [activeSupermarket, setActiveSupermarket] = useIndexedDBState<string | null>('nhanvien-active-supermarket', null);

    useEffect(() => {
        if (!activeSupermarket && supermarkets.length > 0) {
            setActiveSupermarket(supermarkets[0]);
        }
    }, [supermarkets, activeSupermarket]);
    
    const supermarketSuffix = activeSupermarket ? String(activeSupermarket) : '';
    const [danhSachData] = useIndexedDBState<string>(activeSupermarket ? `config-${supermarketSuffix}-danhsach` : null, '');
    const [thiDuaData] = useIndexedDBState<string>(activeSupermarket ? `config-${supermarketSuffix}-thidua` : null, '');
    const [traGopData] = useIndexedDBState<string>(activeSupermarket ? `config-${supermarketSuffix}-tragop` : null, '');
    const [manualMapping] = useIndexedDBState<ManualDeptMapping>(activeSupermarket ? `manual-dept-mapping-${supermarketSuffix}` : null, {});
    
    const [bonusData, setBonusData] = useIndexedDBState<Record<string, BonusMetrics | null>>(activeSupermarket ? `bonus-data-${supermarketSuffix}` : null, {});
    const [modalEmployee, setModalEmployee] = useState<Employee | null>(null);
    const [dataVersion, setDataVersion] = useState(0);

    const employeeDepartmentMap = useMemo(() => {
        const map = new Map<string, string>();
        const baseRows = parseRevenueData(danhSachData);
        baseRows.filter(r => r.type === 'employee' && r.originalName && r.department).forEach(r => {
            map.set(r.originalName!, r.department!);
        });

        if (Object.keys(manualMapping).length > 0) {
            const assignedInManual = new Set<string>();
            Object.entries(manualMapping).forEach(([deptName, employees]) => {
                employees.forEach(empName => {
                    map.set(empName, deptName);
                    assignedInManual.add(empName);
                });
            });
            for (const [empName, dept] of map.entries()) {
                if (!assignedInManual.has(empName)) map.set(empName, 'BP Khác');
            }
        }
        return map;
    }, [danhSachData, manualMapping]);

    const revenueRows = useMemo(() => {
        const rows = parseRevenueData(danhSachData);
        const mappedRows = rows.map(row => {
            if (row.type === 'employee' && row.originalName) {
                return { ...row, department: employeeDepartmentMap.get(row.originalName) || 'BP Khác' };
            }
            return row;
        });

        const finalRows: RevenueRow[] = [];
        const totalRow = mappedRows.find(r => r.type === 'total');
        if (totalRow) finalRows.push(totalRow);

        const currentDeptsInMap = Array.from(new Set(employeeDepartmentMap.values())).sort();
        currentDeptsInMap.forEach((deptName: string) => {
            const deptEmps = mappedRows.filter(r => r.type === 'employee' && r.department === deptName);
            if (deptEmps.length > 0) {
                finalRows.push({ type: 'department', name: deptName, dtlk: 0, dtqd: 0, hieuQuaQD: 0 });
                finalRows.push(...deptEmps);
            }
        });
        return finalRows;
    }, [danhSachData, employeeDepartmentMap]);

    const departmentOptions = useMemo(() => {
        return Array.from(new Set(employeeDepartmentMap.values())).sort();
    }, [employeeDepartmentMap]);

    const [activeDepartments, setActiveDepartments] = useIndexedDBState<string[]>(activeSupermarket ? `nhanvien-active-depts-${supermarketSuffix}` : null, ['all']);
    const [isDeptFilterOpen, setIsDeptFilterOpen] = useState(false);
    const deptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (deptRef.current && !deptRef.current.contains(event.target as Node)) setIsDeptFilterOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDepartment = (dept: string) => {
        setActiveDepartments(prev => {
            if (dept === 'all') return ['all'];
            let next = Array.isArray(prev) ? prev.filter(d => d !== 'all') : [];
            if (next.includes(dept)) {
                next = next.filter(d => d !== dept);
                return next.length === 0 ? ['all'] : next;
            } else return [...next, dept];
        });
    };

    const installmentRows = useMemo(() => parseInstallmentData(traGopData, employeeDepartmentMap), [traGopData, employeeDepartmentMap]);
    const employeeInstallmentMap = useMemo(() => {
        const map = new Map<string, number>();
        installmentRows.forEach(row => { if (row.originalName) map.set(row.originalName, row.totalPercent); });
        return map;
    }, [installmentRows]);

    const allEmployees = useMemo(() => {
        return Array.from(employeeDepartmentMap.entries()).map(([originalName, department]) => ({
            name: formatEmployeeName(originalName),
            originalName,
            department
        })).sort((a,b) => a.name.localeCompare(b.name));
    }, [employeeDepartmentMap]);

    const deptEmployeeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        allEmployees.forEach(emp => { counts[emp.department] = (counts[emp.department] || 0) + 1; });
        return counts;
    }, [allEmployees]);

    const competitionData = useMemo(() => parseCompetitionData(thiDuaData, employeeDepartmentMap), [thiDuaData, employeeDepartmentMap]);
    const [versions] = useIndexedDBState<any[]>(activeSupermarket ? `versions-${supermarketSuffix}` : null, []);
    const [activeVersionName, setActiveVersionName] = useState<string | 'new' | null>(null);
    const [activeCompetitionTab, setActiveCompetitionTab] = useState<Criterion | 'nhom' | 'canhan'>('canhan');
    const [highlightedEmpArray, setHighlightedEmpArray] = useIndexedDBState<string[]>(activeSupermarket ? `highlight-employees-${supermarketSuffix}` : null, []);
    const highlightedEmployees = useMemo(() => new Set(highlightedEmpArray), [highlightedEmpArray]);
    const setHighlightedEmployees = (updater: React.SetStateAction<Set<string>>) => { const newSet = typeof updater === 'function' ? updater(highlightedEmployees) : updater; setHighlightedEmpArray(Array.from(newSet)); };

    const [selectedCompetitions, setSelectedCompetitions] = useState<Set<string>>(new Set());
    const [employeeCompetitionTargets, setEmployeeCompetitionTargets] = useState<Map<string, Map<string, number>>>(new Map());

    useEffect(() => {
        const handleDbChange = (event: CustomEvent) => { if (event.detail.key.startsWith('comptarget-') || event.detail.key.startsWith('targethero-') || event.detail.key.startsWith('manual-dept-mapping') || event.detail.key === 'supermarket-list') setDataVersion(v => v + 1); };
        window.addEventListener('indexeddb-change', handleDbChange as EventListener);
        return () => window.removeEventListener('indexeddb-change', handleDbChange as EventListener);
    }, []);

    useEffect(() => {
        const fetchTargets = async () => {
            if (!activeSupermarket) return;
            const targets = new Map<string, Map<string, number>>();
            const competitionTargetsData = await db.get(`comptarget-${supermarketSuffix}-targets`);
            const departmentWeightsData = await db.get(`targethero-${supermarketSuffix}-departmentweights`);
            const competitionLuyKeData = await db.get('competition-luy-ke');
            if (!competitionLuyKeData) return;
            const lines = String(competitionLuyKeData).split('\n');
            let currentComp: string | null = null;
            const valid = ['DTLK', 'DTQĐ', 'SLLK'];
            for (const line of lines) {
                const parts = line.split('\t').map(p => p.trim());
                if (parts.length > 2 && valid.includes(parts[1]) && parts[2] === 'Target') { currentComp = parts[0]; continue; }
                if (currentComp && parts[0] === activeSupermarket) {
                    const baseTarget = parseFloat(parts[2].replace(/,/g, '')) || 0;
                    const slider = competitionTargetsData?.[currentComp] ?? 100;
                    const adjTarget = baseTarget * (slider / 100);
                    const competitionEmployees = allEmployees;
                    let totalW = 0;
                    const empWeights = new Map<string, number>();
                    competitionEmployees.forEach(emp => { const w = departmentWeightsData?.[emp.department] ?? (100 / competitionEmployees.length); empWeights.set(emp.originalName, w); totalW += w; });
                    if (totalW > 0) {
                        if (!targets.has(currentComp)) targets.set(currentComp, new Map());
                        const compT = targets.get(currentComp)!;
                        competitionEmployees.forEach(emp => { compT.set(emp.originalName, adjTarget * (empWeights.get(emp.originalName)! / totalW)); });
                    }
                }
            }
            setEmployeeCompetitionTargets(targets);
        };
        fetchTargets();
    }, [activeSupermarket, allEmployees, dataVersion]);

    const [snapshots] = useIndexedDBState<SnapshotMetadata[]>(activeSupermarket ? `snapshots-${supermarketSuffix}` : null, []);
    const [snapshotToCompare, setSnapshotToCompare] = useState<string | null>(null);

    const [supermarketMonthlyTargets, setSupermarketMonthlyTargets] = useState<Record<string, number>>({});
    const [departmentWeights, setDepartmentWeights] = useState<Record<string, number>>({});

    useEffect(() => {
        const loadConfigs = async () => {
            if (!activeSupermarket) return;
            const summaryLuyKeData = await db.get('summary-luy-ke');
            const totalTargetPercent = await db.get(`targethero-${supermarketSuffix}-total`) ?? 100;
            if (summaryLuyKeData) {
                const lines = String(summaryLuyKeData).split('\n');
                const smLine = lines.find(l => l.trim().startsWith(activeSupermarket));
                if (smLine) {
                    const cols = smLine.split('\t');
                    const dtdk = parseNumber(cols[5]), ht = parseNumber(cols[6]);
                    if (ht > 0) setSupermarketMonthlyTargets(prev => ({ ...prev, [activeSupermarket]: (dtdk / (ht / 100)) * (totalTargetPercent / 100) }));
                }
            }
            const deptW = await db.get(`targethero-${supermarketSuffix}-departmentweights`);
            if (deptW) setDepartmentWeights(deptW);
        };
        loadConfigs();
    }, [activeSupermarket, dataVersion]);

    const allCompetitionsByCriterion = useMemo(() => ({
        DTLK: competitionData.DTLK.headers,
        DTQĐ: competitionData.DTQĐ.headers,
        SLLK: competitionData.SLLK.headers,
    }), [competitionData]);

    const individualViewEmployees = useMemo(() => {
        const depts = activeDepartments || ['all'];
        if (depts.includes('all')) return allEmployees;
        return allEmployees.filter(emp => depts.includes(emp.department));
    }, [allEmployees, activeDepartments]);

    const [selectedIndividual, setSelectedIndividual] = useState<Employee | null>(null);
    useEffect(() => {
        if (individualViewEmployees.length > 0) { setSelectedIndividual(prev => { if (prev && individualViewEmployees.some(e => e.originalName === prev.originalName)) return prev; return individualViewEmployees[0]; }); } else setSelectedIndividual(null);
    }, [individualViewEmployees]);

    return (
        <div className="space-y-6 relative">
            <header><h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Phân tích Nhân viên</h1></header>
            
            {/* Header Toolbar chuyên nghiệp, thu gọn bộ lọc */}
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl shadow-premium border border-slate-200/50 dark:border-slate-800/50">
                <div className="flex flex-col lg:flex-row items-center gap-4">
                    {/* BỘ LỌC (Thu gọn) */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative group">
                            <BuildingStorefrontIcon className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 z-10" />
                            <select 
                                value={activeSupermarket || ''} 
                                onChange={(e) => setActiveSupermarket(e.target.value)} 
                                className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 pl-8 pr-7 text-[13px] font-bold focus:ring-2 focus:ring-primary-500/20 outline-none w-[160px] truncate transition-all group-hover:border-primary-400"
                            >
                                {supermarkets.map((sm) => <option key={sm} value={sm}>{shortenSupermarketName(sm)}</option>)}
                            </select>
                            <ChevronDownIcon className="h-4 w-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className="relative" ref={deptRef}>
                            <button 
                                onClick={() => setIsDeptFilterOpen(!isDeptFilterOpen)} 
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold border rounded-xl transition-all w-[150px] shadow-sm ${isDeptFilterOpen || (activeDepartments && !activeDepartments.includes('all')) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary-400'}`}
                            >
                                <FilterIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate flex-1 text-left">{(!activeDepartments || activeDepartments.includes('all')) ? 'Tất cả BP' : `${activeDepartments.length} BP`}</span>
                                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${isDeptFilterOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isDeptFilterOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-premium z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer" onClick={() => toggleDepartment('all')}>
                                            <span className={`text-[13px] font-black ${(!activeDepartments || activeDepartments.includes('all')) ? 'text-primary-600' : 'text-slate-500'}`}>TẤT CẢ</span>
                                            <Switch checked={!activeDepartments || activeDepartments.includes('all')} onChange={() => {}} />
                                        </div>
                                        {departmentOptions.map(dept => (
                                            <div key={dept} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer" onClick={() => toggleDepartment(dept)}>
                                                <span className={`text-[13px] ${activeDepartments?.includes(dept) ? 'font-bold text-primary-600' : 'text-slate-600 dark:text-slate-300'}`}>{dept}</span>
                                                <Switch checked={!!activeDepartments?.includes(dept) && !activeDepartments?.includes('all')} onChange={() => {}} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* THANH ĐIỀU HƯỚNG TABS (Ưu tiên độ rộng) */}
                    <div className="flex-1 flex justify-end">
                        <div className="bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl flex items-center gap-0.5 overflow-x-auto scrollbar-hide w-full sm:w-auto">
                           <NavTabButton tab="revenue" activeTab={activeTab} setActiveTab={setActiveTab} icon={<LineChartIcon className="h-4 w-4" />}>Doanh thu</NavTabButton>
                           <NavTabButton tab="installment" activeTab={activeTab} setActiveTab={setActiveTab} icon={<CreditCardIcon className="h-4 w-4" />}>Trả góp</NavTabButton>
                           <NavTabButton tab="competition" activeTab={activeTab} setActiveTab={setActiveTab} icon={<SparklesIcon className="h-4 w-4" />}>Thi đua</NavTabButton>
                           <NavTabButton tab="bonus" activeTab={activeTab} setActiveTab={setActiveTab} icon={<ArchiveBoxIcon className="h-4 w-4" />}>Thưởng</NavTabButton>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                 {activeTab === 'revenue' && <RevenueView rows={revenueRows} supermarketName={activeSupermarket || ''} departmentNames={activeDepartments || ['all']} performanceChanges={new Map()} onViewTrend={() => {}} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} snapshotId={snapshotToCompare} setSnapshotId={setSnapshotToCompare} snapshots={snapshots} handleSaveSnapshot={() => {}} handleDeleteSnapshot={() => {}} supermarketTarget={supermarketMonthlyTargets[activeSupermarket || ''] || 0} departmentWeights={departmentWeights} deptEmployeeCounts={deptEmployeeCounts} employeeInstallmentMap={employeeInstallmentMap} />}
                 {activeTab === 'installment' && <InstallmentTab rows={installmentRows} supermarketName={activeSupermarket || ''} activeDepartments={activeDepartments || ['all']} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} />}
                 {activeTab === 'competition' && <CompetitionTab groupedData={competitionData} allCompetitionsByCriterion={allCompetitionsByCriterion} selectedCompetitions={selectedCompetitions} setSelectedCompetitions={setSelectedCompetitions} supermarket={activeSupermarket} versions={versions} activeVersionName={activeVersionName} setActiveVersionName={setActiveVersionName} activeCompetitionTab={activeCompetitionTab} setActiveCompetitionTab={setActiveCompetitionTab} onVersionTabClick={() => {}} onStartNewVersion={() => {}} onCancelNewVersion={() => {}} onSaveVersion={() => {}} onDeleteVersion={() => {}} employeeCompetitionTargets={employeeCompetitionTargets} allEmployees={allEmployees} performanceChanges={new Map()} individualViewEmployees={individualViewEmployees} selectedIndividual={selectedIndividual} onSelectIndividual={setSelectedIndividual} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} department={(activeDepartments && activeDepartments.length > 0) ? activeDepartments[0] : 'all'} />}
                 {activeTab === 'bonus' && <BonusView employees={allEmployees} bonusData={bonusData} revenueRows={revenueRows} supermarketName={activeSupermarket || ''} onEmployeeClick={setModalEmployee} highlightedEmployees={highlightedEmployees} setHighlightedEmployees={setHighlightedEmployees} activeDepartments={activeDepartments || ['all']} />}
            </div>
            {modalEmployee && <BonusDataModal employee={modalEmployee} onClose={() => setModalEmployee(null)} onSave={(name: string, metrics: BonusMetrics) => setBonusData(prev => ({ ...prev, [name]: metrics }))} currentBonus={bonusData?.[modalEmployee.originalName]} />}
            <AiAssistant danhSachData={danhSachData} thiDuaData={thiDuaData} />
        </div>
    );
};
export default NhanVien;