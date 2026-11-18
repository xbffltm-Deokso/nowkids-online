'use client';

import { useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import DownloadIcon from '@mui/icons-material/Download';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import PasswordDialog from '@/components/molecules/PasswordDialog';
import { useAdminPassword } from '@/hooks/useAdminPassword';
import { downloadPromotionDb } from '@/lib/api-client';
import { DepartmentDetail, DepartmentOverview } from '@/types';

// 진급자 DB 추출 — 부서 탭을 고르고, 학년이 있는 부서는 학년까지 골라 엑셀로 내려받음
export default function PromotionExportSection({ onExported }: { onExported?: () => void }) {
    const { withPassword, dialogProps } = useAdminPassword();
    const [list, setList] = useState<DepartmentDetail[]>([]);
    const [tab, setTab] = useState(0);
    const [gradeId, setGradeId] = useState('');
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/departments?detail=1')
            .then((r) => r.json())
            .then((data: DepartmentOverview) => setList(data.departments.filter((d) => d.kind === 'school' && !d.archived)))
            .catch(() => setError('부서 목록을 불러오지 못했습니다.'));
    }, []);

    const dep = list[tab];

    const handleExport = () => {
        if (!dep) return;
        setError(null);
        withPassword(
            async (password) => {
                setExporting(true);
                try {
                    await downloadPromotionDb({ departmentId: dep.id, gradeId: gradeId || undefined }, password);
                    onExported?.();
                } finally {
                    setExporting(false);
                }
            },
            (err) => setError(`추출 실패: ${err.message}`)
        );
    };

    return (
        <Paper sx={{ p: 3 }}>
            <PasswordDialog {...dialogProps} title="관리자 비밀번호" message="개인정보가 담긴 엑셀을 내려받습니다." />
            <TypographyAtom variant="h6" fontWeight="bold" gutterBottom>
                진급자 DB 추출
            </TypographyAtom>
            <TypographyAtom variant="body2" color="text.secondary" gutterBottom>
                부서를 고르면 그 부서 학생의 개인정보와 최근 52주 출석률·출석그룹(A~E)을 엑셀로 내려받습니다. 학년이 있는
                부서는 학년만 골라 받을 수도 있습니다(예: 소년부 6학년 → 중등부 진급자). 개인정보가 담긴 파일이니 필요한
                사람에게만 전달하고 사용 후 삭제해 주세요.
            </TypographyAtom>
            {error && <Alert severity="error" sx={{ my: 1 }} onClose={() => setError(null)}>{error}</Alert>}
            {list.length > 0 && (
                <>
                    <Tabs
                        value={Math.min(tab, list.length - 1)}
                        onChange={(_, v) => {
                            setTab(v);
                            setGradeId('');
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ borderBottom: 1, borderColor: 'divider', mt: 1 }}
                    >
                        {list.map((d) => (
                            <Tab key={d.id} label={`${d.name}${d.serviceTime ? ` ${d.serviceTime}` : ''}`} />
                        ))}
                    </Tabs>
                    {dep && (
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                            <TypographyAtom variant="body2">
                                재적 <b>{dep.activeStudents}명</b>
                            </TypographyAtom>
                            {dep.grades.length > 0 && (
                                <TextField
                                    select
                                    size="small"
                                    label="학년"
                                    value={gradeId}
                                    onChange={(e) => setGradeId(e.target.value)}
                                    sx={{ minWidth: 140 }}
                                >
                                    <MenuItem value="">부서 전체</MenuItem>
                                    {dep.grades.map((g) => (
                                        <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                                    ))}
                                </TextField>
                            )}
                            <Button
                                variant="contained"
                                onClick={handleExport}
                                disabled={exporting || dep.activeStudents === 0}
                                startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                            >
                                엑셀로 추출
                            </Button>
                        </Stack>
                    )}
                </>
            )}
        </Paper>
    );
}
