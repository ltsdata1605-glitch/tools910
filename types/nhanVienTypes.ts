
export type Tab = 'revenue' | 'installment' | 'competition' | 'bonus';
export type Criterion = 'DTLK' | 'DTQĐ' | 'SLLK';

export interface CompetitionHeader {
    title: string;
    originalTitle: string;
    metric: string;
}

export interface PerformanceChange {
    change: number;
    direction: 'up' | 'down';
}

export interface BonusMetrics {
    erp: number;
    tNong: number;
    tong: number;
    dKien: number;
    pNong: number;
    updatedAt?: string;
}

export interface CompetitionDataForCriterion {
    headers: CompetitionHeader[];
    employees: { name: string; originalName: string; department: string; values: (number | null)[] }[];
}

export interface RevenueRow {
    type: 'total' | 'department' | 'employee';
    name: string;
    originalName?: string;
    department?: string;
    dtlk: number;
    dtqd: number;
    hieuQuaQD: number;
    soLuong?: number;
    donGia?: number;
}

export interface InstallmentProvider {
    name: string;
    shortName: string;
    dt: number;
    percent: number;
}

export interface InstallmentRow {
    type: 'total' | 'department' | 'employee';
    name: string;
    originalName?: string;
    department?: string;
    providers: InstallmentProvider[];
    totalDtSieuThi: number;
    totalPercent: number;
}

export interface SnapshotMetadata {
    id: string;
    name: string;
    date: string;
}

export interface SnapshotData {
    danhSachData: string;
    thiDuaData: string;
}

export interface Version {
    name: string;
    selectedCompetitions: string[];
}

export interface Employee {
    name: string;
    originalName: string;
    department: string;
}

export type ManualDeptMapping = Record<string, string[]>;
