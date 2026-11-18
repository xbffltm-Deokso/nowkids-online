-- 교육부·부서 기본 구성과 소년부 학년·반을 만들고 기존 학생을 연결 (여러 번 실행해도 중복되지 않음)
-- 연령 범위·진급 순서는 2026년 주일보고서 시트 기준. 이후 변경은 관리 화면 설정으로 함
INSERT INTO "divisions" ("name", "sort_order") VALUES ('교육1부', 1), ('교육2부', 2)
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "departments" ("division_id", "name", "kind", "service_time", "age_min", "age_max", "sort_order", "ch2ch_org_name")
SELECT d."id", v."name", 'school', v."st", v."amin", v."amax", v."so", v."ch"
FROM "divisions" d,
(VALUES
    ('통합미취학부', '10시', 2, 7, 1, NULL),
    ('영유아부', '12시', 2, 4, 2, NULL),
    ('유치부', '12시', 5, 7, 3, NULL),
    ('통합아동부', '10시', 8, 13, 4, NULL),
    ('유년부', '12시', 8, 10, 5, NULL),
    ('소년부', '12시', 11, 13, 6, '[덕소]소년부'),
    ('중등부', '12시', 14, 16, 7, NULL),
    ('고등부', '12시', 17, 19, 8, NULL)
) AS v("name", "st", "amin", "amax", "so", "ch")
WHERE d."name" = '교육1부'
ON CONFLICT ("division_id", "name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "departments" ("division_id", "name", "kind", "sort_order")
SELECT d."id", v."name", 'report_only', v."so"
FROM "divisions" d,
(VALUES ('원더풀 시니어', 1), ('장년교육부', 2), ('문화홍보부', 3)) AS v("name", "so")
WHERE d."name" = '교육2부'
ON CONFLICT ("division_id", "name") DO NOTHING;
--> statement-breakpoint
-- 12시 부서 진급 순서: 영유아부 → 유치부 → 유년부 → 소년부 → 중등부 → 고등부 (통합 부서는 개별 지정)
UPDATE "departments" AS cur SET "next_department_id" = nxt."id"
FROM "departments" AS nxt, "divisions" AS d,
(VALUES ('영유아부', '유치부'), ('유치부', '유년부'), ('유년부', '소년부'), ('소년부', '중등부'), ('중등부', '고등부')) AS v("cur", "nxt")
WHERE d."name" = '교육1부'
  AND cur."division_id" = d."id" AND nxt."division_id" = d."id"
  AND cur."name" = v."cur" AND nxt."name" = v."nxt"
  AND cur."next_department_id" IS NULL;
--> statement-breakpoint
INSERT INTO "grades" ("department_id", "name", "sort_order", "ch2ch_sub_name", "report_age")
SELECT dep."id", v."name", v."so", v."ch", v."age"
FROM "departments" dep,
(VALUES ('4.믿음', 1, '4학년', 11), ('5.소망', 2, '5학년', 12), ('6.사랑', 3, '6학년', 13)) AS v("name", "so", "ch", "age")
WHERE dep."name" = '소년부'
  AND NOT EXISTS (SELECT 1 FROM "grades" g WHERE g."department_id" = dep."id" AND g."name" = v."name");
--> statement-breakpoint
-- 소년부 반: 학년별 1~4반 (예: "4.믿음 1반")
INSERT INTO "classes" ("department_id", "name", "sort_order")
SELECT g."department_id", g."name" || ' ' || n || '반', g."sort_order" * 10 + n
FROM "grades" g
JOIN "departments" dep ON dep."id" = g."department_id" AND dep."name" = '소년부'
CROSS JOIN generate_series(1, 4) AS n
WHERE NOT EXISTS (
    SELECT 1 FROM "classes" c WHERE c."department_id" = g."department_id" AND c."name" = g."name" || ' ' || n || '반'
);
--> statement-breakpoint
-- 기존 학생(모두 소년부)을 부서·학년·반에 연결. 반 번호가 1~4가 아니면 반 미배정
UPDATE "students" AS s
SET "department_id" = g."department_id",
    "grade_id" = g."id",
    "class_id" = (
        SELECT c."id" FROM "classes" c
        WHERE c."department_id" = g."department_id" AND c."name" = g."name" || ' ' || s."class_num" || '반'
    ),
    "source" = COALESCE(s."source", 'legacy')
FROM "grades" g
JOIN "departments" dep ON dep."id" = g."department_id" AND dep."name" = '소년부'
WHERE g."name" = s."grade" AND s."department_id" IS NULL;
