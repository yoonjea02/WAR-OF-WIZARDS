import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import { fmtTime } from '../lib/format'
import MagicCircle from '../components/MagicCircle'
import Particles from '../components/Particles'
import VRButton from '../components/VRButton'

const MODE_LABEL = { ranked: '랭킹전', friendly: '친선전', bot: '봇 연습전' } as const

function Stat({ label, value, color = '#e8e4ff' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded border border-purple-900/40 bg-black/40 px-5 py-4 text-center min-w-[130px]">
      <div className="font-[Cinzel] font-bold text-2xl tabular-nums" style={{ color }}>{value}</div>
      <div className="text-xs font-[Rajdhani] tracking-widest uppercase text-purple-500 mt-1">{label}</div>
    </div>
  )
}

function Badge({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className="px-3 py-1.5 rounded-full border text-sm font-[Rajdhani] font-semibold"
      style={{ color: on ? '#fbbf24' : '#4a4a6a', borderColor: on ? 'rgba(251,191,36,0.5)' : 'rgba(74,74,106,0.4)', background: on ? 'rgba(251,191,36,0.1)' : 'transparent' }}>
      {on ? '✦ ' : ''}{children}
    </span>
  )
}

export default function ResultScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { lastMatch: m, profile, beginMatch, room } = useApp()

  if (!m) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-6">
        <div className="font-[Rajdhani] text-xl text-purple-300">표시할 대전 결과가 없습니다.</div>
        <VRButton onClick={() => onNav('lobby')} variant="primary" size="md">로비로</VRButton>
      </div>
    )
  }

  const win = m.result === 'win'
  const accent = win ? '#67e8f9' : '#f87171'

  const again = () => {
    if (m.mode === 'ranked') { beginMatch('ranked', { name: '탐색 중…', rating: 0, isBot: false }); onNav('queue') }
    else if (m.mode === 'friendly') onNav('room')
    else { beginMatch('bot', { name: 'Bot', rating: profile?.rating ?? 1000, isBot: true }); onNav('countdown') }
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-y-auto py-16">
      <div className="absolute inset-0" style={{ background: win ? 'radial-gradient(ellipse 100% 70% at 50% 50%, rgba(30,10,70,0.9) 0%, rgba(6,6,15,1) 65%)' : 'radial-gradient(ellipse 100% 70% at 50% 50%, rgba(60,8,8,0.7) 0%, rgba(6,6,15,1) 65%)' }} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15 pointer-events-none"><MagicCircle size={760} /></div>
      <Particles count={14} />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="text-xs tracking-[0.5em] font-[Rajdhani] uppercase text-purple-500">{MODE_LABEL[m.mode]} · vs {m.opponent}</div>
        <h1 className="font-[Cinzel] font-black result-enter" style={{ fontSize: 96, color: accent, textShadow: `0 0 50px ${accent}` }}>{win ? 'VICTORY' : 'DEFEAT'}</h1>
        <p className="font-[Rajdhani] text-xl text-purple-200 -mt-2">{m.reason}</p>

        <div className="flex gap-3 flex-wrap justify-center">
          <Stat label="플레이 시간" value={fmtTime(m.durationSec)} color="#22d3ee" />
          <Stat label="시전 횟수" value={m.stats.casts} />
          <Stat label="처치한 유닛" value={Math.round(m.stats.minionsKilled)} color="#fb923c" />
          <Stat label="입힌 피해" value={Math.round(m.stats.damageDealt)} color="#f87171" />
          <Stat label="받은 피해" value={Math.round(m.stats.damageTaken)} color="#a78bfa" />
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          <Badge on={m.stats.towerDestroyed}>적 타워 파괴</Badge>
          <Badge on={m.stats.nexusDestroyed}>적 넥서스 파괴</Badge>
          <Badge on={m.stats.ownTowerLost}>아군 타워 손실</Badge>
          <Badge on={m.stats.ownNexusLost}>아군 넥서스 손실</Badge>
        </div>

        <div className="rounded border border-purple-800/40 bg-black/40 px-8 py-4 font-[Rajdhani] text-lg min-w-[380px]">
          {m.saveError ? (
            <span className="text-red-300">전적 저장 실패: {m.saveError}</span>
          ) : !m.record ? (
            <span className="text-purple-400">전적 저장 중…</span>
          ) : m.mode === 'ranked' ? (
            <span>
              레이팅 <b style={{ color: m.record.ratingDelta >= 0 ? '#67e8f9' : '#fca5a5' }}>{m.record.ratingDelta >= 0 ? '+' : ''}{m.record.ratingDelta}</b>
              <span className="text-purple-300"> → {profile?.rating ?? '-'}</span>
            </span>
          ) : (
            <span className="text-purple-300">{MODE_LABEL[m.mode]}은 레이팅에 반영되지 않습니다. 전적은 저장되었습니다.</span>
          )}
        </div>

        <div className="flex gap-4 mt-2">
          <VRButton onClick={again} variant="primary" size="md">{m.mode === 'friendly' && room ? '룸으로 돌아가기' : '다시 대전'}</VRButton>
          <VRButton onClick={() => onNav('lobby')} variant="secondary" size="md">로비로</VRButton>
        </div>
      </div>
    </div>
  )
}
