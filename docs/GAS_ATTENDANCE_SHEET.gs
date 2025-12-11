// Google Apps Script Code for Generating Attendance Sheet
// 2025.12.11 Created

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
  const fixedHeaders = ['Grade', 'Class', 'Name', 'Attendance Rate'];
  const allHeaders = fixedHeaders.concat(sundays);
  
  // Set headers at Row 4
  const headerRange = sheet.getRange(4, 1, 1, allHeaders.length);
  headerRange.setNumberFormat('@'); // Force Plain Text to match DB string dates
  
  // Use simple values (strings), no Date objects
  headerRange.setValues([allHeaders]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e0e0e0');
  headerRange.setHorizontalAlignment('center');
  
  // ... (Lines 39-168)
  
  // Logic to adjust references across range:
  checkboxRange.setFormula(`=COUNTIFS(AttendanceDB!$B:$B, $A5, AttendanceDB!$D:$D, F$4, AttendanceDB!$E:$E, "출석") > 0`);
  
  // 6. Formatting
  sheet.setColumnWidth(1, 5); // ID (Hidden)
  sheet.setColumnWidth(2, 60); // Grade
  sheet.setColumnWidth(3, 50); // Class
  sheet.setColumnWidth(4, 80); // Name
  sheet.setColumnWidth(5, 60); // Rate
  for (let c = 6; c <= realHeaders.length; c++) {
    sheet.setColumnWidth(c, 30);
  }
}

function getExtendedSundays() {
  const dates = [];
  // From Dec 2025 to Dec 2026
  // Start: 2025-12-01
  const start = new Date(2025, 11, 1); // Month is 0-indexed: 11 = Dec
  const end = new Date(2026, 11, 31);
  
  let current = new Date(start);
  // Find first Sunday
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
  const gIdx = headers.indexOf('Grade');
  const cIdx = headers.indexOf('Class');
  const nIdx = headers.indexOf('Number');
  const naIdx = headers.indexOf('Name');
  // ID might not be in column? We generate it based on logic.
  // Logic: `${grade}_${class}_${number}_${rowIndex}`.
  
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Use i as rowIndex match
    const id = `${row[gIdx]}_${row[cIdx]}_${row[nIdx]}_${i}`;
    list.push({
      id: id,
      grade: row[gIdx],
      classNum: row[cIdx],
      number: row[nIdx],
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
