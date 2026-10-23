// ── 게임 규칙 상수 (Notion 기능명세서 기준) ──────────────────────────────
// [명세]  = 명세서에 수치가 명시된 값
// [TBD]   = 명세서에 수치가 없어 프로토타입용으로 임의로 둔 값. ㅈㅈㅇ(서버)·밸런스 회의에서 확정 필요.

export const RULES = {
  highUsesPerGame: 3,                                   // [명세] 고위력 스킬별 게임당 3회
  cooldown: { normal: 5, high: 20 },                    // [명세] 서버 시전 확정 시점부터 (초)

  wave: { interval: 10, melee: 2, ranged: 1, bruteEvery: 3, brute: 1, unitCap: 20 }, // [명세]

  defense: {
    towerAliveTakeRatio: 0.2,                           // [명세] 타워 생존 시 상대 스킬 피해 20%만
    regenInterval: 10,                                  // [명세] 10초마다 플레이어 HP 회복
    regenAmount: 33,                                    // [TBD] HP 1000 기준 3.3% (이전 HP 600 에서 검증한 비율 유지) — 타워 락 상태에서는 회복이 딜을 상쇄해야 함
  },
  permBuff: { towerBreak: 0.2, nexusBreak: 0.4 },       // [명세] 적 타워 파괴 +20%, 적 넥서스 파괴 +40% (영구)
  phase: { interval: 300, cooldownCut: 0.1, atkBoost: 0.1 }, // [명세] 5분마다 강화 / [TBD] 감소·증가 폭
  afk: { warnAfter: 20, loseAfter: 30 },                // [명세] 30초 무활동 기권패 (20초부터 경고)
  aimTimeout: 5,                                        // [명세] 조준 중 5초 무입력 시 자동 취소
  holdToAim: 1,                                         // [명세] 1초 포인팅 유지 후 시전 (프로토타입은 클릭으로 대체)

  queue: { botTimeout: 15 },                            // [TBD] 실서비스 값은 서버 정책 (프로토타입은 데모용 15초)
  countdown: 3,                                         // [명세] 시작 카운트다운 3-2-1

  player: { maxHp: 1000 },                              // [MVP] Unity MVP 화면 'YOU 1000/1000 · 1000/1000 ENEMY' 값. 밸런스 기준 HP (스킬 피해는 battleSim 의 HP_SCALE 로 같은 비율 보정)
  structure: { tower: 300, nexus: 500 },                // [TBD]
} as const

export type Column = 0 | 1 | 2
export const COLUMN_LABEL = ['좌', '중', '우'] as const
