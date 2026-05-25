# 셀렙(이머전트) 접수 사이트 — 설치 가이드

ask.cellab.kr 접수 자동화 사이트를 Cloudflare에 배포하는 순서입니다.

## 구성 요약
- 프론트엔드: `index.html` (+ `assets/`) — 정적 페이지
- 관리자 페이지: `admin.html`
- 백엔드 API: `functions/api/` — Cloudflare Pages Functions
- 데이터베이스: Cloudflare D1 (접수 데이터)
- 파일 저장: Cloudflare R2 (사진·영상)
- 메일 발송: Resend

## 1. GitHub 저장소
1. GitHub에 새 저장소 생성 (예: `ask-cellab`)
2. 이 폴더의 모든 파일을 저장소에 업로드(push)

## 2. Cloudflare Pages 연결
1. Cloudflare 대시보드 → Workers & Pages → Create → Pages → Connect to Git
2. 위 GitHub 저장소 선택
3. 빌드 설정 — 빌드 명령: 없음, 출력 디렉터리: `/` (루트)
4. Save and Deploy

## 3. D1 데이터베이스 (접수 데이터)
1. 대시보드 → Storage & Databases → D1 → Create → 이름 `ask-cellab-db`
2. 생성된 Database ID를 복사해 `wrangler.toml`의 `database_id`에 입력
3. D1 → Console 탭에서 `schema.sql` 내용을 붙여넣고 실행 (테이블 생성)

## 4. R2 버킷 (사진·영상 저장)
1. 대시보드 → R2 → Create bucket → 이름 `ask-cellab-files`

## 5. 바인딩 연결
Pages 프로젝트 → Settings → Bindings:
- D1 database: 변수명 `DB` → `ask-cellab-db`
- R2 bucket: 변수명 `FILES` → `ask-cellab-files`

## 6. 환경변수 / 시크릿
Pages 프로젝트 → Settings → Variables and Secrets (Production):
- `ADMIN_PASSWORD` — 관리자 페이지 비밀번호 (직접 정하세요)
- `ADMIN_EMAIL` — `emgt.yhlee@gmail.com`
- `RESEND_API_KEY` — 7번에서 발급
- `MAIL_FROM` — 발신 주소 (도메인 인증 전에는 `onboarding@resend.dev`)

## 7. Resend (메일 발송)
1. resend.com 무료 가입
2. API Keys → Create API Key → 키를 `RESEND_API_KEY`에 입력
3. (선택) cellab.kr 도메인을 Resend에 인증한 뒤 `MAIL_FROM`을 `noreply@cellab.kr`로 변경
   — 인증 전에는 `onboarding@resend.dev`로도 정상 발송됩니다.

## 8. 도메인 연결
Pages 프로젝트 → Custom domains → `ask.cellab.kr` 추가
→ 안내되는 CNAME 레코드를 후이즈 DNS에 등록

## 배포 완료 후
- 접수 사이트: https://ask.cellab.kr
- 관리자 페이지: https://ask.cellab.kr/admin.html (ADMIN_PASSWORD로 로그인)

설정값을 바꾼 뒤에는 Pages에서 재배포(Retry deployment)하면 반영됩니다.
