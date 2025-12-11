// Google Apps Script Code for Generating Attendance Sheet
// 2025.12.11 Updated (Plain Text Headers + Status Check + Full Restoration)

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
  
  // 2. Setup Headers
  // We need ID (hidden) + Grade + Class + Name + Rate + Dates
  const fixedHeaders = ['ID', 'Grade', 'Class', 'Name', 'Attendance Rate'];
  const allHeaders = fixedHeaders.concat(sundays);
  
  // Set headers at Row 4
  const headerRange = sheet.getRange(4, 1, 1, allHeaders.length);
  headerRange.setNumberFormat('@'); // Force Plain Text to match DB string dates
  headerRange.setValues([allHeaders]);
  
  // Style Headers (Skip ID column which is index 1, but we hide it later. 
  // Let's style visible headers from Col 2)
  sheet.getRange(4, 2, 1, allHeaders.length - 1).setFontWeight('bold').setBackground('#e0e0e0').setHorizontalAlignment('center');
  
  // Freeze panes
  sheet.setFrozenRows(4);
  sheet.setFrozenColumns(5); // Grade, Class, Name, Rate + (Hidden ID)
  
  // 3. Fetch Students from StudentDB
  const students = getStudentList(ss);
  
  if (students.length === 0) {
    Browser.msgBox('StudentDB에 학생 데이터가 없습니다.');
    return;
  }
  
  // Sort Students: Grade > Class > Number (or Name)
  students.sort((a, b) => {
    if (String(a.grade) !== String(b.grade)) return String(a.grade).localeCompare(String(b.grade));
    if (Number(a.classNum) !== Number(b.classNum)) return Number(a.classNum) - Number(b.classNum);
    return Number(a.number) - Number(b.number);
  });
  
  // 4. Prepare Data Rows
  const startRow = 5;
  const numRows = students.length;
  
  // Write Data: ID, Grade, Class, Name
  const dataRows = students.map(s => [s.id, s.grade, s.classNum, s.name]);
  sheet.getRange(startRow, 1, numRows, 4).setValues(dataRows);
  
  // Hide ID Column (Col 1)
  sheet.hideColumns(1);
  
  // 5. Apply Formulas
  
  // (1) Attendance Rate Formula (Column E - Rate)
  // ID=A, Grade=B, Class=C, Name=D, Rate=E (Col 5)
  // Dates start at F (Col 6)
  
  const lastColLetter = getColumnLetter(allHeaders.length);
  // Date Range for today check: F4 : LastCol 4
  const headerDateRange = `$F$4:$${lastColLetter}$4`;
  
  for (let i = 0; i < numRows; i++) {
    const r = startRow + i;
    // Count Checked boxes (TRUE) / Count Sundays Passed (<= Today)
    const rateFormula = `=IFERROR(COUNTIF(F${r}:${lastColLetter}${r}, TRUE) / COUNTIFS(${headerDateRange}, "<="&TEXT(TODAY(), "yyyy-mm-dd")), 0)`;
    sheet.getRange(r, 5).setFormula(rateFormula).setNumberFormat('0%');
  }
  
  // (2) Checkbox Formulas (Auto-check from AttendanceDB)
  // Range: F5 to LastRow LastCol
  const checkboxRange = sheet.getRange(startRow, 6, numRows, sundays.length);
  
  // Formula Logic:
  // Match Student ID (in Col A, Hidden) -> AttendanceDB Col B
  // Match Date (Header Row 4) -> AttendanceDB Col D
  // Match Status "출석" -> AttendanceDB Col E
  // Formula: =COUNTIFS(AttendanceDB!$B:$B, $A5, AttendanceDB!$D:$D, F$4, AttendanceDB!$E:$E, "출석") > 0
  
  // Note: We use TEXT(F$4) if headers are true dates, but we forced plain text. 
  // If headers are text YYYY-MM-DD and DB is text YYYY-MM-DD, direct compare works.
  
  checkboxRange.setFormula(`=COUNTIFS(AttendanceDB!$B:$B, $A5, AttendanceDB!$D:$D, F$4, AttendanceDB!$E:$E, "출석") > 0`);
  checkboxRange.insertCheckboxes();
  
  // 6. Formatting
  sheet.setColumnWidth(1, 5);  // ID (Hidden)
  sheet.setColumnWidth(2, 60); // Grade
  sheet.setColumnWidth(3, 50); // Class
  sheet.setColumnWidth(4, 80); // Name
  sheet.setColumnWidth(5, 60); // Rate
  for (let c = 6; c <= allHeaders.length; c++) {
    sheet.setColumnWidth(c, 30);
  }
}

function getExtendedSundays() {
  const dates = [];
  // From Dec 2025 to Dec 2026
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
  
  // Helper to find column index by English or Korean name
  const getIdx = (eng, kor) => {
    let idx = headers.indexOf(eng);
    if (idx === -1 && kor) idx = headers.indexOf(kor);
    return idx;
  };
  
  const gIdx = getIdx('Grade', '학년');
  const cIdx = getIdx('Class', '반');
  
  // Update Number detection to include 'No' variations
  let nIdx = headers.indexOf('Number');
  if (nIdx === -1) nIdx = headers.indexOf('번호');
  if (nIdx === -1) nIdx = headers.indexOf('No');
  if (nIdx === -1) nIdx = headers.indexOf('No.');
  
  const naIdx = getIdx('Name', '이름');

  // Check critical headers (Grade, Class)
  if (gIdx === -1 || cIdx === -1) {
    Browser.msgBox('필수 헤더(학년, 반)를 찾을 수 없습니다.\\n현재 헤더: ' + headers.join(', '));
    return [];
  }
  
  // Warn if Number is missing, but proceed
  if (nIdx === -1) {
    Browser.msgBox('경고: 번호(Number/No/번호) 컬럼을 찾을 수 없습니다.\\n자동으로 0으로 처리합니다.\\n현재 헤더: ' + headers.join(', '));
  }
  
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Safely get values
    const grade = row[gIdx];
    const classNum = row[cIdx];
    const number = (nIdx !== -1) ? row[nIdx] : '0';
    const name = (naIdx !== -1) ? row[naIdx] : 'Unknown';
    
    // ID Logic: Grade_Class_Number_RowIndex
    const id = `${grade}_${classNum}_${number}_${i}`;
    list.push({
      id: id,
      grade: grade,
      classNum: classNum,
      number: number,
      name: name
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
