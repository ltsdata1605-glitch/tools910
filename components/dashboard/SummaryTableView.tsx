
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../Card';
import ExportButton from '../ExportButton';
import { CogIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { parseSummaryData, roundUp, shortenSupermarketName, parseNumber } from '../../utils/dashboardHelpers';
import { Switch } from './DashboardWidgets';

interface SummaryTableViewProps {
    data: ReturnType<typeof parseSummaryData>['table'];
    isCumulative?: boolean;
    supermarketDailyTargets: Record<string, number>;
    supermarketMonthlyTargets: Record<string, number>;
    activeSupermarket: string | null;
    onExport: () => Promise<void>;
    updateTimestamp?: string | null;
    supermarketTargets: Record<string, { quyDoi: number; traGop: number }>;
}

const SummaryTableView = React.forwardRef<HTMLDivElement, SummaryTableViewProps>((props, ref) => {
    const { data, isCumulative = false, supermarketDailyTargets, supermarketMonthlyTargets, activeSupermarket, onExport, updateTimestamp, supermarketTargets } = props;
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [userHiddenColumns, setUserHiddenColumns] = useIndexedDBState<string[]>(`hidden-cols-summary-${isCumulative ? 'luyke' : 'realtime'}`, []);

    const headerMapping: Record<string, string> = {
        'Tên miền': 'SIÊU THỊ',
        'DTLK': 'DT<br/>THỰC',
        'Target (QĐ)': 'M.TIÊU<br/>QĐ',
        'Target(QĐ) V.Trội': 'M.TIÊU QĐ<br/>V.TRỘI',
        '%HT V.Trội': '%HT<br/>V.TRỘI',
        '%HT TARGET(QĐ) V.Trội': '%HT<br/>V.TRỘI',
        'Lượt Khách LK': 'L.KHÁCH',
        'Lượt Bill Bán Hàng': 'BILL BÁN',
        'Lượt bill': 'TỔNG BILL',
        'Lượt Bill Thu Hộ': 'T.HỘ',
        'TLPVTC LK': 'TLPV',
        'Tỷ Trọng Trả Góp': 'DT<br/>T.CHẬM',
        'DT Hôm Qua': 'H.QUA',
        'DT Dự Kiến': 'DTDK',
        'DT Dự Kiến (QĐ)': 'DTQĐ DK',
        '+/- DTCK Tháng (QĐ)': '+/- DTQĐ CK',
        '+/- DTCK Tháng': '+/- DTCK',
        '+/- Lượt Khách': '+/-L.KHÁCH',
        '% HT Target Dự Kiến (QĐ)': '%HTDK(QĐ)',
        '+/- Tỷ Trọng Trả Góp': '+/-%T.CHẬM',
        '+/- TLPVTC': '+/- TLPV',
        'Số lượng': 'S.LƯỢNG',
        '% HT Target (QĐ)': '%HTQĐ',
        '% HT Target Ngày (QĐ)': '%HTQĐ',
    };

    const processedTable = useMemo(() => {
        const { headers, rows } = data;
        let title: string;
        
        const today = new Date();
        const todayStr = `${today.getDate()}/${today.getMonth() + 1}`;
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getDate()}/${yesterday.getMonth() + 1}`;
        
        let displayName = 'TỔNG QUAN';
        if (activeSupermarket && activeSupermarket !== 'Tổng') {
            displayName = shortenSupermarketName(activeSupermarket).toUpperCase();
        }

        if (isCumulative) {
            title = `LUỸ KẾ DOANH THU - ${displayName} ĐẾN NGÀY ${yesterdayStr}`;
        } else {
            title = `REALTIME DOANH THU - ${displayName} NGÀY ${todayStr}`;
        }

        if (!headers || headers.length === 0) {
            return { allHeaders: [], allRows: [], title };
        }

        const nameIndexOrigin = headers.indexOf('Tên miền');
        let uniqueRows: string[][] = [];
        if (nameIndexOrigin !== -1) {
            const seenNames = new Set<string>();
            rows.forEach(row => {
                const name = row[nameIndexOrigin];
                if (!seenNames.has(name)) {
                    seenNames.add(name);
                    uniqueRows.push(row);
                }
            });
        } else {
            uniqueRows = rows;
        }

        let tempHeaders = [...headers];
        let tempRows: any[][] = JSON.parse(JSON.stringify(uniqueRows));
        
        const nameIndex = tempHeaders.indexOf('Tên miền');

        if (isCumulative) {
            const htTargetDuKienQdIndex = tempHeaders.indexOf('% HT Target Dự Kiến (QĐ)');
            const dtDuKienQdIndex = tempHeaders.indexOf('DT Dự Kiến (QĐ)');

            if (htTargetDuKienQdIndex !== -1 && nameIndex !== -1 && dtDuKienQdIndex !== -1) {
                const targetVuotTroiHeader = "Target(QĐ) V.Trội";
                const htTargetVuotTroiHeader = "%HT TARGET(QĐ) V.Trội";
                
                tempHeaders.splice(htTargetDuKienQdIndex + 1, 0, targetVuotTroiHeader, htTargetVuotTroiHeader);

                tempRows = tempRows.map(row => {
                    const newRow = [...row];
                    const supermarketName = row[nameIndex];
                    let monthlyTarget = supermarketMonthlyTargets[supermarketName] ?? 0;
                    if (supermarketName === 'Tổng') {
                        monthlyTarget = Object.values(supermarketMonthlyTargets).reduce<number>((sum, value) => sum + Number(value), 0);
                    }
                    
                    const dtDuKienQd = parseNumber(row[dtDuKienQdIndex]);
                    const ht = monthlyTarget > 0 ? (dtDuKienQd / monthlyTarget) * 100 : 0;
                    
                    newRow.splice(htTargetDuKienQdIndex + 1, 0, monthlyTarget, `${roundUp(ht)}%`);
                    return newRow;
                });
            }
        } else {
            const headersToRemove = ['Lãi gộp QĐ', '%HT Target Dự kiến (LNTT)'];
            const indicesToRemove = headersToRemove.map(h => tempHeaders.indexOf(h)).filter(i => i !== -1).sort((a, b) => b - a);
            indicesToRemove.forEach(index => tempHeaders.splice(index, 1));
            tempRows = tempRows.map(row => {
                const newRow = [...row];
                indicesToRemove.forEach(index => newRow.splice(index, 1));
                return newRow;
            });
            
            const dtlkIndex = tempHeaders.indexOf('DTLK');
            const dtqdIndex = tempHeaders.indexOf('DTQĐ');
            
            if (dtlkIndex !== -1 && dtqdIndex !== -1 && nameIndex !== -1) {
                const now = new Date();
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

                const hqqdHeader = 'HQQĐ';
                const targetVTHeader = "Target(QĐ) V.Trội";
                const htTargetVTHeader = "%HT V.Trội";

                tempHeaders.splice(dtqdIndex + 1, 0, hqqdHeader);
                
                const targetQdIndex = tempHeaders.indexOf('Target (QĐ)');
                if (targetQdIndex !== -1) {
                    tempHeaders.splice(targetQdIndex + 1, 0, targetVTHeader);
                }
                const htTargetQdIndex = tempHeaders.indexOf('% HT Target (QĐ)');
                if (htTargetQdIndex !== -1) {
                     tempHeaders.splice(htTargetQdIndex + 1, 0, htTargetVTHeader);
                }

                tempRows = tempRows.map((row) => {
                    const newRow = [...row];
                    
                    const dtlkValue = parseNumber(newRow[dtlkIndex]);
                    const dtqdValue = parseNumber(newRow[dtqdIndex]);
                    const hqqdValue = dtlkValue > 0 ? ((dtqdValue / dtlkValue) - 1) * 100 : 0;
                    
                    const supermarketName = newRow[nameIndex];
                    let monthlyTarget = supermarketMonthlyTargets[supermarketName] ?? 0;
                     if (supermarketName === 'Tổng') {
                        monthlyTarget = Object.values(supermarketMonthlyTargets).reduce<number>((sum, value) => sum + Number(value), 0);
                    }
                    const dailyTarget = monthlyTarget / daysInMonth;
                    const ht = dailyTarget > 0 ? (dtqdValue / dailyTarget) * 100 : 0;

                    newRow.splice(dtqdIndex + 1, 0, roundUp(hqqdValue) + '%');

                    const originalTargetQdIndex = data.headers.indexOf('Target (QĐ)');
                    if(originalTargetQdIndex !== -1) {
                       newRow.splice(originalTargetQdIndex + 1 + 1, 0, dailyTarget);
                    }

                    const originalHtTargetQdIndex = data.headers.indexOf('% HT Target (QĐ)');
                    if(originalHtTargetQdIndex !== -1) {
                        const htSpliceIndex = newRow.indexOf(row[originalHtTargetQdIndex]) + 1;
                        newRow.splice(htSpliceIndex, 0, `${roundUp(ht)}%`);
                    }
                    
                    return newRow;
                });
            }
        }

        const pairsToMerge = [
            { base: 'Lượt Khách LK', growth: '+/- Lượt Khách' },
            { base: 'Tỷ Trọng Trả Góp', growth: '+/- Tỷ Trọng Trả Góp' },
            { base: 'DT Dự Kiến', growth: '+/- DTCK Tháng' },
            { base: 'DT Dự Kiến (QĐ)', growth: '+/- DTCK Tháng (QĐ)' },
            { base: 'TLPVTC LK', growth: '+/- TLPVTC' }
        ];

        pairsToMerge.forEach(pair => {
            const baseIdx = tempHeaders.indexOf(pair.base);
            const growthIdx = tempHeaders.indexOf(pair.growth);

            if (baseIdx !== -1 && growthIdx !== -1) {
                tempRows = tempRows.map(row => {
                    const baseVal = row[baseIdx];
                    const growthVal = row[growthIdx];
                    
                    row[baseIdx] = {
                        value: baseVal,
                        growth: growthVal,
                        isMerged: true,
                        type: (pair.base === 'Tỷ Trọng Trả Góp' || pair.base === 'TLPVTC LK') ? 'percent' : 'number'
                    };
                    return row;
                });
                
                tempHeaders[growthIdx] = '__TO_REMOVE__';
            }
        });

        const finalHeaders: string[] = [];
        const removeIndices: number[] = [];
        
        tempHeaders.forEach((h, i) => {
            if (h === '__TO_REMOVE__') removeIndices.push(i);
            else finalHeaders.push(h);
        });

        tempRows = tempRows.map(row => row.filter((_, i) => !removeIndices.includes(i)));
        tempHeaders = finalHeaders;
        
        const totalRowIndex = tempRows.findIndex(row => row[nameIndex] === 'Tổng');
        let totalRow = null;
        if (totalRowIndex > -1) {
            totalRow = tempRows.splice(totalRowIndex, 1)[0];
        }
        
        let sortKey = '';
        if (isCumulative) {
            if (tempHeaders.includes('%HT TARGET(QĐ) V.Trội')) sortKey = '%HT TARGET(QĐ) V.Trội';
            else sortKey = '% HT Target Dự Kiến (QĐ)';
        } else {
            if (tempHeaders.includes('%HT V.Trội')) sortKey = '%HT V.Trội';
            else sortKey = '% HT Target (QĐ)';
        }

        const sortIndex = tempHeaders.indexOf(sortKey);
        if (sortIndex !== -1) {
            tempRows.sort((a,b) => parseNumber(b[sortIndex]?.isMerged ? b[sortIndex].value : b[sortIndex]) - parseNumber(a[sortIndex]?.isMerged ? a[sortIndex].value : a[sortIndex]));
        }

        if (totalRow) tempRows.push(totalRow);
        
        return { allHeaders: tempHeaders, allRows: tempRows, title };

    }, [data, isCumulative, supermarketDailyTargets, supermarketMonthlyTargets, activeSupermarket]);

    const visibleColumns = useMemo(() => {
        const hiddenSet = new Set(userHiddenColumns);
        return new Set(processedTable.allHeaders.filter(h => !hiddenSet.has(h)));
    }, [processedTable.allHeaders, userHiddenColumns]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
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

    const columnSelector = (
        <div className="column-customizer no-print">
            <div className="flex items-center gap-2">
                <ExportButton onExportPNG={onExport} />
                <div className="relative" ref={selectorRef}>
                    <button
                        onClick={() => setIsColumnSelectorOpen(prev => !prev)}
                        className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none transition-colors"
                    >
                        < CogIcon className="h-5 w-5" />
                    </button>
                    {isColumnSelectorOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 z-20 p-2 max-h-80 overflow-y-auto">
                            <div className="grid grid-cols-1 gap-1">
                                {processedTable.allHeaders.map(header => (
                                    <div key={header} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                        <label htmlFor={`col-toggle-${header}`} className="text-sm text-slate-700 dark:text-slate-200 flex-grow cursor-pointer select-none" dangerouslySetInnerHTML={{ __html: headerMapping[header]?.replace(/<br\/>/g, ' ') || header }} />
                                        <Switch
                                            id={`col-toggle-${header}`}
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
        </div>
    );
    
    const cardTitle = (
        <div className="card-title-text flex flex-col items-center justify-center w-full">
            <span className="text-3xl font-bold uppercase text-primary-700 dark:text-primary-400 text-center leading-normal py-1 tracking-tight">
                {processedTable.title}
            </span>
            {updateTimestamp && !isCumulative && (
                <div className="flex items-center justify-center gap-1.5 mt-1 opacity-60 no-print">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Cập nhật lúc: {updateTimestamp}
                    </span>
                </div>
            )}
        </div>
    );


    return (
        <div className="js-summary-table-container">
            <Card ref={ref} title={cardTitle} actionButton={columnSelector} rounded={false}>
                <div className="mt-4 overflow-hidden export-no-radius rounded-none">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="bg-sky-600 dark:bg-sky-700">
                                <tr>
                                {processedTable.allHeaders.map((h, i) => visibleColumns.has(h) ? (
                                    <th key={i} scope="col" className={`js-summary-th px-2 py-3.5 text-[13px] font-bold text-white dark:text-slate-100 uppercase tracking-tight border-r border-sky-500/50 dark:border-sky-600 last:border-r-0 text-center align-middle`} dangerouslySetInnerHTML={{ __html: headerMapping[h] || h }}>
                                    </th>
                                ) : null)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {processedTable.allRows.map((row, rIdx) => {
                                    const nameIndex = processedTable.allHeaders.indexOf('Tên miền');
                                    const isTotalRow = row[nameIndex] === 'Tổng';
                                    const isSelected = !isTotalRow && row[nameIndex] === activeSupermarket;
                                    return (
                                    <tr key={rIdx} className={`
                                        ${isTotalRow ? 'bg-sky-600 dark:bg-sky-700 text-white' : 'bg-white dark:bg-slate-800'}
                                        ${isSelected ? 'bg-sky-50 dark:bg-sky-900/40 ring-1 ring-inset ring-sky-100 dark:ring-sky-800' : ''}
                                        ${!isTotalRow ? 'hover:bg-sky-50/50 dark:hover:bg-sky-900/30 transition-colors' : ''}
                                    `}>
                                        {row.map((cell: any, cellIndex: number) => {
                                            const headerName = processedTable.allHeaders[cellIndex];
                                            if (!visibleColumns.has(headerName)) return null;

                                            const isPercentCol = headerName?.includes('% HT');
                                            const isGrowthCol = headerName?.includes('+/-');
                                            const isHtTargetVuotTroi = headerName === '%HT V.Trội' || headerName === '%HT TARGET(QĐ) V.Trội';
                                            
                                            const numericValue = parseNumber(cell?.isMerged ? cell.value : cell);
                                            const isNumericCol = !isNaN(numericValue) && !String(cell?.isMerged ? cell.value : cell).includes('%') && String(cell?.isMerged ? cell.value : cell).trim() !== '';
                                            
                                            const isTraChamCol = headerName === 'Tỷ Trọng Trả Góp';
                                            const isTlpvCol = headerName === 'TLPVTC LK';
                                            const isHqqdCol = headerName === 'HQQĐ';
                                            const isDtThucCol = headerName === 'DTLK';
                                            const isDtqdCol = headerName === 'DTQĐ';
                                            const isNameColumn = cellIndex === nameIndex;

                                            const cellContent = () => {
                                                if (cell?.isMerged) {
                                                    const baseNumeric = parseNumber(cell.value);
                                                    const growthNumeric = parseNumber(cell.growth);
                                                    let baseDisplay = '';
                                                    if (cell.type === 'percent') baseDisplay = roundUp(baseNumeric) + '%';
                                                    else baseDisplay = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(roundUp(baseNumeric));

                                                    const growthColor = isTotalRow ? 'text-white' : (growthNumeric >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400');
                                                    const growthDisplay = `(${growthNumeric >= 0 ? '+' : ''}${roundUp(growthNumeric)}%)`;

                                                    return (
                                                        <div className="flex items-center justify-center gap-1.5 tabular-nums">
                                                            <span className="font-normal">{baseDisplay}</span>
                                                            <span className={`text-[10px] font-medium ${growthColor}`}>{growthDisplay}</span>
                                                        </div>
                                                    );
                                                }

                                                let displayContent: React.ReactNode = cell;
                                                if (isNameColumn && isTotalRow) return 'TỔNG CÔNG TY';
                                                if (isNameColumn && !isTotalRow) displayContent = shortenSupermarketName(String(cell)).toUpperCase();
                                                else if (isNumericCol) displayContent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(roundUp(numericValue));
                                                else if (isPercentCol || isTraChamCol || isTlpvCol || isHqqdCol || isGrowthCol) displayContent = roundUp(numericValue) + '%';
                                                
                                                if (isGrowthCol && !isNaN(numericValue)) {
                                                    const color = isTotalRow ? 'text-white' : (numericValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400');
                                                    return <span className={`${color} font-medium tabular-nums`}>{numericValue >= 0 ? '+' : ''}{displayContent}</span>;
                                                }
                                                return displayContent;
                                            };

                                            let cellClasses = `px-3 py-3.5 whitespace-nowrap text-[13px] border-r border-slate-100 dark:border-slate-700 last:border-r-0 tabular-nums ${isTotalRow ? 'font-bold border-sky-500/50 dark:border-sky-600' : 'font-normal'}`;
                                            cellClasses += cellIndex > 0 ? ' text-center' : ' text-left';
                                            
                                            if (isTotalRow) {
                                                cellClasses += ' text-white';
                                            } else {
                                                const supermarketName = row[nameIndex] || 'Tổng';
                                                if (isNameColumn) {
                                                    cellClasses = cellClasses.replace('font-normal', isSelected ? 'font-bold' : 'font-medium');
                                                }
                                                
                                                if (isHtTargetVuotTroi && !isNaN(numericValue)) {
                                                    if (numericValue >= 120) cellClasses += ' text-green-600';
                                                    else if (numericValue >= 100) cellClasses += ' text-blue-600';
                                                    else if (numericValue >= 85) cellClasses += ' text-yellow-600';
                                                    else cellClasses += ' text-red-600';
                                                } else if (isPercentCol && !isNaN(numericValue)) {
                                                    if(numericValue >= 100) cellClasses += ' text-green-600';
                                                    else if(numericValue >= 85) cellClasses += ' text-yellow-600';
                                                    else cellClasses += ' text-red-600';
                                                }
                                                if (isHqqdCol && !isNaN(numericValue)) {
                                                    const target = supermarketTargets[supermarketName]?.quyDoi ?? 40;
                                                    if (numericValue >= target) cellClasses += ' text-green-600';
                                                    else if (numericValue >= target * 0.9) cellClasses += ' text-blue-600';
                                                    else cellClasses += ' text-red-600';
                                                }
                                                if (isTraChamCol && !isNaN(numericValue) && numericValue < 50) {
                                                    cellClasses += ' text-red-600';
                                                }
                                                if (isDtThucCol) cellClasses += ' text-[#980000] dark:text-red-400';
                                                if (isDtqdCol) cellClasses += ' text-blue-600 dark:text-blue-400';
                                                if (!cellClasses.includes('text-')) cellClasses += ' text-slate-700 dark:text-slate-200';
                                            }

                                            return <td key={cellIndex} className={cellClasses}>{cellContent()}</td>;
                                        })}
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
});

export default SummaryTableView;
