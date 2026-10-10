'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import { Student, Gender, StudentStatus } from '@/types';

const GRADES = ['4.믿음', '5.소망', '6.사랑'];
const CLASSES = [1, 2, 3, 4];

interface StudentFormDialogProps {
    open: boolean;
    student?: Student | null;
    defaultGrade?: string;
    defaultClassNum?: number;
    onClose: () => void;
    onSave: (data: Omit<Student, 'id'> & { id?: string }) => Promise<void>;
}

export default function StudentFormDialog({
    open,
    student,
    defaultGrade,
    defaultClassNum,
    onClose,
    onSave,
}: StudentFormDialogProps) {
    const [grade, setGrade] = useState(defaultGrade ?? GRADES[0]);
    const [classNum, setClassNum] = useState(defaultClassNum ?? 1);
    const [number, setNumber] = useState(1);
    const [name, setName] = useState('');
    const [gender, setGender] = useState<Gender>('M');
    const [status, setStatus] = useState<StudentStatus>('재학');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (student) {
            setGrade(student.grade);
            setClassNum(student.classNum);
            setNumber(student.number);
            setName(student.name);
            setGender(student.gender);
            setStatus(student.status);
        } else {
            setGrade(defaultGrade ?? GRADES[0]);
            setClassNum(defaultClassNum ?? 1);
            setNumber(1);
            setName('');
            setGender('M');
            setStatus('재학');
        }
    }, [open, student, defaultGrade, defaultClassNum]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await onSave({ id: student?.id, grade, classNum, number, name: name.trim(), gender, status });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{student ? '학생 정보 수정' : '학생 추가'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Stack direction="row" spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel>학년</InputLabel>
                            <Select
                                value={grade}
                                label="학년"
                                onChange={(e) => setGrade(e.target.value)}
                            >
                                {GRADES.map((g) => (
                                    <MenuItem key={g} value={g}>{g}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>반</InputLabel>
                            <Select
                                value={classNum}
                                label="반"
                                onChange={(e) => setClassNum(Number(e.target.value))}
                            >
                                {CLASSES.map((c) => (
                                    <MenuItem key={c} value={c}>{c}반</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                    <TextField
                        label="번호"
                        type="number"
                        value={number}
                        onChange={(e) => setNumber(Number(e.target.value))}
                        inputProps={{ min: 1 }}
                        fullWidth
                    />
                    <TextField
                        label="이름"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        fullWidth
                        required
                        autoFocus={!student}
                    />
                    <Stack direction="row" spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel>성별</InputLabel>
                            <Select
                                value={gender}
                                label="성별"
                                onChange={(e) => setGender(e.target.value as Gender)}
                            >
                                <MenuItem value="M">남</MenuItem>
                                <MenuItem value="F">여</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>상태</InputLabel>
                            <Select
                                value={status}
                                label="상태"
                                onChange={(e) => setStatus(e.target.value as StudentStatus)}
                            >
                                <MenuItem value="재학">재학</MenuItem>
                                <MenuItem value="휴학">휴학</MenuItem>
                                <MenuItem value="전학">전학</MenuItem>
                                <MenuItem value="진급">진급 (중등부)</MenuItem>
                            </Select>
                        </FormControl>
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
