import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AttendanceRecord_Key {
  id: string;
  __typename?: 'AttendanceRecord_Key';
}

export interface GetAttendanceByDateData {
  attendanceRecords: ({
    id: string;
    student: {
      id: string;
      name: string;
    } & Student_Key;
      date: DateString;
      status: boolean;
      reason?: string | null;
      timestamp: TimestampString;
  } & AttendanceRecord_Key)[];
}

export interface GetAttendanceByDateVariables {
  date: DateString;
  grade: string;
  classNum: number;
}

export interface GetAttendanceHistoryData {
  attendanceRecords: ({
    id: string;
    student: {
      id: string;
      name: string;
    } & Student_Key;
      date: DateString;
      status: boolean;
      reason?: string | null;
      timestamp: TimestampString;
  } & AttendanceRecord_Key)[];
}

export interface GetAttendanceHistoryVariables {
  grade: string;
  classNum: number;
}

export interface GetStudentsData {
  students: ({
    id: string;
    grade: string;
    classNum: number;
    number: number;
    name: string;
    gender: string;
    status: string;
  } & Student_Key)[];
}

export interface GetStudentsVariables {
  grade: string;
  classNum: number;
}

export interface Student_Key {
  id: string;
  __typename?: 'Student_Key';
}

export interface UpsertAttendanceData {
  attendanceRecord_upsert: AttendanceRecord_Key;
}

export interface UpsertAttendanceVariables {
  id: string;
  studentId: string;
  date: DateString;
  status: boolean;
  reason?: string | null;
}

export interface UpsertStudentData {
  student_upsert: Student_Key;
}

export interface UpsertStudentVariables {
  id: string;
  grade: string;
  classNum: number;
  number: number;
  name: string;
  gender: string;
  status: string;
}

interface UpsertAttendanceRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertAttendanceVariables): MutationRef<UpsertAttendanceData, UpsertAttendanceVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertAttendanceVariables): MutationRef<UpsertAttendanceData, UpsertAttendanceVariables>;
  operationName: string;
}
export const upsertAttendanceRef: UpsertAttendanceRef;

export function upsertAttendance(vars: UpsertAttendanceVariables): MutationPromise<UpsertAttendanceData, UpsertAttendanceVariables>;
export function upsertAttendance(dc: DataConnect, vars: UpsertAttendanceVariables): MutationPromise<UpsertAttendanceData, UpsertAttendanceVariables>;

interface UpsertStudentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertStudentVariables): MutationRef<UpsertStudentData, UpsertStudentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertStudentVariables): MutationRef<UpsertStudentData, UpsertStudentVariables>;
  operationName: string;
}
export const upsertStudentRef: UpsertStudentRef;

export function upsertStudent(vars: UpsertStudentVariables): MutationPromise<UpsertStudentData, UpsertStudentVariables>;
export function upsertStudent(dc: DataConnect, vars: UpsertStudentVariables): MutationPromise<UpsertStudentData, UpsertStudentVariables>;

interface GetStudentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStudentsVariables): QueryRef<GetStudentsData, GetStudentsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetStudentsVariables): QueryRef<GetStudentsData, GetStudentsVariables>;
  operationName: string;
}
export const getStudentsRef: GetStudentsRef;

export function getStudents(vars: GetStudentsVariables): QueryPromise<GetStudentsData, GetStudentsVariables>;
export function getStudents(dc: DataConnect, vars: GetStudentsVariables): QueryPromise<GetStudentsData, GetStudentsVariables>;

interface GetAttendanceByDateRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAttendanceByDateVariables): QueryRef<GetAttendanceByDateData, GetAttendanceByDateVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetAttendanceByDateVariables): QueryRef<GetAttendanceByDateData, GetAttendanceByDateVariables>;
  operationName: string;
}
export const getAttendanceByDateRef: GetAttendanceByDateRef;

export function getAttendanceByDate(vars: GetAttendanceByDateVariables): QueryPromise<GetAttendanceByDateData, GetAttendanceByDateVariables>;
export function getAttendanceByDate(dc: DataConnect, vars: GetAttendanceByDateVariables): QueryPromise<GetAttendanceByDateData, GetAttendanceByDateVariables>;

interface GetAttendanceHistoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAttendanceHistoryVariables): QueryRef<GetAttendanceHistoryData, GetAttendanceHistoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetAttendanceHistoryVariables): QueryRef<GetAttendanceHistoryData, GetAttendanceHistoryVariables>;
  operationName: string;
}
export const getAttendanceHistoryRef: GetAttendanceHistoryRef;

export function getAttendanceHistory(vars: GetAttendanceHistoryVariables): QueryPromise<GetAttendanceHistoryData, GetAttendanceHistoryVariables>;
export function getAttendanceHistory(dc: DataConnect, vars: GetAttendanceHistoryVariables): QueryPromise<GetAttendanceHistoryData, GetAttendanceHistoryVariables>;

