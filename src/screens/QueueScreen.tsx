import { useEffect, useRef, useState } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import { RULES } from '../data/rules'
import { fmtTime } from '../lib/format'
import MagicCircle from '../components/MagicCircle'
import Particles from '../components/Particles'
import VRButton from '../components/VRButton'

const TIPS = [
  '적 타워가 살아있는 동안에는 상대 플레이어에게 20%의 피해만 들어갑니다.',
  '플레이어 스킬은 타워·넥서스를 공격할 수 없어요. 유닛으로 구조물을 밀어붙이세요.',
  '고위력 스킬은 게임당 3회까지만 쓸 수 있습니다. 결정적인 순간에 아껴두세요.',
  '왼손을 옆으로 휘두르면 좌/중/우 열을 한 칸씩 순간이동합니다.',
  '적 타워를 부수면 공격력이 영구 +20%, 넥서스를 부수면 +40% 강해집니다.',
]

export default function QueueScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { profile, beginMatch } = useApp()
  const [elapsed, setElapsed] = useState(0)
  const [found, setFound] = useState(false)
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)])
  const started = useRef(Date.now())

  useEffect(() => {
    if (found) return
    const id = setInterval(() => {
      const e = (Date.now() - started.current) / 1000
      setElapsed(e)
      // 명세서: 대기 시간 초과 시 봇 매칭
      if (e >= RULES.queue.botTimeout) { setFound(true); clearInterval(id) }
    }, 250)
    return () => clearInterval(id)
  }, [found])

  useEffect(() => {
    if (!found) return
    const rating = Math.max(0, (profile?.rating ?? 1000) + Math.round((Math.random() - 0.5) * 100))
    const t = setTimeout(() => {
      beginMatch('ranked', { name: `Bot (${rating})`, rating, isBot: true })
      onNav('countdown')
    }, 1600)
    return () => clearTimeout(t)
  }, [found, profile, beginMatch, onNav])

  const range = 50 + Math.floor(elapsed) * 15

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(30,10,70,0.7) 0%, rgba(6,6,15,1) 68%)' }} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25"><MagicCircle size={640} /></div>
      <Particles count={18} />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="text-xs tracking-[0.5em] font-[Rajdhani] text-cyan-500 uppercase">Ranked Match</div>
        <h2 className="font-[Cinzel] font-black text-4xl text-purple-100 glow-text-purple">{found ? '봇 매칭 완료' : '상대를 찾고 있습니다'}</h2>
        <div className="font-[Cinzel] font-bold text-6xl text-cyan-300 glow-text-cyan tabular-nums">{fmtTime(elapsed)}</div>
        {found ? (
          <p className="font-[Rajdhani] text-xl text-amber-300">대기 시간이 초과되어 봇과 매칭되었습니다.</p>
        ) : (
          <p className="font-[Rajdhani] text-lg text-purple-400">
            레이팅 {profile?.rating ?? '-'} ± {range} 범위 탐색 중 · {RULES.queue.botTimeout}초 초과 시 봇 매칭
          </p>
        )}
        <div className="max-w-[560px] px-6 py-3 rounded border border-purple-900/40 bg-black/30 font-[Rajdhani] text-base text-purple-300">
          💡 {tip}
        </div>
        <VRButton variant="ghost" size="md" onClick={() => onNav('lobby')} disabled={found}>매칭 취소</VRButton>
      </div>
    </div>
  )
}
