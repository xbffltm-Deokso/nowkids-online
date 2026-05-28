'use client';

import { useState } from 'react';

const DEFAULT_GRADES = ['4.믿음', '5.소망', '6.사랑'];
const DEFAULT_CLASSES = [1, 2, 3, 4];

export function useGrades() {
    const [grades] = useState<string[]>(DEFAULT_GRADES);
    const [classes] = useState<number[]>(DEFAULT_CLASSES);

    return { grades, classes, loading: false, error: null };
}
