import type { ReactNode } from 'react'
import { COLUMN_LABEL, RULES, type Column } from '../../data/rules'
import type { BattleState } from '../../lib/battleSim'
import { HORIZON, VH, VW, Z, frontLine, laneX, lanePolygon, layoutUnits, proj } from '../../lib/scene'
import Hand, { type HandPose } from './Hand'
import type { Fx } from './fx'

// ── Unity MVP 화면 구도의 전장 장면 ───────────────────────────────────────────
// 내 타워가 화면 앞쪽, 적 타워·넥서스가 멀리, 맨 끝에 게이트 3개. 카메라는 내 위치(좌/중/우)에 따라 좌우로 이동한다.
// 순수 렌더링 컴포넌트: 판정은 lib/battleSim, 좌표는 lib/scene.

export const HAND_X = 880
export const HAND_Y = 262
export const ORB_REST = { x: 962, y: 150 }

export interface SceneProps {
  sim: BattleState
  camX: number
  foeX: number
  now: number
  fx: Fx[]
  aimSlot: number | null
  hoverCol: Column | null
  holdPct: number
  aimName: string
  pose: HandPose
  armed: boolean
  colorblind: boolean
  onLaneEnter: (c: Column) => void
  onLaneLeave: () => void
  onLanePick: (c: Column) => void
}

const f1 = (n: number) => n.toFixed(1)
const TS = 0.3   // 타워 크기 (월드 단위 배율)
const US = 0.2   // 유닛 크기
const ne = { vectorEffect: 'non-scaling-stroke' } as const

function Tower({ roof, roofDark, destroyed }: { roof: string; roofDark: string; destroyed: boolean }) {
  if (destroyed) {
    return (
      <g>
        <ellipse cx="0" cy="0.03" rx="0.72" ry="0.15" fill="rgba(0,0,0,.3)" />
        <polygon points="-0.55,0 0.55,0 0.38,-0.34 0.12,-0.25 -0.12,-0.46 -0.4,-0.22" fill="#6f5e48" />
        <polygon points="0.12,-0.25 0.42,-0.06 0.6,0 0.24,0" fill="#4d4030" />
        <circle cx="-0.15" cy="-0.7" r="0.2" fill="rgba(70,60,60,.55)" />
        <circle cx="0.12" cy="-0.95" r="0.23" fill="rgba(70,60,60,.4)" />
        <circle cx="-0.05" cy="-1.25" r="0.26" fill="rgba(70,60,60,.28)" />
      </g>
    )
  }
  return (
    <g>
      <ellipse cx="0" cy="0.03" rx="0.74" ry="0.15" fill="rgba(0,0,0,.3)" />
      <polygon points="-0.5,0 0,0 0,-1.1 -0.44,-1.1" fill="#b39d7b" />
      <polygon points="0,0 0.5,0 0.44,-1.1 0,-1.1" fill="#8f7a59" />
      <path d="M-0.48,-0.28H0.48M-0.46,-0.56H0.46M-0.45,-0.84H0.45" stroke="rgba(0,0,0,.22)" strokeWidth="1" {...ne} />
      <rect x="-0.08" y="-0.78" width="0.16" height="0.24" rx="0.08" fill="#2b2530" />
      <path d="M-0.12,0V-0.18a0.12,0.12 0 0 1 0.24,0V0z" fill="#3b2a22" />
      <polygon points="-0.66,-1.1 0.66,-1.1 0.59,-1.34 -0.59,-1.34" fill="#b9453b" stroke="#6e241f" strokeWidth="1" {...ne} />
      <rect x="-0.63" y="-1.15" width="1.26" height="0.05" fill="#f1e6d3" />
      <polygon points="-0.64,-1.34 0,-1.34 0,-1.97" fill={roof} />
      <polygon points="0,-1.34 0.64,-1.34 0,-1.97" fill={roofDark} />
      <circle cx="0" cy="-2.02" r="0.05" fill="#f4c542" />
    </g>
  )
}

function NexusPole({ destroyed, exposed, now }: { destroyed: boolean; exposed: boolean; now: number }) {
  if (destroyed) {
    return <g><ellipse cx="0" cy="0.02" rx="0.4" ry="0.1" fill="rgba(0,0,0,.35)" /><circle cx="0" cy="-0.25" r="0.2" fill="rgba(70,60,60,.5)" /><circle cx="0.05" cy="-0.5" r="0.18" fill="rgba(70,60,60,.32)" /></g>
  }
  const pulse = 0.14 + 0.1 * (0.5 + 0.5 * Math.sin(now / 260))
  return (
    <g>
      {exposed && <circle cx="0" cy="-1" r="0.75" fill={`rgba(255,70,70,${pulse})`} />}
      <ellipse cx="0" cy="0.02" rx="0.3" ry="0.08" fill="rgba(0,0,0,.3)" />
      <rect x="-0.14" y="-1.8" width="0.28" height="1.8" fill="#ece0cc" />
      <rect x="0.03" y="-1.8" width="0.11" height="1.8" fill="#cdbd9f" />
      <polygon points="-0.19,-1.8 0.19,-1.8 0,-2.12" fill="#b9453b" />
    </g>
  )
}

function Gate() {
  return (
    <g>
      <rect x="-0.38" y="-0.56" width="0.76" height="0.07" fill="#4a4a5c" />
      <rect x="-0.38" y="-0.56" width="0.07" height="0.56" fill="#3a3a48" />
      <rect x="0.31" y="-0.56" width="0.07" height="0.56" fill="#3a3a48" />
      <rect x="-0.3" y="-0.49" width="0.6" height="0.49" fill="rgba(20,16,26,.45)" />
    </g>
  )
}

function Unit({ side, frozen, bob }: { side: 'me' | 'foe'; frozen: boolean; bob: number }) {
  const body = side === 'me' ? '#2f9e74' : frozen ? '#76bddb' : '#b3413b'
  const head = side === 'me' ? '#e4c7a5' : '#d8b6a0'
  return (
    <g transform={`translate(0 ${-bob})`}>
      <ellipse cx="0" cy={bob + 0.02} rx="0.16" ry="0.045" fill="rgba(0,0,0,.3)" />
      <rect x="-0.12" y="-0.42" width="0.24" height="0.42" rx="0.1" fill={body} />
      <rect x="-0.13" y="-0.3" width="0.26" height="0.06" fill="rgba(0,0,0,.35)" />
      <circle cx="0" cy="-0.5" r="0.1" fill={head} />
      {side === 'foe' && <path d="M-0.11,-0.5a0.11,0.11 0 0 1 0.22,0z" fill="#5c1f1f" />}
      <line x1="0.14" y1="-0.18" x2="0.27" y2="-0.5" stroke={side === 'me' ? '#d9e6ee' : '#d8d0c8'} strokeWidth="2.4" strokeLinecap="round" {...ne} />
    </g>
  )
}

function Avatar({ frozen, cb }: { frozen: boolean; cb: boolean }) {
  return (
    <g>
      <ellipse cx="0" cy="0.03" rx="0.3" ry="0.07" fill="rgba(0,0,0,.35)" />
      <polygon points="-0.3,0 0.3,0 0.13,-0.9 -0.13,-0.9" fill={frozen ? '#4f8fb0' : '#7f1d1d'} />
      <polygon points="0,0 0.3,0 0.13,-0.9 0,-0.9" fill="rgba(0,0,0,.25)" />
      <circle cx="0" cy="-1" r="0.15" fill={frozen ? '#3e7694' : '#5c1414'} />
      <circle cx="-0.05" cy="-1" r="0.025" fill="#fde047" />
      <circle cx="0.05" cy="-1" r="0.025" fill="#fde047" />
      {cb && <polygon points="0,-1.32 0.08,-1.2 -0.08,-1.2" fill="#fde047" />}
    </g>
  )
}

function Bar({ x, y, w, pct, color }: { x: number; y: number; w: number; pct: number; color: string }) {
  const p = Math.max(0, Math.min(1, pct))
  return (
    <g>
      <rect x={x - w / 2 - 1} y={y - 1} width={w + 2} height="7" rx="2" fill="rgba(0,0,0,.65)" />
      <rect x={x - w / 2} y={y} width={w * p} height="5" rx="1.5" fill={color} />
    </g>
  )
}

function renderFx(fx: Fx, now: number, cam: number): ReactNode {
  const t = now - fx.born - fx.delay
  if (t < 0 || t > fx.dur) return null
  const p = t / fx.dur
  const ez = 1 - (1 - p) * (1 - p)
  const x = laneX(fx.col)
  const zT = fx.at === 'foe' ? Z.aim : 24
  const target = proj(x, zT, cam, 0.35)

  if (fx.kind === 'bolt') {
    const sx = HAND_X + 40, sy = HAND_Y + 20
    const px = sx + (target.x - sx) * ez, py = sy + (target.y - sy) * ez
    const tx = sx + (target.x - sx) * Math.max(0, ez - 0.18), ty = sy + (target.y - sy) * Math.max(0, ez - 0.18)
    const r = 17 - 9 * ez
    return (
      <g key={fx.id}>
        <line x1={tx} y1={ty} x2={px} y2={py} stroke={fx.color} strokeWidth={r * 1.3} strokeLinecap="round" opacity="0.5" />
        <circle cx={px} cy={py} r={r * 1.9} fill={fx.color} opacity="0.3" />
        <circle cx={px} cy={py} r={r} fill={fx.color} />
        <circle cx={px - r * 0.25} cy={py - r * 0.25} r={r * 0.4} fill="#fff" opacity="0.8" />
      </g>
    )
  }
  if (fx.kind === 'ring') {
    const r = target.u * fx.size * (0.18 + 0.5 * ez)
    return (
      <g key={fx.id} opacity={1 - p}>
        <ellipse cx={target.x} cy={target.y + target.u * 0.35} rx={r} ry={r * 0.42} fill={fx.color} opacity="0.28" />
        <ellipse cx={target.x} cy={target.y + target.u * 0.35} rx={r} ry={r * 0.42} fill="none" stroke={fx.color} strokeWidth="4" />
        <ellipse cx={target.x} cy={target.y + target.u * 0.35} rx={r * 0.55} ry={r * 0.23} fill="none" stroke="#fff" strokeWidth="2" opacity="0.7" />
      </g>
    )
  }
  if (fx.kind === 'strike') {
    const top = proj(x, zT, cam, 3.4)
    return (
      <g key={fx.id} opacity={1 - p * 0.7}>
        <polyline points={`${top.x},${top.y - 80} ${top.x - 8},${top.y * 0.6 + target.y * 0.4} ${top.x + 10},${top.y * 0.3 + target.y * 0.7} ${target.x},${target.y}`}
          fill="none" stroke={fx.color} strokeWidth="9" strokeLinejoin="round" opacity="0.4" />
        <polyline points={`${top.x},${top.y - 80} ${top.x - 8},${top.y * 0.6 + target.y * 0.4} ${top.x + 10},${top.y * 0.3 + target.y * 0.7} ${target.x},${target.y}`}
          fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      </g>
    )
  }
  if (fx.kind === 'beam') {
    return <polygon key={fx.id} points={lanePolygon(fx.col, 6, 108, cam, 0.32)} fill={fx.color} opacity={(1 - p) * 0.75} />
  }
  if (fx.kind === 'flash') {
    return <rect key={fx.id} x="0" y="0" width={VW} height={VH} fill={fx.color} opacity={(1 - p) * 0.22} />
  }
  // global (프리즈): 적진 쪽 바닥을 얼린다
  return <polygon key={fx.id} points={`${f1(proj(-2.2, 112, cam).x)},${f1(proj(-2.2, 112, cam).y)} ${f1(proj(2.2, 112, cam).x)},${f1(proj(2.2, 112, cam).y)} ${f1(proj(2.2, 36, cam).x)},${f1(proj(2.2, 36, cam).y)} ${f1(proj(-2.2, 36, cam).x)},${f1(proj(-2.2, 36, cam).y)}`}
    fill={fx.color} opacity={(p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8) * 0.38} />
}

export default function Scene(props: SceneProps) {
  const { sim, camX: cam, foeX, now, fx, aimSlot, hoverCol, holdPct, aimName, pose, armed, colorblind } = props
  const { me, foe } = sim
  const aiming = aimSlot !== null
  const front = frontLine(me.minions, foe.minions)

  const items: { z: number; key: string; node: ReactNode }[] = []
  const at = (x: number, z: number, h = 0) => proj(x, z, cam, h)
  const place = (key: string, x: number, z: number, node: ReactNode, scale = 1) => {
    const p = at(x, z)
    items.push({ z, key, node: <g key={key} transform={`translate(${f1(p.x)} ${f1(p.y)}) scale(${f1(p.u * scale)})`}>{node}</g> })
  }

  // 구조물
  const foeTowerDown = foe.tower <= 0, foeNexusDown = foe.nexus <= 0
  for (const lane of [-1, 0, 1]) place(`gate${lane}`, lane, Z.gates, <Gate />, 0.9)
  place('foeNexus', 0, Z.foeNexus, <NexusPole destroyed={foeNexusDown} exposed={foeTowerDown && !foeNexusDown} now={now} />, 0.66)
  place('foeTower', 0, Z.foeTower, <Tower roof="#cf4a3c" roofDark="#9c3128" destroyed={foeTowerDown} />, TS)
  place('myTower', 0, Z.myTower, <Tower roof="#3a79c4" roofDark="#26578f" destroyed={me.tower <= 0} />, TS)
  if (me.turretT > 0) place('turret', -1.25, 24, <Tower roof="#8a8f9a" roofDark="#5f646e" destroyed={false} />, TS * 0.5)
  if (me.summonTowerT > 0) place('stower', 1.25, 24, <Tower roof="#8b5cf6" roofDark="#5b3aa8" destroyed={false} />, TS * 0.5)

  // 적 플레이어
  place('foeAvatar', foeX, Z.foeAvatar, <Avatar frozen={foe.frozenT > 0} cb={colorblind} />, 0.48)

  // 유닛
  layoutUnits(me.minions, 'me', front).forEach(u => {
    const bob = Math.max(0, Math.sin(now / 170 + u.i * 1.9)) * 0.035
    place(`m${u.i}`, u.x + Math.sin(now / 900 + u.i) * 0.03, u.z, <Unit side="me" frozen={false} bob={bob} />, US)
  })
  layoutUnits(foe.minions, 'foe', front).forEach(u => {
    const frozen = foe.frozenT > 0
    const bob = frozen ? 0 : Math.max(0, Math.sin(now / 170 + u.i * 2.3)) * 0.035
    place(`f${u.i}`, u.x + (frozen ? 0 : Math.sin(now / 900 + u.i) * 0.03), u.z, <Unit side="foe" frozen={frozen} bob={bob} />, US)
  })
  items.sort((a, b) => b.z - a.z)

  // 지속 효과: 독 장판 / 레이저 예고선
  const zones = sim.zones.map((zn, i) => (
    <g key={`z${i}`}>
      <polygon points={lanePolygon(zn.col, 72, 98, cam, 0.46)} fill="rgba(132,204,22,.32)" stroke="rgba(190,242,100,.7)" strokeWidth="2" />
      {[0, 1, 2, 3, 4].map(k => {
        const q = at(laneX(zn.col) + ((k * 37) % 7 - 3) * 0.1, 76 + k * 4.5, 0.05 + ((now / 600 + k * 0.37) % 1) * 0.5)
        return <circle key={k} cx={q.x} cy={q.y} r={Math.max(2, q.u * 0.04)} fill="rgba(217,249,157,.7)" />
      })}
    </g>
  ))
  const beamWarn = sim.beams.map((b, i) => {
    const a = at(laneX(b.col), 14), c = at(laneX(b.col), 106)
    return <line key={`b${i}`} x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="#f0abfc" strokeWidth={3 + 2 * Math.sin(now / 60)} strokeDasharray="14 9" opacity="0.9" />
  })

  // 구조물 체력바 (화면 픽셀 크기)
  const tPos = (x: number, z: number, h: number) => at(x, z, h)
  const foeT = tPos(0, Z.foeTower, -0.06), foeN = tPos(0, Z.foeNexus, 1.52), myT = tPos(0, Z.myTower, -0.06), av = tPos(foeX, Z.foeAvatar, 0.7)
  const bw = (u: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, u * 0.34))

  // 조준 구체 위치
  const orb = aiming && hoverCol !== null ? (() => { const q = at(laneX(hoverCol), Z.aim, 0.55); return { x: q.x, y: q.y } })() : ORB_REST
  const pips = Math.min(5, Math.round(holdPct * 5))

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width={VW} height={VH} className="absolute inset-0" role="img" aria-label="전장">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d5a52" /><stop offset="0.6" stopColor="#e07f4f" /><stop offset="1" stopColor="#f19a5f" />
        </linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b98068" /><stop offset="0.35" stopColor="#8a5f58" /><stop offset="1" stopColor="#4a3138" />
        </linearGradient>
        <radialGradient id="orb" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stopColor="#ffb066" /><stop offset="1" stopColor="#ff5a0a" /></radialGradient>
        <radialGradient id="edgeCyan" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stopColor="rgba(34,211,238,0)" /><stop offset="1" stopColor="rgba(34,211,238,.5)" /></radialGradient>
        <radialGradient id="edgeTeal" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stopColor="rgba(45,212,191,0)" /><stop offset="1" stopColor="rgba(45,212,191,.55)" /></radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>

      {/* 하늘 + 지면 */}
      <rect x="0" y="0" width={VW} height={HORIZON} fill="url(#sky)" />
      <ellipse cx="900" cy={HORIZON} rx="460" ry="60" fill="rgba(255,190,110,.35)" />
      <rect x="0" y={HORIZON} width={VW} height={VH - HORIZON} fill="url(#ground)" />

      {/* 타일 격자 */}
      <g stroke="rgba(255,235,220,.07)" strokeWidth="1">
        {Array.from({ length: 19 }, (_, i) => {
          const a = at(-7, i * 6), b = at(7, i * 6)
          return <line key={`h${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        })}
        {Array.from({ length: 15 }, (_, i) => {
          const x = i - 7
          const a = at(x, -6), b = at(x, 114)
          return <line key={`v${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        })}
      </g>

      {/* 레인 */}
      {[0, 1, 2].map(c => <polygon key={`l${c}`} points={lanePolygon(c, -8, 115, cam)} fill={`rgba(255,238,224,${c === 1 ? 0.12 : 0.08})`} />)}
      <g stroke="rgba(255,240,230,.28)" strokeWidth="2" strokeDasharray="10 8">
        {[-1.5, -0.5, 0.5, 1.5].map(x => {
          const a = at(x, -8), b = at(x, 112)
          return <line key={x} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        })}
      </g>

      {/* 조준 중 레인 강조 (스크린샷의 주황 레인) */}
      {aiming && [0, 1, 2].map(c => (
        <polygon key={`a${c}`} points={lanePolygon(c, -8, 108, cam)}
          fill={hoverCol === c ? 'rgba(255,106,52,.46)' : 'rgba(125,211,252,.1)'}
          stroke={hoverCol === c ? 'rgba(255,170,110,.9)' : 'rgba(125,211,252,.35)'} strokeWidth="2" />
      ))}
      {aiming && hoverCol !== null && (() => {
        const q = at(laneX(hoverCol), Z.aim)
        return (
          <g>
            <ellipse cx={q.x} cy={q.y} rx={q.u * 0.3} ry={q.u * 0.13} fill="rgba(255,120,40,.55)" stroke="#ff9a4d" strokeWidth="3" />
            <ellipse cx={q.x} cy={q.y} rx={q.u * 0.15} ry={q.u * 0.065} fill="none" stroke="#ffe0c2" strokeWidth="2" />
          </g>
        )
      })()}

      {zones}

      {/* 구조물 · 유닛 (먼 것부터) */}
      {items.map(it => it.node)}

      {beamWarn}
      {fx.map(f => renderFx(f, now, cam))}

      {/* 월드 스페이스 체력바 */}
      <Bar x={foeT.x} y={foeT.y + 6} w={bw(foeT.u, 34, 70)} pct={foe.tower / RULES.structure.tower} color="#4ade80" />
      <Bar x={foeN.x} y={foeN.y - 8} w={bw(foeN.u, 30, 60)} pct={foe.nexus / RULES.structure.nexus} color="#a78bfa" />
      <Bar x={myT.x} y={myT.y + 8} w={bw(myT.u, 40, 110)} pct={me.tower / RULES.structure.tower} color="#4ade80" />
      <Bar x={av.x} y={av.y - 38} w={48} pct={foe.hp / foe.maxHp} color="#f87171" />
      <text x={av.x} y={av.y - 43} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fecaca" stroke="rgba(0,0,0,.6)" strokeWidth="3" paintOrder="stroke">ENEMY</text>

      {/* 방어 상태 테두리 */}
      {me.shield > 0 && <rect x="0" y="0" width={VW} height={VH} fill="url(#edgeCyan)" pointerEvents="none" />}
      {me.reflectT > 0 && <rect x="0" y="0" width={VW} height={VH} fill="url(#edgeTeal)" pointerEvents="none" />}

      {/* 조준 구체 + 라벨 */}
      <g>
        <circle cx={orb.x} cy={orb.y} r="30" fill="#ff6a1a" opacity="0.35" filter="url(#glow)" />
        <circle cx={orb.x} cy={orb.y} r="21" fill="url(#orb)" />
        {armed && !aiming && (
          <text x={orb.x} y={orb.y - 36} textAnchor="middle" fontSize="26" fontWeight="700" fill="#ffd9a3" stroke="rgba(120,50,10,.7)" strokeWidth="4" paintOrder="stroke">POINT to aim</text>
        )}
        {aiming && (
          <g>
            <text x={orb.x} y={orb.y - 52} textAnchor="middle" fontSize="26" fontWeight="700" fill="#ffd9a3" stroke="rgba(120,50,10,.7)" strokeWidth="4" paintOrder="stroke">{aimName}</text>
            <text x={orb.x} y={orb.y - 26} textAnchor="middle" fontSize="22" fontWeight="700" fill="#ffd9a3" stroke="rgba(120,50,10,.7)" strokeWidth="4" paintOrder="stroke" fontFamily="monospace">
              [{'|'.repeat(pips)}{'.'.repeat(5 - pips)}]
            </text>
          </g>
        )}
      </g>

      {/* 오른손 */}
      <Hand pose={pose} x={HAND_X} y={HAND_Y} scale={0.95} />

      {/* 조준용 레인 클릭 영역 (가장 위) */}
      {aiming && ([0, 1, 2] as Column[]).map(c => (
        <polygon key={`p${c}`} role="button" tabIndex={0} aria-label={`${COLUMN_LABEL[c]} 열 조준`}
          points={lanePolygon(c, -8, 108, cam)} fill="transparent" style={{ cursor: 'crosshair', outline: 'none' }}
          onMouseEnter={() => props.onLaneEnter(c)} onMouseLeave={() => props.onLaneLeave()}
          onClick={() => props.onLanePick(c)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') props.onLanePick(c) }} />
      ))}
    </svg>
  )
}
