
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
