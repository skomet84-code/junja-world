# JUNJA VILLAGE LIFE v17 — improved mobile 3D / costumes / life progression

[▶ Play the v17 preview](https://raw.githack.com/skomet84-code/junja-world/junja-village-life-v17/life/index.html)

**Branch-only preview.** The main JUNJA LAND and Adventure live deployments have not been changed.

## Improvements after v16

- Mobile renderer: fewer unnecessary click raycasts, adaptive resolution and less frequent expensive shadow-map updates.
- Distinct rigged 3D clothes: sailor details, navy jacket, knitted/linen seams, satchel, dress ribbons, sleeve cuffs and matching leg materials. Original assets are procedural meshes on one avatar skeleton rather than flat PNG paper-doll layers.
- Island progression: HUD now says *what to do next*, level bonuses unlock at Lv3/4/6/8, and payout labels reflect the actual amounts.
- NPC chat can no longer grant unlimited XP/friendship through repeat clicking.
- Multiplayer: online friends now appear as animated dressed 3D characters; the authoritative relay recognizes the entire expanded eastern island and the crafted linen outfit. Nicknames are editable in the friends panel.
- Real Chromium mobile/WebGL testing is configured in `.github/workflows/village-life-preview.yml`. The workflow also saves screenshots of the mobile village and wardrobe.

## QA

`cd life && npm test` validates JavaScript syntax, joint hierarchy, 110 combinations and deterministic exact-target navigation.

The GitHub Actions browser smoke additionally opens the actual 3D scene on a 390×844 mobile viewport, checks an accurate walking stop, opens the wardrobe, renders a network guest and verifies positions in the east district. Results and screenshots appear under the branch workflow run.

**Known limits:** this is not a completed Animal Crossing-level commercial-quality game; graphic art direction needs further refinement, multiplayer on the static RawGitHack preview is intentionally offline, and production persistent multiplayer/economy databases are not connected.

---

# JUNJA VILLAGE LIFE v16 — 3D character / touch preview (2026-10-17)

> This is an experimental **branch preview**, not the live JUNJA LAND or Adventure build.

[Open v16 preview](https://raw.githack.com/skomet84-code/junja-world/junja-village-life-v16/life/index.html)

## What changed since v15

- Tap to navigate to a fixed world-space target; finger drag now replans only when the finger actually moves. Standing still while the camera follows no longer shifts the destination.
- Improved the 3D character's wearable torso and joined shoulder/elbow sleeve geometry with shared-joint gait, including softly flared dresses. The same rig drives walking, wardrobe preview and villagers.
- On mobile WebGL initialization/context loss, the screen now surfaces a useful error instead of only blank output.
- Added 110 outfit/hat regression combinations and exact-arrival/zero-inertia movement tests.

## Check before promoting

Run `cd life && npm test` on Node.js 22+. Static syntax and navigation logic have been checked. **Actual Safari/WebGL visual QA has not yet been run in this session.** On device, check: map entry, tap destination stop, stationary finger drag while camera follows, obstacle detours, wardrobe rotation/walk preview, linen crafted shirt, dress hems, relaunch with saved progress, and phone overheating/frame rate.

The original v1 notes are retained below for background; they do not describe the complete v16 prototype.

---

# JUNJA VILLAGE LIFE v1.0 — playable integrated prototype

독창적인 2.5D 일러스트 스타일의 낚시·농사·생활형 온라인 마을 게임 **플레이 가능한 통합 테스트 버전**입니다.

## 바로 실행 (혼자 플레이)

`준자마을-LIFE-v1-바로실행.html` 을 Chrome / Safari에서 엽니다. 모든 이미지가 HTML 내부에 포함되어 있습니다. 별도 서버 연결 없이 플레이할 수 있습니다. 모바일 화면을 터치하면 캐릭터가 자동 길찾기로 이동합니다. 조이스틱은 없습니다.

## 친구와 테스트 (개발자/서버가 있는 경우)

Node.js 22+가 설치된 컴퓨터에서:

```bash
npm start
```

`http://localhost:3000/?room=SPRING` 으로 접속합니다. 두 번째 기기 또는 브라우저에서 **같은 주소와 방 코드**로 접속하면 두 캐릭터가 표시되며 이동·옷·모자·채팅이 동기화됩니다. 외부 네트워크 접속은 별도 호스팅 설정이 필요합니다. 익명 룸은 최대 8명, 재접속하면 게스트 연결 ID가 바뀝니다.

## 실제 작동하는 기능

- 2D 레이어드 맵, 개별 건물 및 나무 이미지 렌더링, y 기반 깊이 정렬, 카메라 추적, 4방향 캐릭터, 터치 자동 길찾기(A*)
- 물고기 6종, 입질·챔질·게이지 2회 미니게임, 코인과 경험치, 수집 도감
- 텃밭 14칸, 씨앗 4종 구매/심기/성장/수확, 성장의 실시간 계산(플레이 도중·종료 중 모두 유지)
- 의상 10종, 모자 10종 코인 구매와 착용, 캐릭터 색/모자 렌더링 변화
- 마을 장식 6종 설치/회수, 내 집 벽지 4종, 가구 6종(기본 소파 포함)
- NPC 3명 대화/선물/친밀도, 3종 일일 의뢰, 5종 업적, 제작 공방 및 교역소
- 브라우저 로컬 진행 저장. HTML 단독 실행의 경우 연결·저장 권한을 제한하는 앱 내 미리보기에서는 저장이 되지 않을 수 있습니다.
- Node `server.mjs`를 실행하면 임시 게스트 멀티플레이(방 입장, 실시간 이동/외형, 채팅, 퇴장, 방 격리)

## 구현되지 않은 기능 / 필수 후속 작업

이 프로젝트는 닌텐도의 동물의 숲처럼 완성된 상용 게임이 **아닙니다**. 네이티브 3D 메시 애니메이션, 넓은 필드·실내 인스턴스·스토리, 동물 AI, 정식 그래픽 스프라이트 제작, 보안 인증, 서버 권위형 경제, DB 저장, 운영자 도구, 서버 백업, 부하 테스트, 게임 라이브서비스 인프라가 필요합니다. 지금 서버는 신뢰할 수 있는 인원 간 테스트용이고 재화/아이템은 브라우저 저장(치트 방지 안 됨)입니다. 익명 채팅은 사용자 인증·신고/차단·모더레이션을 붙이기 전 불특정 다수에게 공개 운영하지 마세요.

## 테스트

```bash
python test_v1.py
python test_movement.py
python test_fishing_v1.py
node test_multiplayer.mjs
```

Chromium PC 1280x800 및 모바일 화면 390x844에서 동작을 확인했습니다. 실제 iPhone Safari의 사용자 기기에서는 추가 검증이 필요합니다.

## 배포 및 기존 프로젝트 보호

기존 준자랜드/어드벤처 운영 브랜치·서비스는 변경하지 않았습니다. 공개 미리보기용 GitHub **별도 브랜치**로 정적 체험판을 올릴 수 있습니다. 실시간 멀티플레이 서버를 온라인으로 구동하려면 Node 서비스를 별도로 배포하세요.