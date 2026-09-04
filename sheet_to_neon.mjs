import { neon } from '@neondatabase/serverless';
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SHEET_ID = '1rproSeE0GtPQjqSkyg9gwusb9Jxx1V5SYeYiJop69Qs';
const sql = neon(process.env.DATABASE_URL);

async function fetchSheetJson(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1`;
  const res = await fetch(url);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) throw new Error(`gviz 파싱 실패: ${text.slice(0, 200)}`);
  return JSON.parse(match[1]);
}

function cellVal(cell) {
  if (!cell) return null;
  return cell.v ?? null;
}

function toDateStr(raw) {
  if (typeof raw === 'string' && raw.startsWith('Date(')) {
    const [y, m, d] = raw.replace('Date(', '').replace(')', '').split(',').map(Number);
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if (typeof raw === 'number') {
    const d = new Date((raw - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  return String(raw).slice(0, 10);
}

async function run() {
  // 1. Neon 학생으로 이름 → ID 맵 구성
  const studentRows = await sql`SELECT id, name FROM students`;
  const nameToId = {};
  for (const s of studentRows) nameToId[s.name.trim()] = s.id;
  console.log(`📋 Neon 학생 ${studentRows.length}명 로드`);

  // 2. AttendanceDB 시트 로드
  const json = await fetchSheetJson('AttendanceDB');
  const cols = json.table.cols.map((c) => c.label || c.id);
  const rows = json.table.rows;
  console.log(`📄 시트 ${rows.length}행 로드 / 컬럼: ${cols.join(', ')}`);

  const nameIdx = 2;
  const dateIdx = 3;
  const statusIdx = 4;

  const unmatched = new Set();
  const batch = [];

  for (const row of rows) {
    if (!row.c) continue;
    const rawName = cellVal(row.c[nameIdx]);
    const rawDate = cellVal(row.c[dateIdx]);
    const rawStatus = cellVal(row.c[statusIdx]);
    if (!rawName || rawDate === null) continue;

    const name = String(rawName).trim();
    const studentId = nameToId[name];
    if (!studentId) {
      unmatched.add(name);
      continue;
    }

    const dateStr = toDateStr(rawDate);
    const status =
      rawStatus === true ||
      rawStatus === 1 ||
      String(rawStatus).toUpperCase() === 'TRUE' ||
      rawStatus === 'O' ||
      rawStatus === '출석';

    batch.push({ id: `${studentId}_${dateStr}`, studentId, date: dateStr, status });
  }

  console.log(`\n📥 Neon에 출석 ${batch.length}건 저장 중...`);
  let saved = 0;
  for (const r of batch) {
    await sql`
      INSERT INTO attendance_records (id, student_id, date, status, reason)
      VALUES (${r.id}, ${r.studentId}, ${r.date}, ${r.status}, NULL)
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status
    `;
    saved++;
    if (saved % 300 === 0) console.log(`   진행: ${saved}건...`);
  }

  const [{ count: attCount }] = await sql`SELECT COUNT(*)::int AS count FROM attendance_records`;
  const [{ count: dateCount }] =
    await sql`SELECT COUNT(DISTINCT date)::int AS count FROM attendance_records`;

  console.log(`\n   ✅ ${saved}건 처리 완료`);
  if (unmatched.size > 0) {
    console.log(`   ⚠️  매칭 실패: ${[...unmatched].join(', ')}`);
  }
  console.log(`\n🔍 Neon 최종: 출석 ${attCount}건 / 날짜 ${dateCount}일`);
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ 오류:', err.message || err);
  process.exit(1);
});
