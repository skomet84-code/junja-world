# 준자마을 — Oracle Cloud Always Free 이전 준비

**분리된 테스트 브랜치:** `oci-village-migration-20261018`  
**기존 서비스:** `junja-village-friends.vercel.app` 유지  
**DB:** 기존 Neon `junja-village-auth-prod` 재사용(삭제·초기화 절대 금지)

## 서버 아키텍처
- 한 VM에서 Node.js가 정적 게임 화면, WebSocket(`/api/ws`), 로그인·서버 저장 API(`/api/account`)를 처리합니다.
- Caddy가 80/443으로 HTTPS를 제공하고 내부 3000 포트에 프록시합니다.
- 게임 접속 후 기존 계정으로 다시 로그인하면 기존 Neon 저장 기록을 읽습니다. 새 도메인은 쿠키가 달라 재로그인 필요.
- 서버 저장 기록이 없는 플레이어의 브라우저 로컬 진행은 자동 이전되지 않습니다.

## 계정 소유자가 직접 할 최초 설정
1. [Oracle Cloud 콘솔](https://cloud.oracle.com/)에서 Always Free VM을 생성합니다. Ubuntu 24.04 ARM64, `VM.Standard.A1.Flex`, **2 OCPU / 12 GB RAM 이내**로 권장합니다. 'Always Free-eligible' 표시를 확인하세요.
2. 네트워크 보안에서 80/443 TCP만 공개하고 22 SSH는 본인 IP로 제한합니다. 게임 내부 3000과 PostgreSQL 5432 포트는 공개하지 않습니다.
3. 도메인 DNS A레코드를 VM 공인 IP로 지정합니다. HTTPS와 `Secure` 로그인 쿠키 때문에 실제 호스트 이름이 필요합니다.
4. VM에서 [공식 Docker 설치 안내](https://docs.docker.com/engine/install/ubuntu/)대로 Docker Engine + Compose 플러그인을 설치합니다.

## VM 터미널에서
```bash
git clone --branch oci-village-migration-20261018 --single-branch https://github.com/skomet84-code/junja-world.git
cd junja-world
cp oci/.env.oci.example .env
cp oci/.env.village.example .env.village
chmod 600 .env.village
```

- `.env`: `VILLAGE_DOMAIN` 을 새 도메인으로 변경
- `.env.village`: `VILLAGE_DATABASE_URL`을 Vercel의 `junja-village-friends` 프로젝트 > Settings > Environment Variables에 있는 **기존** 값으로 설정
- 비밀번호, DB URL, 관리자 설정 토큰은 **공개 GitHub/채팅/이슈에 붙여넣지 마세요.**

```bash
docker compose -f compose.oci.yml up -d --build
docker compose -f compose.oci.yml ps
docker compose -f compose.oci.yml logs --tail=80 village caddy
```

## 전환 전 검사
- `https://도메인/health` 응답이 `ok: true`인지
- `https://도메인/` 화면이 뜨는지
- 로그인 안 한 상태로 `https://도메인/api/account?action=save` 응답이 401인지(503이면 DB 설정 오류)
- 테스트 계정 로그인, 원래 레벨/아이템 로딩, 저장 후 새로고침에서도 동일한지
- 다른 브라우저 2개로 WebSocket에서 친구 이동이 동기화되는지
- 원래 Vercel 주소는 복구용으로 그대로 유지

**주의:** Oracle VM의 배포 전에 신규 DB 생성이나 원본 테이블 초기화는 금지. 현재 DB에 서버 저장이 없는 계정은 개인 브라우저의 미동기화 기록을 따로 확인해야 합니다. VM이 재시작되어도 Neon의 계정·아이템은 보존되지만 실시간 방 접속 상태는 사라집니다.

## 업데이트
```bash
git pull --ff-only
docker compose -f compose.oci.yml up -d --build
```
