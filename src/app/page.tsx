'use client';

import { useState } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

import { getSundayOfCurrentWeek } from '@/utils/dateUtils';
import TypographyAtom from '@/components/atoms/TypographyAtom';
import AttendanceForm from '@/components/organisms/AttendanceForm';
import { useAttendance } from '@/hooks/useAttendance';
import { useGrades } from '@/hooks/useGrades';

export default function HomePage() {
    const [date] = useState(getSundayOfCurrentWeek());
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClass, setSelectedClass] = useState(1);

    const { grades, classes, loading: gradesLoading, error: gradesError } = useGrades();
    const { students, attendance, loading, error, updateStatus, saveAttendance } = useAttendance(
        selectedGrade,
        selectedClass,
        date
    );

    if (gradesLoading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (gradesError) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">{gradesError}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <TypographyAtom variant="h4" component="h1" fontWeight="bold" color="primary">
                    출석체크 시스템
                </TypographyAtom>
                <TypographyAtom variant="body2" color="text.secondary">
                    {new Date(date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </TypographyAtom>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <AttendanceForm
                    grades={grades}
                    classes={classes}
                    students={students}
                    attendance={attendance}
                    onGradeChange={setSelectedGrade}
                    onClassChange={setSelectedClass}
                    onStatusChange={updateStatus}
                    onSubmit={saveAttendance}
                    selectedGrade={selectedGrade}
                    selectedClass={selectedClass}
                />
            )}
        </Container>
    );
}
