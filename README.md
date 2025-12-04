# NowKids Online

Next.js + MUI 기반 웹 애플리케이션

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.17 이상
- npm 또는 yarn

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

### 프로덕션 빌드

```bash
npm run build
```

정적 파일이 `out/` 폴더에 생성됩니다.

## 📁 프로젝트 구조

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root Layout
│   └── page.tsx             # Home Page
├── components/              # Atomic Design
│   ├── atoms/               # 기본 컴포넌트
│   ├── molecules/           # 조합 컴포넌트
│   ├── organisms/           # 복잡한 컴포넌트
│   └── templates/           # 페이지 템플릿
├── hooks/                   # 커스텀 훅
├── lib/                     # 유틸리티
├── types/                   # TypeScript 타입
└── theme/                   # MUI 테마
```

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

## 🌐 배포 (Cloudflare Pages)

```bash
# 프로덕션 빌드
npm run build

# out/ 폴더를 Cloudflare Pages에 배포
```

## 📝 Scripts

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run lint` - ESLint 검사
- `npm run type-check` - TypeScript 타입 체크
