# GitHub Pages 배포 가이드

## 1. Next.js 정적 빌드 설정

### 1.1 next.config.mjs 수정

`next.config.mjs` 파일을 다음과 같이 수정하세요:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',  // 정적 빌드 활성화
    images: {
        unoptimized: true,  // 이미지 최적화 비활성화 (GitHub Pages용)
    },
    typescript: {
        ignoreBuildErrors: false,
    },
    eslint: {
        ignoreDuringBuilds: false,
    },
};

export default nextConfig;
```

### 1.2 package.json에 빌드 스크립트 확인

`package.json`의 scripts에 다음이 있는지 확인하세요:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

## 2. GitHub 저장소 생성

### 2.1 새 저장소 만들기

1. https://github.com 접속
2. 우측 상단 **+** 버튼 → **New repository** 클릭
3. 저장소 이름 입력 (예: `church-attendance`)
4. **Public** 선택
5. **Create repository** 클릭

### 2.2 로컬 프로젝트와 연결

프로젝트 폴더에서 다음 명령어 실행:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## 3. GitHub Actions 워크플로우 설정

### 3.1 워크플로우 파일 생성

`.github/workflows/deploy.yml` 파일을 생성하고 다음 내용을 추가하세요:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 3.2 GitHub Pages 설정

1. GitHub 저장소 페이지에서 **Settings** 클릭
2. 왼쪽 메뉴에서 **Pages** 클릭
3. **Source**를 **GitHub Actions**로 선택
4. 저장

## 4. 배포 실행

### 4.1 코드 푸시

```bash
git add .
git commit -m "Add GitHub Pages deployment"
git push
```

### 4.2 배포 확인

1. GitHub 저장소의 **Actions** 탭 확인
2. 워크플로우 실행 상태 확인
3. 성공하면 `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/` 에서 접속 가능

## 5. 주의사항

### 5.1 API URL 설정

배포 전에 `src/lib/api.ts` 파일의 Google Apps Script URL이 올바르게 설정되어 있는지 확인하세요.

### 5.2 환경 변수 (선택사항)

민감한 정보가 있다면 GitHub Secrets를 사용하세요:

1. Settings → Secrets and variables → Actions
2. **New repository secret** 클릭
3. 이름과 값 입력

## 6. 로컬에서 빌드 테스트

배포 전에 로컬에서 테스트하세요:

```bash
# 빌드
npm run build

# out 폴더가 생성됨

# 로컬 서버로 테스트 (선택사항)
npx serve out
```

## 7. 업데이트

코드를 수정한 후:

```bash
git add .
git commit -m "Update features"
git push
```

자동으로 재배포됩니다!

## 트러블슈팅

### 빌드 실패

- TypeScript 오류 확인: `npm run type-check`
- ESLint 오류 확인: `npm run lint`

### 페이지가 표시되지 않음

- GitHub Pages 설정 확인
- 워크플로우 로그 확인
- 브라우저 캐시 삭제

### CORS 오류

- Google Apps Script 배포 설정에서 "모든 사용자" 액세스 권한 확인
