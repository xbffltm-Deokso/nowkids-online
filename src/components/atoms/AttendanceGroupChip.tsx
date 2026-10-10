import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { AttendanceSummary } from '@/types';

// 52주 출석 그룹 표시 — 글자(A~E)가 의미를 담고, 색은 보조
const GROUP_COLOR = {
    A: 'success',
    B: 'info',
    C: 'default',
    D: 'warning',
    E: 'error',
} as const;

export default function AttendanceGroupChip({ summary }: { summary?: AttendanceSummary }) {
    if (!summary || summary.group === null) {
        return <Chip label="-" size="small" variant="outlined" />;
    }
    return (
        <Tooltip title={`최근 52주 ${summary.present}/${summary.weeks}주 출석 (${summary.rate}%)`}>
            <Chip
                label={`${summary.group} · ${Math.round(summary.rate ?? 0)}%`}
                size="small"
                color={GROUP_COLOR[summary.group]}
                variant={summary.group === 'C' ? 'outlined' : 'filled'}
            />
        </Tooltip>
    );
}
