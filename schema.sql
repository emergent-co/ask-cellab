-- 셀렙(이머전트) 접수 데이터베이스 (Cloudflare D1)
-- D1 콘솔에서 1회 실행하여 테이블을 생성합니다.

CREATE TABLE IF NOT EXISTS submissions (
  id          TEXT PRIMARY KEY,                 -- 접수 고유번호
  type        TEXT NOT NULL,                    -- 'as' (A/S 문의) | 'purchase' (구매 문의)
  brand       TEXT,                             -- 'sh' (SH Scientific) | 'lf' (Leadfluid)
  status      TEXT NOT NULL DEFAULT '접수됨',    -- 접수됨 | 처리중 | 완료
  data        TEXT NOT NULL,                    -- 폼 입력값 전체 (JSON)
  files       TEXT NOT NULL DEFAULT '[]',       -- 첨부파일 목록 (JSON: [{key,name}])
  created_at  TEXT NOT NULL                     -- 접수 일시 (ISO 8601)
);

CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);
