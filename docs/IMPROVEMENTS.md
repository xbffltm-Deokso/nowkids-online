# 새로 추가된 기능

## 추가된 컴포넌트

### 1. SnackbarAtom (`src/components/atoms/SnackbarAtom.tsx`)

**용도**: 사용자 피드백 메시지 표시

**사용 예시**:
```typescript
import SnackbarAtom from '@/components/atoms/SnackbarAtom';

const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
});

// 성공 메시지
setSnackbar({ open: true, message: '저장되었습니다!', severity: 'success' });

// 에러 메시지
setSnackbar({ open: true, message: '저장 실패', severity: 'error' });

<SnackbarAtom
    open={snackbar.open}
    message={snackbar.message}
    severity={snackbar.severity}
    onClose={() => setSnackbar({ ...snackbar, open: false })}
/>
```

**기능**:
- ✅ 자동 닫힘 (3초)
- ✅ 4가지 상태 (success, error, info, warning)
- ✅ 화면 하단 중앙 표시

### 2. AttendanceSummary (`src/components/molecules/AttendanceSummary.tsx`)

**용도**: 출석 현황 통계 표시

**사용 예시**:
```typescript
import AttendanceSummary from '@/components/molecules/AttendanceSummary';

<AttendanceSummary
    attendance={attendance}
    totalStudents={students.length}
/>
```

**기능**:
- ✅ 출석/지각/결석/조퇴/기타 인원 표시
- ✅ 색상 코드로 한눈에 파악
- ✅ 미체크 학생 수 경고
- ✅ 반응형 디자인 (모바일 대응)

**표시 정보**:
- 출석 (초록색)
- 지각 (주황색)
- 결석 (빨간색)
- 조퇴 (파란색)
- 기타 (회색)
- 체크 완료 / 미체크 현황

### 3. DateSelector (`src/components/molecules/DateSelector.tsx`)

**용도**: 출석 날짜 선택

**사용 예시**:
```typescript
import DateSelector from '@/components/molecules/DateSelector';

const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

<DateSelector
    date={date}
    onDateChange={setDate}
/>
```

**기능**:
- ✅ 달력으로 날짜 선택
- ✅ 빠른 선택 버튼 (어제, 오늘)
- ✅ 반응형 레이아웃

## 통합 가이드

### page.tsx 업데이트 예시

기존 `src/app/page.tsx`를 다음과 같이 개선할 수 있습니다:

```typescript
'use client';

import { useState } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

import TypographyAtom from '@/components/atoms/TypographyAtom';
import SnackbarAtom from '@/components/atoms/SnackbarAtom';
import DateSelector from '@/components/molecules/DateSelector';
import AttendanceSummary from '@/components/molecules/AttendanceSummary';
import AttendanceForm from '@/components/organisms/AttendanceForm';
import { useAttendance } from '@/hooks/useAttendance';
import { useGrades } from '@/hooks/useGrades';

export default function HomePage() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClass, setSelectedClass] = useState(1);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'info' | 'warning'
    });

    const { grades, classes, loading: gradesLoading, error: gradesError } = useGrades();
    const { students, attendance, loading, error, updateStatus, saveAttendance } = useAttendance(
        selectedGrade,
        selectedClass,
        date
    );

    const handleSubmit = async () => {
        try {
            await saveAttendance();
            setSnackbar({ open: true, message: '출석이 저장되었습니다!', severity: 'success' });
        } catch (e) {
            setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
        }
    };

    if (gradesLoading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Stack spacing={3}>
                <Box>
                    <TypographyAtom variant="h4" component="h1" fontWeight="bold" color="primary">
                        출석체크 시스템
                    </TypographyAtom>
                </Box>

                {/* 날짜 선택 */}
                <DateSelector date={date} onDateChange={setDate} />

                {/* 출석 통계 */}
                {students.length > 0 && (
                    <AttendanceSummary
                        attendance={attendance}
                        totalStudents={students.length}
                    />
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <AttendanceForm
                        grades={grades}
                        classes={classes}
                        students={students}
                        attendance={attendance}
                        onGradeChange={setSelectedGrade}
                        onClassChange={setSelectedClass}
                        onStatusChange={updateStatus}
                        onSubmit={handleSubmit}
                        selectedGrade={selectedGrade}
                        selectedClass={selectedClass}
                    />
                )}
            </Stack>

            {/* 알림 메시지 */}
            <SnackbarAtom
                open={snackbar.open}
                message={snackbar.message}
                severity={snackbar.severity}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            />
        </Container>
    );
}
```

## 향후 개선 사항

### 추가 가능한 기능들

1. **출석 기록 조회**
   - 특정 기간 출석률 조회
   - 학생별 출석 이력
   - 월별/주별 통계

2. **엑셀 다운로드**
   - 출석부 엑셀 내보내기
   - 통계 리포트 생성

3. **알림 기능**
   - 연속 결석 학생 알림
   - 출석률 저조 학생 표시

4. **다크 모드**
   - 테마 전환 기능

5. **오프라인 지원**
   - PWA 설정
   - 오프라인에서 작성 후 온라인 시 동기화

6. **권한 관리**
   - 교사별 접근 권한
   - 반별 제한

7. **모바일 앱**
   - React Native 또는 PWA

## 파일 크기 검사

모든 컴포넌트는 200줄 이하 규칙을 준수합니다:

```bash
# 파일별 줄 수 확인
find src/components -name "*.tsx" -exec wc -l {} \;
```

## 타입 안전성 확인

```bash
# TypeScript 체크
npm run type-check

# ESLint 체크
npm run lint
```
