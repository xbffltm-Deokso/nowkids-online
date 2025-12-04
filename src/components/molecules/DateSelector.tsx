import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import ButtonAtom from '@/components/atoms/ButtonAtom';

interface DateSelectorProps {
    date: string;
    onDateChange: (date: string) => void;
}

export default function DateSelector({ date, onDateChange }: DateSelectorProps) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                size="medium"
                sx={{ minWidth: 200 }}
                InputLabelProps={{
                    shrink: true,
                }}
            />

            <Stack direction="row" spacing={1}>
                <ButtonAtom
                    label="어제"
                    variant="outlined"
                    size="small"
                    onClick={() => onDateChange(yesterday)}
                />
                <ButtonAtom
                    label="오늘"
                    variant="outlined"
                    size="small"
                    onClick={() => onDateChange(today)}
                />
            </Stack>
        </Stack>
    );
}
