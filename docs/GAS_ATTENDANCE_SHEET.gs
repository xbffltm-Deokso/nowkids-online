// Google Apps Script Code for Generating Attendance Sheet
// 2025.12.11 Updated - Simplified Name-Based Matching

/**
 * Creates or updates the AttendanceView sheet.
 * Structure:
 * Rows 1-3: Empty
 * Row 4: Headers [Grade, Class, Name, Rate, ...Dates]
 * Row 5+: Student Data + Formulas
 */
function createAttendanceView() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'AttendanceView';
  let sheet = ss.getSheetByName(sheetName);

  if (sheet) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert('경고', '기존 시트가 삭제되고 재생성됩니다. 계속하시겠습니까?', ui.ButtonSet.YES_NO);
    if (response !== ui.Button.YES) return;
    ss.deleteSheet(sheet);
  }
  
  sheet = ss.insertSheet(sheetName);
  
  // 1. Setup Dates (Sundays from Dec 2025 to Dec 2026)
  const sundays = getExtendedSundays();
  
  // 2. Setup Headers - Simple: Grade, Class, Name, Rate, Dates
  const fixedHeaders = ['Grade', 'Class', 'Name', 'Attendance Rate'];
  const allHeaders = fixedHeaders.concat(sundays);
  
  // Set headers at Row 4
  const headerRange = sheet.getRange(4, 1, 1, allHeaders.length);
  headerRange.setNumberFormat('@'); // Force Plain Text
  headerRange.setValues([allHeaders]);
  headerRange.setFontWeight('bold').setBackground('#e0e0e0').setHorizontalAlignment('center');
  
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
  // Match Status "출석" -> AttendanceDB Col E (Status)
  // Formula: =COUNTIFS(AttendanceDB!$C:$C, $C5, AttendanceDB!$D:$D, E$4, AttendanceDB!$E:$E, "출석") > 0
  
  checkboxRange.setFormula(`=COUNTIFS(AttendanceDB!$C:$C, $C5, AttendanceDB!$D:$D, E$4, AttendanceDB!$E:$E, "출석") > 0`);
  checkboxRange.insertCheckboxes();
  
  // 6. Formatting
  sheet.setColumnWidth(1, 60); // Grade
  sheet.setColumnWidth(2, 50); // Class
  sheet.setColumnWidth(3, 80); // Name
  sheet.setColumnWidth(4, 60); // Rate
  for (let c = 5; c <= allHeaders.length; c++) {
    sheet.setColumnWidth(c, 30);
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

function getColumnLetter(col) {
  let temp, letter = '';
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = (col - temp - 1) / 26;
  }
  return letter;
}
