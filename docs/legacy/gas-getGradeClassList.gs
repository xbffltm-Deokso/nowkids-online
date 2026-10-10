// Google Apps Script에 추가할 함수
// 기존 Code.gs 파일에 이 함수를 추가하세요

/**
 * StudentDB에서 유니크한 학년/반 목록을 반환
 * GET 요청: ?action=getGradeClassList
 */
function getGradeClassList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const studentSheet = ss.getSheetByName('StudentDB');
  
  if (!studentSheet) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'StudentDB 시트를 찾을 수 없습니다.'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = studentSheet.getDataRange().getValues();
  const headers = data[0]; // ['Grade', 'Class', 'Name']
  
  const gradeIndex = headers.indexOf('Grade');
  const classIndex = headers.indexOf('Class');
  
  if (gradeIndex === -1 || classIndex === -1) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Grade 또는 Class 열을 찾을 수 없습니다.'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const gradesSet = new Set();
  const classesSet = new Set();
  
  // 헤더 제외하고 데이터 순회
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[gradeIndex]) gradesSet.add(Number(row[gradeIndex]));
    if (row[classIndex]) classesSet.add(Number(row[classIndex]));
  }
  
  const grades = Array.from(gradesSet).sort((a, b) => a - b);
  const classes = Array.from(classesSet).sort((a, b) => a - b);
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: { grades, classes }
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// 기존 doGet 함수에 action 분기 추가
// 기존 doGet 함수를 다음과 같이 수정하세요:
/*
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getGradeClassList') {
    return getGradeClassList();
  }
  
  // 기존 코드...
  const grade = e.parameter.grade;
  const classNum = e.parameter.class;
  
  // ...나머지 기존 로직
}
*/
