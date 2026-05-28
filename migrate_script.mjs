import WebSocket from 'ws';
global.WebSocket = WebSocket;
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDataConnect } from 'firebase/data-connect';
import { upsertStudent, connectorConfig } from './src/lib/generated/esm/index.esm.js';

const GAS_URL = "https://script.google.com/macros/s/AKfycbxC1lawMsEzl1oTJY5X22VsizaFw1G2XmZvjGwngTNfOc7RSgF6rmuJrJb_ovBXj-p8/exec";

const firebaseConfig = {
  apiKey: "AIzaSyAAXcDVedgeq3uljs0XWphl29ZAfsVfWZc",
  authDomain: "nowkids-attendancedb.firebaseapp.com",
  projectId: "nowkids-attendancedb",
  storageBucket: "nowkids-attendancedb.firebasestorage.app",
  messagingSenderId: "121614751153",
  appId: "1:121614751153:web:9dc126c54ce24cd1db5990",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dataConnect = getDataConnect(app, connectorConfig);

function normalizeGender(raw) {
  if (!raw) return 'M';
  const v = String(raw).trim();
  if (v === '남' || v === 'M' || v === 'm') return 'M';
  if (v === '여' || v === 'F' || v === 'f') return 'F';
  return 'M';
}

function normalizeStatus(raw) {
  const valid = ['재학', '휴학', '전학'];
  if (!raw) return '재학';
  const v = String(raw).trim();
  return valid.includes(v) ? v : '재학';
}

async function gasGet(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GAS_URL}?${qs}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`GAS 응답이 JSON이 아님: ${text.slice(0, 200)}`);
  }
}

async function run() {
  try {
    console.log('🔐 Firebase 익명 로그인 중...');
    await signInAnonymously(auth);
    console.log('✅ 로그인 완료');

    console.log('\n📋 GAS에서 학년/반 목록 조회 중...');
    const gradeRes = await gasGet({ action: 'getGradeClassList' });
    if (!gradeRes.success) throw new Error(`GAS 오류: ${gradeRes.error}`);
    const { grades, classes } = gradeRes.data;
    console.log(`   학년: ${grades.join(', ')} / 반: ${classes.join(', ')}`);

    let totalUpserted = 0;
    let totalSkipped = 0;

    for (const grade of grades) {
      for (const classNum of classes) {
        console.log(`\n📂 [${grade} ${classNum}반] 학생 조회 중...`);

        let students = [];
        try {
          const stuRes = await gasGet({ action: 'getStudents', grade, classNum });
          students = stuRes.data || [];
        } catch (e) {
          console.log(`   ⚠️  조회 실패, 건너뜀: ${e.message}`);
          continue;
        }

        if (!students || students.length === 0) {
          console.log(`   ⚠️  학생 없음, 건너뜀`);
          continue;
        }

        // 중복 제거 (이름 기준)
        const seenNames = new Set();
        const cleaned = [];
        for (const s of students) {
          const name = String(s.name || '').trim();
          if (!name) { totalSkipped++; continue; }
          if (seenNames.has(name)) {
            console.log(`   🚫 중복 제외: ${name}`);
            totalSkipped++;
            continue;
          }
          seenNames.add(name);
          const num = parseInt(s.number, 10);
          cleaned.push({
            ...s,
            name,
            number: (isNaN(num) || num <= 0) ? (cleaned.length + 1) : num,
            gender: normalizeGender(s.gender),
            status: normalizeStatus(s.status),
          });
        }

        console.log(`   정제: ${students.length}명 → ${cleaned.length}명`);

        for (const s of cleaned) {
          const id = `${grade}_${classNum}_${s.number}_${s.name.replace(/\s+/g, '')}`;
          await upsertStudent(dataConnect, {
            id,
            grade,
            classNum,
            number: s.number,
            name: s.name,
            gender: s.gender,
            status: s.status,
          });
          totalUpserted++;
        }
        console.log(`   ✅ ${cleaned.length}명 Firebase 저장 완료`);
      }
    }

    console.log(`\n🎉 학생 데이터 이관 완료!`);
    console.log(`   저장: ${totalUpserted}명 / 건너뜀: ${totalSkipped}명`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 오류 발생:', err.message || err);
    process.exit(1);
  }
}

run();
