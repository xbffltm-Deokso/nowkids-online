import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Student, AttendanceRecord, AttendanceStatus } from '@/types';
import StudentRow from '@/components/molecules/StudentRow';
import TypographyAtom from '@/components/atoms/TypographyAtom';

interface AttendanceTableProps {
    students: Student[];
    attendance: Record<string, AttendanceRecord>;
    onStatusChange: (studentId: string, newStatus: AttendanceStatus) => void;
    onReasonChange: (studentId: string, newReason: string) => void;
    onRemoveStudent?: (studentId: string) => void;
}

export default function AttendanceTable({ students, attendance, onStatusChange, onReasonChange, onRemoveStudent }: AttendanceTableProps) {
    return (
        <TableContainer component={Paper} elevation={2}>
            <Table aria-label="attendance table">
                <TableHead>
                    <TableRow sx={{ backgroundColor: 'primary.light' }}>
                        <TableCell>
                            <TypographyAtom color="white" fontWeight="bold">이름</TypographyAtom>
                        </TableCell>
                        <TableCell align="center">
                            <TypographyAtom color="white" fontWeight="bold">출석</TypographyAtom>
                        </TableCell>
                        <TableCell align="center">
                            <TypographyAtom color="white" fontWeight="bold">사유</TypographyAtom>
                        </TableCell>
                        <TableCell align="center" sx={{ width: 80 }}>
                            <TypographyAtom color="white" fontWeight="bold">관리</TypographyAtom>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {students.map((student) => (
                        <StudentRow
                            key={student.id}
                            student={student}
                            currentStatus={attendance[student.id]?.status ?? false}
                            reason={attendance[student.id]?.reason || ''}
                            onStatusChange={onStatusChange}
                            onReasonChange={onReasonChange}
                            onRemoveStudent={onRemoveStudent}
                        />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
