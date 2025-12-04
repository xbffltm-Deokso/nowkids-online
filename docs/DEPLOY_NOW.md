# 지금 바로 배포하기

## ✅ 1단계: next.config.mjs 수정

**파일**: `next.config.mjs`

**수정 내용**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',          // ← 추가
    images: {                  // ← 추가
        unoptimized: true,     // ← 추가
    },                         // ← 추가
    typescript: {
        ignoreBuildErrors: false,
    },
    eslint: {
        ignoreDuringBuilds: false,
    },
};

export default nextConfig;
```

## ✅ 2단계: API URL 수정

**파일**: `src/lib/api.ts`

**5번째 줄**:
```typescript
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwAHKC42qrL3hHpnoGF1YH2LAAayuXKw7XFZs6z7s9THV-2sQnl2RKT1P5DvgnjSQPw/exec';
```

## ✅ 3단계: Git에 푸시

**터미널에서 실행** (프로젝트 폴더에서):

```bash
# 프로젝트 폴더로 이동
cd "J:/내 드라이브/online-db"

# 변경사항 확인
git status

# 모든 변경사항 추가
git add .

# 커밋
git commit -m "API URL 설정 및 정적 빌드 활성화"

# GitHub에 푸시
git push origin main
```

## ✅ 4단계: GitHub Pages 설정

1. https://github.com/xbffltm-Deokso/nowkids-online 접속
2. **Settings** 클릭
3. 왼쪽 메뉴에서 **Pages** 클릭
4. **Source**: **GitHub Actions** 선택
5. 저장

## ✅ 5단계: 배포 확인

1. GitHub 저장소의 **Actions** 탭 클릭
2. 워크플로우 실행 확인
3. 성공하면 녹색 체크 표시
4. 배포 URL: `https://xbffltm-Deokso.github.io/nowkids-online/`

## 🎉 완료!

배포가 완료되면 위 URL에서 출석 시스템을 사용할 수 있습니다!

## 문제 해결

### 빌드 실패
```bash
# TypeScript 체크
npm run type-check

# ESLint 체크
npm run lint
```

### GitHub Actions 실패
- Actions 탭에서 에러 로그 확인
- `.github/workflows/deploy.yml` 파일 확인

### 페이지가 안 보임
- GitHub Pages 설정 확인
- 배포 완료까지 2-3분 대기
- 브라우저 캐시 삭제 (Ctrl+Shift+R)
