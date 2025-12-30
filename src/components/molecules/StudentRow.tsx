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


export default function StudentRow({ student, currentStatus, onStatusChange }: StudentRowProps) {
    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onStatusChange(student.id, event.target.checked);
    };

    return (
        <TableRow hover>
            <TableCell align="center">
                <TypographyAtom variant="body1" fontWeight="bold">
                    {student.number}
                </TypographyAtom>
            </TableCell>
            <TableCell>
                <TypographyAtom variant="body1">{student.name}</TypographyAtom>
            </TableCell>
            <TableCell align="center">
                <Checkbox
                    checked={currentStatus}
                    onChange={handleCheckboxChange}
                    color="primary"
                />
            </TableCell>
        </TableRow>
    );
}
