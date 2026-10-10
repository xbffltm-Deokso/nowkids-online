# NowKids Online

Next.js + MUI + Neon Postgres 기반 출석체크 웹 애플리케이션

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.17 이상
- npm 또는 yarn

### 설치

```bash
npm install
```

### 환경변수

`.env.example`을 `.env.local`로 복사한 뒤 `DATABASE_URL`(Neon 연결 문자열)을 입력합니다.

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

### 프로덕션 빌드

```bash
npm run build
```

빌드에는 `DATABASE_URL`이 필요합니다.

## 📁 프로젝트 구조

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx             # 교사용 출석 체크
│   ├── history/             # 출석 기록 조회
│   ├── admin/               # 출석/학생 관리
│   └── api/                 # Route Handlers (students, attendance)
├── components/              # Atomic Design (atoms / molecules / organisms)
├── hooks/                   # 데이터 훅 (api-client 사용)
├── lib/                     # api-client, Drizzle 스키마/DB 연결
├── types/                   # TypeScript 타입
├── utils/                   # 날짜 유틸
└── theme/                   # MUI 테마
drizzle/                      # DB 마이그레이션
docs/legacy/                  # Google Apps Script 시절 문서 (참고용)
sheet_to_neon.mjs             # 구 Google Sheet 출석 데이터 → Neon 이관 스크립트
```

데이터 흐름: 화면/훅 → `src/lib/api-client.ts` → `/api/*` Route Handler → Drizzle → Neon

## 🎨 디자인 원칙

### Design Principles (STRICT)
1. **NO raw HTML elements** - Use MUI components only (Surface replaces div)
2. **200 lines max per file** - Aggressively split components
3. **DRY everything** - Reusable components and hooks
4. **Atomic Design** - Atoms → Molecules → Organisms → Templates
5. **Type-safe** - Full TypeScript, no `any` types
6. **SSR First** - Use Next.js SSR/ISR for performance
7. **Component Composition** - Build complex from simple
8. **Client Components Minimized** - Always prefer SSR, use "use client" sparingly
9. **NO FALLBACKS OR WORKAROUNDS** - Never use setTimeout, fallback patterns, or workarounds
10. **NO COMPROMISES** - Fix root causes, not symptoms. No shortcuts or band-aid solutions

## 🌐 배포 (Vercel)

Vercel 프로젝트 환경변수에 `DATABASE_URL`을 등록하고 배포합니다.
스키마 변경 시 `npx drizzle-kit generate` 후 `npx drizzle-kit migrate`로 DB에 반영합니다.

## 📝 Scripts

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run lint` - ESLint 검사
- `npm run type-check` - TypeScript 타입 체크
