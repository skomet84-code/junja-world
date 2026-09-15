# JUNJA WORLD v3.0

한국형 2D 판타지 MMORPG를 목표로 개발 중인 JUNJA WORLD입니다.

## 현재 기준

- 공식 기준 브랜치: `main`
- 런타임 버전: v3.0.x
- 배포: Render Auto-Deploy
- 프론트엔드: TypeScript + Phaser + Vite
- 서버: Node.js + Express + PostgreSQL(Neon)

## 현재 구현된 주요 기능

- 검객·도사·궁사 캐릭터
- 백운성, 청운들판, 흑철광산, 월영숲
- 퀘스트, 자동이동, 사냥, 자동사냥
- 채집, 제작, 장비 성장, 인벤토리
- 보스/엔드게임, 반복 의뢰, 현상금 게시판
- 모바일 HUD 및 터치/드래그 조작
- 계정 로그인, 서버 저장, 관리자 기능
- J-Coin 연동 기능

## 모바일 호환성

Safari, Chrome, 카카오톡 인앱 브라우저 등 모바일 WebKit 환경을 대상으로 렌더링/터치 안정화 작업을 계속 진행하고 있습니다.

v3.0.3에서는 오래된 iPhone 전용 Canvas 강제 선택을 배포 번들에서 제거하고 `Phaser.AUTO`로 복구하여 WebGL을 우선 사용할 수 있도록 조정합니다.

## 로컬 실행

Node.js 22.x가 필요합니다.

```bash
npm install
npm run dev
```

## Render 배포

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Render는 `main` 최신 커밋을 기준으로 Auto-Deploy합니다.

## 개발 원칙

JUNJA WORLD 작업의 기준은 항상 GitHub `main` 최신 커밋입니다. 기능 추가는 별도 브랜치에서 진행하고 빌드 검증 후 `main`으로 병합합니다.

---

Built with TypeScript, Phaser, Vite, Node.js and PostgreSQL.
