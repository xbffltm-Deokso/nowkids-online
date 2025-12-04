import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid2';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import { AttendanceRecord, AttendanceStatus } from '@/types';

interface AttendanceSummaryProps {
    attendance: Record<string, AttendanceRecord>;
    totalStudents: number;
}

interface StatusCount {
    status: AttendanceStatus;
    count: number;
    color: string;
    label: string;
}

export default function AttendanceSummary({ attendance, totalStudents }: AttendanceSummaryProps) {
    const records = Object.values(attendance);

    const counts: StatusCount[] = [
        {
            status: '출석',
            count: records.filter(r => r.status === '출석').length,
            color: 'success.main',
            label: '출석',
        },
        {
            status: '지각',
            count: records.filter(r => r.status === '지각').length,
            color: 'warning.main',
            label: '지각',
        },
        {
            status: '결석',
            count: records.filter(r => r.status === '결석').length,
            color: 'error.main',
            label: '결석',
        },
        {
            status: '조퇴',
            count: records.filter(r => r.status === '조퇴').length,
            color: 'info.main',
            label: '조퇴',
        },
        {
            status: '기타',
            count: records.filter(r => r.status === '기타').length,
            color: 'text.secondary',
            label: '기타',
        },
    ];

    const checkedCount = records.length;
    const uncheckedCount = totalStudents - checkedCount;

    return (
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Stack spacing={2}>
                <TypographyAtom variant="h6" fontWeight="bold">
                    출석 현황
                </TypographyAtom>

                <Grid container spacing={2}>
                    {counts.map(({ status, count, color, label }) => (
                        <Grid key={status} size={{ xs: 6, sm: 2.4 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    bgcolor: 'background.default',
                                    textAlign: 'center',
                                }}
                            >
                                <TypographyAtom variant="body2" color="text.secondary">
                                    {label}
                                </TypographyAtom>
                                <TypographyAtom variant="h4" fontWeight="bold" sx={{ color }}>
                                    {count}
                                </TypographyAtom>
                            </Box>
                        </Grid>
                    ))}
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                    <TypographyAtom variant="body2" color="text.secondary">
                        체크 완료: {checkedCount} / {totalStudents}
                    </TypographyAtom>
                    {uncheckedCount > 0 && (
                        <TypographyAtom variant="body2" color="error.main" fontWeight="bold">
                            미체크: {uncheckedCount}명
                        </TypographyAtom>
                    )}
                </Box>
            </Stack>
        </Paper>
    );
}
