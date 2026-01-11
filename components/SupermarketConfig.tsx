
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { DownloadIcon, XIcon, CheckCircleIcon, ChevronDownIcon, ResetIcon, AlertTriangleIcon, PencilIcon, SaveIcon } from './Icons';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import TargetHero from './TargetHero';
import Slider from './Slider';
import * as db from '../utils/db';

type UpdateCategory = 'BC Tổng hợp' | 'Thi Đua Cụm' | 'Thiết lập và cập nhật dữ liệu cho siêu thị';
type Competition = { name: string; criteria: string };
type ConfigTab = 'data' | 'revenueTarget' | 'competitionTarget';

interface SupermarketConfigProps {
    supermarketName: string | null;
    addUpdate: (id: string, message: string, category: UpdateCategory) => void;
    removeUpdate: (id: string) => void;
    competitionLuyKeData: string;
    summaryLuyKeData: string;
    onThiDuaDataChange: (supermarket: string | null, newData: string) => void;
}


// --- Validation ---
const INDUSTRY_REALTIME_HEADER = 'Nhóm ngành hàng	SL Realtime	DT Realtime (QĐ)	Target Ngày (QĐ)';
const INDUSTRY_LUYKE_HEADER = 'Nhóm ngành hàng	Số lượng	DTQĐ	Target (QĐ)	Lãi gộp QĐ';
const EMPLOYEE_DANHSACH_HEADER = 'Nhân viên	DTLK	DTQĐ	Hiệu quả QĐ	Số lượng	Đơn giá';
const EMPLOYEE_MATRAN_HEADER = 'DTQĐ	Số lượng	DTQĐ	Số lượng';
const EMPLOYEE_TRAGOP_HEADER = 'Nhân viên	HomeCredit(HC)	FECredit(FE)';

const validateIndustryRealtime = (data: string) => data.includes(INDUSTRY_REALTIME_HEADER);
const validateIndustryLuyKe = (data: string) => data.includes(INDUSTRY_LUYKE_HEADER);
const validateEmployeeDanhSach = (data: string) => data.includes(EMPLOYEE_DANHSACH_HEADER);
const validateEmployeeMatran = (data: string) => data.includes('Phòng ban') && data.includes(EMPLOYEE_MATRAN_HEADER);
const validateEmployeeTraGop = (data: string) => data.includes('Nhân viên') && (data.includes('HomeCredit') || data.includes('HC'));

// Cải tiến Validation cho Thi Đua: Linh hoạt và thông minh hơn
const validateEmployeeThiDua = (data: string) => {
    if (!data) return false;
    const lowerData = data.toLowerCase();
    
    // Kiểm tra xem có chứa từ khóa nhận diện báo cáo không (không phân biệt hoa thường)
    const hasKeywords = lowerData.includes('phòng ban') || lowerData.includes('tổng');
    
    // Kiểm tra xem có chứa ít nhất một loại chỉ số thi đua nào không
    const hasMetrics = /dtlk|dtqd|sllk|sl realtime/i.test(data);
    
    // Kiểm tra cấu trúc dòng nhân viên hoặc dòng tổng (để chắc chắn đây là bảng dữ liệu)
    const hasTableStructure = lowerData.includes('tổng') || data.includes(' - ');
    
    return hasKeywords && hasMetrics && hasTableStructure;
};


const ValidationError: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex items-center text-sm text-red-600 dark:text-red-400 mt-2">
        <AlertTriangleIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
        <span>{message}</span>
    </div>
);


// --- Reusable Components ---
const DataSection: React.FC<{ 
    title: string; 
    lastUpdated: string | null; 
    placeholder: string; 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onClear: () => void;
    error?: string | null;
}> = ({ title, lastUpdated, placeholder, value, onChange, onClear, error }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleClear = () => {
        onClear();
        textareaRef.current?.focus();
    };

    const showOverlay = value && value.length > 0 && lastUpdated && !error;

    return (
        <div>
            <div className="mb-2">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</h3>
            </div>
            <div className="relative w-full">
                {showOverlay && (
                    <div className="absolute inset-0 z-10 bg-slate-700/90 rounded-lg flex flex-col items-center justify-center text-white transition-opacity duration-300 ease-in-out">
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="h-7 w-7" />
                            <span className="font-semibold">Đã cập nhật</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-200">
                           Thời gian: {lastUpdated}
                        </p>
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    className={`
                        w-full h-16 p-3 pr-10 bg-white dark:bg-slate-700 border rounded-lg transition duration-200 resize-y placeholder-slate-400 dark:placeholder-slate-500 text-sm dark:text-slate-200
                        ${error 
                            ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent' 
                            : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-primary dark:focus:ring-primary-400 focus:border-transparent'}
                    `}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${title.toLowerCase().replace(/\s/g, '-')}-error` : undefined}
                ></textarea>
                {value && value.length > 0 && (
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Xoá nội dung"
                        className="absolute top-2 right-2 z-20 p-1 text-slate-400 dark:text-slate-300 rounded-full hover:bg-red-100 dark:hover:bg-red-800/50 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
            {error && <ValidationError message={error} />}
        </div>
    );
};

// --- Modal Chỉnh Sửa Tên Nhóm ---
const RenameCompetitionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    competitions: Competition[];
    onSave: (renames: Record<string, string>) => void;
    initialRenames: Record<string, string>;
}> = ({ isOpen, onClose, competitions, onSave, initialRenames }) => {
    const [tempRenames, setTempRenames] = useState<Record<string, string>>({});

    // Sửa lỗi: Chỉ cập nhật tempRenames từ initialRenames khi modal bắt đầu mở
    // Không cho initialRenames vào dependency để tránh việc đang gõ bị reset
    useEffect(() => {
        if (isOpen) {
            setTempRenames(initialRenames || {});
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
                <div className="p-5 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Chỉnh sửa tên hiển thị Nhóm Thi Đua</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Tên mới sẽ thay thế tên gốc trong các báo cáo</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <XIcon className="h-5 w-5 text-slate-500" />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto space-y-4">
                    {competitions.length > 0 ? (
                        competitions.map((comp) => (
                            <div key={comp.name} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="flex-1 min-w-0">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tên gốc (BI)</span>
                                    <span className="block text-sm font-medium text-slate-600 dark:text-slate-400 truncate" title={comp.name}>{comp.name}</span>
                                </div>
                                <div className="flex-1">
                                    <span className="block text-[10px] font-bold text-primary-500 uppercase tracking-wider mb-1">Tên hiển thị mới</span>
                                    <input 
                                        value={tempRenames[comp.name] || ''} 
                                        onChange={(e) => setTempRenames({ ...tempRenames, [comp.name]: e.target.value })}
                                        placeholder="Để trống nếu giữ nguyên..."
                                        className="w-full px-3 py-1.5 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600 focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center py-10 text-slate-400 italic">Chưa có dữ liệu thi đua.</p>
                    )}
                </div>
                <div className="p-4 border-t dark:border-slate-700 flex gap-3 bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800">Hủy</button>
                    <button 
                        onClick={() => { onSave(tempRenames); onClose(); }}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                        <SaveIcon className="h-4 w-4" />
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
};

interface CompetitionTargetProps {
    supermarketName: string;
    addUpdate: (id: string, message: string, category: UpdateCategory) => void;
    competitions: Competition[];
    competitionLuyKeData: string;
}

const CompetitionTarget: React.FC<CompetitionTargetProps> = ({ supermarketName, addUpdate, competitions, competitionLuyKeData }) => {
    const [isExpanded, setIsExpanded] = useIndexedDBState<boolean>(`comptarget-${supermarketName}-isExpanded`, true);
    const [competitionTargets, setCompetitionTargets] = useIndexedDBState<Record<string, number>>(`comptarget-${supermarketName}-targets`, {});
    const [nameOverrides, setNameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

    const competitionBaseTargets = useMemo(() => {
        if (!competitionLuyKeData || !supermarketName) return {};

        const lines = competitionLuyKeData.split('\n');
        const targets: Record<string, number> = {};
        let currentCompetition: string | null = null;
        const validCriterias = ['DTLK', 'DTQĐ', 'SLLK'];

        for (const line of lines) {
            const parts = line.split('\t').map(p => p.trim());
            
            if (parts.length > 2 && validCriterias.includes(parts[1]) && parts[2] === 'Target') {
                currentCompetition = parts[0];
                continue;
            }

            if (currentCompetition && parts[0].startsWith(supermarketName)) {
                if (parts.length > 2) {
                    const targetStr = parts[2].replace(/,/g, '');
                    const targetValue = parseFloat(targetStr);
                    if (!isNaN(targetValue)) {
                        targets[currentCompetition] = targetValue;
                    }
                }
            }
        }
        return targets;
    }, [competitionLuyKeData, supermarketName]);

    const groupedCompetitions = useMemo(() => {
        return competitions.reduce((acc, comp) => {
            const criteria = comp.criteria as keyof typeof acc;
            if (!acc[criteria]) {
                acc[criteria] = [];
            }
            acc[criteria].push(comp);
            return acc;
        }, {} as Record<'DTLK' | 'DTQĐ' | 'SLLK', Competition[]>);
    }, [competitions]);

    const effectiveCompetitionTargets = useMemo(() => {
        const storedTargets = competitionTargets || {};
        
        if (!competitions || competitions.length === 0) {
            return storedTargets;
        }

        const currentCompetitionNames = new Set(competitions.map(c => c.name));
        const finalTargets = { ...storedTargets };
        
        for (const comp of competitions) {
            if (finalTargets[comp.name] === undefined) {
                finalTargets[comp.name] = 100;
            }
        }
        
        for (const storedName in finalTargets) {
            if (!currentCompetitionNames.has(storedName)) {
                delete finalTargets[storedName];
            }
        }
        
        return finalTargets;
    }, [competitions, competitionTargets]);


    const handleSliderChange = (competitionName: string) => (value: number) => {
        setCompetitionTargets({
            ...effectiveCompetitionTargets,
            [competitionName]: value,
        });
        addUpdate(`comptarget-${supermarketName}-comp-${competitionName.replace(/\s/g, '')}`, `Target Thi Đua (${competitionName}) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
    };

    const criteriaOrder: Array<'DTLK' | 'DTQĐ' | 'SLLK'> = ['DTLK', 'DTQĐ', 'SLLK'];
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    return (
        <section>
            <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cập Nhật Target Thi Đua</h2>
                 <button 
                    onClick={() => setIsRenameModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                 >
                    <PencilIcon className="h-3.5 w-3.5" />
                    <span>Sửa tên nhóm</span>
                 </button>
            </div>
            <div id="competition-target-content" className="mt-6">
                {competitions && competitions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2">
                        {criteriaOrder.map(criteria => (
                            <div key={criteria} className="space-y-6">
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-slate-700">{criteria}</h3>
                                {(groupedCompetitions[criteria] && groupedCompetitions[criteria].length > 0) ? (
                                    groupedCompetitions[criteria].map(comp => {
                                        const baseTarget = competitionBaseTargets[comp.name] ?? 0;
                                        const sliderValue = effectiveCompetitionTargets[comp.name] ?? 100;
                                        const adjustedTarget = baseTarget * (sliderValue / 100);
                                        const dailyTarget = adjustedTarget / daysInMonth;
                                        
                                        const displayName = nameOverrides[comp.name] || comp.name;

                                        const displayContent = (
                                            <div>
                                                <div className="font-bold text-primary-600 dark:text-primary-400">
                                                    {sliderValue.toFixed(0)}%
                                                    <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">
                                                        ({new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(adjustedTarget)})
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                    Mục tiêu ngày: {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(dailyTarget)}
                                                </div>
                                            </div>
                                        );

                                        return (
                                            <Slider 
                                                key={comp.name}
                                                label={
                                                    <span className={nameOverrides[comp.name] ? 'text-primary-600 dark:text-primary-400 font-bold' : ''}>
                                                        {displayName}
                                                    </span>
                                                }
                                                value={sliderValue}
                                                onChange={handleSliderChange(comp.name)}
                                                onReset={() => handleSliderChange(comp.name)(100)}
                                                displayValue={displayContent}
                                                min={0}
                                                max={300}
                                                step={1}
                                                unit="%"
                                            />
                                        );
                                    })
                                ) : (
                                     <p className="text-sm text-slate-400 dark:text-slate-500 italic">Không có chương trình.</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="sm:col-span-2 lg:col-span-3 text-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Dán dữ liệu vào ô "Thi Đua Cụm - Luỹ kế tháng" ở trên để hiển thị các chương trình cần phân bổ target.
                        </p>
                    </div>
                )}
            </div>
            <RenameCompetitionModal 
                isOpen={isRenameModalOpen}
                onClose={() => setIsRenameModalOpen(false)}
                competitions={competitions}
                initialRenames={nameOverrides}
                onSave={setNameOverrides}
            />
        </section>
    );
};

interface TabButtonProps {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`
            ${isActive
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}
            whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 rounded-t-sm
        `}
        role="tab"
        aria-selected={isActive}
    >
        {children}
    </button>
);


// --- Main Component ---

const SupermarketConfig: React.FC<SupermarketConfigProps> = ({ supermarketName, addUpdate, removeUpdate, competitionLuyKeData, summaryLuyKeData, onThiDuaDataChange }) => {
    const [activeTab, setActiveTab] = useState<ConfigTab>('data');

    const danhSachId = supermarketName ? `config-${supermarketName}-danhsach` : null;
    const maTranId = supermarketName ? `config-${supermarketName}-matran` : null;
    const thiDuaId = supermarketName ? `config-${supermarketName}-thidua` : null;
    const industryRealtimeId = supermarketName ? `config-${supermarketName}-industry-realtime` : null;
    const industryLuyKeId = supermarketName ? `config-${supermarketName}-industry-luyke` : null;
    const traGopId = supermarketName ? `config-${supermarketName}-tragop` : null;

    const [danhSachData, setDanhSachData] = useIndexedDBState(danhSachId, '');
    const [maTranData, setMaTranData] = useIndexedDBState(maTranId, '');
    const [thiDuaData, setThiDuaData] = useIndexedDBState(thiDuaId, '');
    const [industryRealtimeData, setIndustryRealtimeData] = useIndexedDBState(industryRealtimeId, '');
    const [industryLuyKeData, setIndustryLuyKeData] = useIndexedDBState(industryLuyKeId, '');
    const [traGopData, setTraGopData] = useIndexedDBState(traGopId, '');

    const [danhSachTs, setDanhSachTs] = useIndexedDBState<string | null>(supermarketName ? `${danhSachId}-ts` : null, null);
    const [maTranTs, setMaTranTs] = useIndexedDBState<string | null>(supermarketName ? `${maTranId}-ts` : null, null);
    const [thiDuaTs, setThiDuaTs] = useIndexedDBState<string | null>(supermarketName ? `${thiDuaId}-ts` : null, null);
    const [industryRealtimeTs, setIndustryRealtimeTs] = useIndexedDBState<string | null>(supermarketName ? `${industryRealtimeId}-ts` : null, null);
    const [industryLuyKeTs, setIndustryLuyKeTs] = useIndexedDBState<string | null>(supermarketName ? `${industryLuyKeId}-ts` : null, null);
    const [traGopTs, setTraGopTs] = useIndexedDBState<string | null>(supermarketName ? `${traGopId}-ts` : null, null);

    const [errors, setErrors] = useIndexedDBState<Record<string, string | null>>(supermarketName ? `errors-${supermarketName}` : null, {});

    const departments = useMemo(() => {
        if (!danhSachData || !validateEmployeeDanhSach(danhSachData)) {
            return [];
        }
        const lines = danhSachData.split('\n').map(l => l.trim()).filter(l => l);
        const departmentList: { name: string; employeeCount: number }[] = [];
        let currentDept: { name: string; employeeCount: number } | null = null;

        for (const line of lines) {
            const parts = line.split('\t');
            if (line.startsWith('BP ') && parts.length > 1 && parts[0]?.trim()) {
                 if (currentDept) {
                    departmentList.push(currentDept);
                }
                currentDept = { name: parts[0].trim(), employeeCount: 0 };
            } else if (currentDept && parts.length > 1) { // Assuming an employee line has at least 2 columns (e.g., ID, Name)
                currentDept.employeeCount++;
            }
        }

        if (currentDept) {
            departmentList.push(currentDept);
        }
        
        return departmentList.sort((a,b) => a.name.localeCompare(b.name));
    }, [danhSachData]);

    const competitions = useMemo(() => {
        if (!competitionLuyKeData) return [];
        const lines = competitionLuyKeData.split('\n');
        
        const competitionList: Competition[] = [];
        const seenCompetitions = new Set<string>();
        const validCriterias = ['DTLK', 'DTQĐ', 'SLLK'];

        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length > 2 && validCriterias.includes(parts[1]?.trim()) && parts[2]?.trim() === 'Target') {
                const name = parts[0].trim();
                const criteria = parts[1].trim();

                if (name && !seenCompetitions.has(name)) {
                    competitionList.push({ name, criteria });
                    seenCompetitions.add(name);
                }
            }
        }
        
        return competitionList;
    }, [competitionLuyKeData]);

    if (!supermarketName) {
        return (
            <div className="p-6 text-center bg-slate-100 dark:bg-slate-800 rounded-lg">
                <p className="text-slate-500 dark:text-slate-400">
                    Dán dữ liệu từ "BC Tổng hợp - Luỹ kế tháng" vào ô bên trên để tự động tạo danh sách siêu thị, sau đó chọn một siêu thị để cấu hình.
                </p>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs" role="tablist">
                    <TabButton isActive={activeTab === 'data'} onClick={() => setActiveTab('data')}>Dữ liệu Báo cáo</TabButton>
                    <TabButton isActive={activeTab === 'revenueTarget'} onClick={() => setActiveTab('revenueTarget')}>Target Doanh thu</TabButton>
                    <TabButton isActive={activeTab === 'competitionTarget'} onClick={() => setActiveTab('competitionTarget')}>Target Thi đua</TabButton>
                </nav>
            </div>
            
            <div className="pt-2">
                 {/* Data Input Tab */}
                <div role="tabpanel" hidden={activeTab !== 'data'}>
                     <section>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cập Nhật Dữ Liệu Báo Cáo</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Dán dữ liệu từ các báo cáo tương ứng của siêu thị.</p>
                        <div className="mt-6 space-y-8">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-slate-700">BC Doanh thu ngành hàng</h3>
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                                    <DataSection 
                                        title="REALTIME"
                                        lastUpdated={industryRealtimeTs}
                                        placeholder={INDUSTRY_REALTIME_HEADER}
                                        value={industryRealtimeData}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const isValid = validateIndustryRealtime(val);
                                            setIndustryRealtimeData(val);
                                            if (val === '') {
                                                setErrors(prev => ({...prev, industryRealtime: null}));
                                                setIndustryRealtimeTs(null);
                                                removeUpdate(industryRealtimeId!);
                                            } else if (isValid) {
                                                setErrors(prev => ({...prev, industryRealtime: null}));
                                                setIndustryRealtimeTs(new Date().toLocaleString('vi-VN'));
                                                addUpdate(industryRealtimeId!, `Ngành hàng chính (Realtime) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                                            } else {
                                                setErrors(prev => ({...prev, industryRealtime: 'Dữ liệu không đúng định dạng.'}));
                                                setIndustryRealtimeTs(null);
                                                removeUpdate(industryRealtimeId!);
                                            }
                                        }}
                                        onClear={() => {
                                            setIndustryRealtimeData('');
                                            setIndustryRealtimeTs(null);
                                            removeUpdate(industryRealtimeId!);
                                            setErrors(prev => ({...prev, industryRealtime: null}));
                                        }}
                                        error={errors?.industryRealtime}
                                    />
                                    <DataSection 
                                        title="LUỸ KẾ THÁNG"
                                        lastUpdated={industryLuyKeTs}
                                        placeholder={INDUSTRY_LUYKE_HEADER}
                                        value={industryLuyKeData}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const isValid = validateIndustryLuyKe(val);
                                            setIndustryLuyKeData(val);
                                             if (val === '') {
                                                setErrors(prev => ({...prev, industryLuyKe: null}));
                                                setIndustryLuyKeTs(null);
                                                removeUpdate(industryLuyKeId!);
                                            } else if (isValid) {
                                                setErrors(prev => ({...prev, industryLuyKe: null}));
                                                setIndustryLuyKeTs(new Date().toLocaleString('vi-VN'));
                                                addUpdate(industryLuyKeId!, `Ngành hàng chính (Luỹ kế) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                                            } else {
                                                setErrors(prev => ({...prev, industryLuyKe: 'Dữ liệu không đúng định dạng.'}));
                                                setIndustryLuyKeTs(null);
                                                removeUpdate(industryLuyKeId!);
                                            }
                                        }}
                                        onClear={() => {
                                            setIndustryLuyKeData('');
                                            setIndustryLuyKeTs(null);
                                            removeUpdate(industryLuyKeId!);
                                            setErrors(prev => ({...prev, industryLuyKe: null}));
                                        }}
                                        error={errors?.industryLuyKe}
                                    />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-slate-700">BC Doanh thu theo nhân viên</h3>
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                                     <DataSection 
                                        title="Ngành hàng chính - Danh sách"
                                        lastUpdated={danhSachTs}
                                        placeholder={EMPLOYEE_DANHSACH_HEADER}
                                        value={danhSachData}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const isValid = validateEmployeeDanhSach(val);
                                            setDanhSachData(val);
                                             if (val === '') {
                                                setErrors(prev => ({...prev, danhSach: null}));
                                                setDanhSachTs(null);
                                                removeUpdate(danhSachId!);
                                            } else if (isValid) {
                                                setErrors(prev => ({...prev, danhSach: null}));
                                                setDanhSachTs(new Date().toLocaleString('vi-VN'));
                                                addUpdate(danhSachId!, `Nhân viên (DS) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                                            } else {
                                                setErrors(prev => ({...prev, danhSach: 'Dữ liệu không đúng định dạng.'}));
                                                setDanhSachTs(null);
                                                removeUpdate(danhSachId!);
                                            }
                                        }}
                                        onClear={() => {
                                            setDanhSachData('');
                                            setDanhSachTs(null);
                                            removeUpdate(danhSachId!);
                                            setErrors(prev => ({...prev, danhSach: null}));
                                        }}
                                        error={errors?.danhSach}
                                    />
                                     <DataSection 
                                        title="Ngành hàng chính - Ma trận"
                                        lastUpdated={maTranTs}
                                        placeholder={EMPLOYEE_MATRAN_HEADER}
                                        value={maTranData}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const isValid = validateEmployeeMatran(val);
                                            setMaTranData(val);
                                            if (val === '') {
                                                setErrors(prev => ({...prev, maTran: null}));
                                                setMaTranTs(null);
                                                removeUpdate(maTranId!);
                                            } else if (isValid) {
                                                setErrors(prev => ({...prev, maTran: null}));
                                                setMaTranTs(new Date().toLocaleString('vi-VN'));
                                                addUpdate(maTranId!, `Nhân viên (Ma trận) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                                            } else {
                                                setErrors(prev => ({...prev, maTran: 'Dữ liệu không đúng định dạng.'}));
                                                setMaTranTs(null);
                                                removeUpdate(maTranId!);
                                            }
                                        }}
                                        onClear={() => {
                                            setMaTranData('');
                                            setMaTranTs(null);
                                            removeUpdate(maTranId!);
                                            setErrors(prev => ({...prev, maTran: null}));
                                        }}
                                        error={errors?.maTran}
                                    />
                                     <DataSection 
                                        title="Chương trình thi đua"
                                        lastUpdated={thiDuaTs}
                                        placeholder="Phòng ban	Bảo Hiểm..."
                                        value={thiDuaData}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const isValid = validateEmployeeThiDua(val);
                                            /* Fix: Changed 'setUserThiDuaData' to 'setThiDuaData' as it was incorrectly named */
                                            setThiDuaData(val); // Luôn cập nhật giá trị hiển thị

                                            if (val === '') {
                                                setErrors(prev => ({...prev, thiDua: null}));
                                                setThiDuaTs(null);
                                                removeUpdate(thiDuaId!);
                                            } else if (isValid) {
                                                onThiDuaDataChange(supermarketName, val);
                                                setErrors(prev => ({...prev, thiDua: null}));
                                                setThiDuaTs(new Date().toLocaleString('vi-VN'));
                                                addUpdate(thiDuaId!, `Nhân viên (Thi đua) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                                            } else {
                                                setErrors(prev => ({...prev, thiDua: 'Dữ liệu không đúng định dạng của báo cáo thi đua.'}));
                                                setThiDuaTs(null);
                                                removeUpdate(thiDuaId!);
                                            }
                                        }}
                                        onClear={() => {
                                            setThiDuaData('');
                                            setThiDuaTs(null);
                                            removeUpdate(thiDuaId!);
                                            setErrors(prev => ({...prev, thiDua: null}));
                                        }}
                                        error={errors?.thiDua}
                                    />
                                    <DataSection 
                                        title="Trả góp"
                                        lastUpdated={traGopTs}
                                        placeholder={EMPLOYEE_TRAGOP_HEADER}
                                        value={traGopData}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const isValid = validateEmployeeTraGop(val);
                                            setTraGopData(val);
                                            if (val === '') {
                                                setErrors(prev => ({...prev, traGop: null}));
                                                setTraGopTs(null);
                                                removeUpdate(traGopId!);
                                            } else if (isValid) {
                                                setErrors(prev => ({...prev, traGop: null}));
                                                setTraGopTs(new Date().toLocaleString('vi-VN'));
                                                addUpdate(traGopId!, `Nhân viên (Trả góp) - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                                            } else {
                                                setErrors(prev => ({...prev, traGop: 'Dữ liệu không đúng định dạng.'}));
                                                setTraGopTs(null);
                                                removeUpdate(traGopId!);
                                            }
                                        }}
                                        onClear={() => {
                                            setTraGopData('');
                                            setTraGopTs(null);
                                            removeUpdate(traGopId!);
                                            setErrors(prev => ({...prev, traGop: null}));
                                        }}
                                        error={errors?.traGop}
                                    />
                                </div>
                            </div>
                        </div>
                     </section>
                </div>

                {/* Revenue Target Tab */}
                <div role="tabpanel" hidden={activeTab !== 'revenueTarget'}>
                    <TargetHero 
                        supermarketName={supermarketName}
                        addUpdate={addUpdate}
                        departments={departments}
                        summaryLuyKeData={summaryLuyKeData}
                    />
                </div>

                {/* Competition Target Tab */}
                <div role="tabpanel" hidden={activeTab !== 'competitionTarget'}>
                     <CompetitionTarget
                        supermarketName={supermarketName}
                        addUpdate={addUpdate}
                        competitions={competitions}
                        competitionLuyKeData={competitionLuyKeData}
                    />
                </div>
            </div>
        </div>
    );
};
export default SupermarketConfig;
