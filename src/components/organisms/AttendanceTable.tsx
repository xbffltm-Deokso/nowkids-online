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
}

export default function AttendanceTable({ students, attendance, onStatusChange }: AttendanceTableProps) {
    return (
        <TableContainer component={Paper} elevation={2}>
            <Table sx={{ minWidth: 650 }} aria-label="attendance table">
                <TableHead>
                    <TableRow sx={{ backgroundColor: 'primary.light' }}>
                        <TableCell align="center">
                            <TypographyAtom color="white" fontWeight="bold">번호</TypographyAtom>
                        </TableCell>
                        <TableCell>
                            <TypographyAtom color="white" fontWeight="bold">이름</TypographyAtom>
                        </TableCell>
                        <TableCell align="center">
                            <TypographyAtom color="white" fontWeight="bold">출석</TypographyAtom>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {students.map((student) => (
                        <StudentRow
                            key={student.id}
                            student={student}
                            currentStatus={attendance[student.id]?.status || '출석'} // 기본값 출석
                            onStatusChange={onStatusChange}
                        />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
