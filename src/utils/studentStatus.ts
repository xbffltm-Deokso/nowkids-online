// 출석 대상(재적)인 학생 상태 — 전학·진급 처리된 학생은 목록·통계에서 제외
const ACTIVE_STATUSES = ['재학', '휴학'];

export function isActiveStatus(status: string): boolean {
    return ACTIVE_STATUSES.includes(status);
}
