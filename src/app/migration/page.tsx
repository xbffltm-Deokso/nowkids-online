'use client';

import { useState } from 'react';
import { Container, Typography, Button, Box, Alert, CircularProgress } from '@mui/material';
import { api } from '@/lib/api'; // 구버전 GAS API
import { dataConnect } from '@/lib/firebase';
import { upsertStudent } from '@/lib/generated';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Student } from '@/types';

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
            const auth = getAuth();
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }
            addLog("✅ Firebase 익명 로그인 완료");

            addLog("🔍 구글 시트(GAS)에서 학년/반 목록을 가져오는 중...");
            const { grades, classes } = await api.getGradeClassList();
            
            if (!grades || grades.length === 0) {
                throw new Error("학년 데이터를 찾을 수 없습니다.");
            }

            addLog(`📁 총 ${grades.length}개 학년, ${classes.length}개 반 데이터 확인됨.`);

            for (const grade of grades) {
                for (const classNum of classes) {
                    addLog(`----------------------------------------`);
                    addLog(`🚀 [${grade} ${classNum}반] 데이터 처리 시작...`);

                    const rawStudents = await api.getStudents({ grade, classNum });
                    if (!rawStudents || rawStudents.length === 0) {
                        addLog(`⚠️ 데이터 없음. 건너뜜.`);
                        continue;
                    }

                    // 1차 가공 및 중복 제거
                    const processedStudents: Student[] = [];
                    const seenNames = new Set<string>();

                    rawStudents.forEach((s) => {
                        const name = s.name.trim();
                        if (!name) return;

                        // 중복 이름 체크 (학년/반 내에서)
                        if (seenNames.has(name)) {
                            addLog(`🚫 중복 데이터 발견: ${name} (제외됨)`);
                            return;
                        }

                        // 번호(Number) 처리 - NaN이거나 0 이하인 경우 보정
                        let studentNumber = s.number;
                        if (isNaN(studentNumber) || studentNumber <= 0) {
                            studentNumber = processedStudents.length + 1;
                        }

                        processedStudents.push({
                            ...s,
                            id: s.id, // 임시, 아래에서 다시 정의
                            name,
                            number: studentNumber,
                            gender: (s.gender === '남' || s.gender === 'M') ? 'M' : 'F',
                            status: s.status === '재학' || s.status === '휴학' || s.status === '전학' ? s.status : '재학'
                        });
                        seenNames.add(name);
                    });

                    addLog(`📦 정제 완료: ${rawStudents.length}명 -> ${processedStudents.length}명`);

                    // DB 업로드
                    for (const s of processedStudents) {
                        const studentId = `${grade}_${classNum}_${s.number}_${s.name.replace(/\s+/g, '')}`;
                        
                        await upsertStudent(dataConnect, {
                            id: studentId,
                            grade: grade,
                            classNum: classNum,
                            number: s.number,
                            name: s.name,
                            gender: s.gender,
                            status: s.status
                        });
                    }
                    addLog(`✅ DB 업로드 완료: ${processedStudents.length}명`);
                }
            }

            addLog(`----------------------------------------`);
            addLog("🎉 모든 데이터 이관 및 정제가 성공적으로 완료되었습니다!");

        } catch (err: any) {
            console.error(err);
            setError(err.message || '마이그레이션 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
                데이터베이스 마이그레이션 (GAS ➔ Firebase)
            </Typography>
            <Alert severity="warning" sx={{ mb: 4 }}>
                주의: 이 작업은 구글 스프레드시트의 데이터를 정제(중복 제거, 번호 보정 등)하여 Firebase RDBMS로 업로드합니다.<br/>
                기존 DB에 동일한 ID의 학생이 있을 경우 덮어씌워집니다.
            </Alert>

            <Box sx={{ mb: 4 }}>
                <Button 
                    variant="contained" 
                    color="primary" 
                    size="large" 
                    onClick={runMigration}
                    disabled={loading}
                    sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                >
                    {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : '데이터 정제 및 이관 시작'}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>
            )}

            <Box sx={{ bgcolor: '#1e1e1e', color: '#00ff00', p: 3, borderRadius: 2, minHeight: 300, maxHeight: 500, overflowY: 'auto' }}>
                <Typography variant="subtitle2" color="rgba(255,255,255,0.7)" gutterBottom>
                    마이그레이션 터미널 로그:
                </Typography>
                {log.map((line, idx) => (
                    <Typography key={idx} variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5, lineHeight: 1.6 }}>
                        {line}
                    </Typography>
                ))}
                {loading && <CircularProgress size={16} sx={{ mt: 1, color: '#00ff00' }} />}
            </Box>
        </Container>
    );
}
