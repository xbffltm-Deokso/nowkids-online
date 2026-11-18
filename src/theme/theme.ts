'use client';

import { alpha, createTheme } from '@mui/material/styles';

// 교회학교 출석 — 차분한 남색 + 따뜻한 회색 바탕, 그림자 대신 얇은 테두리
const INK = '#1B2030';
const MUTED = '#5E6575';
const LINE = '#E4E7EC';
const CANVAS = '#F4F5F7';
const PRIMARY = '#2F4FB8';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: PRIMARY, light: '#5873D4', dark: '#233D92', contrastText: '#FFFFFF' },
        secondary: { main: '#D9822B', light: '#F0A65B', dark: '#B0661B', contrastText: '#FFFFFF' },
        success: { main: '#2E8B57', light: '#E7F4EC', dark: '#1F6B41' },
        error: { main: '#D1435B', light: '#FBEAED', dark: '#A8293F' },
        warning: { main: '#C77C02', light: '#FDF3E1', dark: '#9A5F00' },
        info: { main: '#2F7FB8', light: '#E6F1F9', dark: '#215F8C' },
        text: { primary: INK, secondary: MUTED },
        divider: LINE,
        background: { default: CANVAS, paper: '#FFFFFF' },
        action: { hover: alpha(PRIMARY, 0.04), selected: alpha(PRIMARY, 0.08) },
    },
    shape: { borderRadius: 10 },
    typography: {
        fontFamily: [
            '"Pretendard Variable"',
            'Pretendard',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Apple SD Gothic Neo"',
            '"Malgun Gothic"',
            'sans-serif',
        ].join(','),
        h4: { fontWeight: 700, letterSpacing: '-0.02em' },
        h5: { fontWeight: 700, letterSpacing: '-0.02em' },
        h6: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: '1.125rem' },
        subtitle1: { fontWeight: 600 },
        subtitle2: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
        overline: { fontWeight: 600, letterSpacing: '0.06em' },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    wordBreak: 'keep-all', // 한글 단어 중간에서 줄바꿈하지 않음
                },
            },
        },
        MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: { backgroundImage: 'none' },
                elevation0: { border: `1px solid ${LINE}` },
                rounded: { borderRadius: 14 },
            },
        },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { borderRadius: 10, paddingInline: 16 },
                sizeSmall: { paddingInline: 10 },
                outlined: { borderColor: LINE, '&:hover': { borderColor: alpha(PRIMARY, 0.5) } },
            },
        },
        MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
        MuiTabs: {
            styleOverrides: {
                indicator: { height: 3, borderRadius: '3px 3px 0 0' },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: MUTED,
                    minWidth: 0,
                    paddingInline: 14,
                    '&.Mui-selected': { color: INK },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: { borderColor: LINE },
                head: {
                    backgroundColor: '#F8F9FB',
                    color: MUTED,
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    whiteSpace: 'nowrap',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: { '&:last-of-type td': { borderBottom: 0 } },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { fontWeight: 500, borderRadius: 8 },
                outlined: { borderColor: LINE },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    backgroundColor: '#FFFFFF',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: LINE },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(PRIMARY, 0.45) },
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: { borderRadius: 12, alignItems: 'center' },
                standardInfo: { border: `1px solid ${alpha('#2F7FB8', 0.18)}` },
                standardSuccess: { border: `1px solid ${alpha('#2E8B57', 0.2)}` },
                standardWarning: { border: `1px solid ${alpha('#C77C02', 0.2)}` },
                standardError: { border: `1px solid ${alpha('#D1435B', 0.2)}` },
            },
        },
        MuiDialog: {
            styleOverrides: { paper: { borderRadius: 16, border: 'none' } },
        },
        MuiDialogTitle: { styleOverrides: { root: { fontWeight: 700 } } },
        MuiTooltip: {
            styleOverrides: { tooltip: { backgroundColor: INK, fontSize: '0.75rem', borderRadius: 8 } },
        },
        MuiToggleButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: LINE,
                    paddingInline: 12,
                    '&.Mui-selected': { backgroundColor: alpha(PRIMARY, 0.08), color: PRIMARY },
                },
            },
        },
    },
});

export default theme;
