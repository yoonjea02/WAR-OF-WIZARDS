// Notion 명세서 §7 "13종 UI 캔버스" 와 화면 ID 매핑
export type Screen =
  | 'login' | 'signup'   // 1. 로그인/회원가입
  | 'lobby'              // 2. 메인 로비
  | 'mypage'             // 3. 마이페이지
  | 'settings'           // 4. 환경설정
  | 'friends'            // 5. 친구 목록
  | 'room'               // 6. 친선전 룸
  | 'mailbox'            // 7. 우편함/공지
  | 'ranking'            // 8. 랭킹
  | 'spellbook'          // 9. 마법서
  | 'queue'              // 10. 매칭 대기 큐
  | 'countdown'          // 11. 매치 카운트다운
  | 'battle'             // 12. 인게임 전투 HUD
  | 'result'             // 13. 결과 화면

export const CANVASES: { no: number; id: Screen; label: string; group: 'meta' | 'social' | 'match' | 'ingame' }[] = [
  { no: 1,  id: 'login',     label: '로그인/가입', group: 'meta' },
  { no: 2,  id: 'lobby',     label: '메인 로비',   group: 'meta' },
  { no: 3,  id: 'mypage',    label: '마이페이지',  group: 'meta' },
  { no: 4,  id: 'settings',  label: '환경설정',    group: 'meta' },
  { no: 5,  id: 'friends',   label: '친구',        group: 'social' },
  { no: 6,  id: 'room',      label: '친선전 룸',   group: 'social' },
  { no: 7,  id: 'mailbox',   label: '우편/공지',   group: 'social' },
  { no: 8,  id: 'ranking',   label: '랭킹',        group: 'social' },
  { no: 9,  id: 'spellbook', label: '마법서',      group: 'match' },
  { no: 10, id: 'queue',     label: '매칭 대기',   group: 'match' },
  { no: 11, id: 'countdown', label: '카운트다운',  group: 'match' },
  { no: 12, id: 'battle',    label: '전투 HUD',    group: 'ingame' },
  { no: 13, id: 'result',    label: '결과',        group: 'ingame' },
]
