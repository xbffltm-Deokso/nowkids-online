import { Student, AttendanceRecord, ApiResponse } from '@/types';

// Google Apps Script Web App URL (나중에 환경변수로 분리)
// Google Apps Script Web App URL (환경변수 설정 문제로 하드코딩)
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwIF7skJwt9GEnre5ELUAaVvD6s8H9n0W7vCKwGDuO5CeHMynS-Fsp9AbgrrFUsYbPA/exec';

interface GetStudentsParams {
    grade: string;
    classNum: number;
}

interface GetAttendanceParams {
    date: string;
    grade: string;
    classNum: number;
}

interface SubmitAttendanceParams {
    date: string;
    records: Omit<AttendanceRecord, 'id' | 'timestamp'>[];
}

class ApiClient {
    private baseUrl: string;

    constructor(url: string) {
        this.baseUrl = url;
    }

    private async fetch<T>(params: Record<string, string | number>, method: 'GET' | 'POST' = 'GET', body?: any): Promise<T> {
        // Mock 모드이거나 API URL이 없으면 에러 (나중에 Mock 데이터로 대체 가능)
        if (!this.baseUrl) {
            console.warn('API URL not set. Using mock data or failing.');
            throw new Error('API URL is not configured');
        }

        const queryString = new URLSearchParams(
            Object.entries(params).map(([key, value]) => [key, String(value)])
        ).toString();

        const url = `${this.baseUrl}?${queryString}`;

        const headers: Record<string, string> = {};

        // Google Apps Script는 OPTIONS(Preflight) 요청을 제대로 처리하지 못하는 경우가 많음
        // GET 요청은 헤더 없이, POST 요청은 text/plain으로 보내 Preflight를 방지함
        if (method === 'POST') {
            headers['Content-Type'] = 'text/plain;charset=utf-8';
        }

        const options: RequestInit = {
            method,
            headers,
        };

        if (method === 'POST' && body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
            const result: ApiResponse<T> = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Unknown API error');
            }

            return result.data as T;
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    async getStudents({ grade, classNum }: GetStudentsParams): Promise<Student[]> {
        return this.fetch<Student[]>({ action: 'getStudents', grade, classNum });
    }

    async getAttendance({ date, grade, classNum }: GetAttendanceParams): Promise<AttendanceRecord[]> {
        return this.fetch<AttendanceRecord[]>({ action: 'getAttendance', date, grade, classNum });
    }

    async submitAttendance(params: SubmitAttendanceParams): Promise<boolean> {
        // POST 요청은 action을 query param으로 보내고 데이터는 body로
        return this.fetch<boolean>({ action: 'submitAttendance' }, 'POST', params);
    }

    async getGradeClassList(): Promise<{ grades: string[]; classes: number[] }> {
        // StudentDB에서 유니크한 학년/반 목록을 반환하는 API
        return this.fetch<{ grades: string[]; classes: number[] }>({ action: 'getGradeClassList' });
    }
}

export const api = new ApiClient(GAS_API_URL);
