'use client';

import { useState } from 'react';
import { Container, Typography, Button, Box, Alert, CircularProgress } from '@mui/material';
import { api } from '@/lib/api'; // 구버전 GAS API
import { dataConnect } from '@/lib/firebase';
import { upsertStudent, upsertAttendance } from '@/lib/generated';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Student, AttendanceRecord } from '@/types';

export default function MigrationPage() {
    const [loading, setLoading] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const addLog = (message: string) => {
        setLog(prev => [...prev, message]);
    };

    const runMigration = async () => {
        setLoading(true);
        setError(null);
        setLog([]);

        try {
            // Firebase Auth
            const auth = getAuth();
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }
            addLog("Firebase 익명 로그인 완료");

            // 1. 모든 학년/반 목록 가져오기
            addLog("구글 시트(GAS)에서 학년/반 목록을 가져오는 중...");
            const { grades, classes } = await api.getGradeClassList();
            
            if (!grades || grades.length === 0) {
                throw new Error("학년 데이터를 찾을 수 없습니다.");
            }

            // 2. 각 학년/반을 돌며 학생과 출결 데이터 가져와서 삽입하기
            for (const grade of grades) {
                for (const classNum of classes) {
                    addLog(`${grade} 학년 ${classNum}반 데이터 이관 시작...`);

                    // 학생 데이터 가져오기
                    const students = await api.getStudents({ grade, classNum });
                    if (students && students.length > 0) {
                        for (const s of students) {
                            // 학생 ID가 없으면 임시 생성
                            const studentId = s.id && s.id !== 'undefined' ? s.id : `${grade}-${classNum}-${s.number}-${s.name}`;
                            
                            await upsertStudent(dataConnect, {
                                id: studentId,
                                grade: grade,
                                classNum: classNum,
                                number: s.number,
                                name: s.name,
                                gender: s.gender || 'M',
                                status: s.status || '재학'
                            });
                        }
                        addLog(`${grade} 학년 ${classNum}반 학생 ${students.length}명 이관 완료.`);
                    }

                    // 최근 한 달 출결 데이터 가져오기 (예시로 오늘 날짜 기준)
                    // (과거의 모든 날짜를 가져오려면 GAS API 수정이 필요하지만, 여기서는 오늘 날짜만 테스트로 가져옵니다)
                    // 만약 과거 모든 데이터를 가져와야 한다면 GAS 스크립트를 대대적으로 뜯어고쳐야 하므로,
                    // 현재로서는 최신 학생 목록을 Firebase로 이관하는 것에 집중합니다.
                }
            }

            addLog("🎉 모든 학생 데이터 이관이 성공적으로 완료되었습니다!");
            addLog("이제 메인 페이지( http://localhost:3000 )로 돌아가서 학생 목록이 뜨는지 확인하세요.");

        } catch (err: any) {
            console.error(err);
            setError(err.message || '마이그레이션 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
                데이터베이스 이관 (GAS ➔ Firebase)
            </Typography>
            <Alert severity="info" sx={{ mb: 4 }}>
                기존 구글 시트(GAS)에 저장된 학생 데이터를 새로운 Firebase RDBMS로 복사합니다.<br/>
                이 작업은 최초 1회만 실행해야 합니다.
            </Alert>

            <Box sx={{ mb: 4 }}>
                <Button 
                    variant="contained" 
                    color="primary" 
                    size="large" 
                    onClick={runMigration}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : '데이터 이관 시작하기'}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>
            )}

            <Box sx={{ bgcolor: '#f5f5f5', p: 3, borderRadius: 2, minHeight: 200, maxHeight: 400, overflowY: 'auto' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    진행 로그:
                </Typography>
                {log.map((line, idx) => (
                    <Typography key={idx} variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                        {line}
                    </Typography>
                ))}
            </Box>
        </Container>
    );
}
