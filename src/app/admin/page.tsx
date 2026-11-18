'use client';

import { useState, useMemo, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import DepartmentScopeSelect from '@/components/molecules/DepartmentScopeSelect';
import ViewModeSelector, { ViewMode } from '@/components/molecules/ViewModeSelector';
import AttendanceMatrix from '@/components/organisms/AttendanceMatrix';
import StudentManagementPanel from '@/components/organisms/StudentManagementPanel';
import Ch2chSyncPanel from '@/components/organisms/Ch2chSyncPanel';
import AttendanceStatsPanel from '@/components/organisms/AttendanceStatsPanel';
import AdminDataPanel from '@/components/organisms/AdminDataPanel';
import { useDepartments } from '@/hooks/useDepartments';
import { useAdminAttendance, AttendanceMatrixRow } from '@/hooks/useAdminAttendance';
import { getSundayOfCurrentWeek, getQuarter, getQuarterRange, getSundaysInRange } from '@/utils/dateUtils';

// 위: 부서 탭(출석 관리·출석 통계·학생 관리에 적용), 아래: 기능 탭
const SECTIONS = [
    { label: '출석 관리', perDepartment: true },
    { label: '출석 통계', perDepartment: true },
    { label: '학생 관리', perDepartment: true },
    { label: 'ch2ch 연동', perDepartment: false },
    { label: '부서·진급·개인정보', perDepartment: false },
];

export default function AdminPage() {
    const departments = useDepartments();
    const department = departments.selected;

    const [topTab, setTopTab] = useState(0);
    const [gradeId, setGradeId] = useState('');
    const [classId, setClassId] = useState('');
    const [mode, setMode] = useState<ViewMode>('weekly');

    const todaySunday = getSundayOfCurrentWeek();
    const [currentWeek, setCurrentWeek] = useState(todaySunday);
    const [year, setYear] = useState(Number(todaySunday.slice(0, 4)));
    const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(getQuarter(todaySunday));

    // 부서를 바꾸면 학년·반 선택은 처음으로
    useEffect(() => {
        setGradeId('');
        setClassId('');
    }, [department?.id]);

    const scope = useMemo(
        () => (department ? { departmentId: department.id, gradeId: gradeId || undefined, classId: classId || undefined } : null),
        [department, gradeId, classId]
    );
    const { rows: allRows, allDates, loading, error, saveBatchAttendance } = useAdminAttendance(topTab === 0 ? scope : null);

    const filteredDates = useMemo(() => {
        if (mode === 'weekly') return [currentWeek]; // 주간 모드는 해당 주차(일요일) 1개만
        if (mode === 'quarterly') {
            const { start, end } = getQuarterRange(year, quarter);
            return getSundaysInRange(start, end); // 기록 여부와 상관없이 분기의 모든 일요일
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

    const perDepartment = SECTIONS[topTab].perDepartment;
    const scopeLabel = department
        ? [
              department.name,
              department.grades.find((g) => g.id === gradeId)?.name,
              classId === 'none' ? '반 미배정' : department.classes.find((c) => c.id === classId)?.name,
          ]
              .filter(Boolean)
              .join('_')
        : '';

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* 머리글 */}
            <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
                <Container maxWidth="xl">
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pt: 2.5, pb: 1 }}>
                        <Link href="/" passHref>
                            <IconButton size="small" aria-label="처음 화면">
                                <ArrowBackIcon fontSize="small" />
                            </IconButton>
                        </Link>
                        <Box>
                            <TypographyAtom variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                덕소교회 교회학교
                            </TypographyAtom>
                            <TypographyAtom variant="h5" component="h1" fontWeight={700}>
                                출석 관리
                            </TypographyAtom>
                        </Box>
                    </Stack>
                    <Tabs
                        value={topTab}
                        onChange={(_, v) => setTopTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ minHeight: 44, '& .MuiTab-root': { minHeight: 44 } }}
                    >
                        {SECTIONS.map((s) => (
                            <Tab key={s.label} label={s.label} />
                        ))}
                    </Tabs>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ py: 3 }}>
                {departments.error && <Alert severity="error" sx={{ mb: 2 }}>{departments.error}</Alert>}

                {/* 부서 선택 */}
                {perDepartment && (
                    <Paper variant="outlined" sx={{ p: 1.5, mb: 3 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ overflowX: 'auto', pb: 0.5 }}>
                            <TypographyAtom variant="body2" color="text.secondary" sx={{ px: 1, whiteSpace: 'nowrap' }}>
                                부서
                            </TypographyAtom>
                            {departments.schools.length === 0 && !departments.error && <CircularProgress size={18} />}
                            {departments.schools.map((d) => {
                                const active = d.id === department?.id;
                                return (
                                    <Chip
                                        key={d.id}
                                        label={
                                            <span>
                                                {d.name}
                                                <Box component="span" sx={{ ml: 0.75, opacity: 0.7, fontSize: 12 }}>
                                                    {d.serviceTime ? `${d.serviceTime} · ` : ''}
                                                    {d.activeStudents}명
                                                </Box>
                                            </span>
                                        }
                                        color={active ? 'primary' : 'default'}
                                        variant={active ? 'filled' : 'outlined'}
                                        onClick={() => departments.select(d.id)}
                                        sx={{ fontWeight: active ? 700 : 500, flexShrink: 0 }}
                                    />
                                );
                            })}
                        </Stack>
                    </Paper>
                )}

                {topTab === 0 && department && (
                    <>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems={{ md: 'center' }}>
                            <DepartmentScopeSelect
                                department={department}
                                gradeId={gradeId}
                                classId={classId}
                                onGradeChange={setGradeId}
                                onClassChange={setClassId}
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
                        ) : department.activeStudents === 0 && allRows.length === 0 ? (
                            <Alert severity="info">
                                {department.name}에는 아직 학생이 없습니다. 학생 관리 탭에서 추가하거나 교적 동기화로 불러와 주세요.
                            </Alert>
                        ) : (
                            <AttendanceMatrix
                                rows={filteredRows}
                                dates={filteredDates}
                                scopeLabel={scopeLabel}
                                showClass={!classId}
                                onSaveBatch={saveBatchAttendance}
                            />
                        )}
                    </>
                )}

                {topTab === 1 && department && <AttendanceStatsPanel key={department.id} department={department} />}

                {topTab === 2 && department && (
                    <StudentManagementPanel
                        key={department.id}
                        department={department}
                        departments={departments.schools}
                        onChanged={departments.reload}
                    />
                )}

                {topTab === 3 && <Ch2chSyncPanel />}

                {topTab === 4 && <AdminDataPanel onDepartmentsChanged={departments.reload} />}
            </Container>
        </Box>
    );
}
