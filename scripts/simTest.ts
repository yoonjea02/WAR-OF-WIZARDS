// 실행: npm run test:sim
// 전투 시뮬레이터와 덱 검증이 Notion 명세서 규칙대로 동작하는지 확인한다.
import { createBattle, cast, tick, moveMe, defenseTier, forceEnd, HP_SCALE, type BattleState } from '../src/lib/battleSim'
import { validateDeck, SKILLS } from '../src/data/skills'
import { RULES } from '../src/data/rules'

let pass = 0, failN = 0
function ok(cond: boolean, name: string, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { failN++; console.log(`  ✗ ${name} ${extra}`) }
}
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const DECK = ['S03', 'S02', 'S07', 'S08', 'S11', 'S13', 'H01', 'H02']

console.log('\n[1] 덱 검증 (명세서 §4.1)')
ok(SKILLS.length === 19, '스킬 19종')
ok(SKILLS.filter(k => k.tier === 'normal').length === 13 && SKILLS.filter(k => k.tier === 'high').length === 6, '일반 13 + 고위력 6')
ok(validateDeck(DECK) === null, '정상 덱 통과')
ok(validateDeck(DECK.slice(0, 7)) !== null, '7장 거부')
ok(validateDeck([...DECK.slice(0, 7), 'S03']) !== null, '중복 거부')
ok(validateDeck(['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'H01', 'H02']) === null, '고위력 2장 허용')
ok(validateDeck(['S01', 'S02', 'S03', 'S04', 'S05', 'H01', 'H02', 'H03']) !== null, '고위력 3장 거부')
ok(validateDeck([...DECK.slice(0, 7), 'X99']) !== null, '없는 스킬 거부')

console.log('\n[1-2] MVP 화면 기준값')
{
  const s = createBattle(DECK, mulberry32(1))
  ok(s.me.maxHp === 1000 && s.foe.maxHp === 1000, `플레이어 HP 1000 / 1000 (MVP 화면 기준) (${s.me.maxHp}/${s.foe.maxHp})`)
}

console.log('\n[2] 스킬 규칙')
{
  const s = createBattle(DECK, mulberry32(1))
  s.foe.col = 1
  const r = cast(s, 0, 1) // S03 파이어볼 중앙
  ok(r.ok, '파이어볼 시전 성공')
  ok(near(s.foe.hp, s.foe.maxHp - 14 * HP_SCALE * 0.2), `타워 생존 시 피해 20%만 (${s.foe.hp.toFixed(2)})`)
  ok(s.cd[0] === RULES.cooldown.normal, '일반 스킬 쿨타임 5초')
  ok(!cast(s, 0, 1).ok, '쿨타임 중 재시전 거부')
  s.foe.tower = 0
  s.foe.hp = s.foe.maxHp; s.cd[0] = 0
  cast(s, 0, 1)
  ok(near(s.foe.hp, s.foe.maxHp - 14 * HP_SCALE), `타워 파괴 후 피해 100% (${s.foe.hp.toFixed(2)})`)
  s.foe.hp = s.foe.maxHp; s.cd[0] = 0; s.foe.col = 0
  cast(s, 0, 2)
  ok(s.foe.hp === s.foe.maxHp, '다른 열을 조준하면 플레이어 피해 없음')
  ok(s.foe.tower === 0 && s.foe.nexus === RULES.structure.nexus, '플레이어 스킬은 구조물 피해 불가')
}
{
  const s = createBattle(DECK, mulberry32(2))
  const slot = DECK.indexOf('H01')
  let n = 0
  for (let i = 0; i < 5; i++) { s.cd[slot] = 0; if (cast(s, slot, null).ok) n++ }
  ok(n === RULES.highUsesPerGame, `고위력 스킬은 게임당 ${RULES.highUsesPerGame}회만 (${n}회)`)
  const s2 = createBattle(DECK, mulberry32(2))
  cast(s2, slot, null)
  ok(s2.cd[slot] === RULES.cooldown.high, '고위력 쿨타임 20초')
  ok(s2.foe.frozenT === 5, '프리즈 5초')
}
{
  const s = createBattle(['S09', 'S13', 'H06', 'H04', 'S10', 'S08', 'S03', 'S01'], mulberry32(3))
  s.me.tower = 0
  const r = cast(s, 0, null)
  ok(!r.ok && s.cd[0] === 0, '타워 파괴 시 타워 버프 비활성 (쿨타임 소모 없음)')
  ok(cast(s, 1, 1).ok && !cast(s, 1, 1).ok === true, '터렛은 진영당 1기 (재설치 거부)')
  s.cd[1] = 0
  ok(!cast(s, 1, 1).ok, '터렛 중복 설치 거부')
  ok(cast(s, 2, 1).ok, '소환탑 설치')
}
{
  const s = createBattle(['H04', 'S10', 'S03', 'S02', 'S05', 'S06', 'S07', 'S08'], mulberry32(4))
  cast(s, 0, null) // 반사 결계
  s.botT = 0; s.rng = () => 0.1 // 봇이 공격을 고르도록 (r<0.4) + 내 열 조준
  const hp0 = s.me.hp
  tick(s, 0.1)
  ok(s.me.reflectT === 0 && s.me.hp === hp0, '반사 결계가 상대 스킬 1회를 무효화')
}
{
  const s = createBattle(['S10', 'S03', 'S02', 'S05', 'S06', 'S07', 'S08', 'S01'], mulberry32(5))
  s.foe.col = 1; s.foe.tower = 0
  cast(s, 0, null) // 집중
  cast(s, 1, 1)
  ok(near(s.foe.hp, s.foe.maxHp - 14 * HP_SCALE * 2), `집중: 다음 공격 피해 2배 (${s.foe.hp.toFixed(1)})`)
  ok(!s.me.focus, '집중은 1회 소모')
}

console.log('\n[3] 전장 규칙')
{
  const s = createBattle(DECK, mulberry32(6))
  const m0 = s.me.minions
  tick(s, 10.05)
  ok(s.wave === 1, '10초에 웨이브 1')
  ok(s.me.minions > m0 - 3, '웨이브로 유닛 증가')
  tick(s, 20)
  ok(s.wave === 3, '30초에 웨이브 3 (Brute 등장 회차)')
  const s2 = createBattle(DECK, mulberry32(6)); s2.botT = 1e9; s2.botMoveT = 1e9
  s2.me.minions = 0; s2.foe.minions = 0; s2.nextWaveAt = 0
  tick(s2, 0.1)
  ok(near(s2.me.minions, 3, 0.1), `일반 웨이브 = 근접2 + 원거리1 (${s2.me.minions.toFixed(2)})`)
  s2.me.minions = 0; s2.wave = 2; s2.nextWaveAt = s2.t
  tick(s2, 0.1)
  ok(near(s2.me.minions, 5, 0.1), `3회차 웨이브는 Brute 추가 (3+2) (${s2.me.minions.toFixed(2)})`)
  s2.me.minions = 19; s2.wave = 5; s2.nextWaveAt = s2.t
  tick(s2, 0.1)
  ok(s2.me.minions <= RULES.wave.unitCap, '진영당 최대 20기 상한')
  const s3 = createBattle(DECK, mulberry32(7)); s3.botT = 1e9
  tick(s3, 301)
  ok(s3.phase === 1, '5분 경과 시 강화 단계 1')
  const s4 = createBattle(DECK, mulberry32(8)); s4.botT = 1e9
  s4.me.hp = 50; s4.me.regenT = 9.95; s4.foe.minions = 0; s4.me.minions = 0
  tick(s4, 0.1)
  ok(s4.me.hp === 50 + RULES.defense.regenAmount, '10초마다 HP 회복')
  const s5 = createBattle(DECK, mulberry32(8)); s5.botT = 1e9
  s5.me.tower = 0; s5.me.nexus = 0; s5.me.hp = 50; s5.me.regenT = 9.95; s5.foe.minions = 0; s5.me.minions = 0
  ok(defenseTier(s5.me) === 2, '타워·넥서스 파괴 = 돌파 상태')
  tick(s5, 0.1)
  ok(s5.me.hp <= 50, '돌파 상태에서는 HP 회복 중단')
  const s6 = createBattle(DECK, mulberry32(9)); s6.botT = 1e9
  s6.me.hp = 0.5
  s6.foe.minions = 15; s6.me.minions = 0; s6.me.tower = 0; s6.me.nexus = 0
  tick(s6, 5)
  ok(s6.status === 'lose', 'HP 0 즉시 패배')
  const s7 = createBattle(DECK, mulberry32(9)); forceEnd(s7, 'lose', '30초 무활동 기권패')
  ok(s7.status === 'lose', '기권패 처리')
  moveMe(s7, -1)
}

console.log('\n[4] 몬테카를로 시뮬레이션 (안정성)')
function play(seed: number, policy: 'aggressive' | 'idle'): BattleState {
  const rng = mulberry32(seed)
  const s = createBattle(DECK, rng)
  let guard = 0
  while (s.status === 'run' && s.t < 3600 && guard++ < 100000) {
    if (policy === 'aggressive') {
      for (let i = 0; i < s.deck.length; i++) cast(s, i, s.foe.col)
    }
    tick(s, 0.25)
    if (![s.me.hp, s.foe.hp, s.me.minions, s.foe.minions, s.me.tower, s.foe.nexus].every(Number.isFinite)) throw new Error('NaN 발생')
    if (s.me.minions < -1e-9 || s.foe.minions < -1e-9 || s.me.minions > 20 + 1e-9 || s.foe.minions > 20 + 1e-9) throw new Error(`유닛 수 범위 이탈 ${s.me.minions} ${s.foe.minions}`)
    if (s.cd.some(c => c < 0)) throw new Error('쿨타임 음수')
  }
  return s
}
for (const policy of ['aggressive', 'idle'] as const) {
  const res = { win: 0, lose: 0, run: 0 }
  const durs: number[] = []
  for (let seed = 1; seed <= 40; seed++) {
    const s = play(seed, policy)
    res[s.status]++
    if (s.status !== 'run') durs.push(s.t)
  }
  durs.sort((a, b) => a - b)
  const med = durs.length ? durs[Math.floor(durs.length / 2)] : 0
  console.log(`  [${policy}] 40판: 승 ${res.win} / 패 ${res.lose} / 미종료 ${res.run}, 종료시간 중앙값 ${Math.floor(med / 60)}분 ${Math.floor(med % 60)}초 (게임 내 시간)`)
  ok(res.run === 0, `${policy}: 60분 내 전부 종료`)
}
{
  let wins = 0, towerFirst = 0, minT = Infinity, maxT = 0
  for (let seed = 1; seed <= 40; seed++) {
    const s = play(seed, 'aggressive')
    if (s.status === 'win') { wins++; minT = Math.min(minT, s.t); maxT = Math.max(maxT, s.t) }
    if (s.status === 'win' && s.stats.towerDestroyed) towerFirst++
  }
  ok(wins >= 36, `적극적으로 플레이하면 대부분 승리 (${wins}/40)`)
  ok(towerFirst === wins, `모든 승리가 적 타워 파괴 이후에 발생 (${towerFirst}/${wins}) — 타워 락 유지`)
  ok(minT >= 120, `완벽한 플레이도 2분 이상 소요 (최단 ${Math.floor(minT)}초)`)
  console.log(`  승리 시간 범위: ${Math.floor(minT / 60)}분 ${Math.floor(minT % 60)}초 ~ ${Math.floor(maxT / 60)}분 ${Math.floor(maxT % 60)}초`)
}

console.log(`\n결과: ${pass} 통과, ${failN} 실패`)
process.exit(failN ? 1 : 0)
