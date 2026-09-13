# JUNJA WORLD v0.2

한국형 2D 판타지 MMORPG를 목표로 만드는 첫 번째 플레이어블 프로토타입입니다.

## v0.2 비주얼 업그레이드

- 백운성 조선풍 쿼터뷰 픽셀아트 월드맵
- 검객·도사·궁사 4방향 걷기 애니메이션
- 전용 촌장 백운 NPC 아트
- 도깨비 슬라임 애니메이션
- 전체 화면 반응형 게임 캔버스

## 지금 플레이할 수 있는 기능

- 캐릭터 이름 및 직업 선택: 검객, 도사, 궁사
- 단풍골 초보자 마을과 야생 숲 탐험
- PC 방향키/WASD 이동, Space 공격, E 대화
- 모바일 터치 이동, 공격, 대화 버튼
- NPC 대화와 첫 메인 임무
- 슬라임 전투, 피해, 사망 및 마을 부활
- 경험치, 레벨업, 능력치 성장
- 브라우저 자동 저장

## 로컬 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev
```

표시된 주소(보통 `http://localhost:5173`)를 브라우저에서 엽니다.

## Render 배포

이 저장소에는 `render.yaml`이 포함되어 있습니다.

1. Render Dashboard에서 **New + → Blueprint**를 선택합니다.
2. 이 GitHub 저장소를 연결합니다.
3. **Apply**를 누릅니다.

수동 Web Service 생성 시 설정은 다음과 같습니다.

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

## 다음 개발 단계

v0.2에서는 서버 로그인과 PostgreSQL 캐릭터 저장, Socket.IO 실시간 동시 접속, 다른 플레이어 표시를 추가할 예정입니다. 이후 인벤토리·장비·스킬·몬스터 AI·맵 확장 순으로 발전시킵니다.

---

Built with TypeScript, Phaser, Vite and Node.js.
