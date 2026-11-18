// 한국 시간(UTC+9) 기준 이번 주 일요일 — 서버(Vercel)는 UTC라 기기 시간대에 기대지 않고 직접 계산
// (UTC로 계산하면 한국 일요일 0~9시에 지난주 일요일이 나옴)
export function getSundayOfCurrentWeek(now: Date = new Date()): string {
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    kst.setUTCDate(kst.getUTCDate() - kst.getUTCDay());
    return kst.toISOString().slice(0, 10);
}

export function getSundayOfWeek(date: Date): string {
    const day = date.getDay();
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - day);
    return toDateString(sunday);
}

export function addWeeks(dateStr: string, weeks: number): string {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + weeks * 7);
    return toDateString(d);
}

export function getQuarter(dateStr: string): 1 | 2 | 3 | 4 {
    const month = new Date(dateStr + 'T00:00:00').getMonth() + 1;
    return Math.ceil(month / 3) as 1 | 2 | 3 | 4;
}

export function getQuarterRange(year: number, quarter: 1 | 2 | 3 | 4): { start: string; end: string } {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    const lastDay = new Date(year, endMonth, 0).getDate();
    return {
        start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
        end: `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
}

export function getSundaysInRange(start: string, end: string): string[] {
    const sundays: string[] = [];
    const d = new Date(start + 'T00:00:00');
    // move to first Sunday
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
    while (toDateString(d) <= end) {
        sundays.push(toDateString(d));
        d.setDate(d.getDate() + 7);
    }
    return sundays;
}

export function formatDateShort(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function toDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
