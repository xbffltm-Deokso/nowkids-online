import WebSocket from 'ws';
global.WebSocket = WebSocket;
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDataConnect } from 'firebase/data-connect';
import {
  getAttendanceHistory,
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

const GRADES = ['4.믿음', '5.소망', '6.사랑'];
const CLASSES = [1, 2, 3, 4];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dataConnect = getDataConnect(app, connectorConfig);

async function run() {
  try {
    console.log('🔐 Firebase 익명 로그인 중...');
    await signInAnonymously(auth);
    console.log('✅ 로그인 완료');

    let totalFixed = 0;

    for (const grade of GRADES) {
      for (const classNum of CLASSES) {
        console.log(`[${grade} ${classNum}반] 데이터 조회 중...`);
        const res = await getAttendanceHistory(dataConnect, { grade, classNum });
        const records = res.data.attendanceRecords;

        for (const rec of records) {
          const d = new Date(rec.date + 'T00:00:00');
          const day = d.getDay();
          
          if (day !== 0) { // 일요일이 아닌 데이터 발견 (하루 밀린 현상)
            const diffToSunday = (7 - day) % 7;
            d.setDate(d.getDate() + diffToSunday);
            
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const date = String(d.getDate()).padStart(2, '0');
            const correctDate = `${year}-${month}-${date}`;
            
            const newId = `${rec.student.id}_${correctDate}`;
            
            console.log(`  수정: ${rec.student.name} | ${rec.date}(요일:${day}) -> ${correctDate}(일요일)`);
            
            await upsertAttendance(dataConnect, {
              id: newId,
              studentId: rec.student.id,
              date: correctDate,
              status: rec.status,
              reason: rec.reason
            });
            totalFixed++;
          }
        }
      }
    }
    
    console.log(`\n🎉 모든 작업 완료! 총 ${totalFixed}건의 날짜 오류 수정됨.`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 오류 발생:', err.message || err);
    process.exit(1);
  }
}

run();
