import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import GradeClassSelect from '@/components/molecules/GradeClassSelect';
import ButtonAtom from '@/components/atoms/ButtonAtom';
import AttendanceTable from './AttendanceTable';
import { Student, AttendanceRecord, AttendanceStatus } from '@/types';

interface AttendanceFormProps {
    grades: string[];
    classes: number[];
    students: Student[];
    attendance: Record<string, AttendanceRecord>;
    onGradeChange: (grade: string) => void;
    onClassChange: (classNum: number) => void;
    onStatusChange: (studentId: string, newStatus: AttendanceStatus) => void;
    onReasonChange: (studentId: string, newReason: string) => void;
    onSubmit: () => void;
    onAddStudent?: (name: string) => void;
    onRemoveStudent?: (studentId: string) => void;
    selectedGrade: string;
    selectedClass: number;
}

export default function AttendanceForm({
    grades,
    classes,
    students,
    attendance,
    onGradeChange,
    onClassChange,
    onStatusChange,
    onReasonChange,
    onSubmit,
    onAddStudent,
    onRemoveStudent,
    selectedGrade,
    selectedClass,
}: AttendanceFormProps) {
    const [newStudentName, setNewStudentName] = useState('');

    const handleAddStudent = () => {
        if (onAddStudent && newStudentName.trim()) {
            onAddStudent(newStudentName);
            setNewStudentName('');
        }
    };

    return (
        <Box component={Paper} elevation={3} sx={{ p: 3 }}>
            <Stack spacing={3}>
                <GradeClassSelect
                    grades={grades}
                    classes={classes}
                    selectedGrade={selectedGrade}
                    selectedClass={selectedClass}
                    onGradeChange={onGradeChange}
                    onClassChange={onClassChange}
                />

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <TextField 
                        size="small" 
                        placeholder="새 학생 이름" 
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                    />
                    <Button variant="outlined" onClick={handleAddStudent} disabled={!newStudentName.trim()}>
                        학생 추가
                    </Button>
                </Box>

                <AttendanceTable
                    students={students}
                    attendance={attendance}
                    onStatusChange={onStatusChange}
                    onReasonChange={onReasonChange}
                    onRemoveStudent={onRemoveStudent}
                />

                <Stack direction="row" justifyContent="flex-end" spacing={2}>
                    <ButtonAtom
                        label="출석 제출"
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={onSubmit}
                    />
                </Stack>
            </Stack>
        </Box>
    );
}
