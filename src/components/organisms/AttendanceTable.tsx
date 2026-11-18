import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Student, AttendanceRecord, AttendanceStatus } from '@/types';
import StudentRow from '@/components/molecules/StudentRow';

interface AttendanceTableProps {
    students: Student[];
    attendance: Record<string, AttendanceRecord>;
    onStatusChange: (studentId: string, newStatus: AttendanceStatus) => void;
    onReasonChange: (studentId: string, newReason: string) => void;
    onRemoveStudent?: (studentId: string) => void;
}

export default function AttendanceTable({ students, attendance, onStatusChange, onReasonChange, onRemoveStudent }: AttendanceTableProps) {
    return (
        <TableContainer component={Paper}>
            <Table aria-label="attendance table">
                <TableHead>
                    <TableRow>
                        <TableCell>
                            이름
                        </TableCell>
                        <TableCell align="center">
                            출석
                        </TableCell>
                        <TableCell align="center">
                            사유
                        </TableCell>
                        <TableCell align="center" sx={{ width: 80 }}>
                            관리
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
