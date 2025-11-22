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
    
    var now = new Date();
    var timestamp = getTargetSunday(new Date(now)); // 오늘이 주일이면 오늘, 아니면 지난 주일
    
    // 디버그 로그
    Logger.log('현재 시각: ' + now);
    Logger.log('계산된 기준 주일: ' + timestamp);
    Logger.log('timestamp 요일: ' + timestamp.getDay()); // 0이어야 함 (일요일)
    
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

// 헬퍼 함수: 기준 주일 계산 (오늘이 주일이면 오늘, 아니면 지난 주일 반환)
function getTargetSunday(date) {
  // 새로운 Date 객체를 생성하여 원본을 수정하지 않음
  var result = new Date(date.getTime());
  var day = result.getDay(); // 0(일) ~ 6(토)
  
  // 주일까지의 일수 차이 계산 (일요일이면 0, 월요일이면 -1, 토요일이면 -6)
  result.setDate(result.getDate() - day);
  
  // 시간을 00:00:00으로 초기화
  result.setHours(0, 0, 0, 0);
  
  return result;
}

// 헬퍼 함수: JSON 응답 생성 (CORS 해결 포함)
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// 4. 출석부 시트 자동 생성 함수 (연도별 시트 - 체크박스 + 출석율)
function setupAttendanceView(year) {
  // 기본값: 현재 연도
  if (!year) {
    year = new Date().getFullYear();
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var studentSheet = ss.getSheetByName('StudentDB');
  var responseSheet = ss.getSheetByName('Response');
  
  // 연도별 시트 이름
  var sheetName = 'AttendanceView_' + year;
  var viewSheet = ss.getSheetByName(sheetName);
  
  // 시트가 없으면 생성
  if (!viewSheet) {
    viewSheet = ss.insertSheet(sheetName);
    Logger.log(sheetName + ' 시트가 생성되었습니다.');
  }
  
  if (!studentSheet || !responseSheet) {
    Logger.log('필요한 시트(StudentDB, Response)가 없습니다.');
    return;
  }
  
  // 1. 기존 내용 초기화
  viewSheet.clear();
  
  // 2. 학생 명단 가져오기 (학년, 반, 이름 정렬)
  var studentData = studentSheet.getDataRange().getValues();
  var students = [];
  // 헤더 제외하고 데이터만 추출
  for (var i = 1; i < studentData.length; i++) {
    students.push(studentData[i]);
  }
  
  // 정렬: 학년 -> 반 -> 이름 순
  students.sort(function(a, b) {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1; // 학년 (문자열 비교)
    if (a[1] !== b[1]) return a[1] - b[1]; // 반 (숫자 비교)
    return a[2] < b[2] ? -1 : 1; // 이름
  });
  
  // 3. 날짜 헤더 생성 (해당 연도의 모든 주일)
  var sundays = [];
  var date = new Date(year, 0, 1);
  
  // 첫 번째 주일 찾기
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1);
  }
  
  // 1년치 주일 수집
  while (date.getFullYear() === year) {
    sundays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  
  // 4. 헤더 쓰기 (학년, 반, 이름, 출석율, 날짜들...)
  var headers = ['학년', '반', '이름', '출석율'];
  // 날짜 포맷팅 (M/d)
  var dateHeaders = sundays.map(function(d) {
    return (d.getMonth() + 1) + '/' + d.getDate();
  });
  var fullHeaders = headers.concat(dateHeaders);
  
  viewSheet.getRange(1, 1, 1, fullHeaders.length).setValues([fullHeaders]);
  viewSheet.setFrozenRows(1);
  viewSheet.setFrozenColumns(4); // 출석율 컬럼 포함하여 4개 고정
  
  // 5. 학생 데이터 쓰기
  if (students.length > 0) {
    viewSheet.getRange(2, 1, students.length, 3).setValues(students);
    
    // 6. 출석율 공식 추가 (D열)
    // 출석율 = (출석한 주일 수 / 전체 주일 수) × 100
    // COUNTIF(E2:ZZ2, TRUE) / COUNTA($E$1:$ZZ$1) * 100
    var lastCol = String.fromCharCode(64 + 5 + sundays.length - 1); // 5는 E열부터 시작 (1-indexed: A=1, B=2, C=3, D=4, E=5)
    var attendanceRateFormula = '=IFERROR(COUNTIF(E2:' + lastCol + '2, TRUE) / ' + sundays.length + ' * 100, 0)';
    
    var attendanceRateRange = viewSheet.getRange(2, 4, students.length, 1);
    attendanceRateRange.setFormula(attendanceRateFormula);
    attendanceRateRange.setNumberFormat('0.0"%"'); // 퍼센트 포맷 (소수점 1자리)
    
    // 7. 날짜 헤더를 Date 객체로 넣고 포맷팅
    var dateHeaderRange = viewSheet.getRange(1, 5, 1, sundays.length);
    dateHeaderRange.setValues([sundays]);
    dateHeaderRange.setNumberFormat("M/d");
    
    // 8. 체크박스 삽입
    var checkboxRange = viewSheet.getRange(2, 5, students.length, sundays.length);
    checkboxRange.insertCheckboxes();
    
    // 9. 수식 생성
    // Response 시트 컬럼: A(Timestamp), B(Grade), C(Class), D(Name)
    // 조건: Grade=$A2, Class=$B2, Name=$C2, Timestamp=E$1 (날짜 헤더)
    var formula = '=COUNTIFS(Response!$B:$B, $A2, Response!$C:$C, $B2, Response!$D:$D, $C2, Response!$A:$A, E$1) > 0';
    checkboxRange.setFormula(formula);
  }
  
  Logger.log(sheetName + ' 시트가 생성되었습니다.');
}

// 편의 함수: 2025년 출석부 생성
function setupAttendanceView2025() {
  setupAttendanceView(2025);
}

// 편의 함수: 2026년 출석부 생성
function setupAttendanceView2026() {
  setupAttendanceView(2026);
}
