# 단계별 설정 가이드 (복사해서 따라하세요)

## ✅ 1단계: Google Sheets 생성

### 1-1. 새 스프레드시트 만들기
1. https://sheets.google.com 접속
2. **빈 스프레드시트** 클릭
3. 제목을 "교회출석부" 또는 원하는 이름으로 변경

### 1-2. StudentDB 시트 만들기
1. 하단의 "시트1" 탭을 더블클릭
2. 이름을 **StudentDB**로 변경
3. 첫 번째 행에 다음 헤더를 입력:

```
A1: ID
B1: Grade
C1: Class
D1: Number
E1: Name
F1: Gender
G1: Status
```

### 1-3. 테스트 데이터 입력

**2번째 행부터 입력:**
```
A2: 2024001
B2: 1
C2: 1
D2: 1
E2: 홍길동
F2: M
G2: 재학

A3: 2024002
B3: 1
C3: 1
D3: 2
E3: 김영희
F3: F
G3: 재학

A4: 2024003
B4: 1
C4: 1
D4: 3
E4: 이철수
F4: M
G4: 재학
```

### 1-4. AttendanceDB 시트 만들기
1. 하단의 **+ 버튼** 클릭 (새 시트)
2. 시트 이름을 **AttendanceDB**로 변경
3. 첫 번째 행에 다음 헤더를 입력:

```
A1: ID
B1: StudentID
C1: Date
D1: Status
E1: Timestamp
```

*이 시트는 비워두세요 (출석 기록이 자동으로 저장됩니다)*

---

## ✅ 2단계: Google Apps Script 설정

### 2-1. Apps Script 열기
1. 스프레드시트 상단 메뉴에서 **확장 프로그램 > Apps Script** 클릭
2. 새 탭에서 Apps Script 에디터가 열립니다

### 2-2. Code.gs 코드 작성

**기존 코드를 모두 지우고** 다음 코드를 복사해서 붙여넣으세요:

```javascript
function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getGradeClassList') {
    return getGradeClassList();
  } else if (action === 'getStudents') {
    return getStudents(e);
  } else if (action === 'getAttendance') {
    return getAttendance(e);
  }

  return createError('Invalid action');
}

function doPost(e) {
  const action = e.parameter.action;

  if (action === 'submitAttendance') {
    return submitAttendance(e);
  }

  return createError('Invalid action');
}

function getGradeClassList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentSheet = ss.getSheetByName('StudentDB');

  if (!studentSheet) {
    return createError('StudentDB 시트를 찾을 수 없습니다.');
  }

  const data = studentSheet.getDataRange().getValues();
  const headers = data[0];
  const gradeIndex = headers.indexOf('Grade');
  const classIndex = headers.indexOf('Class');

  if (gradeIndex === -1 || classIndex === -1) {
    return createError('Grade 또는 Class 열을 찾을 수 없습니다.');
  }

  const gradesSet = new Set();
  const classesSet = new Set();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[gradeIndex]) gradesSet.add(String(row[gradeIndex]));
    if (row[classIndex]) classesSet.add(Number(row[classIndex]));
  }

  const grades = Array.from(gradesSet).sort();
  const classes = Array.from(classesSet).sort((a, b) => a - b);

  return createSuccess({ grades, classes });
}

function getStudents(e) {
  const grade = e.parameter.grade;
  const classNum = Number(e.parameter.classNum);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentSheet = ss.getSheetByName('StudentDB');

  if (!studentSheet) {
    return createError('StudentDB 시트를 찾을 수 없습니다.');
  }

  const data = studentSheet.getDataRange().getValues();
  const headers = data[0];

  const students = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[headers.indexOf('Grade')]) === String(grade) &&
        Number(row[headers.indexOf('Class')]) === classNum) {
      students.push({
        id: String(row[headers.indexOf('ID')]),
        grade: String(row[headers.indexOf('Grade')]),
        classNum: Number(row[headers.indexOf('Class')]),
        number: Number(row[headers.indexOf('Number')]),
        name: row[headers.indexOf('Name')],
        gender: row[headers.indexOf('Gender')],
        status: row[headers.indexOf('Status')]
      });
    }
  }

  return createSuccess(students);
}

function getAttendance(e) {
  const date = e.parameter.date;
  const grade = e.parameter.grade;
  const classNum = Number(e.parameter.classNum);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const attendanceSheet = ss.getSheetByName('AttendanceDB');

  if (!attendanceSheet) {
    return createSuccess([]);
  }

  const data = attendanceSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createSuccess([]);
  }

  const headers = data[0];
  const studentSheet = ss.getSheetByName('StudentDB');
  const studentData = studentSheet.getDataRange().getValues();
  const studentHeaders = studentData[0];

  const studentIds = [];
  for (let i = 1; i < studentData.length; i++) {
    const row = studentData[i];
    if (String(row[studentHeaders.indexOf('Grade')]) === String(grade) &&
        Number(row[studentHeaders.indexOf('Class')]) === classNum) {
      studentIds.push(String(row[studentHeaders.indexOf('ID')]));
    }
  }

  const records = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const studentId = String(row[headers.indexOf('StudentID')]);
    const recordDate = row[headers.indexOf('Date')];

    if (studentIds.includes(studentId) && recordDate === date) {
      records.push({
        id: String(row[headers.indexOf('ID')]),
        studentId: studentId,
        date: recordDate,
        status: row[headers.indexOf('Status')],
        timestamp: row[headers.indexOf('Timestamp')]
      });
    }
  }

  return createSuccess(records);
}

function submitAttendance(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const date = params.date;
    const records = params.records;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let attendanceSheet = ss.getSheetByName('AttendanceDB');

    if (!attendanceSheet) {
      attendanceSheet = ss.insertSheet('AttendanceDB');
      attendanceSheet.appendRow(['ID', 'StudentID', 'Date', 'Status', 'Timestamp']);
    }

    const timestamp = new Date().toISOString();
    const data = attendanceSheet.getDataRange().getValues();
    const headers = data[0];
    const studentIds = records.map(r => r.studentId);

    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if (row[headers.indexOf('Date')] === date &&
          studentIds.includes(String(row[headers.indexOf('StudentID')]))) {
        attendanceSheet.deleteRow(i + 1);
      }
    }

    records.forEach(record => {
      const id = 'A' + Date.now() + Math.random().toString(36).substr(2, 9);
      attendanceSheet.appendRow([
        id,
        record.studentId,
        record.date,
        record.status,
        timestamp
      ]);
    });

    return createSuccess(true);
  } catch (error) {
    return createError('출석 저장 실패: ' + error.toString());
  }
}

function createSuccess(data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: data
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createError(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: message
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 2-3. 저장 및 배포

1. **디스크 아이콘** 클릭 (저장)
2. 프로젝트 이름: "교회출석API" 입력 → **확인**
3. 상단 메뉴 **배포 > 새 배포** 클릭
4. **유형 선택** (톱니바퀴 아이콘) → **웹 앱** 선택
5. 설정:
   - **설명**: v1
   - **실행 계정**: 나
   - **액세스 권한**: **모든 사용자** ⚠️ 중요!
6. **배포** 클릭
7. **액세스 승인** 클릭
8. 계정 선택
9. **고급** 클릭 → **[프로젝트 이름](으)로 이동** 클릭
10. **허용** 클릭

### 2-4. 웹 앱 URL 복사

배포 완료 후 나타나는 **웹 앱 URL**을 복사하세요!
(예: https://script.google.com/macros/s/AKfycby.../exec)

⚠️ **이 URL을 꼭 저장하세요!**

---

## ✅ 3단계: API URL 설정

### 3-1. api.ts 파일 열기
`J:/내 드라이브/online-db/src/lib/api.ts` 파일 열기

### 3-2. URL 변경
5번째 줄을 찾아서 복사한 URL로 변경:

```typescript
// 변경 전:
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzoadB8ckhGS7tN5z5rumsKwC1TU7mdjlEVclcPsokXMaPYR9PkkOCpoUES4x7Ug3eD/exec';

// 변경 후:
const GAS_API_URL = '여기에_복사한_URL_붙여넣기';
```

---

## ✅ 4단계: 테스트

### 4-1. 빌드 테스트 (선택사항)
```bash
cd "J:/내 드라이브/online-db"
npm run build
```

### 4-2. Google Sheets에서 확인
출석 체크 후 AttendanceDB 시트에 데이터가 저장되는지 확인

---

## 🎉 완료!

이제 출석 체크 시스템을 사용할 수 있습니다!

### 다음 단계:
- GitHub에 푸시하면 자동으로 배포됩니다
- `docs/DEPLOYMENT_GUIDE.md` 참고

### 문제 해결:
- API 오류: Google Apps Script 배포 설정 확인
- 데이터 안 보임: StudentDB 헤더 이름 확인
- 저장 안 됨: Apps Script 권한 확인
