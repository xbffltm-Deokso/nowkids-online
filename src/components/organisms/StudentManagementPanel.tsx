'use client';

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
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
import EditIcon from '@mui/icons-material/Edit';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Alert from '@mui/material/Alert';
import AttendanceGroupChip from '@/components/atoms/AttendanceGroupChip';
import { useAttendanceGroups } from '@/hooks/useAttendanceGroups';
import { isActiveStatus } from '@/utils/studentStatus';
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
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { Student } from '@/types';
import { useStudentManagement } from '@/hooks/useStudentManagement';
import StudentFormDialog from '@/components/molecules/StudentFormDialog';

const ALL_GRADES = ['4.믿음', '5.소망', '6.사랑'];
const ALL_CLASSES = [1, 2, 3, 4];

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'default'> = {
    재학: 'success',
    휴학: 'warning',
    전학: 'default',
    진급: 'default',
};

export default function StudentManagementPanel() {
    const [tabIndex, setTabIndex] = useState(0); // 0=전체학생, 1=학년별
    const [filterGrade, setFilterGrade] = useState(ALL_GRADES[0]);
    const [filterClass, setFilterClass] = useState(1);
    const [showInactive, setShowInactive] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Student | null>(null);
    const [confirmDeactivate, setConfirmDeactivate] = useState<Student | null>(null);

    // 전체학생 탭: 모든 학생 로드
    const allStudentsHook = useStudentManagement();
    // 학년별 탭: 선택한 학년/반만 로드
    const classStudentsHook = useStudentManagement(filterGrade, filterClass);

    const groups = useAttendanceGroups();

    const isAllTab = tabIndex === 0;
    const { students: rawStudents, loading, error, refresh, saveStudent, deactivateStudent } =
        isAllTab ? allStudentsHook : classStudentsHook;

    const students = useMemo(
        () => (showInactive ? rawStudents : rawStudents.filter((s) => isActiveStatus(s.status))),
        [rawStudents, showInactive]
    );

    const handleEdit = (student: Student) => {
        setEditTarget(student);
        setDialogOpen(true);
    };

    const handleAddNew = () => {
        setEditTarget(null);
        setDialogOpen(true);
    };

    const handleSave = async (data: Omit<Student, 'id'> & { id?: string }) => {
        await saveStudent(data);
    };

    const handleDeactivateConfirm = async () => {
        if (!confirmDeactivate) return;
        await deactivateStudent(confirmDeactivate);
        setConfirmDeactivate(null);
    };

    return (
        <Box>
            <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 2 }}>
                <Tab label="전체 학생" />
                <Tab label="학년별" />
            </Tabs>

            {tabIndex === 1 && (
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>학년</InputLabel>
                        <Select
                            value={filterGrade}
                            label="학년"
                            onChange={(e) => setFilterGrade(e.target.value)}
                        >
                            {ALL_GRADES.map((g) => (
                                <MenuItem key={g} value={g}>{g}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>반</InputLabel>
                        <Select
                            value={filterClass}
                            label="반"
                            onChange={(e) => setFilterClass(Number(e.target.value))}
                        >
                            {ALL_CLASSES.map((c) => (
                                <MenuItem key={c} value={c}>{c}반</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            )}

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        총 {students.length}명
                    </Typography>
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                            />
                        }
                        label="전학·진급 학생 포함"
                    />
                </Stack>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<PersonAddIcon />}
                    onClick={handleAddNew}
                >
                    학생 추가
                </Button>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell>학년</TableCell>
                                <TableCell>반</TableCell>
                                <TableCell align="center">번호</TableCell>
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
                                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        학생 데이터가 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((student) => (
                                    <TableRow
                                        key={student.id}
                                        sx={{
                                            opacity: isActiveStatus(student.status) ? 1 : 0.5,
                                            '&:hover': { bgcolor: 'action.hover' },
                                        }}
                                    >
                                        <TableCell>{student.grade}</TableCell>
                                        <TableCell>{student.classNum}반</TableCell>
                                        <TableCell align="center">{student.number}</TableCell>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell align="center">
                                            {student.gender === 'M' ? '남' : '여'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={student.status}
                                                size="small"
                                                color={STATUS_COLOR[student.status] ?? 'default'}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <AttendanceGroupChip summary={groups.byStudent.get(student.id)} />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="수정">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEdit(student)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {isActiveStatus(student.status) && (
                                                <Tooltip title="비활성화 (전학 처리)">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => setConfirmDeactivate(student)}
                                                    >
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
                defaultGrade={tabIndex === 1 ? filterGrade : ALL_GRADES[0]}
                defaultClassNum={tabIndex === 1 ? filterClass : 1}
                onClose={() => setDialogOpen(false)}
                onSave={handleSave}
            />

            {/* 비활성화 확인 다이얼로그 */}
            <Dialog open={!!confirmDeactivate} onClose={() => setConfirmDeactivate(null)}>
                <DialogTitle>학생 비활성화</DialogTitle>
                <DialogContent>
                    <Typography>
                        <strong>{confirmDeactivate?.name}</strong> 학생을 전학 처리하시겠습니까?
                        <br />
                        출석 기록은 유지되며 상태만 변경됩니다.
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
