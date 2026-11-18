// 출석 대상(재적)인 학생 상태 — 전학·진급 처리된 학생은 목록·통계에서 제외
// 새친구: 교사 링크로 등록되어 교역자 확인 전인 학생 (출석 대상에 포함)
export const ACTIVE_STATUSES = ['재학', '휴학', '새친구'];

export function isActiveStatus(status: string): boolean {
    return ACTIVE_STATUSES.includes(status);
}
