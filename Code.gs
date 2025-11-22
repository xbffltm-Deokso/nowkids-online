/**
 * [Phase 1] 백엔드 & DB 스키마 자동 생성
 * 
 * 이 코드를 Google Apps Script 프로젝트에 복사하여 붙여넣으세요.
 * 1. 스프레드시트 상단 메뉴 [확장 프로그램] > [Apps Script] 선택
 * 2. 코드 에디터에 아래 내용을 붙여넣기
 * 3. 'initialSetup' 함수를 선택하고 [실행] 버튼 클릭 (권한 허용 필요)
 * 4. [배포] > [새 배포] > 유형: '웹 앱'
 *    - 설명: 'Attendance API'
 *    - 다음 사용자로서 실행: '나(웹 앱 소유자)'
 *    - 액세스 권한이 있는 사용자: '모든 사용자' (필수)
 * 5. 생성된 '웹 앱 URL'을 복사하여 보관 (Phase 2에서 사용)
 */

// 1. 초기 설정 함수 (1회 실행용)
function initialSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1-1. Response 시트 생성 (출석 로그)
  createSheetIfNotExists(ss, 'Response', ['Timestamp', 'Grade', 'Class', 'Name']);
  
  // 1-2. StudentDB 시트 생성 (학생 명단)
  var studentSheet = createSheetIfNotExists(ss, 'StudentDB', ['Grade', 'Class', 'Name']);
  
  // 테스트 데이터 추가 (StudentDB가 비어있을 경우에만)
  if (studentSheet.getLastRow() === 1) {
    var testData = [
      ['믿음', 1, '홍길동'],
      ['믿음', 1, '김철수'],
      ['소망', 1, '이영희']
    ];
    // 2차원 배열로 한 번에 기록
    studentSheet.getRange(2, 1, testData.length, 3).setValues(testData);
    Logger.log('StudentDB에 테스트 데이터가 추가되었습니다.');
  }
  
  // 1-3. AttendanceView 시트 생성 (시각화용)
  createSheetIfNotExists(ss, 'AttendanceView', ['이 시트는 Response 시트의 데이터를 기반으로 피벗 테이블을 생성하여 사용하세요']);
  
  Logger.log('모든 시트 설정이 완료되었습니다.');
}

// 헬퍼 함수: 시트가 없으면 생성하고 헤더 설정
function createSheetIfNotExists(ss, sheetName, headerRow) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headerRow);
    Logger.log(sheetName + ' 시트가 생성되었습니다.');
  }
  return sheet;
}

// 2. doGet 함수: 학생 명단 조회
function doGet(e) {
  try {
    var grade = e.parameter.grade;
    var cls = e.parameter.class; // 'class'는 예약어일 수 있으므로 변수명 변경
    
    if (!grade || !cls) {
      return responseJSON({ error: '학년(grade)과 반(class) 파라미터가 필요합니다.' });
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('StudentDB');
    
    if (!sheet) {
      return responseJSON({ error: 'StudentDB 시트를 찾을 수 없습니다. initialSetup을 먼저 실행하세요.' });
    }
    
    var data = sheet.getDataRange().getValues(); // 전체 데이터 읽기
    var headers = data[0];
    var students = [];
    
    // 헤더 이후 데이터부터 순회 (1행은 헤더)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // 데이터 타입 비교를 위해 == 사용 (문자열/숫자 호환)
      if (row[0] == grade && row[1] == cls) {
        students.push({
          grade: row[0],
          class: row[1],
          name: row[2]
        });
      }
    }
    
    return responseJSON({ 
      success: true, 
      data: students,
      count: students.length
    });
    
  } catch (err) {
    return responseJSON({ error: err.toString() });
  }
}

// 3. doPost 함수: 출석 데이터 저장
function doPost(e) {
  try {
    // POST 데이터 파싱
    var params;
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else {
      return responseJSON({ error: 'POST 데이터가 없습니다.' });
    }
    
    var grade = params.grade;
    var cls = params.class;
    var students = params.students; // 배열 형태 예상: ['이름1', '이름2']
    
    if (!grade || !cls || !students || !Array.isArray(students)) {
      return responseJSON({ error: '잘못된 데이터 형식입니다. grade, class, students(배열)이 필요합니다.' });
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Response');
    
    if (!sheet) {
      return responseJSON({ error: 'Response 시트를 찾을 수 없습니다.' });
    }
    
    var timestamp = new Date();
    var newRows = [];
    
    // 학생 1명당 1행씩 데이터 생성
    for (var i = 0; i < students.length; i++) {
      newRows.push([timestamp, grade, cls, students[i]]);
    }
    
    // 한 번에 기록 (성능 최적화)
    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 4).setValues(newRows);
    }
    
    return responseJSON({ 
      success: true, 
      message: newRows.length + '명의 출석이 저장되었습니다.' 
    });
    
  } catch (err) {
    return responseJSON({ error: err.toString() });
  }
}

// 헬퍼 함수: JSON 응답 생성 (CORS 해결 포함)
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
