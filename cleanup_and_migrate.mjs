import WebSocket from 'ws';
global.WebSocket = WebSocket;
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDataConnect } from 'firebase/data-connect';
import {
  getStudents,
  deleteStudent,
  upsertAttendance,
  connectorConfig,
} from './src/lib/generated/esm/index.esm.js';

const firebaseConfig = {
  apiKey: "AIzaSyAAXcDVedgeq3uljs0XWphl29ZAfsVfWZc",
  authDomain: "nowkids-attendancedb.firebaseapp.com",
  projectId: "nowkids-attendancedb",
  storageBucket: "nowkids-attendancedb.firebasestorage.app",
  messagingSenderId: "121614751153",
  appId: "1:121614751153:web:9dc126c54ce24cd1db5990",
};

const SHEET_ID = '1rproSeE0GtPQjqSkyg9gwusb9Jxx1V5SYeYiJop69Qs';
const GRADES = ['4.믿음', '5.소망', '6.사랑'];
const CLASSES = [1, 2, 3, 4];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dataConnect = getDataConnect(app, connectorConfig);

async function fetchSheetJson(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1`;
  const res = await fetch(url);
  const text = await res.text();
  // gviz 응답은 /*O_o*/\ngoogle.visualization.Query.setResponse({...}); 형태
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) throw new Error(`gviz 파싱 실패: ${text.slice(0, 200)}`);
  return JSON.parse(match[1]);
}

function cellVal(cell) {
  if (!cell) return null;
  if (cell.v === null || cell.v === undefined) return null;
  return cell.v;
}

async function phase1_deleteNaNStudents() {
  console.log('\n=== PHASE 1: NaN 학생 레코드 삭제 ===');
  let deleted = 0;
  let errors = 0;

  for (const grade of GRADES) {
    for (const classNum of CLASSES) {
      const res = await getStudents(dataConnect, { grade, classNum });
      const students = res.data.students;
      const nanStudents = students.filter((s) => s.id.includes('_NaN_'));
      if (nanStudents.length === 0) continue;

      console.log(`  [${grade} ${classNum}반] NaN 학생 ${nanStudents.length}명 삭제 중...`);
      for (const s of nanStudents) {
        try {
          await deleteStudent(dataConnect, { id: s.id });
          console.log(`    삭제: ${s.id}`);
          deleted++;
        } catch (e) {
          console.error(`    ❌ 삭제 실패 ${s.id}: ${e.message}`);
          errors++;
        }
      }
    }
  }

  console.log(`  완료: ${deleted}개 삭제, ${errors}개 오류`);
}

async function phase2_migrateAttendance() {
  console.log('\n=== PHASE 2: 출석 데이터 마이그레이션 ===');

  // 1. Firebase에서 전체 학생 로드 → 이름 → ID 맵
  console.log('  Firebase 학생 목록 로드 중...');
  const nameToId = {};
  for (const grade of GRADES) {
    for (const classNum of CLASSES) {
      const res = await getStudents(dataConnect, { grade, classNum });
      for (const s of res.data.students) {
        // NaN 레코드는 이미 삭제됨, 정상 레코드만 사용
        if (!s.id.includes('_NaN_')) {
          nameToId[s.name.trim()] = s.id;
        }
      }
    }
  }
  console.log(`  학생 ${Object.keys(nameToId).length}명 로드 완료`);

  // 2. AttendanceDB 시트에서 출석 데이터 로드
  console.log('  AttendanceDB 시트 로드 중...');
  const json = await fetchSheetJson('AttendanceDB');
  const cols = json.table.cols;
  const rows = json.table.rows;

  // 컬럼 인덱스 확인
  const colNames = cols.map((c) => (c.label || c.id || '').toLowerCase());
  console.log(`  컬럼: ${cols.map((c) => c.label || c.id).join(', ')}`);

  const idxStudentId = colNames.findIndex((c) => c.includes('studentid') || c === 'id' || c === 'studentid');
  const idxName = colNames.findIndex((c) => c === 'name' || c === '이름');
  const idxDate = colNames.findIndex((c) => c === 'date' || c === '날짜');
  const idxStatus = colNames.findIndex((c) => c === 'status' || c === '상태');

  // fallback: 컬럼 순서로 추정 (ID, StudentID, Name, Date, Status, Timestamp)
  const sIdIdx = idxStudentId >= 0 ? idxStudentId : 1;
  const nameIdx = idxName >= 0 ? idxName : 2;
  const dateIdx = idxDate >= 0 ? idxDate : 3;
  const statusIdx = idxStatus >= 0 ? idxStatus : 4;

  console.log(`  컬럼 매핑 - StudentID:${sIdIdx} Name:${nameIdx} Date:${dateIdx} Status:${statusIdx}`);

  let upserted = 0;
  let skipped = 0;
  let unmatchedNames = new Set();

  for (const row of rows) {
    if (!row.c) continue;
    const cells = row.c;

    const rawName = cellVal(cells[nameIdx]);
    const rawDate = cellVal(cells[dateIdx]);
    const rawStatus = cellVal(cells[statusIdx]);

    if (!rawName || rawDate === null || rawDate === undefined) {
      skipped++;
      continue;
    }

    const name = String(rawName).trim();
    // 날짜 처리: gviz Date 타입은 Date(yyyy,m,d) 형태로 오거나 문자열로 올 수 있음
    let dateStr;
    if (typeof rawDate === 'string' && rawDate.startsWith('Date(')) {
      // Date(2026,0,4) → 2026-01-04
      const parts = rawDate.replace('Date(', '').replace(')', '').split(',').map(Number);
      const d = new Date(parts[0], parts[1], parts[2]);
      dateStr = d.toISOString().slice(0, 10);
    } else if (rawDate instanceof Date || (typeof rawDate === 'object' && rawDate !== null)) {
      dateStr = new Date(rawDate).toISOString().slice(0, 10);
    } else if (typeof rawDate === 'number') {
      // Excel 시리얼 넘버
      const d = new Date((rawDate - 25569) * 86400 * 1000);
      dateStr = d.toISOString().slice(0, 10);
    } else {
      dateStr = String(rawDate).slice(0, 10);
    }

    // 상태 처리: true/'TRUE'/1/O/출석 → true, 나머지 → false
    let status = false;
    if (rawStatus === true || rawStatus === 1 || String(rawStatus).toUpperCase() === 'TRUE' || rawStatus === 'O' || rawStatus === '출석') {
      status = true;
    }

    const studentId = nameToId[name];
    if (!studentId) {
      unmatchedNames.add(name);
      skipped++;
      continue;
    }

    // 출석 ID: studentId_date
    const id = `${studentId}_${dateStr}`;

    try {
      await upsertAttendance(dataConnect, {
        id,
        studentId,
        date: dateStr,
        status,
        reason: null,
      });
      upserted++;
      if (upserted % 100 === 0) {
        console.log(`  진행: ${upserted}건 저장...`);
      }
    } catch (e) {
      console.error(`  ❌ upsert 실패 [${name} ${dateStr}]: ${e.message}`);
      skipped++;
    }
  }

  console.log(`\n  완료: ${upserted}건 저장, ${skipped}건 건너뜀`);
  if (unmatchedNames.size > 0) {
    console.log(`  매칭 실패 학생 이름 (${unmatchedNames.size}명):`);
    for (const n of unmatchedNames) {
      console.log(`    - "${n}"`);
    }
  }
}

async function run() {
  try {
    console.log('🔐 Firebase 익명 로그인 중...');
    await signInAnonymously(auth);
    console.log('✅ 로그인 완료');

    await phase1_deleteNaNStudents();
    await phase2_migrateAttendance();

    console.log('\n🎉 모든 작업 완료!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 오류 발생:', err.message || err);
    console.error(err);
    process.exit(1);
  }
}

run();
