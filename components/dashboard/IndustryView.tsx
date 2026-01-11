
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { FilterIcon, CogIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { parseIndustryRealtimeData, parseIndustryLuyKeData, parseNumber, roundUp, shortenSupermarketName } from '../../utils/dashboardHelpers';
import { Switch, ProgressBar } from './DashboardWidgets';

interface IndustryViewProps {
    realtimeData: ReturnType<typeof parseIndustryRealtimeData>;
    luykeData: ReturnType<typeof parseIndustryLuyKeData>;
    isRealtime: boolean;
    activeSupermarket: string | null;
}

const IndustryView = React.forwardRef<HTMLDivElement, IndustryViewProps>((props, ref) => {
    const { realtimeData, luykeData, isRealtime, activeSupermarket } = props;
    
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>(`hidden-cols-industry-${isRealtime ? 'realtime' : 'luyke'}`, []);

    const [isIndustryFilterOpen, setIsIndustryFilterOpen] = useState(false);
    const industryFilterRef = useRef<HTMLDivElement>(null);
    const [hiddenIndustries, setHiddenIndustries] = useIndexedDBState<string[]>(`hidden-industries-${isRealtime ? 'realtime' : 'luyke'}`, []);
    const [industryFilterSearch, setIndustryFilterSearch] = useState('');

    const data = isRealtime ? realtimeData : luykeData.table;
    const { headers, rows } = data;

    const allIndustries = useMemo(() => {
        const sourceRows = isRealtime ? realtimeData.rows : luykeData.table.rows;
        return (sourceRows || [])
            .map(row => row[0])
            .filter(name => name && name !== 'Tổng');
    }, [realtimeData.rows, luykeData.table.rows, isRealtime]);

    const processedTable = useMemo(() => {
        if (!headers || headers.length === 0 || !rows || rows.length === 0) {
            return { headers: [], rows: [] };
        }
        
        let totalRow = rows.find(r => r[0] === 'Tổng');
        let otherRows = rows.filter(r => r[0] !== 'Tổng');

        const hiddenIndustriesSet = new Set(hiddenIndustries);
        otherRows = otherRows.filter(row => 
            row[0] && !hiddenIndustriesSet.has(row[0])
        );

        const htTargetIndex = headers.indexOf(isRealtime ? '% HT Target Ngày (QĐ)' : '% HT Target (QĐ)');
        if (htTargetIndex !== -1) {
            otherRows.sort((a, b) => parseNumber(b[htTargetIndex]) - parseNumber(a[htTargetIndex]));
        }
        
        const finalRows = totalRow ? [...otherRows, totalRow] : otherRows;

        return { headers, rows: finalRows };
    }, [rows, headers, isRealtime, hiddenIndustries]);
    
    const visibleColumns = useMemo(() => {
        const hiddenSet = new Set(userHiddenColumns);
        return new Set(processedTable.headers.filter(h => !hiddenSet.has(h)));
    }, [processedTable.headers, userHiddenColumns]);

    const headerMapping: Record<string, string> = {
        'Nhóm ngành hàng': 'NGÀNH HÀNG',
        'SL Realtime': 'S.LƯỢNG',
        'DT Realtime (QĐ)': 'T.HIỆN<br/>QĐ',
        'Target Ngày (QĐ)': 'M.TIÊU<br/>QĐ',
        '% HT Target Ngày (QĐ)': '%HTQĐ',
        'DT Trả Gộp': 'DT<br/>T.CHẬM',
        'DT TRẢ GÓP': 'DT<br/>T.CHẬM',
        'Tỷ Trọng Trả Góp': 'DT<br/>T.CHẬM',
        'Số lượng': 'S.LƯỢNG',
        'Target (QĐ)': 'M.TIÊU<br/>QĐ',
        '% HT Target (QĐ)': '%HTQĐ',
        '+/- DTCK Tháng (QĐ)': '+/- DTQĐ CK',
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
            if (industryFilterRef.current && !industryFilterRef.current.contains(event.target as Node)) {
                setIsIndustryFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleColumn = (header: string) => {
        setUserHiddenColumns(prev => {
            const newHidden = new Set(prev);
            if (newHidden.has(header)) newHidden.delete(header);
            else newHidden.add(header);
            return Array.from(newHidden);
        });
    };

    const actionButton = (
        <div className="industry-view-controls flex items-center gap-2 no-print">
             <div className="relative" ref={industryFilterRef}>
                <button
                    onClick={() => setIsIndustryFilterOpen(prev => !prev)}
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Lọc ngành hàng"
                >
                    <FilterIcon className="h-5 w-5" />
                </button>
                {isIndustryFilterOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 z-20 p-2 flex flex-col max-h-96 text-left">
                        <input
                            type="text"
                            value={industryFilterSearch}
                            onChange={(e) => setIndustryFilterSearch(e.target.value)}
                            placeholder="Tìm kiếm ngành hàng..."
                            className="w-full px-3 py-1.5 mb-2 text-sm border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500 dark:text-slate-200"
                        />
                        <div className="flex-1 overflow-y-auto space-y-1">
                            {allIndustries.filter(n => n.toLowerCase().includes(industryFilterSearch.toLowerCase())).map(industry => (
                                <label key={industry} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenIndustries.includes(industry)}
                                        onChange={() => setHiddenIndustries(prev => prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry])}
                                        className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-200">{industry.replace('NNH ', '')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="relative" ref={selectorRef}>
                <button
                    onClick={() => setIsColumnSelectorOpen(prev => !prev)}
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <CogIcon className="h-5 w-5" />
                </button>
                {isColumnSelectorOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 z-20 p-2 flex flex-col max-h-80 overflow-y-auto">
                        <div className="grid grid-cols-1 gap-1">
                            {processedTable.headers.map(header => (
                                <div key={header} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <label htmlFor={`col-toggle-ind-${header}`} className="text-sm text-slate-700 dark:text-slate-200 flex-grow cursor-pointer select-none" dangerouslySetInnerHTML={{ __html: headerMapping[header]?.replace(/<br\/>/g, ' ') || header }} />
                                    <Switch
                                        id={`col-toggle-ind-${header}`}
                                        checked={visibleColumns.has(header)}
                                        onChange={() => toggleColumn(header)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const title = "CHI TIẾT NGÀNH HÀNG";

    if (!headers || headers.length === 0 || !rows || rows.length === 0) {
        return (
            <Card title={title} rounded={false}>
                <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400 mt-4 font-medium italic">Chưa có dữ liệu cho siêu thị này.</div>
            </Card>
        );
    }

    return (
        <div className="js-industry-view-container">
            <Card ref={ref} title={<div className="flex flex-col items-center justify-center w-full py-1"><span className="text-3xl font-bold uppercase text-primary-700 dark:text-primary-400 text-center leading-normal tracking-tight">{title}</span></div>} actionButton={actionButton} rounded={false}>
                <div className="mt-4 overflow-hidden rounded-none">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="bg-sky-600 dark:bg-sky-700">
                                <tr>
                                    {processedTable.headers.map((h, i) => visibleColumns.has(h) ? (
                                        <th key={i} scope="col" className={`px-2 py-3.5 text-[13px] font-bold text-white uppercase tracking-tight border-r border-sky-500/50 dark:border-sky-600 last:border-r-0 text-center align-middle`} dangerouslySetInnerHTML={{ __html: headerMapping[h] || h }}>
                                        </th>
                                    ) : null)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {processedTable.rows.map((row, rIdx) => {
                                    const isTotalRow = row[0] === 'Tổng';
                                    return (
                                        <tr key={rIdx} className={isTotalRow ? 'bg-sky-600 dark:bg-sky-700 text-white' : 'bg-white dark:bg-slate-800'}>
                                            {row.map((cell, cellIndex) => {
                                                const headerName = processedTable.headers[cellIndex];
                                                if (!visibleColumns.has(headerName)) return null;

                                                const numericValue = parseNumber(cell);
                                                const isPercentCol = headerName.includes('%') || headerName === 'Tỷ Trọng Trả Góp' || headerName === 'DT Trả Gộp';
                                                const isNumericCol = !isNaN(numericValue) && !String(cell).includes('%') && cellIndex > 0;

                                                const cellContent = () => {
                                                    if (cellIndex === 0) return String(cell).replace('NNH ', '').toUpperCase();
                                                    if ((isPercentCol || isNumericCol) && numericValue === 0) return '-';
                                                    if (isPercentCol) return `${roundUp(numericValue)}%`;
                                                    if (isNumericCol) return new Intl.NumberFormat('vi-VN').format(roundUp(numericValue));
                                                    return cell;
                                                };

                                                let cellClasses = `px-3 py-3.5 whitespace-nowrap text-[13px] border-r border-slate-100 dark:border-slate-700 last:border-r-0 tabular-nums ${cellIndex > 0 ? 'text-center' : 'text-left'}`;
                                                
                                                if (isTotalRow) {
                                                    cellClasses += ' text-white font-bold';
                                                } else {
                                                    cellClasses += cellIndex === 0 ? ' font-medium' : ' font-normal';

                                                    if (isPercentCol && !isNaN(numericValue)) {
                                                        if (numericValue >= 100) cellClasses += ' text-green-600';
                                                        else if (numericValue >= 85) cellClasses += ' text-yellow-600';
                                                        else if (numericValue > 0) cellClasses += ' text-red-600';
                                                    } else {
                                                        cellClasses += ' text-slate-700 dark:text-slate-200';
                                                    }
                                                }
                                                return <td key={cellIndex} className={cellClasses}>{cellContent()}</td>;
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
});

export default IndustryView;
