/**
 * 주어진 날짜가 속한 주의 일요일 날짜를 반환
 * @param date - 기준 날짜 (기본값: 오늘)
 * @returns YYYY-MM-DD 형식의 일요일 날짜
 */
export function getSundayOfWeek(date: Date = new Date()): string {
    const day = date.getDay(); // 0(일) ~ 6(토)
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - day);
    
    return sunday.toISOString().split('T')[0];
}

/**
 * YYYY-MM-DD 형식의 날짜 문자열을 Date 객체로 변환
 */
export function parseDate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
}
