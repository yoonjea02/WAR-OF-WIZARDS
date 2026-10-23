# War of Wizards — 아웃게임/메타 UI 프로토타입 (ㅈㅇㅈ 담당)

> **위치**: `Backend/web-client/` (§29: `Backend/` 는 ㅈㅇㅈ 소유). 같은 저장소의 `Backend/wow_server.py` 를 서버로 씁니다.
> - 서버 연동 현황: `docs/서버_연동_현황.md`
> - 구글 로그인 설정·실행: `docs/서버_구글로그인_연동.md`
> - 서버 없이도 `.env` 를 만들지 않으면 Mock 모드로 전 기능을 시연할 수 있습니다.


Notion 기능명세서 `[기능명세서] Project Spellbound VR` 기준으로 만든 **13종 UI 캔버스 + 전투 HUD + 서버(`wow_server.py`) 연동** 프로토타입입니다. (Supabase 방식은 보류)
React 웹 프로토타입이며, Unity(Quest 3) World Space Canvas 로 옮길 때의 레이아웃/데이터 흐름 기준으로 사용합니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:8443  (vite.config.ts 의 PORT 기본값)
```

- Windows PowerShell 에서 `npm` 이 막히면 한 번만: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- 로그인 화면의 **"데모 계정으로 바로 시작"** 을 누르면 바로 로비로 들어갑니다. (`demo@wow.dev` / `demo1234`)
- 좌상단 **☰ DEV** 버튼으로 13개 캔버스로 바로 이동할 수 있습니다.
- 전투 화면 우상단의 **DEV·QA 패널**(개발 모드에서만 표시): 배속(×5, ×20) / AFK 경고 / 연결 끊김 / 강제 승리

## 테스트

```bash
npm test           # 아래 3개를 순서대로 실행
npm run test:sim   # 전투 규칙 시뮬레이터 (43개)
npm run test:api   # Mock API: 인증·덱·전적·랭킹·친구·우편·닉네임 변경·스키마 가드 (46개)
npm run test:ui    # 화면 클릭 흐름 · 스킬 아트 · 전투 장면 좌표 · 실제 서버 연동 · 구글 로그인 · 닉네임 설정 (51개 — 서버 파일이 있으면 `wow_server.py` 를 임시 DB 로 띄워 검증)
npm run typecheck
```

## 백엔드: Mock ↔ Supabase

`.env` 가 없으면 **Mock 모드**(브라우저 localStorage)로 동작하고, 있으면 **Supabase** 로 자동 전환됩니다.

1. Supabase 프로젝트 생성 (무료 티어)
2. **SQL Editor** 에 `supabase/schema.sql` 전체를 붙여넣고 Run
   - 테이블: `profiles` `decks` `matches` `friendships` `mails` `notices`
   - RLS 전 테이블 적용, 덱 규칙(8장·중복 불가·고위력 ≤2) DB 트리거로 강제, 가입 시 프로필/환영 우편 자동 생성
3. **Authentication → Providers → Email**: 개발 중에는 "Confirm email" 을 끄면 가입 즉시 로그인됩니다. (켜두면 인증 메일 안내 후 로그인 화면으로 이동)
4. `.env.example` 을 `.env` 로 복사하고 **Project Settings → API** 의 URL / anon key 입력 후 `npm run dev` 재시작
5. (선택) **Google 로그인**: `docs/GOOGLE_로그인_설정.md` 순서대로 (구글 클라이언트 생성 → Supabase 에 Client ID/Secret 입력 → Redirect URLs 등록)

## 13종 캔버스 ↔ 화면

| # | 캔버스 | 파일 | 사용하는 데이터 |
|---|---|---|---|
| 1 | 로그인/회원가입 | `LoginScreen` `SignUpScreen` | Auth, 닉네임 중복 확인 |
| 2 | 메인 로비 | `LobbyScreen` | 프로필, 덱 상태, 우편 미확인 수, 친구 접속 수 |
| 3 | 마이페이지 (전적/승률) | `MyPageScreen` | `matches`, `profiles` |
| 4 | 환경설정 | `SettingsScreen` | 로컬 저장 (`wow.settings.v1`) |
| 5 | 친구 목록 (상태/초대) | `FriendsScreen` | `friendships`, Realtime Presence |
| 6 | 친선전 룸 (방 생성/코드 입장/봇 채우기) | `RoomScreen` | 룸 코드, `mails`(초대) |
| 7 | 우편함/공지 | `MailboxScreen` | `mails`, `notices` |
| 8 | 랭킹 | `RankingScreen` | `profiles` (레이팅순) |
| 9 | 마법서 (19종 중 8장) | `SpellbookScreen` | `decks` |
| 10 | 매칭 대기 큐 (초과 시 봇 매칭) | `QueueScreen` | — |
| 11 | 매치 카운트다운 | `CountdownScreen` | — |
| 12 | 인게임 전투 HUD | `BattleScreen` + `lib/battleSim.ts` | — |
| 13 | 결과 화면 | `ResultScreen` | `record_match()` |

화면 흐름: `로그인 → 로비 → (마법서) → 랭킹전 큐 / 친선전 룸 / 봇 연습전 → 카운트다운 → 전투 → 결과 → 로비`

## 명세서 반영 현황

**구현됨**
- 스킬 19종(일반 13 + 고위력 6), 덱 19종 중 8장, 고위력 덱 내 최대 2장, 중복 불가 (클라이언트 + DB 트리거 양쪽 검증)
- 전투 HUD: 8슬롯 고정(2줄×4칸, 순환 없음), 쿨타임 일반 5초/고위력 20초, 고위력 게임당 3회, 방어 계층(20% / 100% / 돌파 시 회복 중단), 진영 배율(+20% / +40%), 5분 강화 단계, 웨이브 10초·3회차 Brute·최대 20기, 상태 효과, 시전 상태 머신 6단계, 조준 5초 무입력 자동 취소, AFK 20초 경고 → 30초 기권패, 사망 즉시 패배
- 플레이어 스킬은 구조물(타워/넥서스) 타격 불가, 유닛이 구조물을 공격하고 넥서스 파괴 후에만 플레이어 직접 공격
- 로비/메타 캔버스 전부 + Supabase Auth · 덱 · 전적 · 랭킹 · 친구 · 우편 · 공지 · 초대 · 접속 상태 · RLS

**프로토타입에서 대체한 것** (실제 구현은 다른 파트/Unity)
- 전투 판정은 로컬 시뮬레이터. 실제는 Photon 전용 서버(ㅈㅈㅇ)가 권위 판정 — 스킬 데미지/유닛 수치는 화면 확인용 임시값
- 룬 드로잉($P+)·핀치·포인팅·Hand Ray·스냅 이동 → 클릭/키보드(1~8, ←/→, Q/W/E, Esc)로 대체 (ㅊㄱㅇ)
- 친선전 룸 입장/게스트 참가는 시뮬레이션. 실제는 Photon 세션 (코드 = 세션명)
- 전적 기록(`record_match`)은 클라이언트가 결과를 신고하는 구조. **실서비스에서는 전용 서버가 service_role 로 기록**해야 조작을 막을 수 있음

**확정 필요한 수치 `[TBD]`** — 명세서에 수치가 없어 임시로 둔 값은 모두 `src/data/rules.ts` 에 표시되어 있습니다.
플레이어 HP는 MVP 화면 기준 1000(`[MVP]`), HP 회복량(33), 타워/넥서스 체력(300/500), 5분 강화 폭(쿨타임 -10%·공격력 +10%), 스킬별 피해량(`lib/battleSim.ts`), 매칭 큐 타임아웃(데모 15초)

**하지 못한 것 / 검증하지 못한 것**
- Unity 캔버스 제작 (이 프로젝트는 React 웹 프로토타입)
- 실제 Supabase 프로젝트 연결 검증: SQL 문법은 파서로 검사했지만 실서버에 실행하지는 못했습니다. 처음 적용할 때 SQL Editor 오류 메시지가 나오면 알려주세요.
- 브라우저에서의 시각 확인: 자동 테스트는 DOM 동작 기준입니다. 전투 HUD는 **1280×720 이상**을 기준으로 잡았습니다.

## Unity 이식 메모

- 로비/메타 캔버스: World Space Canvas + Hand Ray 조작, 전투 진입 시 UI Ray 비활성화 (명세서 §7)
- 글자는 크게, 버튼은 크고 간격 넓게 — 현재 `Shell` 의 헤더/본문/푸터 3분할 구조를 그대로 캔버스 템플릿으로 사용 가능
- 전투 HUD 8슬롯은 손목/전방 고정 패널 (2×4). 슬롯 순서 = 마법서 저장 순서 = 단축키 1~8
- 데이터 모양은 `src/lib/types.ts` 와 `supabase/schema.sql` 이 동일 — Unity 쪽 API 클라이언트의 DTO 기준으로 사용

## 스킬 아트 (그림 → 스킬 페이지 기준)

- `src/assets/skills/circle/S01~H06.png`: 마법진 (마법서·HUD 슬롯)
- `src/assets/skills/rune/S01~H06.png`: 플레이어가 그려야 할 룬 (흰 획 + 투명 배경 → 스킬 색으로 칠함)
- 그림이 바뀌면 **같은 파일명으로 덮어쓰기**만 하면 됩니다. 파일이 없는 스킬은 기본 도형 아이콘으로 대체됩니다.
- 단일 HTML 데모 재빌드: `npm run build:demo` → `dist-single/war-of-wizards-demo.html`
- MVP 반영 상세·확인 필요 사항: `docs/MVP_반영_결과물.md`
- 전투 화면: `screens/BattleScreen.tsx` + `components/battle/`(장면·손·HUD 패널) + `lib/scene.ts`(원근 좌표). 조준은 레인 위 1초 유지 시 시전, 클릭·Q/W/E 는 즉시 시전

## 이전 버전에서 바뀐 점

- v3 의 40종 스킬 / 4슬롯 순환 / 밴픽 화면은 Notion 명세서(19종 · 8슬롯 고정)와 달라 제거했습니다.
- 명세서의 13개 캔버스에 없는 튜토리얼/룬 캐스팅/타게팅 시연 화면도 제거했습니다. (`War_of_Wizards_UI_v3.zip` 에 그대로 남아 있습니다.)
