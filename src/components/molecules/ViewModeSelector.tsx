import React from 'react';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Stack from '@mui/material/Stack';
import { addWeeks, formatDateShort } from '@/utils/dateUtils';

export type ViewMode = 'weekly' | 'quarterly' | 'all';

interface ViewModeSelectorProps {
    mode: ViewMode;
    onModeChange: (mode: ViewMode) => void;
    // weekly
    currentWeek: string;
    onWeekChange: (date: string) => void;
    // quarterly
    year: number;
    quarter: 1 | 2 | 3 | 4;
    onYearChange: (year: number) => void;
    onQuarterChange: (q: 1 | 2 | 3 | 4) => void;
}

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

export default function ViewModeSelector({
    mode,
    onModeChange,
    currentWeek,
    onWeekChange,
    year,
    quarter,
    onYearChange,
    onQuarterChange,
}: ViewModeSelectorProps) {
    return (
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
            <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(_, v) => v && onModeChange(v)}
                size="small"
            >
                <ToggleButton value="weekly">주별</ToggleButton>
                <ToggleButton value="quarterly">분기별</ToggleButton>
                <ToggleButton value="all">전체</ToggleButton>
            </ToggleButtonGroup>

            {mode === 'weekly' && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconButton size="small" onClick={() => onWeekChange(addWeeks(currentWeek, -1))}>
                        <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="body2" sx={{ minWidth: 90, textAlign: 'center' }}>
                        {formatDateShort(currentWeek)} (일)
                    </Typography>
                    <IconButton size="small" onClick={() => onWeekChange(addWeeks(currentWeek, 1))}>
                        <ChevronRightIcon />
                    </IconButton>
                </Stack>
            )}

            {mode === 'quarterly' && (
                <Stack direction="row" spacing={1}>
                    <FormControl size="small">
                        <Select value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
                            {YEARS.map((y) => (
                                <MenuItem key={y} value={y}>{y}년</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small">
                        <Select value={quarter} onChange={(e) => onQuarterChange(Number(e.target.value) as 1|2|3|4)}>
                            {([1, 2, 3, 4] as const).map((q) => (
                                <MenuItem key={q} value={q}>{q}분기</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            )}
        </Stack>
    );
}
