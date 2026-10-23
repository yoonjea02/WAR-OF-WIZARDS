import { useEffect, useState } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import { RULES } from '../data/rules'
import { tierOf } from '../lib/format'
import MagicCircle from '../components/MagicCircle'
import Particles from '../components/Particles'
import SkillIcon from '../components/SkillIcon'

export default function CountdownScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { profile, opponent, deck } = useApp()
  const [n, setN] = useState<number>(RULES.countdown)

  useEffect(() => {
    if (n < 0) { onNav('battle'); return }
    const t = setTimeout(() => setN(v => v - 1), n === 0 ? 700 : 1000)
    return () => clearTimeout(t)
  }, [n, onNav])

  const myTier = tierOf(profile?.rating ?? 1000)
  const foe = opponent ?? { name: 'Bot', rating: 1000, isBot: true }
  const foeTier = tierOf(foe.rating)

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 70% at 50% 50%, rgba(40,10,80,0.8) 0%, rgba(6,6,15,1) 65%)' }} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20"><MagicCircle size={760} /></div>
      <Particles count={16} />

      <div className="relative z-10 w-full max-w-[1200px] grid grid-cols-[1fr_260px_1fr] items-center gap-6 px-10">
        <div className="text-right flex flex-col items-end gap-3">
          <div className="text-xs tracking-[0.4em] font-[Rajdhani] text-purple-500 uppercase">나</div>
          <div className="font-[Cinzel] font-black text-3xl text-purple-100">{profile?.nickname}</div>
          <div className="font-[Rajdhani] text-lg" style={{ color: myTier.color }}>{myTier.name} · {profile?.rating}</div>
          <div className="grid grid-cols-4 gap-2 mt-2">{deck.map(id => <SkillIcon key={id} skill={id} size={44} />)}</div>
        </div>

        <div className="text-center">
          <div key={n} className="font-[Cinzel] font-black glow-text-cyan" style={{ fontSize: n > 0 ? 150 : 72, color: n > 0 ? '#67e8f9' : '#fbbf24', animation: 'result-enter 0.5s ease-out' }}>
            {n > 0 ? n : 'START!'}
          </div>
          <div className="font-[Cinzel] font-bold text-lg text-purple-400 tracking-widest mt-2">VS</div>
        </div>

        <div className="flex flex-col items-start gap-3">
          <div className="text-xs tracking-[0.4em] font-[Rajdhani] text-red-400 uppercase">상대</div>
          <div className="font-[Cinzel] font-black text-3xl text-red-200">{foe.name}</div>
          <div className="font-[Rajdhani] text-lg" style={{ color: foeTier.color }}>{foeTier.name} · {foe.rating}</div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="hex-clip w-11 h-11 flex items-center justify-center bg-purple-950/40 text-purple-700 font-[Cinzel] font-bold">?</div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center font-[Rajdhani] text-purple-400">
        손이 카메라에 잘 보이도록 두 손을 앞으로 내밀어 주세요.
      </div>
    </div>
  )
}
