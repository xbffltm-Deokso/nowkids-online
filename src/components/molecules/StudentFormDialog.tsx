'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { DepartmentDetail, Gender, Student, StudentStatus } from '@/types';
import { StudentInput } from '@/hooks/useStudentManagement';

interface StudentFormDialogProps {
    open: boolean;
    student?: Student | null;
    department: DepartmentDetail; // 지금 보고 있는 부서 (새 학생 기본값)
    departments: DepartmentDetail[]; // 다른 부서로 옮길 때 고를 목록
    defaultGradeId?: string;
    defaultClassId?: string;
    onClose: () => void;
    onSave: (data: StudentInput) => Promise<void>;
}

const STATUSES: { value: StudentStatus; label: string }[] = [
    { value: '재학', label: '재학' },
    { value: '새친구', label: '새친구' },
    { value: '휴학', label: '휴학' },
    { value: '전학', label: '전학 (목록에서 빠짐)' },
    { value: '진급', label: '진급 (목록에서 빠짐)' },
];

// 학생 추가·수정 — 부서·학년·반을 고름 (반은 출석 화면 묶음용, 비워도 됨)
export default function StudentFormDialog({
    open,
    student,
    department,
    departments,
    defaultGradeId,
    defaultClassId,
    onClose,
    onSave,
}: StudentFormDialogProps) {
    const [departmentId, setDepartmentId] = useState(department.id);
    const [gradeId, setGradeId] = useState('');
    const [classId, setClassId] = useState('');
    const [number, setNumber] = useState(0);
    const [name, setName] = useState('');
    const [gender, setGender] = useState<Gender>('M');
    const [status, setStatus] = useState<StudentStatus>('재학');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        if (student) {
            setDepartmentId(student.departmentId ?? department.id);
            setGradeId(student.gradeId ?? '');
            setClassId(student.classId ?? '');
            setNumber(student.number);
            setName(student.name);
            setGender(student.gender);
            setStatus(student.status);
        } else {
            setDepartmentId(department.id);
            setGradeId(defaultGradeId ?? '');
            setClassId(defaultClassId && defaultClassId !== 'none' ? defaultClassId : '');
            setNumber(0);
            setName('');
            setGender('M');
            setStatus('재학');
        }
    }, [open, student, department.id, defaultGradeId, defaultClassId]);

    const target = departments.find((d) => d.id === departmentId) ?? department;
    const gradeName = target.grades.find((g) => g.id === gradeId)?.name;
    const classOptions = gradeName ? target.classes.filter((c) => c.name.startsWith(`${gradeName} `)) : target.classes;

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        setError(null);
        try {
            await onSave({
                id: student?.id,
                departmentId,
                gradeId: gradeId || null,
                classId: classId || null,
                number,
                name: name.trim(),
                gender,
                status,
            });
            onClose();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{student ? '학생 정보 수정' : '학생 추가'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField
                        label="이름"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
                        autoFocus={!student}
                    />
                    <TextField
                        select
                        label="부서"
                        value={departmentId}
                        onChange={(e) => {
                            setDepartmentId(e.target.value);
                            setGradeId('');
                            setClassId('');
                        }}
                        helperText={departmentId !== (student?.departmentId ?? department.id) ? '저장하면 이 부서로 옮겨집니다. 지난 출석 기록은 그대로 남습니다.' : undefined}
                    >
                        {departments.map((d) => (
                            <MenuItem key={d.id} value={d.id}>
                                {d.name}
                                {d.serviceTime ? ` (${d.serviceTime})` : ''}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Stack direction="row" spacing={2}>
                        {target.grades.length > 0 && (
                            <TextField
                                select
                                label="학년"
                                value={gradeId}
                                onChange={(e) => {
                                    setGradeId(e.target.value);
                                    setClassId('');
                                }}
                                fullWidth
                            >
                                <MenuItem value="">없음</MenuItem>
                                {target.grades.map((g) => (
                                    <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                                ))}
                            </TextField>
                        )}
                        <TextField select label="반" value={classId} onChange={(e) => setClassId(e.target.value)} fullWidth>
                            <MenuItem value="">미배정</MenuItem>
                            {classOptions.map((c) => (
                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <TextField select label="성별" value={gender} onChange={(e) => setGender(e.target.value as Gender)} fullWidth>
                            <MenuItem value="M">남</MenuItem>
                            <MenuItem value="F">여</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="상태"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as StudentStatus)}
                            fullWidth
                        >
                            {STATUSES.map((s) => (
                                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="번호"
                            type="number"
                            value={number}
                            onChange={(e) => setNumber(Math.max(0, Number(e.target.value)))}
                            sx={{ width: 100, flexShrink: 0 }}
                        />
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>취소</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving || !name.trim()}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                >
                    저장
                </Button>
            </DialogActions>
        </Dialog>
    );
}
