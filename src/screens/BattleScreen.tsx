import { useEffect, useRef, useState } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import { RULES, type Column } from '../data/rules'
import { KIND_META, SKILL_MAP, validateDeck } from '../data/skills'
import { cast, createBattle, forceEnd, moveMe, tick, type BattleState } from '../lib/battleSim'
import Stage from '../components/battle/Stage'
import Scene from '../components/battle/Scene'
import HudPanel from '../components/battle/HudPanel'
import RuneGlyph from '../components/RuneGlyph'
import { fxForCast, type Fx } from '../components/battle/fx'
import type { HandPose } from '../components/battle/Hand'

// ── Unity MVP 화면을 따른 전투 화면 ───────────────────────────────────────────
// 원근 전장(내 타워 앞 · 적 타워/넥서스 멀리) + 오른손(핀치→주먹→검지) + 룬 궤적(파랑→인식되면 초록)
// + 주황 조준 구체 + 바닥에 기울어진 HUD 패널. 판정은 lib/battleSim, 좌표는 lib/scene.

// 명세서 §2.1 시전 상태 머신
const STAGES = ['Drawing', 'Recognizing', 'RuneReady', 'Armed', 'Aiming', 'Cast'] as const
type Stage = (typeof STAGES)[number] | 'Idle'
const FALLBACK_DECK = ['S03', 'S02', 'S07', 'S08', 'S11', 'S13', 'H01', 'H02']

// MVP(Unity) 손 조작 대응: 오른손 핀치=룬 그리기, 인식 성공=초록, 주먹=시전 준비, 검지=조준 위치 지정
const STAGE_HINT: Record<(typeof STAGES)[number], string> = {
  Drawing: '핀치로 룬 그리기',
  Recognizing: '룬 인식 중',
  RuneReady: '인식 성공 (초록)',
  Armed: '주먹 · 시전 준비',
  Aiming: '검지 · 조준',
  Cast: '시전!',
}
// 프로토타입의 시전 흐름 타이밍(ms). 실제 Quest 에서는 사용자의 동작이 각 단계를 결정한다.
const FLOW: [Stage, number][] = [['Drawing', 0], ['Recognizing', 650], ['RuneReady', 850], ['Armed', 1200]]
const FLOW_END = 1500

const poseOf = (s: Stage): HandPose =>
  s === 'Drawing' || s === 'Recognizing' || s === 'RuneReady' ? 'pinch' : s === 'Armed' ? 'fist' : s === 'Aiming' ? 'point' : 'open'

export default function BattleScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { deck, settings, finishMatch, profile } = useApp()
  const deckValid = validateDeck(deck) === null
  const [sim] = useState<BattleState>(() => createBattle(deckValid ? deck : FALLBACK_DECK))
  const [, setFrame] = useState(0)
  const [stage, setStage] = useState<Stage>('Idle')
  const [aim, setAim] = useState<{ slot: number; at: number } | null>(null)
  const [hoverCol, setHoverCol] = useState<Column | null>(null)
  const [trail, setTrail] = useState<{ id: number; skill: string } | null>(null)
  const [hint, setHint] = useState('')
  const [idle, setIdle] = useState(0)
  const [speed, setSpeed] = useState(1)

  const aimRef = useRef<{ slot: number; at: number } | null>(null)
  const hoverRef = useRef<{ col: Column; at: number } | null>(null)
  const busy = useRef(false)
  const lastInput = useRef(Date.now())
  const speedRef = useRef(1)
  const finished = useRef(false)
  const timers = useRef<number[]>([])
  const fxRef = useRef<Fx[]>([])
  const camRef = useRef(0)
  const foeXRef = useRef(0)
  const trailSeq = useRef(0)
  const fm = useRef(finishMatch)
  fm.current = finishMatch
  const nav = useRef(onNav)
  nav.current = onNav

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }
  const flash = (msg: string) => { setHint(msg); later(() => setHint(h => (h === msg ? '' : h)), 2200) }
  const touch = () => { lastInput.current = Date.now() }

  const clearAim = () => {
    aimRef.current = null
    hoverRef.current = null
    setAim(null)
    setHoverCol(null)
  }

  const finishCast = (slot: number, col: Column | null) => {
    const skillId = sim.deck[slot]
    const r = cast(sim, slot, col)
    clearAim()
    if (r.ok) {
      fxRef.current.push(...fxForCast(skillId, col))
      setStage('Cast')
      later(() => { setStage('Idle'); setTrail(null); busy.current = false }, 500)
    } else {
      flash(r.reason)
      setStage('Idle')
      setTrail(null)
      busy.current = false
    }
  }

  const cancelAim = (why: string) => {
    clearAim()
    setStage('Idle')
    setTrail(null)
    busy.current = false
    flash(why)
  }

  const startCast = (slot: number) => {
    touch()
    if (sim.status !== 'run' || busy.current) return
    const id = sim.deck[slot]
    const k = SKILL_MAP[id]
    if (!k) return
    if (sim.cd[slot] > 0) { flash('쿨타임 중입니다.'); return }
    if (sim.uses[slot] <= 0) { flash('이번 게임의 시전 횟수를 모두 사용했습니다.'); return }
    busy.current = true
    setTrail({ id: ++trailSeq.current, skill: id })
    // 프로토타입: 실제로는 룬 드로잉(핀치) → $P+ 인식 → 주먹 → 포인팅. 여기서는 클릭 한 번으로 상태 흐름만 재현.
    FLOW.forEach(([st, ms]) => later(() => setStage(st), ms))
    later(() => {
      if (KIND_META[k.kind].needsAim) {
        setStage('Aiming')
        const a = { slot, at: Date.now() }
        aimRef.current = a
        setAim(a)
      } else finishCast(slot, null)
    }, FLOW_END)
  }

  const handlers = useRef({ startCast, finishCast, cancelAim })
  handlers.current = { startCast, finishCast, cancelAim }

  // 메인 루프 (50ms). dt 는 실제 경과 시간 × 개발용 배속
  useEffect(() => {
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const real = Math.min(0.5, (now - last) / 1000)
      last = now
      tick(sim, real * speedRef.current)

      // 카메라/적 위치 부드럽게 이동
      camRef.current += ((sim.me.col - 1) * 0.55 - camRef.current) * 0.28
      foeXRef.current += ((sim.foe.col - 1) - foeXRef.current) * 0.2
      const t = Date.now()
      fxRef.current = fxRef.current.filter(f => t - f.born < f.delay + f.dur + 80)

      const idleS = (t - lastInput.current) / 1000
      setIdle(idleS)
      if (idleS >= RULES.afk.loseAfter) forceEnd(sim, 'lose', `${RULES.afk.loseAfter}초 동안 입력이 없어 기권패 처리되었습니다.`)

      const a = aimRef.current
      if (a && t - a.at > RULES.aimTimeout * 1000) handlers.current.cancelAim(`${RULES.aimTimeout}초 동안 입력이 없어 조준이 자동 취소되었습니다.`)
      // 명세서: 조준 후 1초간 포인팅을 유지하면 시전
      const h = hoverRef.current
      const a2 = aimRef.current
      if (a2 && h && t - h.at >= RULES.holdToAim * 1000) handlers.current.finishCast(a2.slot, h.col)

      setFrame(f => f + 1)
      if (sim.status !== 'run' && !finished.current) {
        finished.current = true
        fm.current({ result: sim.status, reason: sim.endReason, stats: { ...sim.stats }, durationSec: Math.floor(sim.t) })
        later(() => nav.current('result'), 2200)
      }
    }, 50)
    return () => { clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  // 입력: 키보드(1~8 시전, ←/→ 스냅 이동, Q/W/E 열 조준, Esc 취소) · 포인터는 AFK 판정용
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      touch()
      const h = handlers.current
      const k = e.key.toLowerCase()
      const a = aimRef.current
      if (a) {
        if (k === 'q') h.finishCast(a.slot, 0)
        else if (k === 'w') h.finishCast(a.slot, 1)
        else if (k === 'e') h.finishCast(a.slot, 2)
        else if (k === 'escape') h.cancelAim('조준을 취소했습니다. (쿨타임 소모 없음)')
        return
      }
      if (/^[1-8]$/.test(k)) h.startCast(Number(k) - 1)
      else if (k === 'arrowleft' || k === 'a') moveMe(sim, -1)
      else if (k === 'arrowright' || k === 'd') moveMe(sim, 1)
    }
    const onPointer = () => touch()
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer) }
  }, [sim])

  const ended = sim.status !== 'run'
  const lastLog = sim.log[sim.log.length - 1]
  const idleLeft = Math.max(0, RULES.afk.loseAfter - idle)
  const aimLeft = aim ? Math.max(0, RULES.aimTimeout - (Date.now() - aim.at) / 1000) : 0
  const holdPct = aim && hoverRef.current ? Math.min(1, (Date.now() - hoverRef.current.at) / (RULES.holdToAim * 1000)) : 0
  const aimName = aim ? SKILL_MAP[sim.deck[aim.slot]]?.name ?? '' : ''
  const armed = stage === 'Armed'
  const trailVisible = trail !== null && (stage === 'Drawing' || stage === 'Recognizing' || stage === 'RuneReady' || stage === 'Armed')
  const trailColor = stage === 'RuneReady' || stage === 'Armed' ? '#4ade80' : '#7dd3fc'

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <Stage>
        <Scene
          sim={sim} camX={camRef.current} foeX={foeXRef.current} now={Date.now()} fx={fxRef.current}
          aimSlot={aim ? aim.slot : null} hoverCol={hoverCol} holdPct={holdPct} aimName={aimName}
          pose={poseOf(stage)} armed={armed} colorblind={settings.colorblind}
          onLaneEnter={c => { hoverRef.current = { col: c, at: Date.now() }; setHoverCol(c); touch() }}
          onLaneLeave={() => { hoverRef.current = null; setHoverCol(null) }}
          onLanePick={c => { const a = aimRef.current; if (a) handlers.current.finishCast(a.slot, c) }}
        />

        {/* 룬 궤적: 그리는 동안 파랑, 인식되면 초록 (스크린샷의 궤적 색 규칙) */}
        {trailVisible && trail && (
          <div key={trail.id} className="absolute pointer-events-none"
            style={{ left: 722, top: 118, width: 210, height: 210, animation: 'rune-reveal .65s linear both', filter: `drop-shadow(0 0 8px ${trailColor}) drop-shadow(0 0 3px ${trailColor})` }}>
            <RuneGlyph id={trail.skill} size={210} color={trailColor} line />
          </div>
        )}

        {/* 상단: 최근 이벤트 · 안내 */}
        <div className="absolute left-1/2 -translate-x-1/2 top-3 flex flex-col items-center gap-1.5 pointer-events-none" style={{ width: 720 }}>
          {settings.subtitles ? null : sim.log.slice(-2).map((l, i, arr) => (
            <div key={`${l.t}-${i}`} className="px-4 py-0.5 rounded-full bg-black/45 font-[Rajdhani] font-semibold text-[16px]"
              style={{ opacity: 0.5 + (i / arr.length) * 0.5, color: l.tone === 'me' ? '#a5f3fc' : l.tone === 'foe' ? '#fecaca' : '#e9d5ff' }}>{l.text}</div>
          ))}
          {hint && <div className="px-4 py-1 rounded bg-amber-950/80 border border-amber-500/60 font-[Rajdhani] font-bold text-[17px] text-amber-200">{hint}</div>}
          {idle >= RULES.afk.warnAfter && !ended && (
            <div role="alert" className="px-6 py-2 rounded border border-red-500/70 bg-red-950/80 font-[Cinzel] font-bold text-red-200 animate-pulse">
              ⚠ 입력이 없습니다 — {Math.ceil(idleLeft)}초 후 기권패
            </div>
          )}
        </div>

        {/* 시작 배너 (MVP 의 FIGHT!) */}
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ top: 230 }}>
          <div className="font-[Cinzel] font-black" style={{ fontSize: 112, color: '#4ade80', WebkitTextStroke: '3px #063d1c', textShadow: '0 6px 24px rgba(0,0,0,.6)', animation: 'fight-pop 2.4s ease-out both' }}>FIGHT!</div>
        </div>

        {settings.subtitles && (
          <div className="absolute left-1/2 -translate-x-1/2 px-6 py-3 rounded bg-black/80 border border-purple-700/40 font-[Rajdhani] font-semibold text-[28px] text-white text-center" style={{ top: 400, maxWidth: 900 }}>{lastLog?.text}</div>
        )}

        {/* 좌상단: 시전 상태 · 손 조작 */}
        <div className="absolute left-4 top-12 w-[262px] rounded-lg border border-white/15 bg-black/55 backdrop-blur-sm p-3 flex flex-col gap-1.5">
          <div className="text-[11px] font-[Rajdhani] font-bold tracking-widest uppercase text-purple-300">시전 상태</div>
          <div className="font-[Rajdhani] font-bold text-[17px]" style={{ color: stage === 'Idle' ? '#9d93b0' : '#67e8f9' }}>
            {stage === 'Idle' ? 'Idle' : stage} <span className="text-[13px] font-semibold text-slate-300">{stage === 'Idle' ? '· 슬롯 클릭 / 1~8' : `· ${STAGE_HINT[stage]}`}</span>
          </div>
          {aim && (
            <div className="text-[13px] font-[Rajdhani] font-semibold text-cyan-200 leading-snug">
              레인 위에 1초 유지하거나 클릭 (Q/W/E) · {aimLeft.toFixed(1)}초{' '}
              <button className="underline ml-1 pointer-events-auto" onClick={() => handlers.current.cancelAim('조준을 취소했습니다. (쿨타임 소모 없음)')}>취소</button>
            </div>
          )}
          <div className="pt-1.5 border-t border-white/10 text-[12px] font-[Rajdhani] text-slate-300 leading-relaxed">
            <b className="text-purple-200">왼손</b> 좌우 흔들기 = 이동 <span className="text-slate-500">(← →)</span><br />
            <b className="text-purple-200">오른손</b> 핀치 = 룬 그리기 · 주먹 = 준비 · 검지 = 조준
          </div>
          {!deckValid && <div className="text-[12px] font-[Rajdhani] text-amber-300">저장된 덱이 없어 임시 덱으로 진행 중입니다.</div>}
        </div>

        <HudPanel sim={sim} aimSlot={aim ? aim.slot : null} onSlot={startCast} myName={profile?.nickname ?? ''} />

        {settings.comfortVignette && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 45%, rgba(0,0,0,.6) 100%)' }} />
        )}

        {/* 개발용 QA 패널 (npm run dev 에서만 표시) */}
        {import.meta.env.DEV && !ended && (
          <div className="absolute right-3 top-3 z-40 flex flex-col gap-1 p-2 rounded border border-amber-500/40 bg-black/80 text-[11px] font-[Rajdhani] text-amber-300">
            <span className="font-bold tracking-widest">DEV · QA</span>
            <div className="flex gap-1">
              {[1, 5, 20].map(x => (
                <button key={x} onClick={() => { setSpeed(x); speedRef.current = x }} className="px-2 py-0.5 rounded border border-amber-500/40" style={{ background: speed === x ? 'rgba(251,191,36,0.3)' : 'transparent' }}>×{x}</button>
              ))}
            </div>
            <button onClick={() => { lastInput.current = Date.now() - 24_000 }} className="px-2 py-0.5 rounded border border-amber-500/40 text-left">AFK 경고 테스트</button>
            <button onClick={() => forceEnd(sim, 'lose', '연결이 끊어져 패배 처리되었습니다.')} className="px-2 py-0.5 rounded border border-amber-500/40 text-left">연결 끊김</button>
            <button onClick={() => forceEnd(sim, 'win', '(개발용) 강제 승리')} className="px-2 py-0.5 rounded border border-amber-500/40 text-left">강제 승리</button>
          </div>
        )}

        {ended && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
            <div className="font-[Cinzel] font-black text-7xl" style={{ color: sim.status === 'win' ? '#67e8f9' : '#f87171', textShadow: '0 0 40px currentColor' }}>
              {sim.status === 'win' ? 'VICTORY' : 'DEFEAT'}
            </div>
            <div className="font-[Rajdhani] text-xl text-purple-200">{sim.endReason}</div>
          </div>
        )}
      </Stage>
    </div>
  )
}
