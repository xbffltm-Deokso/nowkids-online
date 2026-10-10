'use client';

import { useState } from 'react';
import { GRADES as DEFAULT_GRADES, CLASSES as DEFAULT_CLASSES } from '@/utils/grades';

export function useGrades() {
    const [grades] = useState<string[]>(DEFAULT_GRADES);
    const [classes] = useState<number[]>(DEFAULT_CLASSES);

    return { grades, classes, loading: false, error: null };
}
