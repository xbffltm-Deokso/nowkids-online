'use client';

import { useState } from 'react';
import {
    Container, Typography, Button, Box, Alert, CircularProgress,
    Divider, TextField, Stack
} from '@mui/material';
import { api } from '@/lib/api';
import { dataConnect } from '@/lib/firebase';
import { upsertStudent, upsertAttendance } from '@/lib/generated';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Student } from '@/types';
import { getSundaysInRange } from '@/utils/dateUtils';

const GRADES = ['4.믿음', '5.소망', '6.사랑'];
const CLASSES = [1, 2, 3, 4];

export default function MigrationPage() {
    // 학생 이관
    const [studentLoading, setStudentLoading] = useState(false);
    const [studentLog, setStudentLog] = useState<string[]>([]);
    const [studentError, setStudentError] = useState<string | null>(null);

    // 출석 이관
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceLog, setAttendanceLog] = useState<string[]>([]);
    const [attendanceError, setAttendanceError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState('2024-01-01');
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const addStudentLog = (msg: string) => setStudentLog((prev) => [...prev, msg]);
    const addAttendanceLog = (msg: string) => setAttendanceLog((prev) => [...prev, msg]);

    const ensureAuth = async () => {
        const auth = getAuth();
        if (!auth.currentUser) await signInAnonymously(auth);
    };

    // ── 학생 데이터 이관 ──────────────────────────────────────────────
    const runStudentMigration = async () => {
        setStudentLoading(true);
        setStudentError(null);
        setStudentLog([]);
        try {
            await ensureAuth();
            addStudentLog('✅ Firebase 익명 로그인 완료');

            addStudentLog('🔍 구글 시트(GAS)에서 학년/반 목록을 가져오는 중...');
            const { grades, classes } = await api.getGradeClassList();

            if (!grades || grades.length === 0) throw new Error('학년 데이터를 찾을 수 없습니다.');
            addStudentLog(`📁 총 ${grades.length}개 학년, ${classes.length}개 반 데이터 확인됨.`);

            for (const grade of grades) {
                for (const classNum of classes) {
                    addStudentLog('----------------------------------------');
                    addStudentLog(`🚀 [${grade} ${classNum}반] 데이터 처리 시작...`);

                    const rawStudents = await api.getStudents({ grade, classNum });
                    if (!rawStudents || rawStudents.length === 0) {
                        addStudentLog('⚠️ 데이터 없음. 건너뜜.');
                        continue;
                    }

                    const processedStudents: Student[] = [];
                    const seenNames = new Set<string>();

                    rawStudents.forEach((s) => {
                        const name = s.name.trim();
                        if (!name) return;
                        if (seenNames.has(name)) {
                            addStudentLog(`🚫 중복: ${name} (제외됨)`);
                            return;
                        }
                        let studentNumber = s.number;
                        if (isNaN(studentNumber) || studentNumber <= 0) {
                            studentNumber = processedStudents.length + 1;
                        }
                        processedStudents.push({
                            ...s,
                            id: s.id,
                            name,
                            number: studentNumber,
                            gender: ((s.gender as string) === '남' || s.gender === 'M') ? 'M' : 'F',
                            status: ['재학', '휴학', '전학'].includes(s.status) ? s.status : '재학',
                        });
                        seenNames.add(name);
                    });

                    addStudentLog(`📦 정제 완료: ${rawStudents.length}명 → ${processedStudents.length}명`);

                    for (const s of processedStudents) {
                        const studentId = `${grade}_${classNum}_${s.number}_${s.name.replace(/\s+/g, '')}`;
                        await upsertStudent(dataConnect, {
                            id: studentId, grade, classNum,
                            number: s.number, name: s.name,
                            gender: s.gender, status: s.status,
                        });
                    }
                    addStudentLog(`✅ DB 업로드 완료: ${processedStudents.length}명`);
                }
            }
            addStudentLog('----------------------------------------');
            addStudentLog('🎉 학생 데이터 이관 완료!');
        } catch (err: any) {
            setStudentError(err.message || '마이그레이션 중 오류가 발생했습니다.');
        } finally {
            setStudentLoading(false);
        }
    };

    // ── 출석 데이터 이관 ──────────────────────────────────────────────
    const runAttendanceMigration = async () => {
        setAttendanceLoading(true);
        setAttendanceError(null);
        setAttendanceLog([]);
        try {
            await ensureAuth();
            addAttendanceLog('✅ Firebase 익명 로그인 완료');

            const sundays = getSundaysInRange(startDate, endDate);
            addAttendanceLog(`📅 ${startDate} ~ ${endDate} 사이 일요일: ${sundays.length}개`);

            let totalSuccess = 0;
            let totalSkip = 0;

            for (const grade of GRADES) {
                for (const classNum of CLASSES) {
                    addAttendanceLog('----------------------------------------');
                    addAttendanceLog(`🚀 [${grade} ${classNum}반] 출석 이관 시작...`);

                    // 학생 목록 조회 (studentId 매핑용)
                    let students: Student[] = [];
                    try {
                        students = await api.getStudents({ grade, classNum });
                    } catch {
                        addAttendanceLog(`⚠️ 학생 목록 조회 실패. 건너뜜.`);
                        continue;
                    }

                    if (!students || students.length === 0) {
                        addAttendanceLog(`⚠️ 학생 없음. 건너뜜.`);
                        continue;
                    }

                    // name → Firebase studentId 매핑 테이블 구성
                    const nameToId: Record<string, string> = {};
                    students.forEach((s) => {
                        const studentId = `${grade}_${classNum}_${s.number}_${s.name.replace(/\s+/g, '')}`;
                        nameToId[s.name.trim()] = studentId;
                    });

                    for (const date of sundays) {
                        let records: any[] = [];
                        try {
                            records = await api.getAttendance({ date, grade, classNum });
                        } catch {
                            totalSkip++;
                            continue;
                        }

                        if (!records || records.length === 0) {
                            totalSkip++;
                            continue;
                        }

                        for (const record of records) {
                            const studentName = record.studentName?.trim() ?? '';
                            const studentId = nameToId[studentName] ?? record.studentId;
                            if (!studentId) continue;

                            await upsertAttendance(dataConnect, {
                                id: `${studentId}_${date}`,
                                studentId,
                                date,
                                status: record.status === true || record.status === 'TRUE',
                                reason: record.reason || null,
                            });
                            totalSuccess++;
                        }
                    }
                    addAttendanceLog(`✅ [${grade} ${classNum}반] 완료`);
                }
            }

            addAttendanceLog('----------------------------------------');
            addAttendanceLog(`🎉 출석 이관 완료! 성공: ${totalSuccess}건, 건너뜜: ${totalSkip}건`);
        } catch (err: any) {
            setAttendanceError(err.message || '출석 이관 중 오류가 발생했습니다.');
        } finally {
            setAttendanceLoading(false);
        }
    };

    const TerminalLog = ({ log, loading }: { log: string[]; loading: boolean }) => (
        <Box sx={{ bgcolor: '#1e1e1e', color: '#00ff00', p: 3, borderRadius: 2, minHeight: 200, maxHeight: 400, overflowY: 'auto' }}>
            <Typography variant="subtitle2" color="rgba(255,255,255,0.7)" gutterBottom>
                터미널 로그:
            </Typography>
            {log.map((line, idx) => (
                <Typography key={idx} variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5, lineHeight: 1.6 }}>
                    {line}
                </Typography>
            ))}
            {loading && <CircularProgress size={16} sx={{ mt: 1, color: '#00ff00' }} />}
        </Box>
    );

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
                데이터베이스 마이그레이션 (GAS ➔ Firebase)
            </Typography>

            {/* ── 학생 데이터 이관 ── */}
            <Typography variant="h6" fontWeight="bold" sx={{ mt: 4, mb: 1 }}>
                1. 학생 데이터 이관
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
                구글 스프레드시트의 학생 명부를 정제(중복 제거, 번호 보정)하여 Firebase에 업로드합니다.
                동일 ID의 학생은 덮어씌워집니다.
            </Alert>
            <Box sx={{ mb: 2 }}>
                <Button
                    variant="contained" color="primary" size="large"
                    onClick={runStudentMigration} disabled={studentLoading}
                    sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                >
                    {studentLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : '학생 데이터 이관 시작'}
                </Button>
            </Box>
            {studentError && <Alert severity="error" sx={{ mb: 2 }}>{studentError}</Alert>}
            <TerminalLog log={studentLog} loading={studentLoading} />

            <Divider sx={{ my: 6 }} />

            {/* ── 출석 데이터 이관 ── */}
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                2. 출석 기록 이관
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
                GAS에 저장된 날짜별 출석 기록을 Firebase로 이관합니다.
                학생 데이터 이관이 먼저 완료되어야 합니다.
            </Alert>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <TextField
                    label="시작일" type="date" size="small"
                    value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="종료일" type="date" size="small"
                    value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <Button
                    variant="contained" color="secondary" size="large"
                    onClick={runAttendanceMigration} disabled={attendanceLoading}
                    sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                >
                    {attendanceLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : '출석 기록 이관 시작'}
                </Button>
            </Stack>
            {attendanceError && <Alert severity="error" sx={{ mb: 2 }}>{attendanceError}</Alert>}
            <TerminalLog log={attendanceLog} loading={attendanceLoading} />
        </Container>
    );
}
