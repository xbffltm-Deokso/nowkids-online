import React from 'react';
import Box from '@mui/material/Box';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';

export interface GradeClassOption {
    grade: number;
    classNum: number;
}

interface GradeClassSelectProps {
    grades: string[];
    classes: number[];
    selectedGrade: string;
    selectedClass: number;
    onGradeChange: (grade: string) => void;
    onClassChange: (classNum: number) => void;
    showAllClassOption?: boolean; // classNum=0 "전체" 옵션 표시
}

export default function GradeClassSelect({
    grades,
    classes,
    selectedGrade,
    selectedClass,
    onGradeChange,
    onClassChange,
    showAllClassOption = false,
}: GradeClassSelectProps) {
    const handleGradeChange = (event: SelectChangeEvent<string>) => {
        onGradeChange(event.target.value);
    };

    const handleClassChange = (event: SelectChangeEvent<number>) => {
        onClassChange(Number(event.target.value));
    };

    return (
        <Stack direction="row" spacing={2} sx={{ minWidth: 300 }}>
            <FormControl fullWidth>
                <InputLabel id="grade-select-label">학년</InputLabel>
                <Select
                    labelId="grade-select-label"
                    id="grade-select"
                    value={selectedGrade}
                    label="학년"
                    onChange={handleGradeChange}
                >
                    {grades.map((grade) => (
                        <MenuItem key={grade} value={grade}>
                            {grade}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth>
                <InputLabel id="class-select-label">반</InputLabel>
                <Select
                    labelId="class-select-label"
                    id="class-select"
                    value={selectedClass}
                    label="반"
                    onChange={handleClassChange}
                >
                    {showAllClassOption && (
                        <MenuItem value={0}>전체</MenuItem>
                    )}
                    {classes.map((classNum) => (
                        <MenuItem key={classNum} value={classNum}>
                            {classNum}반
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Stack>
    );
}
