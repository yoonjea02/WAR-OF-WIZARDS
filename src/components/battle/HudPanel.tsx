import { RULES } from '../../data/rules'
import { SKILL_MAP } from '../../data/skills'
import { defenseTier, takeRatio, type BattleState, type SideState } from '../../lib/battleSim'
import { fmtTime } from '../../lib/format'
import RuneGlyph from '../RuneGlyph'
import SkillIcon from '../SkillIcon'

// Unity MVP 의 바닥 월드 스페이스 HUD 패널: 기울어진 패널에 같은 문구(YOU … ENEMY, T:O N:O | dmg | regen | ATK, Next wave, POS)와 스킬 슬롯.
// 텍스트 규칙은 MVP 화면 그대로 두고, 슬롯에는 마법진·룬·쿨타임·고위력 잔여 횟수를 추가했다.

const atkMul = (sd: SideState, phase: number) => sd.permMul * (1 + phase * RULES.phase.atkBoost)
const flag = (alive: boolean) => (alive ? 'O' : 'X')

function SideLine({ label, sd, phase, left }: { label: string; sd: SideState; phase: number; left: boolean }) {
  const regen = defenseTier(sd) < 2
  return (
    <div className={`text-[15px] font-[Rajdhani] font-semibold text-slate-200 whitespace-nowrap ${left ? 'text-left' : 'text-right'}`}>
      {label} T:{flag(sd.tower > 0)} N:{flag(sd.nexus > 0)} | dmg {Math.round(takeRatio(sd) * 100)}% |{' '}
      <span style={{ color: regen ? '#86efac' : '#fca5a5' }}>{regen ? 'regen' : 'no-regen'}</span> | ATK x{atkMul(sd, phase).toFixed(2)}
    </div>
  )
}

function chips(sd: SideState, isMe: boolean) {
  const out: { label: string; color: string }[] = []
  if (isMe) {
    if (sd.focus) out.push({ label: '집중', color: '#facc15' })
    if (sd.shield > 0) out.push({ label: `쉴드 ${Math.ceil(sd.shield)}·${Math.ceil(sd.shieldT)}s`, color: '#22d3ee' })
    if (sd.reflectT > 0) out.push({ label: `반사 ${Math.ceil(sd.reflectT)}s`, color: '#2dd4bf' })
    if (sd.rageT > 0) out.push({ label: `분노 ${Math.ceil(sd.rageT)}s`, color: '#ef4444' })
    if (sd.towerBuffT > 0) out.push({ label: `타워버프 ${Math.ceil(sd.towerBuffT)}s`, color: '#c4b5fd' })
    if (sd.turretT > 0) out.push({ label: `터렛 ${Math.ceil(sd.turretT)}s`, color: '#94a3b8' })
    if (sd.summonTowerT > 0) out.push({ label: `소환탑 ${Math.ceil(sd.summonTowerT)}s`, color: '#a78bfa' })
  }
  if (sd.smokeT > 0) out.push({ label: `연막 ${Math.ceil(sd.smokeT)}s`, color: '#cbd5e1' })
  if (sd.frozenT > 0) out.push({ label: `프리즈 ${Math.ceil(sd.frozenT)}s`, color: '#7dd3fc' })
  return out
}

function Slot({ i, id, cd, cdMax, uses, active, onClick }: { i: number; id: string; cd: number; cdMax: number; uses: number; active: boolean; onClick: () => void }) {
  const k = SKILL_MAP[id]
  const spent = uses <= 0
  const ready = cd <= 0 && !spent
  return (
    <button
      onClick={onClick}
      aria-label={`${i + 1}번 ${k.name}`}
      className="relative h-[60px] rounded-md border-2 flex items-center gap-2.5 px-2 overflow-hidden text-left transition-colors"
      style={{
        background: spent ? '#26242c' : ready ? 'linear-gradient(#0f6b3a,#094a28)' : '#2a2433',
        borderColor: active ? '#67e8f9' : spent ? '#3b3844' : ready ? '#22c55e' : '#4b4458',
        boxShadow: active ? '0 0 14px rgba(103,232,249,.8)' : 'none',
        cursor: ready ? 'pointer' : 'not-allowed',
        filter: spent ? 'grayscale(1)' : 'none',
      }}
    >
      <SkillIcon skill={k} size={40} active={ready} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-[12px] font-[Rajdhani] font-bold tracking-wide" style={{ color: ready ? '#bbf7d0' : '#9d93b0' }}>{i + 1}. {id}</div>
        <div className="text-[16px] font-[Cinzel] font-bold truncate" style={{ color: ready ? '#fef08a' : '#8b829c' }}>{k.name}</div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <RuneGlyph id={id} size={22} color={ready ? '#e8e4ff' : '#6b6a8a'} />
        {Number.isFinite(uses) && (
          <div className="flex gap-1">
            {Array.from({ length: RULES.highUsesPerGame }, (_, n) => (
              <span key={n} className="w-2 h-2 rounded-full" style={{ background: n < uses ? '#fbbf24' : 'rgba(255,255,255,.18)' }} />
            ))}
          </div>
        )}
      </div>
      {cd > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55" style={{ clipPath: `inset(${100 - Math.min(100, (cd / cdMax) * 100)}% 0 0 0)` }} />
      )}
      {cd > 0 && <span className="absolute right-2 top-1 font-[Cinzel] font-black text-xl text-white" style={{ textShadow: '0 0 6px #000' }}>{Math.ceil(cd)}</span>}
      {spent && <div className="absolute inset-0 flex items-center justify-center bg-black/55 font-[Cinzel] font-bold text-sm text-purple-200">소진</div>}
    </button>
  )
}

export default function HudPanel({ sim, aimSlot, onSlot, myName }: { sim: BattleState; aimSlot: number | null; onSlot: (i: number) => void; myName: string }) {
  const { me, foe } = sim
  const phaseIn = RULES.phase.interval - (sim.t % RULES.phase.interval)
  const waveIn = Math.max(0, Math.ceil(sim.nextWaveAt - sim.t))
  const mine = chips(me, true), theirs = chips(foe, false)
  const col = me.col
  return (
    <div
      className="absolute"
      style={{
        left: 150, bottom: 2, width: 980, transformOrigin: '50% 100%',
        transform: 'perspective(1100px) rotateX(56deg) rotateZ(-2deg)',
      }}
    >
      <div className="rounded-xl border-2 border-white/15 px-5 py-3 flex flex-col gap-1.5" style={{ background: 'rgba(16,13,26,.88)', boxShadow: '0 12px 40px rgba(0,0,0,.6)' }}>
        <div className="grid grid-cols-3 items-baseline">
          <div className="font-[Rajdhani] font-bold text-[26px] tabular-nums" style={{ color: '#4aa3ff' }}>
            YOU {Math.ceil(me.hp)}/{me.maxHp} <span className="text-[13px] text-slate-400 font-semibold">{myName}</span>
          </div>
          <div className="text-center font-[Rajdhani] font-bold text-[24px] text-white tabular-nums">
            {fmtTime(sim.t)} &nbsp; S{sim.phase} &nbsp; up {fmtTime(phaseIn)}
          </div>
          <div className="text-right font-[Rajdhani] font-bold text-[26px] tabular-nums" style={{ color: '#ff5252' }}>{Math.ceil(foe.hp)}/{foe.maxHp} ENEMY</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SideLine label="YOU" sd={me} phase={sim.phase} left />
          <SideLine label="ENEMY" sd={foe} phase={sim.phase} left={false} />
        </div>
        <div className="grid grid-cols-3 items-center">
          <div className="font-[Rajdhani] font-bold text-[16px]" style={{ color: '#fde047' }}>Next wave {waveIn}s</div>
          <div className="text-center font-[Rajdhani] font-bold text-[18px] text-white tracking-wider">
            POS {col === 0 ? '[L]' : 'L'} {col === 1 ? '[C]' : 'C'} {col === 2 ? '[R]' : 'R'}
          </div>
          <div className="text-right font-[Rajdhani] font-semibold text-[15px] text-slate-300">Units {Math.round(me.minions)} : {Math.round(foe.minions)}</div>
        </div>
        <div className="flex items-center justify-between gap-3 min-h-[22px]">
          <div className="flex gap-1.5 flex-wrap">{mine.map(c => <span key={c.label} className="px-2 py-0.5 rounded text-[12px] font-[Rajdhani] font-bold border" style={{ color: c.color, borderColor: `${c.color}77`, background: `${c.color}1f` }}>{c.label}</span>)}</div>
          <div className="flex gap-1.5 flex-wrap justify-end">{theirs.map(c => <span key={c.label} className="px-2 py-0.5 rounded text-[12px] font-[Rajdhani] font-bold border" style={{ color: c.color, borderColor: `${c.color}77`, background: `${c.color}1f` }}>적 {c.label}</span>)}</div>
        </div>
        <div className="grid grid-cols-4 gap-2 pt-1">
          {sim.deck.map((id, i) => (
            <Slot key={i} i={i} id={id} cd={sim.cd[i]} cdMax={sim.cdMax[i]} uses={sim.uses[i]} active={aimSlot === i} onClick={() => onSlot(i)} />
          ))}
        </div>
      </div>
    </div>
  )
}
