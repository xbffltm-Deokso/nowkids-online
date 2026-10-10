# 빠른 시작 가이드

## 개요

교회 소년부 출석 체크 시스템입니다. Google Sheets를 데이터베이스로 사용하고, GitHub Pages로 배포됩니다.

## 시스템 구조

```
프론트엔드 (Next.js + MUI)
    ↓
Google Apps Script (API)
    ↓
Google Sheets (데이터베이스)
```

## 설정 단계

### 1단계: Google Sheets 설정 (필수)

📖 **[GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)** 참고

1. 새 Google 스프레드시트 생성
2. `StudentDB`와 `AttendanceDB` 시트 만들기
3. Google Apps Script 설정
4. API URL 획득

⏱️ 소요 시간: 약 15분

### 2단계: API URL 설정 (필수)

`src/lib/api.ts` 파일 열기:

```typescript
// 5번 줄
const GAS_API_URL = '여기에_복사한_API_URL_붙여넣기';
```

### 3단계: 배포 (선택사항)

📖 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** 참고

1. `next.config.mjs` 수정 (정적 빌드 설정)
2. GitHub 저장소 생성
3. 코드 푸시
4. GitHub Pages 자동 배포

⏱️ 소요 시간: 약 10분

## 로컬 개발 (선택사항)

```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:3000 열기
```

⚠️ **주의**: Google Drive에서는 `npm install`이 실패할 수 있습니다.
→ 로컬 디스크 (C:\Projects 등)로 복사 후 작업 권장

## 주요 기능

- ✅ 학년/반별 학생 관리
- ✅ 출석/지각/결석/조퇴/기타 상태 체크
- ✅ 실시간 Google Sheets 연동
- ✅ 반응형 디자인 (모바일 지원)
- ✅ TypeScript 타입 안전성

## 문제 해결

### npm install 실패
→ 로컬 디스크로 프로젝트 복사

### API 연결 오류
→ Google Apps Script URL 확인
→ Apps Script 배포 설정에서 "모든 사용자" 권한 확인

### 빌드 오류
→ `npm run type-check` 실행
→ `npm run lint` 실행

## 다음 단계

1. ☑️ Google Sheets 설정
2. ☑️ 테스트 데이터 입력
3. ☑️ API URL 설정
4. ☑️ 로컬에서 테스트 (선택)
5. ☑️ GitHub Pages 배포

## 도움이 필요하신가요?

각 단계별 상세 가이드를 참고하세요:

- 📖 [Google Sheets 설정](./GOOGLE_SHEETS_SETUP.md)
- 📖 [배포 가이드](./DEPLOYMENT_GUIDE.md)
