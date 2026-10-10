'use client';

import { useCallback, useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import PasswordDialog from '@/components/molecules/PasswordDialog';
import { useAdminPassword } from '@/hooks/useAdminPassword';
import { downloadPromotionDb, fetchAdminLogs, fetchStudents, importPrivateData, promoteStudents } from '@/lib/api-client';
import { isActiveStatus } from '@/utils/studentStatus';
import { useGrades } from '@/hooks/useGrades';
import { AdminLog, PrivateImportResult, PromoteResult } from '@/types';

const ACTION_LABEL: Record<AdminLog['action'], string> = {
    import: '가져오기',
    export: '추출',
    promote: '진급 처리',
};

function NameList({ title, names, severity }: { title: string; names: string[]; severity: 'info' | 'warning' }) {
    if (names.length === 0) return null;
    return (
        <Alert severity={severity} sx={{ mt: 1 }}>
            <b>{title} ({names.length}명)</b>: {names.join(', ')}
        </Alert>
    );
}

// Admin "진급·개인정보" 탭 — 개인정보는 화면에 표시하지 않고, 비밀번호 확인 후 서버에서만 처리
export default function AdminDataPanel() {
    const { withPassword, dialogProps } = useAdminPassword();
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<AdminLog[]>([]);

    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<PrivateImportResult | null>(null);

    const { grades } = useGrades();
    const [exportGrade, setExportGrade] = useState(grades[grades.length - 1] ?? 'all');
    const [exporting, setExporting] = useState(false);

    // 진급 처리: 확인 창에 학년별 재적 인원을 보여 준 뒤 실행
    const [promoteCounts, setPromoteCounts] = useState<Record<string, number> | null>(null);
    const [promoting, setPromoting] = useState(false);
    const [promoteResult, setPromoteResult] = useState<PromoteResult | null>(null);

    const loadLogs = useCallback(() => {
        fetchAdminLogs().then(setLogs).catch(() => setLogs([]));
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleImport = () => {
        if (!file) return;
        setError(null);
        withPassword(
            async (password) => {
                setImporting(true);
                try {
                    setImportResult(await importPrivateData(file, password));
                    loadLogs();
                } finally {
                    setImporting(false);
                }
            },
            (err) => setError(`가져오기 실패: ${err.message}`)
        );
    };

    const handleExport = () => {
        setError(null);
        withPassword(
            async (password) => {
                setExporting(true);
                try {
                    await downloadPromotionDb(exportGrade, password);
                    loadLogs();
                } finally {
                    setExporting(false);
                }
            },
            (err) => setError(`추출 실패: ${err.message}`)
        );
    };

    const openPromoteConfirm = async () => {
        setError(null);
        try {
            const all = await fetchStudents('all', 0);
            const counts: Record<string, number> = {};
            for (const g of grades) counts[g] = all.filter((s) => s.grade === g && isActiveStatus(s.status)).length;
            setPromoteCounts(counts);
        } catch (err) {
            setError(`학생 목록을 불러오지 못했습니다: ${(err as Error).message}`);
        }
    };

    const handlePromote = () => {
        setPromoteCounts(null);
        withPassword(
            async (password) => {
                setPromoting(true);
                try {
                    setPromoteResult(await promoteStudents(password));
                    loadLogs();
                } finally {
                    setPromoting(false);
                }
            },
            (err) => setError(`진급 처리 실패: ${err.message}`)
        );
    };

    const lastGrade = grades[grades.length - 1];

    return (
        <Stack spacing={3}>
            <Dialog open={promoteCounts !== null} onClose={() => setPromoteCounts(null)} maxWidth="xs" fullWidth>
                <DialogTitle>진급 처리 확인</DialogTitle>
                <DialogContent>
                    {promoteCounts && (
                        <Stack spacing={1}>
                            <TypographyAtom variant="body2">
                                {lastGrade} {promoteCounts[lastGrade]}명 → <b>중등부 진급</b> (목록에서 빠짐)
                            </TypographyAtom>
                            {grades.slice(0, -1).map((g, i) => (
                                <TypographyAtom key={g} variant="body2">
                                    {g} {promoteCounts[g]}명 → <b>{grades[i + 1]}</b>
                                </TypographyAtom>
                            ))}
                            <Alert severity="warning">
                                한 해에 한 번만 할 수 있고 되돌리기 어렵습니다. 진급자 DB를 먼저 추출했는지 확인해 주세요.
                                반 번호는 그대로이니 새 반 편성은 학생 관리에서 바꿔 주세요.
                            </Alert>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPromoteCounts(null)}>취소</Button>
                    <Button variant="contained" color="warning" onClick={handlePromote}>진급 처리</Button>
                </DialogActions>
            </Dialog>

            <PasswordDialog
                {...dialogProps}
                title="관리자 비밀번호"
                message="학생 개인정보를 다루는 작업입니다. 관리자 비밀번호를 입력해 주세요."
            />

            <Alert severity="info">
                생년월일·연락처·주소는 화면에 표시되지 않고 서버에만 저장됩니다. 가져오기와 추출은 관리자 비밀번호가 필요하며
                모든 작업이 아래 기록에 남습니다.
            </Alert>

            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            {/* 1. 교적 엑셀 가져오기 */}
            <Paper sx={{ p: 3 }}>
                <TypographyAtom variant="h6" fontWeight="bold" gutterBottom>
                    교적 엑셀 가져오기
                </TypographyAtom>
                <TypographyAtom variant="body2" color="text.secondary" gutterBottom>
                    구글 시트(예: 2026 DataBase)를 파일 → 다운로드 → Microsoft Excel(.xlsx)로 받아 올려 주세요. 이름·생년월일
                    머리글이 있는 시트를 찾아 이름으로 학생과 연결하고, 선생님·생년월일·휴대폰·부모 이름과 연락처·주소·비고를
                    저장합니다. 이미 저장된 학생은 엑셀 내용으로 바뀝니다.
                </TypographyAtom>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                    <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                        파일 선택
                        <input
                            hidden
                            type="file"
                            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={(e) => {
                                setFile(e.target.files?.[0] ?? null);
                                setImportResult(null);
                            }}
                        />
                    </Button>
                    <TypographyAtom variant="body2">{file ? file.name : '선택된 파일 없음'}</TypographyAtom>
                    <Button
                        variant="contained"
                        onClick={handleImport}
                        disabled={!file || importing}
                        startIcon={importing ? <CircularProgress size={16} /> : undefined}
                    >
                        가져오기
                    </Button>
                </Stack>

                {importResult && (
                    <>
                        <Alert severity="success" sx={{ mt: 2 }}>
                            엑셀 {importResult.totalRows}행 중 <b>{importResult.updated}명</b>의 개인정보를 저장했습니다.
                        </Alert>
                        <NameList title="이름 표기가 달라 연결한 학생" names={importResult.looseMatches} severity="info" />
                        <NameList title="NowKids에 없는 이름 (저장 안 됨)" names={importResult.unmatched} severity="warning" />
                        <NameList title="누군지 확실하지 않아 건너뜀" names={importResult.ambiguous} severity="warning" />
                        <NameList title="엑셀에 두 번 나와 뒤쪽은 건너뜀" names={importResult.duplicates} severity="warning" />
                        <NameList title="엑셀에 없어 개인정보가 없는 학생" names={importResult.studentsWithoutData} severity="warning" />
                    </>
                )}
            </Paper>

            {/* 2. 진급자 DB 추출 */}
            <Paper sx={{ p: 3 }}>
                <TypographyAtom variant="h6" fontWeight="bold" gutterBottom>
                    진급자 DB 추출
                </TypographyAtom>
                <TypographyAtom variant="body2" color="text.secondary" gutterBottom>
                    고른 학년 학생의 개인정보와 최근 52주 출석률·출석그룹(A~E)을 엑셀로 내려받습니다. 중등부로 올려 보낼 때는
                    6학년을 고르세요. 개인정보가 담긴 파일이니 필요한 사람에게만 전달하고 사용 후 삭제해 주세요.
                </TypographyAtom>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
                    <Select size="small" value={exportGrade} onChange={(e) => setExportGrade(e.target.value)}>
                        {grades.map((g) => (
                            <MenuItem key={g} value={g}>{g}</MenuItem>
                        ))}
                        <MenuItem value="all">전체 학년</MenuItem>
                    </Select>
                    <Button
                        variant="contained"
                        onClick={handleExport}
                        disabled={exporting}
                        startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                    >
                        엑셀로 추출
                    </Button>
                </Stack>
            </Paper>

            {/* 3. 진급 처리 */}
            <Paper sx={{ p: 3 }}>
                <TypographyAtom variant="h6" fontWeight="bold" gutterBottom>
                    진급 처리
                </TypographyAtom>
                <TypographyAtom variant="body2" color="text.secondary" gutterBottom>
                    새 학년도에 한 번 실행합니다. {lastGrade} 학생은 중등부 진급 상태가 되고, 나머지는 한 학년씩 올라갑니다.
                    출석 기록은 그대로 보존됩니다. 먼저 위에서 진급자 DB를 추출해 두세요.
                </TypographyAtom>
                <Button
                    variant="outlined"
                    color="warning"
                    sx={{ mt: 1 }}
                    onClick={openPromoteConfirm}
                    disabled={promoting}
                    startIcon={promoting ? <CircularProgress size={16} /> : undefined}
                >
                    진급 처리
                </Button>
                {promoteResult && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        {promoteResult.year}년 진급 처리 완료: {lastGrade} {promoteResult.graduated}명 중등부 진급,{' '}
                        {promoteResult.moved.map((m) => `${m.from}→${m.to} ${m.count}명`).join(', ')}
                    </Alert>
                )}
            </Paper>

            {/* 작업 기록 */}
            <Paper sx={{ p: 3 }}>
                <TypographyAtom variant="h6" fontWeight="bold" gutterBottom>
                    작업 기록
                </TypographyAtom>
                {logs.length === 0 ? (
                    <TypographyAtom variant="body2" color="text.secondary">기록이 없습니다.</TypographyAtom>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>시각</TableCell>
                                <TableCell>작업</TableCell>
                                <TableCell>내용</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {new Date(log.createdAt).toLocaleString('ko-KR')}
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{ACTION_LABEL[log.action] ?? log.action}</TableCell>
                                    <TableCell>{log.summary}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>
        </Stack>
    );
}
