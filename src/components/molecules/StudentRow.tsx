import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { Student, AttendanceStatus } from '@/types';
import TypographyAtom from '@/components/atoms/TypographyAtom';

interface StudentRowProps {
    student: Student;
    currentStatus: AttendanceStatus;
    reason: string;
    onStatusChange: (studentId: string, newStatus: AttendanceStatus) => void;
    onReasonChange: (studentId: string, newReason: string) => void;
    onRemoveStudent?: (studentId: string) => void;
}

const PRESET_REASONS = ['여행', '병결', '상례', '대회 출전'];

export default function StudentRow({ 
    student, 
    currentStatus, 
    reason, 
    onStatusChange, 
    onReasonChange,
    onRemoveStudent
}: StudentRowProps) {
    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onStatusChange(student.id, event.target.checked);
    };

    const handleReasonSelectChange = (event: SelectChangeEvent) => {
        onReasonChange(student.id, event.target.value);
    };

    const handleReasonTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onReasonChange(student.id, event.target.value);
    };

    const isPreset = PRESET_REASONS.includes(reason) || reason === '';
    const displayValue = isPreset ? reason : '기타';

    return (
        <TableRow hover>
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
            <TableCell align="center">
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                    <Select
                        value={displayValue}
                        onChange={handleReasonSelectChange}
                        size="small"
                        disabled={currentStatus}
                        sx={{ minWidth: 120 }}
                    >
                        <MenuItem value=""><em>선택 없음</em></MenuItem>
                        {PRESET_REASONS.map((r) => (
                            <MenuItem key={r} value={r}>{r}</MenuItem>
                        ))}
                        <MenuItem value="기타">기타</MenuItem>
                    </Select>
                    
                    {!isPreset && (
                        <TextField
                            size="small"
                            value={reason === '기타' ? '' : reason}
                            onChange={handleReasonTextChange}
                            placeholder="사유 입력"
                            disabled={currentStatus}
                            sx={{ width: 150 }}
                        />
                    )}
                </Stack>
            </TableCell>
            <TableCell align="center">
                <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => onRemoveStudent?.(student.id)}
                    title="목록에서 제외 (전학 처리)"
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </TableCell>
        </TableRow>
    );
}
