// NowKids → ch2ch 출석부(분기) 반영 스크립트
// ch2ch "교인관리 > 교육기관 검색 > 출석부(분기)" 화면에서 북마클릿으로 실행됨
// - 화면의 학생(이름)과 주차별 체크박스를 읽어 NowKids 출석 기록에 맞게 체크/해제
// - NowKids에 기록이 없는 주는 건드리지 않음
// - 바뀐 칸은 색으로 표시만 하고, 저장은 사용자가 ch2ch "저장" 버튼으로 직접 함
(function () {
    var PANEL_ID = 'nowkids-ch2ch-panel';
    var script = document.currentScript;
    var API_ORIGIN = script ? new URL(script.src).origin : '';

    // 프레임 안까지 뒤져서 출석부(분기) 폼이 있는 창을 찾음
    function findPresenceWindow(w) {
        try {
            var f = w.document.forms.form1;
            if (f && f.search_view_type && f.search_view_type.value === 'Presence') return w;
        } catch (e) {
            // 다른 출처의 프레임은 건너뜀
        }
        for (var i = 0; i < w.frames.length; i++) {
            var found = findPresenceWindow(w.frames[i]);
            if (found) return found;
        }
        return null;
    }

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function toDateString(d) {
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    // ch2ch 주차 번호 → 날짜: N주차 = 그 해의 N번째 일요일
    function sundayOfWeek(year, week) {
        var d = new Date(year, 0, 1);
        d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + (week - 1) * 7);
        return d;
    }

    function cellText(cell) {
        return (cell ? cell.innerText : '').trim().split('\n')[0].trim();
    }

    function showPanel(doc, html) {
        var old = doc.getElementById(PANEL_ID);
        if (old) old.remove();
        var panel = doc.createElement('div');
        panel.id = PANEL_ID;
        panel.style.cssText =
            'position:fixed;top:12px;right:12px;z-index:99999;width:340px;max-height:80vh;overflow:auto;' +
            'background:#fff;border:2px solid #1976d2;border-radius:8px;padding:14px 16px;' +
            'font:14px/1.5 sans-serif;color:#222;box-shadow:0 4px 16px rgba(0,0,0,.2)';
        panel.innerHTML =
            '<button type="button" style="float:right;border:0;background:none;font-size:18px;cursor:pointer">×</button>' +
            '<b style="color:#1976d2">NowKids 출석 반영</b><br>' +
            html;
        panel.querySelector('button').onclick = function () {
            panel.remove();
        };
        doc.body.appendChild(panel);
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function nameList(names) {
        return names.length ? names.map(escapeHtml).join(', ') : '없음';
    }

    async function run() {
        var win = findPresenceWindow(window);
        if (!win) {
            alert('ch2ch "출석부(분기)" 화면을 연 상태에서 실행해 주세요.\n(교인관리 > 교육기관 검색 > 학년 선택 > 출석부(분기))');
            return;
        }
        var doc = win.document;
        var form = doc.forms.form1;
        var year = Number(form.presence_year.value);
        var subname = form.subname.value; // 예: "4학년"
        var gradeMatch = /^(\d)/.exec(subname);
        if (!gradeMatch) {
            alert('학년을 알 수 없습니다 (' + subname + '). 학년 단위로 검색한 출석부에서 실행해 주세요.');
            return;
        }
        var grade = gradeMatch[1];

        // 출석부 표와 이름 열 위치
        var table = Array.prototype.find.call(form.querySelectorAll('table'), function (t) {
            return t.querySelector('tr.main_tr[person_id]');
        });
        if (!table) {
            alert('출석부 표를 찾을 수 없습니다.');
            return;
        }
        var headerCells = Array.prototype.map.call(table.rows[0].cells, cellText);
        var nameIndex = headerCells.indexOf('이름');
        if (nameIndex < 0) {
            alert('출석부 표에서 "이름" 열을 찾을 수 없습니다.');
            return;
        }

        // 화면의 주차 목록과 날짜 — 헤더의 일(日) 숫자와 계산한 날짜가 맞는지 확인
        var rows = Array.prototype.slice.call(table.querySelectorAll('tr.main_tr[person_id]'));
        var firstRowWeeks = Array.prototype.map.call(
            rows[0].querySelectorAll('input[type=checkbox][name^="week_"]'),
            function (cb) {
                return Number(cb.name.split('_')[1]);
            }
        );
        var headerDays = Array.prototype.map.call(table.rows[1].cells, cellText).map(Number);
        var weekDates = {};
        for (var i = 0; i < firstRowWeeks.length; i++) {
            var d = sundayOfWeek(year, firstRowWeeks[i]);
            if (headerDays[i] !== d.getDate()) {
                alert('주차와 날짜가 맞지 않아 중단합니다. (' + firstRowWeeks[i] + '주차 → ' + toDateString(d) + ', 화면 ' + headerDays[i] + '일)');
                return;
            }
            weekDates[firstRowWeeks[i]] = toDateString(d);
        }
        var dates = Object.keys(weekDates).map(function (w) {
            return weekDates[w];
        }).sort();

        var url =
            API_ORIGIN + '/api/ch2ch?grade=' + grade + '&from=' + dates[0] + '&to=' + dates[dates.length - 1];
        var res = await fetch(url);
        var data = await res.json();
        if (!res.ok) {
            alert('NowKids 데이터를 불러오지 못했습니다: ' + (data && data.error));
            return;
        }

        var recordMap = {};
        data.records.forEach(function (r) {
            recordMap[r.name + '|' + r.date] = r.status;
        });

        var ch2chNames = [];
        var checked = 0;
        var unchecked = 0;
        var $ = win.jQuery;

        rows.forEach(function (tr) {
            var name = cellText(tr.cells[nameIndex]);
            ch2chNames.push(name);
            var personId = tr.getAttribute('person_id');
            tr.querySelectorAll('input[type=checkbox][name^="week_"]').forEach(function (cb) {
                var parts = cb.name.split('_');
                if (parts[2] !== personId) return;
                var date = weekDates[Number(parts[1])];
                var key = name + '|' + date;
                // NowKids에 기록이 없는 주는 그대로 둠
                if (!date || !(key in recordMap)) return;
                var status = recordMap[key];
                if (cb.checked === status) return;
                cb.checked = status;
                if ($) $(cb).trigger('change');
                cb.parentElement.style.background = status ? '#c8e6c9' : '#ffcdd2';
                if (status) checked++;
                else unchecked++;
            });
        });

        var onlyCh2ch = ch2chNames.filter(function (n) {
            return data.students.indexOf(n) < 0;
        });
        var onlyNowkids = data.students.filter(function (n) {
            return ch2chNames.indexOf(n) < 0;
        });

        // 이 분기에서 NowKids 기록이 있는 주 — 분기 전체를 대조하지만 기록이 있는 주만 바뀜
        var datesWithData = dates.filter(function (date) {
            return data.records.some(function (r) {
                return r.date === date;
            });
        });
        var dataWeeksText = datesWithData.length
            ? datesWithData.map(function (date) {
                return Number(date.slice(5, 7)) + '/' + Number(date.slice(8, 10));
            }).join(', ') + ' (' + datesWithData.length + '/' + dates.length + '주)'
            : '없음';

        showPanel(
            doc,
            subname + ' · ' + dates[0] + ' ~ ' + dates[dates.length - 1] + '<br>' +
                '<b>NowKids 기록이 있는 주</b>: ' + dataWeeksText + '<br>' +
                '<span style="color:#666;font-size:12px">다른 분기는 ch2ch에서 분기를 바꾼 뒤 다시 눌러 주세요.</span><br><br>' +
                '<span style="background:#c8e6c9;padding:0 4px">출석으로 체크</span> ' + checked + '칸<br>' +
                '<span style="background:#ffcdd2;padding:0 4px">결석으로 해제</span> ' + unchecked + '칸<br><br>' +
                '<b>ch2ch에만 있는 학생</b> (반영 안 됨)<br>' + nameList(onlyCh2ch) + '<br><br>' +
                '<b>NowKids에만 있는 학생</b> (반영 안 됨)<br>' + nameList(onlyNowkids) + '<br><br>' +
                (checked + unchecked > 0
                    ? '<b style="color:#d32f2f">아직 저장되지 않았습니다.</b> 표시된 칸을 확인한 뒤 ch2ch의 <b>저장</b> 버튼을 눌러 주세요.'
                    : '바꿀 칸이 없습니다. 이미 NowKids 기록과 같습니다.')
        );
    }

    run().catch(function (err) {
        alert('NowKids 출석 반영 중 오류: ' + err.message);
    });
})();
