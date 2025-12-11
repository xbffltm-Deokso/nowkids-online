import React from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Stack from '@mui/material/Stack';
import Checkbox from '@mui/material/Checkbox';
import { Student, AttendanceStatus } from '@/types';
import TypographyAtom from '@/components/atoms/TypographyAtom';

interface StudentRowProps {
    student: Student;
    currentStatus: AttendanceStatus;
    onStatusChange: (studentId: string, newStatus: AttendanceStatus) => void;
}

const STATUS_OPTIONS: AttendanceStatus[] = ['출석', '지각', '결석', '조퇴', '기타'];

export default function StudentRow({ student, currentStatus, onStatusChange }: StudentRowProps) {
    const isChecked = currentStatus === '출석';

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newStatus = event.target.checked ? '출석' : '결석';
        onStatusChange(student.id, newStatus);
    };

    return (
        <TableRow hover>
            <TableCell align="center" sx={{ width: 80 }}>
                <TypographyAtom variant="body1" fontWeight="bold">
                    {student.number}
                </TypographyAtom>
            </TableCell>
            <TableCell sx={{ width: 150 }}>
                <TypographyAtom variant="body1">{student.name}</TypographyAtom>
            </TableCell>
            <TableCell align="center">
                <Checkbox
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                    color="primary"
                />
            </TableCell>
        </TableRow>
    );
}
