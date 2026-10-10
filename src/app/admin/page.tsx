'use client';

import { useState, useMemo } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import GradeClassSelect from '@/components/molecules/GradeClassSelect';
import ViewModeSelector, { ViewMode } from '@/components/molecules/ViewModeSelector';
import AttendanceMatrix from '@/components/organisms/AttendanceMatrix';
import StudentManagementPanel from '@/components/organisms/StudentManagementPanel';
import Ch2chSyncPanel from '@/components/organisms/Ch2chSyncPanel';
import { useGrades } from '@/hooks/useGrades';
import { useAdminAttendance, AttendanceMatrixRow } from '@/hooks/useAdminAttendance';
import {
    getSundayOfCurrentWeek,
    getQuarter,
    getQuarterRange,
    getSundaysInRange,
} from '@/utils/dateUtils';

export default function AdminPage() {
    const { grades, classes } = useGrades();

    const [topTab, setTopTab] = useState(0); // 0=출석 관리, 1=학생 관리, 2=ch2ch 연동

    const [selectedGrade, setSelectedGrade] = useState('all');
    const [selectedClass, setSelectedClass] = useState(0); // 0 = 전체 반
    const [mode, setMode] = useState<ViewMode>('weekly');

    const todaySunday = getSundayOfCurrentWeek();
    const [currentWeek, setCurrentWeek] = useState(todaySunday);

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(getQuarter(todaySunday));

    const { rows: allRows, allDates, loading, error, saveBatchAttendance } = useAdminAttendance(selectedGrade, selectedClass);

    const filteredDates = useMemo(() => {
        if (mode === 'weekly') {
            return [currentWeek]; // 주간 모드는 해당 주차(일요일) 1개만 고정 노출
        }
        if (mode === 'quarterly') {
            const { start, end } = getQuarterRange(year, quarter);
            return getSundaysInRange(start, end); // 기록 여부와 상관없이 해당 분기의 모든 일요일 컬럼을 생성
        }
        return allDates;
    }, [mode, allDates, currentWeek, year, quarter]);

    const filteredRows = useMemo((): AttendanceMatrixRow[] => {
        return allRows.map((row) => {
            let presentCount = 0;
            let absentCount = 0;
            const records: Record<string, { status: boolean; reason?: string | null }> = {};
            for (const d of filteredDates) {
                if (d in row.records) {
                    records[d] = row.records[d];
                    if (row.records[d].status) presentCount++;
                    else absentCount++;
                }
            }
            return { ...row, records, presentCount, absentCount };
        });
    }, [allRows, filteredDates]);

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Link href="/" passHref>
                    <IconButton color="primary">
                        <ArrowBackIcon />
                    </IconButton>
                </Link>
                <TypographyAtom variant="h4" component="h1" fontWeight="bold" color="primary">
                    출석 관리 (Admin)
                </TypographyAtom>
            </Box>

            <Tabs value={topTab} onChange={(_, v) => setTopTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="출석 관리" />
                <Tab label="학생 관리" />
                <Tab label="ch2ch 연동" />
            </Tabs>

            {topTab === 0 && (
                <>
                    <Stack spacing={2} sx={{ mb: 3 }}>
                        <GradeClassSelect
                            grades={grades}
                            classes={classes}
                            selectedGrade={selectedGrade}
                            selectedClass={selectedClass}
                            onGradeChange={setSelectedGrade}
                            onClassChange={setSelectedClass}
                            showAllClassOption
                            showAllGradeOption
                        />
                        <ViewModeSelector
                            mode={mode}
                            onModeChange={setMode}
                            currentWeek={currentWeek}
                            onWeekChange={setCurrentWeek}
                            year={year}
                            quarter={quarter}
                            onYearChange={setYear}
                            onQuarterChange={setQuarter}
                        />
                    </Stack>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <AttendanceMatrix
                            rows={filteredRows}
                            dates={filteredDates}
                            grade={selectedGrade}
                            classNum={selectedClass}
                            onSaveBatch={saveBatchAttendance}
                        />
                    )}
                </>
            )}

            {topTab === 1 && <StudentManagementPanel />}

            {topTab === 2 && <Ch2chSyncPanel />}
        </Container>
    );
}
