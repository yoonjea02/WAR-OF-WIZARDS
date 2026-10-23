import { SKILL_MAP } from '../../data/skills'

// 시전 시각 효과 (장면 위에 잠깐 그려지는 연출). 판정과 무관한 순수 시각 요소다.
export type FxKind = 'bolt' | 'ring' | 'strike' | 'flash' | 'beam' | 'global'
export interface Fx {
  id: number
  kind: FxKind
  col: number          // 대상 레인 (0~2)
  born: number         // Date.now() 기준 생성 시각
  delay: number        // ms — 생성 후 이 시간이 지나야 보이기 시작
  dur: number          // ms
  color: string
  size: number         // 임팩트 반경(레인 폭 기준)
  at: 'foe' | 'me'     // 효과가 놓이는 진영
}

let seq = 0
const mk = (kind: FxKind, col: number, color: string, o: Partial<Fx> = {}): Fx => ({
  id: ++seq, kind, col, born: Date.now(), delay: 0, dur: 650, color, size: 0.5, at: 'foe', ...o,
})

/** 스킬 시전 시 생성할 이펙트 목록 */
export function fxForCast(skillId: string, col: number | null): Fx[] {
  const k = SKILL_MAP[skillId]
  if (!k) return []
  const c = col ?? 1
  switch (skillId) {
    case 'S01': return [mk('bolt', c, k.color, { dur: 520 }), mk('ring', c, k.color, { delay: 520, size: 0.5 })]
    case 'S02': return [mk('ring', c, k.color, { delay: 300, dur: 900, size: 0.75 })]
    case 'S03': return [mk('bolt', c, k.color, { dur: 480 }), mk('ring', c, k.color, { delay: 480, size: 0.55 })]
    case 'S04': return [mk('ring', c, k.color, { dur: 800, size: 1.1 })]
    case 'S05': return [mk('bolt', c, k.color, { dur: 560 }), mk('ring', c, k.color, { delay: 560, size: 0.6 })]
    case 'S06': return [mk('strike', c, k.color, { dur: 380 }), mk('ring', c, k.color, { delay: 200, size: 0.8 })]
    case 'S07': return [0, 120, 240].map(d => mk('bolt', c, k.color, { delay: d, dur: 380 }))
    case 'H03': return [mk('bolt', c, k.color, { dur: 520 }), mk('ring', c, k.color, { delay: 520, size: 0.5 })]
    case 'H02': return [mk('beam', c, k.color, { delay: 500, dur: 420 })]
    case 'H01': return [mk('global', 1, k.color, { dur: 1100 })]
    case 'S11': case 'S12': return [mk('ring', c, k.color, { dur: 700, size: 0.8, at: 'me' })]
    case 'S13': case 'H06': return [mk('ring', c, k.color, { dur: 800, size: 0.9, at: 'me' }), mk('flash', c, k.color, { dur: 500 })]
    default: return [mk('flash', c, k.color, { dur: 800 })]   // S08 S09 S10 H04 H05 — 버프 계열
  }
}
