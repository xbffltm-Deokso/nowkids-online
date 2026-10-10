# 변경 이력

## [2024-12-04] - 프로젝트 설정 및 개선

### 추가됨
- ✅ **SnackbarAtom 컴포넌트**: 사용자 피드백 알림
- ✅ **AttendanceSummary 컴포넌트**: 출석 현황 통계 대시보드
- ✅ **DateSelector 컴포넌트**: 날짜 선택 UI (어제/오늘 빠른 선택)
- ✅ **GitHub Actions 워크플로우**: 자동 배포 설정
- ✅ **.nojekyll 파일**: GitHub Pages 최적화
- ✅ **종합 문서 작성**:
  - QUICK_START.md - 빠른 시작 가이드
  - GOOGLE_SHEETS_SETUP.md - Google Sheets 설정
  - DEPLOYMENT_GUIDE.md - 배포 가이드
  - IMPROVEMENTS.md - 개선 사항 및 통합 가이드

### 설정
- ✅ Next.js 정적 빌드 설정 준비 (`output: 'export'`)
- ✅ GitHub Pages 배포 자동화

### 개선
- ✅ 컴포넌트 구조 검토 및 최적화
- ✅ Mock 데이터 폴백 시스템 (개발/테스트용)
- ✅ 에러 처리 강화

## 기존 기능 (프로젝트 초기 상태)

### 핵심 기능
- ✅ 학년/반별 학생 관리
- ✅ 출석/지각/결석/조퇴/기타 상태 체크
- ✅ Google Sheets 데이터베이스 연동
- ✅ Google Apps Script API 통신
- ✅ 실시간 출석 기록 저장

### 기술 스택
- ✅ Next.js 15 (App Router)
- ✅ React 19
- ✅ MUI 6 (Material-UI)
- ✅ TypeScript
- ✅ Emotion (CSS-in-JS)

### 디자인 패턴
- ✅ Atomic Design (Atoms → Molecules → Organisms)
- ✅ Custom Hooks (useAttendance, useGrades)
- ✅ TypeScript 완전 타입 안전성
- ✅ 파일당 200줄 제한 준수

### 컴포넌트 계층
```
Atoms:
- AttendanceButton
- StatusChip
- ButtonAtom
- CheckboxAtom
- TypographyAtom
- SnackbarAtom (신규)

Molecules:
- StudentRow
- GradeClassSelect
- AttendanceSummary (신규)
- DateSelector (신규)

Organisms:
- AttendanceTable
- AttendanceForm

Pages:
- HomePage (app/page.tsx)
```

## 다음 릴리스 계획

### v1.1 (예정)
- [ ] 출석 통계 페이지
- [ ] 학생별 출석 이력 조회
- [ ] 엑셀 다운로드 기능

### v1.2 (예정)
- [ ] 다크 모드
- [ ] PWA 지원 (오프라인 모드)
- [ ] 모바일 최적화

### v2.0 (예정)
- [ ] 교사 권한 관리
- [ ] 다중 교회 지원
- [ ] 고급 통계 및 리포트

## 버그 수정

### 알려진 이슈
- ⚠️ Google Drive에서 `npm install` 실패 (동기화 충돌)
  - 해결 방법: 로컬 디스크로 복사 후 작업

### 해결됨
- ✅ GitHub Pages 배포 설정 완료
- ✅ 정적 빌드 설정 준비
