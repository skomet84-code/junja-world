# 준자마을 v50 — Google Cloud Compute Engine 이전 준비

## 상태 (2026-10-19)
- GitHub 브랜치: feat/village-v50-economy-release
- GCP 프로젝트 생성: **미완료** (연결된 GCP/Compute Engine 작업 도구 없음)
- GCP VM/공개 HTTPS 주소: **미생성**
- 기존 junja-village-friends.vercel.app: **그대로 보존**
- 신규 코드는 Node 22 지속 실행 서버에 계정·경제 API와 실시간 WebSocket을 결합하는 방식을 추가함.
- 실제 앱, 기존 PostgreSQL DB, 복수 친구 계정에 대한 운영 환경 검증은 **미완료**.

## 예상 무료 한도 및 주의 (Google 공식 문서 기준)
- e2-micro 1대/월 상당. us-west1 / us-central1 / us-east1에서만 해당.
- 30 GB-month standard persistent disk. pd-balanced 디스크는 과금 위험.
- VM 북미 출발 아웃바운드 월 1GB 무료. 다중 접속 시 초과 가능.
- **공인 IPv4는 사실상 무료가 아님**: 월 1시간만 무료, 이후 시간당 약 USD 0.005 (월 약 USD 3.65).
- 공인 IPv6 주소는 주소료가 없지만, 모든 사용자 네트워크 접속을 보장하지 않음. 기존 외부 PostgreSQL, GitHub, 패키지 저장소 등도 IPv6 호환성 확인 필요.
- HTTPS 도메인/인증서 필수: 로그인 세션 쿠키에 Secure가 있어 HTTP로는 정상 로그인 불가능.
- Google Cloud 경고 예산은 자동 과금 차단이 아님. 이용 가능 시 지출 한도 기능 검토.

## 계정에서 해야 할 최초 작업
1. https://console.cloud.google.com/ 에서 자신의 Google Cloud 프로젝트 생성 및 청구 계정 상태 확인.
2. Compute Engine API 활성화.
3. 무료 가능 지역과 비용 평가. 외부 IPv4 및 기타 유료 네트워크 구성은 임의로 생성하지 않음.
4. e2-micro, us-west1 (예: us-west1-b), pd-standard 20GB 이하 인스턴스 제안.
5. IPv4 비용을 피하는 경우 External IPv4=None, External IPv6 주소를 가진 subnet이 필요. 이 구성은 모든 이용자의 IPv6 호환성을 검증할 때까지 시험 용도로만.
6. 공개 HTTPS 호스트명과 TLS 인증서 구성. 기존 Vercel 기본 도메인은 다른 서버로 직접 이전할 수 없음.

## VM에서 수행할 설치
- Debian/Ubuntu, Node.js 22, git, npm, HTTPS 프록시 준비.
- 기존 PostgreSQL 저장소를 새로 만들거나 덮어쓰지 않는다.
- 기존 운영 DB 연결 문자열을 VM의 root-only /etc/junja-village.env 파일에 VILLAGE_DATABASE_URL 환경변수로 설정. Git/채팅에 절대 붙여넣지 않는다.
- 아직 서버에 소스가 없다면 해당 브랜치를 체크아웃한 뒤, root 권한으로 life/deploy/install-on-gcp-v50.sh 실행.
- systemctl status junja-village, curl http://127.0.0.1:3000/health로 내부 작동 확인.
- 외부에는 Node 포트 3000을 직접 노출하지 않고 HTTPS 프록시만 공개.

## 정식 출시 전 확인 (모두 통과 시에만 친구 초대)
1. npm test 통과: 저장·경제·가방 및 VM API/2인 WebSocket 회귀.
2. 휴대폰과 PC에서 실제 HTTPS 게임 접속.
3. 기존 계정 2개로 로그인→기존 XP·골드·집·가방·행동력 확인→저장→재접속→유지.
4. 동일 방에 2명 이상 들어가 실시간 이동과 말풍선 확인. 현재 릴레이는 한 방 최대 8명.
5. 주문과 거래가 원래 PostgreSQL에 중복 없이 기록되는지 확인.
6. 신규 도메인/서버를 별도 시험 후 공개 링크 변경. 기존 서버는 유지.
7. 문제 발생 시 신규 코드/주소만 롤백; 데이터베이스를 이전 시점으로 되돌리지 않음.

## 제한
ChatGPT의 현재 연결에는 GCP VM 생성/관리 권한이 없으며 계정 및 결제 설정도 확인되지 않았다. 따라서 실제 Google Cloud 서버를 생성했다고 주장할 수 없다.
