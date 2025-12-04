// Google Apps Script 전체 코드
// 이 파일을 복사해서 Apps Script 에디터에 붙여넣으세요

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getGradeClassList') {
    return getGradeClassList();
  } else if (action === 'getStudents') {
    return getStudents(e);
  } else if (action === 'getAttendance') {
    return getAttendance(e);
  }

  return createError('Invalid action: ' + action);
}

function doPost(e) {
  const action = e.parameter.action;

  if (action === 'submitAttendance') {
    return submitAttendance(e);
  }

  return createError('Invalid action: ' + action);
}

// 학년/반 목록 조회
function getGradeClassList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const studentSheet = ss.getSheetByName('StudentDB');

    if (!studentSheet) {
      return createError('StudentDB 시트를 찾을 수 없습니다.');
    }

    const data = studentSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createError('학생 데이터가 없습니다.');
    }

    const headers = data[0];
    const gradeIndex = headers.indexOf('Grade');
    const classIndex = headers.indexOf('Class');

    if (gradeIndex === -1 || classIndex === -1) {
      return createError('Grade 또는 Class 열을 찾을 수 없습니다. 헤더: ' + headers.join(', '));
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

    return createSuccess({ grades: grades, classes: classes });
  } catch (error) {
    return createError('getGradeClassList 오류: ' + error.toString());
  }
}

// 학생 목록 조회
function getStudents(e) {
  try {
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
  } catch (error) {
    return createError('getStudents 오류: ' + error.toString());
  }
}

// 출석 기록 조회
function getAttendance(e) {
  try {
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
  } catch (error) {
    return createError('getAttendance 오류: ' + error.toString());
  }
}

// 출석 기록 저장
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
    const studentIds = records.map(function(r) { return r.studentId; });

    // 기존 기록 삭제
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if (row[headers.indexOf('Date')] === date &&
          studentIds.includes(String(row[headers.indexOf('StudentID')]))) {
        attendanceSheet.deleteRow(i + 1);
      }
    }

    // 새 기록 추가
    records.forEach(function(record) {
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
    return createError('submitAttendance 오류: ' + error.toString());
  }
}

// 성공 응답
function createSuccess(data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: data
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 에러 응답
function createError(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: message
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
