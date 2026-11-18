'use client';

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import EditIcon from '@mui/icons-material/Edit';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import AttendanceGroupChip from '@/components/atoms/AttendanceGroupChip';
import DepartmentScopeSelect from '@/components/molecules/DepartmentScopeSelect';
import StudentFormDialog from '@/components/molecules/StudentFormDialog';
import { useAttendanceGroups } from '@/hooks/useAttendanceGroups';
import { useStudentManagement, StudentInput } from '@/hooks/useStudentManagement';
import { isActiveStatus } from '@/utils/studentStatus';
import { DepartmentDetail, Student } from '@/types';

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
    재학: 'success',
    새친구: 'info',
    휴학: 'warning',
    전학: 'default',
    진급: 'default',
};

// 학생 관리 — 고른 부서의 학생 목록(학년·반으로 좁히기), 추가·수정·부서 이동·전학 처리
export default function StudentManagementPanel({
    department,
    departments,
    onChanged,
}: {
    department: DepartmentDetail;
    departments: DepartmentDetail[];
    onChanged?: () => void;
}) {
    const [gradeId, setGradeId] = useState('');
    const [classId, setClassId] = useState('');
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Student | null>(null);
    const [confirmDeactivate, setConfirmDeactivate] = useState<Student | null>(null);

    const scope = useMemo(
        () => ({ departmentId: department.id, gradeId: gradeId || undefined, classId: classId || undefined }),
        [department.id, gradeId, classId]
    );
    const { students: rawStudents, loading, error, saveStudent, deactivateStudent } = useStudentManagement(scope);
    const groups = useAttendanceGroups(department.id);

    const students = useMemo(() => {
        const term = search.replace(/\s+/g, '');
        return rawStudents.filter(
            (s) => (showInactive || isActiveStatus(s.status)) && (!term || s.name.replace(/\s+/g, '').includes(term))
        );
    }, [rawStudents, showInactive, search]);

    const handleSave = async (data: StudentInput) => {
        await saveStudent(data);
        onChanged?.();
    };

    const handleDeactivateConfirm = async () => {
        if (!confirmDeactivate) return;
        await deactivateStudent(confirmDeactivate);
        setConfirmDeactivate(null);
        onChanged?.();
    };

    const hasGrades = department.grades.length > 0;

    return (
        <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
                    <DepartmentScopeSelect
                        department={department}
                        gradeId={gradeId}
                        classId={classId}
                        onGradeChange={setGradeId}
                        onClassChange={setClassId}
                    />
                    <TextField
                        size="small"
                        placeholder="이름 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ width: 180 }}
                    />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <FormControlLabel
                        control={<Switch size="small" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
                        label="전학·진급 포함"
                    />
                    <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={() => {
                            setEditTarget(null);
                            setDialogOpen(true);
                        }}
                    >
                        학생 추가
                    </Button>
                </Stack>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {department.name} · {students.length}명
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {hasGrades && <TableCell>학년</TableCell>}
                                <TableCell>반</TableCell>
                                <TableCell>이름</TableCell>
                                <TableCell align="center">성별</TableCell>
                                <TableCell align="center">상태</TableCell>
                                <TableCell align="center">출석 그룹(52주)</TableCell>
                                <TableCell align="center">관리</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {students.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                        학생이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((student) => (
                                    <TableRow key={student.id} hover sx={{ opacity: isActiveStatus(student.status) ? 1 : 0.5 }}>
                                        {hasGrades && <TableCell>{student.gradeLabel || '-'}</TableCell>}
                                        <TableCell>{student.classLabel ?? '-'}</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>
                                            {student.name}
                                            {student.needsRegistration && (
                                                <Tooltip title="ch2ch 교적 명단에 없음 — 교적 등록이 필요합니다">
                                                    <Chip label="교적 등록 필요" size="small" color="warning" sx={{ ml: 1 }} />
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">{student.gender === 'M' ? '남' : '여'}</TableCell>
                                        <TableCell align="center">
                                            <Chip label={student.status} size="small" color={STATUS_COLOR[student.status] ?? 'default'} variant="outlined" />
                                        </TableCell>
                                        <TableCell align="center">
                                            <AttendanceGroupChip summary={groups.byStudent.get(student.id)} />
                                        </TableCell>
                                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                            <Tooltip title="수정·부서 이동">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setEditTarget(student);
                                                        setDialogOpen(true);
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {isActiveStatus(student.status) && (
                                                <Tooltip title="전학 처리">
                                                    <IconButton size="small" color="error" onClick={() => setConfirmDeactivate(student)}>
                                                        <PersonOffIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <StudentFormDialog
                open={dialogOpen}
                student={editTarget}
                department={department}
                departments={departments}
                defaultGradeId={gradeId}
                defaultClassId={classId}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
            />

            <Dialog open={!!confirmDeactivate} onClose={() => setConfirmDeactivate(null)}>
                <DialogTitle>전학 처리</DialogTitle>
                <DialogContent>
                    <Typography>
                        <strong>{confirmDeactivate?.name}</strong> 학생을 전학 처리할까요?
                        <br />
                        출석 기록은 그대로 남고 상태만 바뀝니다.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeactivate(null)}>취소</Button>
                    <Button color="error" variant="contained" onClick={handleDeactivateConfirm}>
                        전학 처리
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
