# Google Sheets 설정 가이드

## 1. 스프레드시트 생성

새 Google 스프레드시트를 만들고 다음 시트들을 생성하세요:

### StudentDB 시트

학생 정보를 저장하는 시트입니다.

**컬럼 구조:**
| ID | Grade | Class | Number | Name | Gender | Status |
|----|-------|-------|--------|------|--------|--------|
| 예: 2024001 | 1 | 1 | 1 | 홍길동 | M | 재학 |
| 2024002 | 1 | 1 | 2 | 김영희 | F | 재학 |

- **ID**: 학생 고유 번호 (예: 2024001)
- **Grade**: 학년 (1, 2, 3 등)
- **Class**: 반 (1, 2, 3 등)
- **Number**: 번호 (1, 2, 3 등)
- **Name**: 이름
- **Gender**: 성별 (M: 남자, F: 여자)
- **Status**: 상태 (재학, 휴학, 전학)

### AttendanceDB 시트

출석 기록을 저장하는 시트입니다.

**컬럼 구조:**
| ID | StudentID | Date | Status | Timestamp |
|----|-----------|------|--------|-----------|
| A001 | 2024001 | 2024-12-04 | 출석 | 2024-12-04T10:30:00.000Z |
| A002 | 2024002 | 2024-12-04 | 지각 | 2024-12-04T10:30:00.000Z |

- **ID**: 출석 기록 고유 번호
- **StudentID**: 학생 ID (StudentDB의 ID 참조)
- **Date**: 출석 날짜 (YYYY-MM-DD)
- **Status**: 출석 상태 (출석, 지각, 결석, 조퇴, 기타)
- **Timestamp**: 기록 시간 (ISO 8601 형식)

## 2. Google Apps Script 설정

### 2.1 스크립트 에디터 열기

1. Google Sheets에서 **확장 프로그램 > Apps Script** 선택
2. 새 프로젝트가 생성됩니다

### 2.2 Code.gs 파일 작성

다음 코드를 작성하세요:

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

  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const action = e.parameter.action;

  if (action === 'submitAttendance') {
    return submitAttendance(e);
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 학년/반 목록 조회
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

// 학생 목록 조회
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

// 출석 기록 조회
function getAttendance(e) {
  const date = e.parameter.date;
  const grade = e.parameter.grade;
  const classNum = Number(e.parameter.classNum);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const attendanceSheet = ss.getSheetByName('AttendanceDB');

  if (!attendanceSheet) {
    return createSuccess([]); // 시트가 없으면 빈 배열 반환
  }

  const data = attendanceSheet.getDataRange().getValues();
  const headers = data[0];

  // 해당 학년/반의 학생 ID 목록 가져오기
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

// 출석 기록 저장
function submitAttendance(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const date = params.date;
    const records = params.records;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let attendanceSheet = ss.getSheetByName('AttendanceDB');

    // 시트가 없으면 생성
    if (!attendanceSheet) {
      attendanceSheet = ss.insertSheet('AttendanceDB');
      attendanceSheet.appendRow(['ID', 'StudentID', 'Date', 'Status', 'Timestamp']);
    }

    const timestamp = new Date().toISOString();

    // 기존 데이터 삭제 (해당 날짜, 해당 학생들)
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

    // 새 데이터 추가
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

// 헬퍼 함수
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

### 2.3 배포하기

1. **배포 > 새 배포** 선택
2. **유형 선택 > 웹 앱** 선택
3. 설정:
   - **실행 계정**: 나
   - **액세스 권한**: 모든 사용자
4. **배포** 클릭
5. **웹 앱 URL** 복사 (이것이 API URL입니다)

### 2.4 프로젝트에 API URL 설정

복사한 URL을 프로젝트의 `src/lib/api.ts` 파일의 `GAS_API_URL` 변수에 붙여넣으세요.

## 3. 테스트 데이터 입력

StudentDB 시트에 테스트 학생 데이터를 입력하세요:

```
ID       | Grade | Class | Number | Name   | Gender | Status
2024001  | 1     | 1     | 1      | 홍길동 | M      | 재학
2024002  | 1     | 1     | 2      | 김영희 | F      | 재학
2024003  | 1     | 1     | 3      | 이철수 | M      | 재학
```

## 4. 완료!

이제 웹 애플리케이션에서 출석 체크를 시작할 수 있습니다.
