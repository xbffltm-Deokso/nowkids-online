'use client';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { DepartmentDetail } from '@/types';

// 부서 안에서 학년·반 고르기 (학년이 없는 부서는 반만). 빈 값 = 전체, 'none' = 반 미배정
export default function DepartmentScopeSelect({
    department,
    gradeId,
    classId,
    onGradeChange,
    onClassChange,
}: {
    department: DepartmentDetail;
    gradeId: string;
    classId: string;
    onGradeChange: (id: string) => void;
    onClassChange: (id: string) => void;
}) {
    // 학년을 고르면 그 학년 이름으로 시작하는 반만 (소년부 "4.믿음 1반" 같은 이름 규칙)
    const gradeName = department.grades.find((g) => g.id === gradeId)?.name;
    const classOptions = gradeName
        ? department.classes.filter((c) => c.name.startsWith(`${gradeName} `))
        : department.classes;

    return (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {department.grades.length > 0 && (
                <TextField
                    select
                    size="small"
                    label="학년"
                    value={gradeId}
                    onChange={(e) => {
                        onGradeChange(e.target.value);
                        onClassChange('');
                    }}
                    sx={{ minWidth: 140 }}
                >
                    <MenuItem value="">전체 학년</MenuItem>
                    {department.grades.map((g) => (
                        <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                    ))}
                </TextField>
            )}
            {department.classes.length > 0 && (
                <TextField
                    select
                    size="small"
                    label="반"
                    value={classId}
                    onChange={(e) => onClassChange(e.target.value)}
                    sx={{ minWidth: 140 }}
                >
                    <MenuItem value="">전체 반</MenuItem>
                    {classOptions.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                            {gradeName ? c.name.slice(gradeName.length + 1) : c.name}
                        </MenuItem>
                    ))}
                    <MenuItem value="none">반 미배정</MenuItem>
                </TextField>
            )}
        </Stack>
    );
}
