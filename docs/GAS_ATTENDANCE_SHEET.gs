// Google Apps Script Code for Generating Attendance Sheet
// Updated to include Class-Specific Counts and 2026 Date Range

/**
 * Creates or updates the AttendanceView sheet.
 * Structure:
 * Rows 1-6: Summary Statistics
 * Row 7: Headers [Grade, Class, Name, Rate, ...Dates]
 * Row 8+: Student Data + Formulas
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
  
  // 1. Setup Dates (Sundays from Jan 2026 to Dec 2026)
  const sundays = getExtendedSundays();
  
  // 2. Setup Headers - Simple: Grade, Class, Name, Rate, Dates
  const fixedHeaders = ['Grade', 'Class', 'Name', 'Attendance Rate'];
  const allHeaders = fixedHeaders.concat(sundays);
  
  // Set headers at Row 7 (Shifted down to make room for class summaries)
  // Fixed headers (Grade, Class, Name, Rate)
  const headerRow = 7;
  const fixedHeaderRange = sheet.getRange(headerRow, 1, 1, fixedHeaders.length);
  fixedHeaderRange.setValues([fixedHeaders]);
  fixedHeaderRange.setFontWeight('bold').setBackground('#e0e0e0').setHorizontalAlignment('center');
  
  // Date headers (E7 onwards) - Store as String "yyyy-mm-dd" (matches AttendanceDB format)
  const dateHeaderRange = sheet.getRange(headerRow, 5, 1, sundays.length);
  dateHeaderRange.setValues([sundays]); // sundays는 이미 "yyyy-mm-dd" 형식 문자열 배열
  dateHeaderRange.setFontWeight('bold').setBackground('#e0e0e0').setHorizontalAlignment('center');
  dateHeaderRange.setNumberFormat('dd/mm'); // 표시 형식을 "04/01" (일/월) 형식으로 변경
  
  // Add Summary Statistics in Rows 1-6
  
  // Row 1: 재적 (Total Enrollment)
  sheet.getRange('A1').setValue('재적');
  sheet.getRange('A2').setFormula(`=COUNTA(C${headerRow + 1}:C)`); // Count names from data start row
  
  // Row 2: 재적 대비 출석율 (Attendance Rate vs Enrollment)
  sheet.getRange('D2').setValue('재적 대비 출석율');
  
  // Class Specific Counts (Rows 3, 4, 5)
  // Class 1 = 믿음, Class 2 = 소망, Class 3 = 사랑
  sheet.getRange('D3').setValue('믿음');
  sheet.getRange('D4').setValue('소망');
  sheet.getRange('D5').setValue('사랑');
  
  // Row 6: 출석현황 (Total Attendance Count)
  sheet.getRange('D6').setValue('출석현황');
  
  // Add formulas for each date column (E onwards)
  const lastColLetter = getColumnLetter(allHeaders.length);
  const dataStartRow = headerRow + 1; // Row 8
  
  // E2 onwards: Attendance Rate (Total TRUE count / Total Students)
  for (let col = 5; col <= allHeaders.length; col++) {
    const colLetter = getColumnLetter(col);
    sheet.getRange(2, col).setFormula(`=IFERROR(COUNTIF(${colLetter}${dataStartRow}:${colLetter}, TRUE) / $A$2, 0)`).setNumberFormat('0%');
  }

  // Class Specific Counts Formulas (Rows 3, 4, 5)
  // User requested to filter by Grade (Column A) instead of Class (Column B)
  // Formula: =COUNTIFS($A$8:$A, "믿음", E$8:E, TRUE)
  for (let col = 5; col <= allHeaders.length; col++) {
    const colLetter = getColumnLetter(col);
    // 믿음 (Grade = 믿음)
    sheet.getRange(3, col).setFormula(`=COUNTIFS($A$${dataStartRow}:$A, "믿음", ${colLetter}$${dataStartRow}:${colLetter}, TRUE)`);
    // 소망 (Grade = 소망)
    sheet.getRange(4, col).setFormula(`=COUNTIFS($A$${dataStartRow}:$A, "소망", ${colLetter}$${dataStartRow}:${colLetter}, TRUE)`);
    // 사랑 (Grade = 사랑)
    sheet.getRange(5, col).setFormula(`=COUNTIFS($A$${dataStartRow}:$A, "사랑", ${colLetter}$${dataStartRow}:${colLetter}, TRUE)`);
  }
  
  // E6 onwards: Total Attendance Count (TRUE count)
  for (let col = 5; col <= allHeaders.length; col++) {
    const colLetter = getColumnLetter(col);
    sheet.getRange(6, col).setFormula(`=COUNTIF(${colLetter}${dataStartRow}:${colLetter}, TRUE)`);
  }
  
  // Freeze panes
  sheet.setFrozenRows(headerRow);
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
  const numRows = students.length;
  
  const dataRows = students.map(s => [s.grade, s.classNum, s.name]);
  sheet.getRange(dataStartRow, 1, numRows, 3).setValues(dataRows);
  
  // 5. Apply Formulas
  
  // (1) Attendance Rate Formula (Column D)
  // Header Date Range is Row 7
  const headerDateRange = `$E$${headerRow}:$${lastColLetter}$${headerRow}`;
  
  for (let i = 0; i < numRows; i++) {
    const r = dataStartRow + i;
    const rateFormula = `=IFERROR(COUNTIF(E${r}:${lastColLetter}${r}, TRUE) / COUNTIFS(${headerDateRange}, "<="&TEXT(TODAY(), "yyyy-mm-dd")), 0)`;
    sheet.getRange(r, 4).setFormula(rateFormula).setNumberFormat('0%');
  }
  
  // (2) Checkbox Formulas - Name-Based Matching
  // Range: E8 to LastRow LastCol
  const checkboxRange = sheet.getRange(dataStartRow, 5, numRows, sundays.length);
  
  // Formula Logic:
  // Match Student Name (Col C) -> AttendanceDB Col C (StudentName)
  // Match Date (Header Row 7) -> AttendanceDB Col D (Date)
  // Match Status TRUE -> AttendanceDB Col E (Status)
  // Formula: =COUNTIFS(AttendanceDB!$C:$C, $C8, AttendanceDB!$D:$D, E$7, AttendanceDB!$E:$E, TRUE) > 0
  
  checkboxRange.setFormula(`=COUNTIFS(AttendanceDB!$C:$C, $C${dataStartRow}, AttendanceDB!$D:$D, E$${headerRow}, AttendanceDB!$E:$E, TRUE) > 0`);
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
  const start = new Date(2026, 0, 1); // Jan 1, 2026
  const end = new Date(2026, 11, 31); // Dec 31, 2026
  
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

function getColumnLetter(col) {
  let temp, letter = '';
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = (col - temp - 1) / 26;
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
