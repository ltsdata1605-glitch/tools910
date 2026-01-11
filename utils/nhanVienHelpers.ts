
import { RevenueRow, CompetitionHeader, Criterion, CompetitionDataForCriterion, InstallmentRow, InstallmentProvider } from '../types/nhanVienTypes';

export const roundUp = (num: number): number => Math.ceil(num);

export const parseNumber = (str: string | undefined): number => {
    if (!str) return 0;
    // Xử lý dấu phẩy phân cách hàng nghìn và ký tự %
    const cleaned = String(str).replace(/,/g, '').replace('%', '').trim();
    return parseFloat(cleaned) || 0;
};

/**
 * Chuẩn hóa văn bản về dạng NFC để so sánh Unicode chính xác (tránh lỗi ễ vs e+~)
 */
export const normalizeText = (text: string): string => {
    return text ? text.normalize("NFC").trim() : "";
};

export const shortenName = (name: string, overrides: Record<string, string> = {}): string => {
    // 1. Kiểm tra ưu tiên tên tùy chỉnh từ người dùng
    if (overrides && overrides[name]) {
        return overrides[name];
    }

    const rules: { [key: string]: string } = {
        'Thi đua Iphone 17 series': 'IPHONE 17',
        'BÁN HÀNG PANASONIC': 'Panasonic',
        'Tủ lạnh, tủ đông, tủ mát': 'Tủ lạnh/đông/mát',
        'BÁN HÀNG ĐIỆN TỬ & ĐIỆN LẠNH HÃNG SAMSUNG': 'Samsung ĐT/ĐL',
        'NH MÁY GIẶT, SẤY': 'Máy giặt/sấy',
        'TRẢ CHẬM FECREDIT, TPBANK EVO': 'FE/TPB',
        'PHỤ KIỆN - ĐỒNG HỒ': 'PK - Đồng hồ',
        'ĐIỆN THOẠI & TABLET ANDROID TRÊN 7 TRIỆU': 'Android > 7Tr',
        'NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG': 'Nạp/Rút NH',
        'Thi đua Vivo': 'Vivo',
        'Thi đua Realme': 'Realme',
        'Đồng hồ thời trang': 'ĐH thời trang',
        'VÍ TRẢ SAU': 'Ví',
        'HOMECREDIT': 'HC',
        'TIỀN MẶT CAKE': 'Cake',
    };
    if (rules[name]) return rules[name];
    if (name.startsWith('BÁN HÀNG ')) {
        return name.replace('BÁN HÀNG ', '').split(' ')[0];
    }
    return name;
};

export const formatEmployeeName = (fullName: string): string => {
    const nameParts = fullName.split(' - ');
    if (nameParts.length < 2) {
        return fullName; 
    }
    
    const name = nameParts[0];
    const id = nameParts[1];
    const nameWords = name.split(' ').filter(w => w);
    if (nameWords.length < 2) return `${id} - ${name}`;
    
    const lastName = nameWords[nameWords.length - 1];
    const middleWords = nameWords.slice(1, nameWords.length - 1);
    
    let initial = '';
    if (middleWords.length > 0) {
        initial = middleWords[middleWords.length - 1].charAt(0).toUpperCase();
    } else {
        initial = nameWords[0].charAt(0).toUpperCase();
    }
        
    return `${id} - ${initial}.${lastName}`;
};

export const getYesterdayDateString = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return `${yesterday.getDate()}/${yesterday.getMonth() + 1}`;
};

export const parseRevenueData = (danhSachData: string): RevenueRow[] => {
    if (!danhSachData) return [];
    const rows: RevenueRow[] = [];
    let currentDeptDS = '';
    for (const line of String(danhSachData).split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split('\t');
        const name = parts[0]?.trim() || '';

        const dtlkValue = parseNumber(parts[1]);
        const dtqdValue = parseNumber(parts[2]);
        const hqqdCalculated = dtlkValue > 0 ? (dtqdValue / dtlkValue) - 1 : 0;

        if (name === 'Tổng') {
            rows.push({
                type: 'total',
                name: name,
                dtlk: dtlkValue,
                dtqd: dtqdValue,
                hieuQuaQD: hqqdCalculated,
                soLuong: parseNumber(parts[4]),
                donGia: parseNumber(parts[5]),
            });
        } else if (trimmed.startsWith('BP ') && parts.length > 1 && !isNaN(parseNumber(parts[1]))) {
            currentDeptDS = name;
            rows.push({ 
                type: 'department', 
                name: name, 
                dtlk: dtlkValue, 
                dtqd: dtqdValue, 
                hieuQuaQD: hqqdCalculated 
            });
        } else if (currentDeptDS && name.includes(' - ') && parts.length > 3) {
            rows.push({
                type: 'employee',
                name: formatEmployeeName(name),
                originalName: name,
                department: currentDeptDS,
                dtlk: dtlkValue,
                dtqd: dtqdValue,
                hieuQuaQD: hqqdCalculated
            });
        }
    }
    return rows;
};

export const parseInstallmentData = (traGopData: string, employeeDepartmentMap: Map<string, string>): InstallmentRow[] => {
    if (!traGopData) return [];

    const rows: InstallmentRow[] = [];
    const lines = String(traGopData).split('\n');
    
    // Đủ 8 nhà cung cấp theo dữ liệu thực tế BI
    const providerNames = [
        { name: 'HomeCredit(HC)', short: 'HC' },
        { name: 'FECredit(FE)', short: 'FE' },
        { name: 'Shinhan Finance', short: 'SHF' },
        { name: 'Thẻ tín dụng - SMARTPOS', short: 'POS' },
        { name: 'Trả góp HPL-Home Credit', short: 'HPL' },
        { name: 'Trả góp KREDIVO', short: 'KRE' },
        { name: 'Samsung Finance +', short: 'SSF' },
        { name: 'MWG PAYLATER', short: 'MWG' }
    ];

    const findFullName = (shortName: string) => {
        const normalizedShort = normalizeText(shortName);
        if (!normalizedShort) return null;
        
        // Khớp tuyệt đối hoặc khớp bắt đầu (ví dụ: "Nguyễn Vũ Minh" khớp "Nguyễn Vũ Minh - 12345")
        for (const fullName of employeeDepartmentMap.keys()) {
            const normalizedFull = normalizeText(fullName);
            if (normalizedFull === normalizedShort || normalizedFull.startsWith(normalizedShort + " - ")) {
                return fullName;
            }
        }
        return null;
    };

    for (const line of lines) {
        const trimmed = line.trim();
        // Bỏ qua các dòng tiêu đề hoặc chú thích
        if (!trimmed || trimmed.startsWith('Nhân viên') || trimmed.startsWith('Hỗ trợ BI') || trimmed.startsWith('Copyright') || trimmed.includes('(*) DT Siêu thị')) continue;

        const parts = line.split('\t'); 
        if (parts.length < 3) continue;

        const rawName = parts[0]?.trim() || '';
        const isTotal = rawName === 'Tổng';
        
        let originalName: string | null = null;
        let department: string | undefined = undefined;

        if (isTotal) {
            originalName = 'Tổng';
        } else {
            originalName = findFullName(rawName);
            if (originalName) {
                department = employeeDepartmentMap.get(originalName);
            }
        }

        if (!originalName) continue;

        const providers: InstallmentProvider[] = [];
        
        /**
         * Cấu trúc BI (19 cột):
         * [0]: Tên nhân viên
         * [1-16]: 8 cặp (Doanh thu & Tỷ trọng)
         * [17]: DT Siêu thị (*)
         * [18]: Tỷ trọng tổng (**)
         */
        for (let i = 0; i < 8; i++) {
            const dtIdx = 1 + i * 2;
            const pctIdx = 2 + i * 2;
            
            providers.push({
                name: providerNames[i].name,
                shortName: providerNames[i].short,
                dt: parseNumber(parts[dtIdx]),
                percent: parseNumber(parts[pctIdx])
            });
        }

        // Tự động lấy 2 cột cuối cùng đề phòng dữ liệu copy không đủ tab
        const totalDtSieuThi = parts.length > 17 ? parseNumber(parts[17]) : parseNumber(parts[parts.length - 2]);
        const totalPercent = parts.length > 18 ? parseNumber(parts[18]) : parseNumber(parts[parts.length - 1]);

        rows.push({
            type: isTotal ? 'total' : 'employee',
            name: isTotal ? 'Tổng cộng' : formatEmployeeName(originalName),
            originalName: originalName,
            department: department,
            providers,
            totalDtSieuThi,
            totalPercent
        });
    }

    return rows;
};

export const parseCompetitionData = (
    thiDuaData: string,
    employeeDepartmentMap: Map<string, string>
): Record<Criterion, { headers: CompetitionHeader[], employees: { name: string; originalName: string; department: string; values: (number | null)[] }[] }> => {
    const emptyResult: Record<Criterion, { headers: CompetitionHeader[], employees: any[] }> = { 
        DTLK: { headers: [], employees: [] }, 
        DTQĐ: { headers: [], employees: [] }, 
        SLLK: { headers: [], employees: [] } 
    };
    
    if (typeof thiDuaData !== 'string' || !thiDuaData || employeeDepartmentMap.size === 0) return emptyResult;

    const lines = thiDuaData.split('\n').filter(line => line.trim() !== '');
    const metricsRowIndex = lines.findIndex(l => {
        const parts = l.split('\t').map(p => p.trim().toUpperCase());
        return parts.some(p => ['DTLK', 'DTQĐ', 'SLLK', 'SL REALTIME'].includes(p));
    });

    if (metricsRowIndex === -1) return emptyResult;
    
    const phongBanIndex = lines.findIndex(l => l.toLowerCase().includes('phòng ban'));
    if (phongBanIndex === -1 || phongBanIndex >= metricsRowIndex) return emptyResult;
    
    const titles = lines.slice(phongBanIndex + 1, metricsRowIndex).map(t => t.trim());
    const metrics = lines[metricsRowIndex].trim().split('\t');
    
    const allHeaders: CompetitionHeader[] = [];
    const count = Math.min(titles.length, metrics.length);
    for (let i = 0; i < count; i++) {
        const metricRaw = metrics[i]?.trim().toUpperCase();
        let metric = '';
        if (metricRaw === 'DTLK') metric = 'DTLK';
        else if (metricRaw === 'DTQĐ') metric = 'DTQĐ';
        else if (metricRaw === 'SLLK' || metricRaw === 'SL REALTIME') metric = 'SLLK';

        if (metric) {
            const originalTitle = titles[i] || `Unnamed ${i}`;
            // Mặc định khởi tạo chưa có overrides, sẽ được xử lý tại UI
            allHeaders.push({ title: shortenName(originalTitle), originalTitle, metric });
        }
    }
    
    const result: Record<Criterion, { headers: CompetitionHeader[], employees: any[] }> = {
        DTLK: { headers: allHeaders.filter(h => h.metric === 'DTLK'), employees: [] },
        DTQĐ: { headers: allHeaders.filter(h => h.metric === 'DTQĐ'), employees: [] },
        SLLK: { headers: allHeaders.filter(h => h.metric === 'SLLK'), employees: [] },
    };
    
    const employeeData = new Map<string, { [key in Criterion]: (number | null)[] }>();

    for (const line of lines.slice(metricsRowIndex + 1)) {
        const parts = line.split('\t');
        const namePart = parts[0]?.trim();
        if (!namePart) continue;

        // Chuẩn hóa tên khi tra cứu
        const normalizedName = normalizeText(namePart);
        let matchedOriginalName = "";
        let department = "";
        
        for (const [fullName, dept] of employeeDepartmentMap.entries()) {
            if (normalizeText(fullName) === normalizedName) {
                matchedOriginalName = fullName;
                department = dept;
                break;
            }
        }

        if (!department && namePart !== 'Tổng' && !namePart.startsWith('BP ')) continue;
        
        const formattedName = namePart === 'Tổng' ? 'Tổng' : formatEmployeeName(matchedOriginalName || namePart);
        if (!employeeData.has(formattedName)) {
            employeeData.set(formattedName, { DTLK: [], DTQĐ: [], SLLK: [] });
        }
        
        const employeeRecord = employeeData.get(formattedName)!;
        allHeaders.forEach((header, index) => {
            const value = parseNumber(parts[index + 1]);
            employeeRecord[header.metric as Criterion].push(value > 0 ? value : null);
        });
    }

    employeeData.forEach((values, name) => {
        // Tìm lại thông tin gốc để map bộ phận
        let originalName = name;
        let department = 'Unknown';
        const normalizedFormatted = normalizeText(name);

        for (const [fullName, dept] of employeeDepartmentMap.entries()) {
            if (normalizeText(formatEmployeeName(fullName)) === normalizedFormatted) {
                originalName = fullName;
                department = dept;
                break;
            }
        }

        if (name === 'Tổng') department = 'Tổng';

        Object.keys(result).forEach(key => {
            const criterion = key as Criterion;
            result[criterion].employees.push({ name, originalName, department, values: values[criterion] });
        });
    });

    return result;
};

export const isVersion = (v: any): v is { name: string, selectedCompetitions: string[] } => {
    return v && typeof v === 'object' && typeof v.name === 'string' && Array.isArray(v.selectedCompetitions);
};
