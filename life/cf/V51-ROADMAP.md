# 모여봐요 반말방숲 v51 — 단일 Cloudflare 운영 기반 강화

기준: v50 실서비스 Cloudflare-only Workers + SQLite Durable Object + WebSocket.
v50 실운영 주소 `https://junja-world.skomet.workers.dev/` 변경 금지.

## 기준 확인 (2026-10-20)
- 실서비스 신규 가입, 로그인, 기본 캐릭터 입장, 서버 저장 성공, 새로고침 후 유지 확인.
- 서버 공개 health: `release=v50-single-platform`, `database=cloudflare-do-sqlite`.
- GitHub 로컬 Wrangler 회귀 테스트: 2명 WebSocket 입장/이동 성공.
- 제한: **v38~v46의 실험 경제·직업·사업장 관련 네트워크 API는 새 Cloudflare 전용 Worker에 모두 이전되지 않아 일부 메뉴가 503을 반환함.** 기존 v50 게임의 프론트 UI/정적 시스템은 존재. v51에서 사용자-visible 오류 없이 이를 복구할 것.
- 제한: 실제 서로 다른 모바일 단말 2명의 공개 실서버 멀티플레이는 아직 확인되지 않음.
- 제한: 최고관리자 계정 초기 설정은 Cloudflare 비공개 시크릿이 필요함. 비밀값을 GitHub나 ChatGPT 채팅에 하드코딩하지 말 것.

## v51 P0
1. 실제 로그인 세션 기준 서비스 상태 검사(비공개 QA 계정만 사용), 내구성/저장 버전 충돌 409 안전 처리.
2. v38~v46 관련 경제·주민 주문·사업장 API 중 기존 게임 화면에서 호출되는 엔드포인트 확인, 서버 경제 장부와 같은 SQLite Durable Object 트랜잭션으로 안전하게 구현.
3. 요청별 중복 처리 ID와 거래 원장, 잔액/재고 감소·증가가 하나의 원자적 트랜잭션에서 처리되는지 검사.
4. 친구 두 명의 실제 공개 서버 WebSocket 입장·이동·퇴장 및 Safari 모바일 화면 테스트.
5. 운영자 계정 및 관리자 부여·회수, 권한 403, 감사·로그 복구 검증. 관리자 시크릿은 별도 안전한 채널에서 설정.
6. v51 운영 배포는 별도 브랜치에서 빌드·테스트·리뷰 후 진행. v50 서비스 자동 덮어쓰기 금지.

## 유지 규칙
- Vercel 및 Neon에 운영 요청을 재연결하지 않는다.
- 신규 계정 저장 데이터는 `VillageDatabase` Durable Object 한 곳이 원본(authoritative source of truth).
- 기존 계정·레벨은 자동 이관하지 않는다(관리자의 명시적 신규 이전 요청 시에만 검토).
- 5초마다 DB 저장하던 방식은 실제 상태 변경 기반/배치·디바운스로 점진적 교체.
- 클라이언트가 보낸 금액을 거래 원장 없이 그대로 신뢰하지 않음.
- 건강 상태만으로 전체 게임 성공을 선언하지 않음.
