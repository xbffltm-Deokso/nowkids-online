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
        
        let id = String(row[headers.indexOf('ID')]);
        const number = Number(row[headers.indexOf('Number')]);
        
        // ID가 없거나 중복될 수 있으므로, 고유성을 위해 행 인덱스(i)를 포함하여 ID 생성
        // 기존: id || grade_class_number
        // 변경: grade_class_number_rowindex (ID가 있어도 덮어쓰거나, ID가 없으면 생성)
        // 안전하게 항상 grade_class_number_rowindex 형식을 사용하여 중복 방지
        id = `${grade}_${classNum}_${number}_${i}`; // i는 행 번호 (Unique)

        students.push({
          id: id,
          grade: String(row[headers.indexOf('Grade')]),
          classNum: Number(row[headers.indexOf('Class')]),
          number: number,
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
        
        // getStudents와 동일한 로직으로 ID 생성하여 매칭
        const number = Number(row[studentHeaders.indexOf('Number')]);
        const id = `${grade}_${classNum}_${number}_${i}`;
        studentIds.push(id);
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
      attendanceSheet.appendRow(['ID', 'StudentID', 'StudentName', 'Date', 'Status', 'Timestamp']);
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
      const rowIndex = attendanceSheet.getLastRow() + 1;
      
      attendanceSheet.appendRow([
        id,
        record.studentId,
        record.studentName || '',
        record.date,
        record.status, // Boolean: TRUE or FALSE
        timestamp
      ]);
      
      // Status 컬럼(E)을 체크박스로 설정
      const statusCell = attendanceSheet.getRange(rowIndex, 5); // Column E (5th column)
      statusCell.insertCheckboxes();
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

// 출석 체크 시트 생성 (1년치)
function createAttendanceCheckSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'AttendanceCheck_' + new Date().getFullYear();
  let sheet = ss.getSheetByName(sheetName);
  
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  sheet = ss.insertSheet(sheetName);
  
  // 1. 헤더 설정 (4행)
  // 1열: 학년, 2열: 반, 3열: 이름, 4열: 출석율
  // 5열부터: 52주 주일 날짜
  
  const headers = ['Grade', 'Class', 'Name', 'Attendance Rate'];
  const sundays = getSundaysOfYear(new Date().getFullYear());
  const fullHeaders = headers.concat(sundays);
  
  sheet.getRange(4, 1, 1, fullHeaders.length).setValues([fullHeaders]);
  sheet.getRange(4, 1, 1, fullHeaders.length).setFontWeight('bold').setBackground('#f3f3f3');
  
  // 2. 학생 데이터 가져오기
  const studentSheet = ss.getSheetByName('StudentDB');
  if (!studentSheet) return;
  
  const studentData = studentSheet.getDataRange().getValues();
  const studentHeaders = studentData[0];
  const gradeIdx = studentHeaders.indexOf('Grade');
  const classIdx = studentHeaders.indexOf('Class');
  const nameIdx = studentHeaders.indexOf('Name');
  
  const students = [];
  for (let i = 1; i < studentData.length; i++) {
    students.push({
      grade: studentData[i][gradeIdx],
      classNum: studentData[i][classIdx],
      name: studentData[i][nameIdx]
    });
  }
  
  // 학년/반/이름 순 정렬
  students.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade > b.grade ? 1 : -1;
    if (a.classNum !== b.classNum) return a.classNum - b.classNum;
    return a.name > b.name ? 1 : -1;
  });
  
  // 3. 데이터 쓰기
  if (students.length > 0) {
    const rows = students.map(s => [s.grade, s.classNum, s.name, '']);
    sheet.getRange(5, 1, rows.length, 4).setValues(rows);
    
    // 4. 체크박스 추가
    const checkboxRange = sheet.getRange(5, 5, rows.length, sundays.length);
    checkboxRange.insertCheckboxes();
    
    // 5. 출석율 수식 추가
    // (체크된 수 / 전체 주 수) * 100
    // 5열(E)부터 시작.
    for (let i = 0; i < rows.length; i++) {
      const rowNum = 5 + i;
      const rangeString = `E${rowNum}:${getColumnLetter(4 + sundays.length)}${rowNum}`;
      const formula = `=IFERROR(COUNTIF(${rangeString}, TRUE) / ${sundays.length}, 0)`;
      sheet.getRange(rowNum, 4).setFormula(formula).setNumberFormat('0%');
    }
  }
  
  // 열 너비 조정
  sheet.setColumnWidth(1, 60); // Grade
  sheet.setColumnWidth(2, 60); // Class
  sheet.setColumnWidth(3, 100); // Name
  sheet.setColumnWidth(4, 80); // Rate
  for (let i = 5; i <= fullHeaders.length; i++) {
    sheet.setColumnWidth(i, 30); // Checkboxes
  }
  
  // 틀 고정
  sheet.setFrozenRows(4);
  sheet.setFrozenColumns(4);
}

function getSundaysOfYear(year) {
  const sundays = [];
  const date = new Date(year, 0, 1);
  
  // 첫 번째 일요일 찾기
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1);
  }
  
  while (date.getFullYear() === year) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    sundays.push(`${year}-${month}-${day}`);
    date.setDate(date.getDate() + 7);
  }
  
  return sundays;
}

function getColumnLetter(columnIndex) {
  let temp, letter = '';
  while (columnIndex > 0) {
    temp = (columnIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    columnIndex = (columnIndex - temp - 1) / 26;
  }
  return letter;
}

/**
 * StudentDB 시트 수정 시 자동으로 AttendanceView 갱신
 * Simple Trigger - 별도 설치 없이 자동 동작
 */
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();
    
    // StudentDB 시트가 수정된 경우에만 실행
    if (sheetName === 'StudentDB') {
      createAttendanceView();
    }
  } catch (error) {
    Logger.log('onEdit 오류: ' + error.toString());
  }
}

/**
 * AttendanceView 시트 생성/갱신 (GAS_ATTENDANCE_SHEET.gs의 createAttendanceView 함수를 복사)
 * 이 함수는 APPS_SCRIPT_CODE.gs를 단독으로 사용할 때 필요합니다.
 */
function createAttendanceView() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'AttendanceView';
  let sheet = ss.getSheetByName(sheetName);

  // 기존 시트가 있으면 삭제
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  
  sheet = ss.insertSheet(sheetName);
  
  // 1. Setup Dates (Sundays from Dec 2025 to Dec 2026)
  const sundays = getExtendedSundays();
  
  // 2. Setup Headers - Simple: Grade, Class, Name, Rate, Dates
  const fixedHeaders = ['Grade', 'Class', 'Name', 'Attendance Rate'];
  const allHeaders = fixedHeaders.concat(sundays);
  
  // Set headers at Row 4
  // Fixed headers (Grade, Class, Name, Rate)
  const fixedHeaderRange = sheet.getRange(4, 1, 1, fixedHeaders.length);
  fixedHeaderRange.setValues([fixedHeaders]);
  fixedHeaderRange.setFontWeight('bold').setBackground('#e0e0e0').setHorizontalAlignment('center');
  
  // Date headers (E4 onwards) - Store as String "yyyy-mm-dd" (matches AttendanceDB format)
  const dateHeaderRange = sheet.getRange(4, 5, 1, sundays.length);
  dateHeaderRange.setValues([sundays]); // sundays는 이미 "yyyy-mm-dd" 형식 문자열 배열
  dateHeaderRange.setFontWeight('bold').setBackground('#e0e0e0').setHorizontalAlignment('center');
  
  // Add Summary Statistics in Rows 1-3
  
  // Row 1: 재적 (Total Enrollment)
  sheet.getRange('A1').setValue('재적');
  sheet.getRange('A2').setFormula('=COUNTA(C5:C)'); // Count names from row 5 down
  
  // Row 2: 재적 대비 출석율 (Attendance Rate vs Enrollment)
  sheet.getRange('D2').setValue('재적 대비 출석율');
  
  // Row 3: 출석현황 (Attendance Status)
  sheet.getRange('D3').setValue('출석현황');
  
  // Add formulas for each date column (E onwards)
  const lastColLetter = getColumnLetter(allHeaders.length);
  
  // E2 onwards: Attendance Rate (TRUE count / Total Students)
  for (let col = 5; col <= allHeaders.length; col++) {
    const colLetter = getColumnLetter(col);
    sheet.getRange(2, col).setFormula(`=IFERROR(COUNTIF(${colLetter}5:${colLetter}, TRUE) / $A$2, 0)`).setNumberFormat('0%');
  }
  
  // E3 onwards: Attendance Count (TRUE count)
  for (let col = 5; col <= allHeaders.length; col++) {
    const colLetter = getColumnLetter(col);
    sheet.getRange(3, col).setFormula(`=COUNTIF(${colLetter}5:${colLetter}, TRUE)`);
  }
  
  // Freeze panes
  sheet.setFrozenRows(4);
  sheet.setFrozenColumns(4);
  
  // 3. Fetch Students from StudentDB
  const students = getStudentList(ss);
  
  if (students.length === 0) {
    Browser.msgBox('StudentDB에 학생 데이터가 없습니다.');
    return;
  }
  
  // Sort Students: Grade > Class > Name
  students.sort((a, b) => {
    if (String(a.grade) !== String(b.grade)) return String(a.grade).localeCompare(String(b.grade));
    if (Number(a.classNum) !== Number(b.classNum)) return Number(a.classNum) - Number(b.classNum);
    return String(a.name).localeCompare(String(b.name));
  });
  
  // 4. Write Student Data
  const startRow = 5;
  const numRows = students.length;
  
  const dataRows = students.map(s => [s.grade, s.classNum, s.name]);
  sheet.getRange(startRow, 1, numRows, 3).setValues(dataRows);
  
  // 5. Apply Formulas
  
  // (1) Attendance Rate Formula (Column D)
  const headerDateRange = `$E$4:$${lastColLetter}$4`;
  
  for (let i = 0; i < numRows; i++) {
    const r = startRow + i;
    const rateFormula = `=IFERROR(COUNTIF(E${r}:${lastColLetter}${r}, TRUE) / COUNTIFS(${headerDateRange}, "<="&TEXT(TODAY(), "yyyy-mm-dd")), 0)`;
    sheet.getRange(r, 4).setFormula(rateFormula).setNumberFormat('0%');
  }
  
  // (2) Checkbox Formulas - Name-Based Matching
  // Range: E5 to LastRow LastCol
  const checkboxRange = sheet.getRange(startRow, 5, numRows, sundays.length);
  
  // Formula Logic:
  // Match Student Name (Col C) -> AttendanceDB Col C (StudentName)
  // Match Date (Header Row 4) -> AttendanceDB Col D (Date)
  // Match Status TRUE -> AttendanceDB Col E (Status)
  // Formula: =COUNTIFS(AttendanceDB!$C:$C, $C5, AttendanceDB!$D:$D, E$4, AttendanceDB!$E:$E, TRUE) > 0
  
  checkboxRange.setFormula(`=COUNTIFS(AttendanceDB!$C:$C, $C5, AttendanceDB!$D:$D, E$4, AttendanceDB!$E:$E, TRUE) > 0`);
  checkboxRange.insertCheckboxes();
  
  // 6. Formatting
  sheet.setColumnWidth(1, 60); // Grade
  sheet.setColumnWidth(2, 50); // Class
  sheet.setColumnWidth(3, 80); // Name
  sheet.setColumnWidth(4, 120); // Rate (Attendance Rate)
  for (let c = 5; c <= allHeaders.length; c++) {
    sheet.setColumnWidth(c, 40); // 날짜 컬럼들
  }
}

function getExtendedSundays() {
  const dates = [];
  const start = new Date(2025, 11, 1); 
  const end = new Date(2026, 11, 31);
  
  let current = new Date(start);
  while (current.getDay() !== 0) {
    current.setDate(current.getDate() + 1);
  }
  
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 7);
  }
  return dates;
}

function getStudentList(ss) {
  const sheet = ss.getSheetByName('StudentDB');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  
  // Helper to find column index
  const getIdx = (eng, kor) => {
    let idx = headers.indexOf(eng);
    if (idx === -1 && kor) idx = headers.indexOf(kor);
    return idx;
  };
  
  const gIdx = getIdx('Grade', '학년');
  const cIdx = getIdx('Class', '반');
  const naIdx = getIdx('Name', '이름');
  
  if (gIdx === -1 || cIdx === -1 || naIdx === -1) {
    Browser.msgBox('필수 헤더(Grade/학년, Class/반, Name/이름)를 찾을 수 없습니다.\\n현재 헤더: ' + headers.join(', '));
    return [];
  }
  
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    list.push({
      grade: row[gIdx],
      classNum: row[cIdx],
      name: row[naIdx]
    });
  }
  return list;
}

/**
 * 트리거 수동 설치 함수 (선택사항)
 * Simple Trigger로 충분하지만, 필요시 Installable Trigger로 전환 가능
 */
function installTrigger() {
  // 기존 onEdit 트리거 삭제
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 새 트리거 생성
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  
  Browser.msgBox('트리거가 설치되었습니다.');
}

/**
 * StudentDB 시트가 없을 때 기본 구조로 생성해주는 함수
 * 이 함수를 실행하면 StudentDB 시트가 생성되고 예시 데이터가 입력됩니다.
 */
function setupStudentDB() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('StudentDB');
  
  if (sheet) {
    Browser.msgBox('이미 StudentDB 시트가 존재합니다.');
    return;
  }
  
  sheet = ss.insertSheet('StudentDB');
  
  // 헤더 설정 (Grade, Class, Number, Name, ID, Gender, Status)
  const headers = ['Grade', 'Class', 'Number', 'Name', 'ID', 'Gender', 'Status'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e0e0e0');
  
  // 예시 데이터 추가
  const samples = [
    [1, 1, 1, '홍길동', '10101', 'M', 'Active'],
    [1, 1, 2, '김철수', '10102', 'M', 'Active'],
    [1, 2, 1, '이영희', '10201', 'F', 'Active']
  ];
  
  sheet.getRange(2, 1, samples.length, samples[0].length).setValues(samples);
  
  // 열 너비 조정
  sheet.setColumnWidth(1, 50); // Grade
  sheet.setColumnWidth(2, 50); // Class
  sheet.setColumnWidth(3, 50); // Number
  sheet.setColumnWidth(4, 80); // Name
  
  Browser.msgBox('StudentDB 시트가 생성되었습니다.');
}

/**
 * [최초 실행용] 초기 설정 원클릭 함수
 * 빈 스프레드시트에 코드를 붙여넣은 후, 이 함수만 실행하면 됩니다.
 * 1. StudentDB 시트 생성 및 예시 데이터 입력
 * 2. AttendanceView 시트 생성
 */
function initializeAll() {
  setupStudentDB();
  createAttendanceView();
  Browser.msgBox('초기 설정이 완료되었습니다.\\n\\n1. "StudentDB" 시트에서 학생 명단을 실제 데이터로 수정하세요.\\n2. 수정 후에는 "AttendanceView" 시트가 자동으로 갱신됩니다.');
}
