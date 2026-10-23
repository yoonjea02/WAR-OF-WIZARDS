// ── 스킬 19종 (Notion 기능명세서 §4 기준) ─────────────────────────────────
// 일반 13종(S01~S13, 쿨타임 5초) + 고위력 6종(H01~H06, 쿨타임 20초, 게임당 3회)
// 덱: 19종 중 8장, 중복 불가, 고위력은 덱 내 최대 2장.

export type SkillTier = 'normal' | 'high'
export type SkillKind = 'projectile' | 'area' | 'beam' | 'buff' | 'summon' | 'install' | 'global'

export interface SkillData {
  id: string
  name: string
  tier: SkillTier
  kind: SkillKind
  effect: string
  color: string
  glow: string
}

// 명세서 §2.1 조준 모드: 열 지정 / 범위 지정 / 소환 라인 / 설치 구역, 자기·타워·전역은 조준 생략
export const KIND_META: Record<SkillKind, { label: string; aim: string; needsAim: boolean }> = {
  projectile: { label: '투사체', aim: '열 지정',              needsAim: true },
  area:       { label: '범위',   aim: '범위 지정 (열+깊이)',  needsAim: true },
  beam:       { label: '관통 빔', aim: '열 지정',             needsAim: true },
  buff:       { label: '버프',   aim: '즉시 발동',            needsAim: false },
  summon:     { label: '소환',   aim: '소환 라인 (아군)',     needsAim: true },
  install:    { label: '설치',   aim: '설치 구역 (타워·넥서스 앞)', needsAim: true },
  global:     { label: '전역',   aim: '즉시 발동',            needsAim: false },
}

function glowOf(hex: string, a = 0.65): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function s(id: string, name: string, tier: SkillTier, kind: SkillKind, effect: string, color: string): SkillData {
  return { id, name, tier, kind, effect, color, glow: glowOf(color) }
}

export const SKILLS: SkillData[] = [
  // ── 일반 13종 (쿨타임 5초) ──
  s('S01', '연막',       'normal', 'projectile', '적중 시 상대 명중률 감소 및 시야 외곽 안개 부여', '#94a3b8'),
  s('S02', '독 장판',    'normal', 'area',       '구역 내 초당 지속 피해 누적', '#84cc16'),
  s('S03', '파이어볼',   'normal', 'area',       '소범위 집중 즉발 피해', '#f97316'),
  s('S04', '화살 세례',  'normal', 'area',       '광범위 다수 분산 피해', '#fbbf24'),
  s('S05', '토네이도',   'normal', 'projectile', '경로 상 적 유닛 넉백 및 피해', '#67e8f9'),
  s('S06', '번개',       'normal', 'area',       '지정 위치 타격 및 스플래시 피해', '#a78bfa'),
  s('S07', '총난사',     'normal', 'projectile', '열 전방 유닛부터 순차 연사 타격', '#ec4899'),
  s('S08', '방어 쉴드',  'normal', 'buff',       '피해 흡수 쉴드 생성 (피격 없을 시 HP 회복)', '#22d3ee'),
  s('S09', '타워 버프',  'normal', 'buff',       '본인 타워 방어력/공격력 일시 강화 (타워 파괴 시 비활성화)', '#c4b5fd'),
  s('S10', '집중',       'normal', 'buff',       '다음 공격 1회의 명중률 및 공격력 대폭 증가', '#facc15'),
  s('S11', '도끼 전사',  'normal', 'summon',     '근접 공격형 소환수 소환', '#dc2626'),
  s('S12', '드래곤',     'normal', 'summon',     '원거리 공격형 소환수 소환', '#818cf8'),  // 백엔드 통합 안내: 기획서 §14.3 · 게임 SpellDefinition 에 맞춰 "마법사" → "드래곤"
  s('S13', '터렛',       'normal', 'install',    '적 유닛 요격용 고정 포탑 설치 (진영당 1기)', '#71717a'),
  // ── 고위력 6종 (쿨타임 20초, 게임당 3회) ──
  s('H01', '프리즈',     'high', 'global',  '적 전체 미니언 및 소환수 5초간 행동 정지', '#38bdf8'),
  s('H02', '레이저 빔',  'high', 'beam',    '0.5초 예고선 후 열 전체 관통 타격 (유닛 및 끝의 플레이어)', '#e879f9'),
  s('H03', '흡혈',       'high', 'projectile', '적 플레이어/유닛 타격 시 실 피해량 비례 HP 회복', '#be123c'),
  s('H04', '반사 결계',  'high', 'buff',    '상대 플레이어의 스킬 공격 1회 무효화 및 일부 피해 반사', '#2dd4bf'),
  s('H05', '분노',       'high', 'global',  '필드 내 기존 아군 유닛들의 공격력/공격속도 증가', '#ef4444'),
  s('H06', '소환탑',     'high', 'install', '주기적으로 소형 근접 소환수를 생성하는 탑 설치', '#8b5cf6'),
]

export const SKILL_MAP: Record<string, SkillData> = Object.fromEntries(SKILLS.map(k => [k.id, k]))

export function getSkill(id: string): SkillData {
  const k = SKILL_MAP[id]
  if (!k) throw new Error(`알 수 없는 스킬: ${id}`)
  return k
}

export const DECK_SIZE = 8
export const MAX_HIGH_IN_DECK = 2

/** 덱 검증. 문제가 없으면 null, 있으면 사유(한글)를 반환. Supabase 트리거와 동일 규칙. */
export function validateDeck(ids: string[]): string | null {
  if (ids.length !== DECK_SIZE) return `덱은 정확히 ${DECK_SIZE}장이어야 합니다. (현재 ${ids.length}장)`
  if (new Set(ids).size !== ids.length) return '같은 스킬을 중복해서 넣을 수 없습니다.'
  if (ids.some(id => !SKILL_MAP[id])) return '존재하지 않는 스킬이 포함되어 있습니다.'
  const high = ids.filter(id => SKILL_MAP[id].tier === 'high').length
  if (high > MAX_HIGH_IN_DECK) return `고위력 스킬은 덱에 최대 ${MAX_HIGH_IN_DECK}장까지 넣을 수 있습니다.`
  return null
}

// ── 서버/Unity 와의 스킬 번호 변환 ───────────────────────────────────────────
// 백엔드(DeckService.ToSpellIds / ToCodes)는 덱을 코드 문자열("S03", "H02")로 주고받고,
// 게임 쪽 SpellDefinition 은 숫자 id 를 쓴다: S01~S13 ↔ 1~13, H01~H06 ↔ 101~106.
export function codeToSpellId(code: string): number {
  const m = /^([SH])(\d{2})$/.exec(code)
  const n = m ? Number(m[2]) : NaN
  if (!m || !SKILL_MAP[code]) throw new Error(`알 수 없는 스킬 코드: ${code}`)
  return m[1] === 'H' ? 100 + n : n
}

export function spellIdToCode(id: number): string {
  const code = id >= 101 ? `H${String(id - 100).padStart(2, '0')}` : `S${String(id).padStart(2, '0')}`
  if (!Number.isInteger(id) || !SKILL_MAP[code]) throw new Error(`알 수 없는 스킬 번호: ${id}`)
  return code
}

export const deckToSpellIds = (codes: string[]): number[] => codes.map(codeToSpellId)
export const spellIdsToDeck = (ids: number[]): string[] => ids.map(spellIdToCode)
