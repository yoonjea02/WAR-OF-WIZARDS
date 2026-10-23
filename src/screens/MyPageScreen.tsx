import { useEffect, useState } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import { api } from '../lib/api'
import type { MatchRecord } from '../lib/types'
import { fmtTime, tierOf, timeAgo, winRate } from '../lib/format'
import { getSkill } from '../data/skills'
import Shell from '../components/Shell'
import VRButton from '../components/VRButton'
import SkillIcon from '../components/SkillIcon'

const MODE_LABEL = { ranked: '랭킹전', friendly: '친선전', bot: '봇 연습' } as const

function Ring({ pct }: { pct: number }) {
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`승률 ${pct}%`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(124,58,237,0.18)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#06b6d4" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(c * pct) / 100} ${c}`} transform="rotate(-90 60 60)" style={{ filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.7))' }} />
      <text x="60" y="58" textAnchor="middle" fill="#e8e4ff" fontSize="26" fontWeight="700" fontFamily="Cinzel, serif">{pct}%</text>
      <text x="60" y="78" textAnchor="middle" fill="#8b80c8" fontSize="11" fontFamily="Rajdhani, sans-serif">WIN RATE</text>
    </svg>
  )
}

// 서버는 무승부(DRAW)도 기록한다
const RES = {
  win:  { c: '#67e8f9', bg: 'rgba(6,182,212,0.25)',   bd: 'rgba(6,182,212,0.5)',   short: 'W', long: 'VICTORY' },
  lose: { c: '#fca5a5', bg: 'rgba(239,68,68,0.22)',   bd: 'rgba(239,68,68,0.4)',   short: 'L', long: 'DEFEAT' },
  draw: { c: '#cbd5e1', bg: 'rgba(148,163,184,0.2)',  bd: 'rgba(148,163,184,0.4)', short: 'D', long: 'DRAW' },
} as const

export default function MyPageScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { user, profile, deck, refreshProfile } = useApp()
  const [matches, setMatches] = useState<MatchRecord[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let alive = true
    void refreshProfile()
    api.listMatches(user.id, 30).then(m => { if (alive) setMatches(m) }).catch(e => { if (alive) setError((e as Error).message) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const total = profile ? profile.wins + profile.losses : 0
  const rate = profile ? winRate(profile.wins, profile.losses) : 0
  const tier = tierOf(profile?.rating ?? 1000)
  const recent = (matches ?? []).slice(0, 10)
  const avgDur = matches && matches.length ? matches.reduce((a, m) => a + m.durationSec, 0) / matches.length : 0
  const avgCasts = matches && matches.length ? matches.reduce((a, m) => a + m.casts, 0) / matches.length : 0

  return (
    <Shell title="마이페이지" onBack={() => onNav('lobby')}>
      <div className="grid grid-cols-[360px_1fr] gap-8 max-w-[1300px] mx-auto">
        <div className="flex flex-col gap-5">
          <div className="rounded border border-purple-800/40 bg-purple-950/20 p-6 flex flex-col items-center gap-3">
            <div className="hex-clip w-24 h-24 flex items-center justify-center font-[Cinzel] font-black text-4xl text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', boxShadow: '0 0 30px rgba(124,58,237,0.5)' }}>
              {(profile?.nickname ?? '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="font-[Cinzel] font-bold text-2xl text-purple-100">{profile?.nickname ?? '…'}</div>
            <div className="px-4 py-1 rounded-full border text-sm font-[Cinzel] font-semibold tracking-widest" style={{ color: tier.color, borderColor: `${tier.color}88` }}>
              {tier.name} · {profile?.rating ?? '-'}
            </div>
            <Ring pct={rate} />
            <div className="grid grid-cols-3 gap-3 w-full text-center">
              {[['전체', total], ['승', profile?.wins ?? 0], ['패', profile?.losses ?? 0]].map(([k, v]) => (
                <div key={k as string} className="rounded bg-black/30 border border-purple-900/30 py-2">
                  <div className="font-[Cinzel] font-bold text-xl text-purple-100">{v}</div>
                  <div className="text-xs font-[Rajdhani] tracking-widest text-purple-500">{k}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-purple-900/40 bg-purple-950/15 p-5 flex flex-col gap-3">
            <div className="text-sm font-[Rajdhani] font-semibold tracking-widest uppercase text-purple-400">전적 분석 (최근 {matches?.length ?? 0}경기)</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {recent.length === 0 && <span className="text-sm font-[Rajdhani] text-purple-600">기록 없음</span>}
              {recent.map(m => (
                <span key={m.id} title={`${MODE_LABEL[m.mode]} vs ${m.opponent}`}
                  className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold font-[Rajdhani]"
                  style={{ background: RES[m.result].bg, color: RES[m.result].c, border: `1px solid ${RES[m.result].bd}` }}>
                  {RES[m.result].short}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded bg-black/30 border border-purple-900/30 py-2"><div className="font-[Cinzel] font-bold text-lg text-purple-100">{avgDur ? fmtTime(avgDur) : '-'}</div><div className="text-xs font-[Rajdhani] text-purple-500">평균 플레이 시간</div></div>
              <div className="rounded bg-black/30 border border-purple-900/30 py-2"><div className="font-[Cinzel] font-bold text-lg text-purple-100">{avgCasts ? Math.round(avgCasts) : '-'}</div><div className="text-xs font-[Rajdhani] text-purple-500">평균 시전 횟수</div></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 min-w-0">
          <div className="rounded border border-purple-900/40 bg-purple-950/15 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-[Rajdhani] font-semibold tracking-widest uppercase text-purple-400">내 덱 (HUD 슬롯 순서)</span>
              <VRButton variant="ghost" size="sm" onClick={() => onNav('spellbook')}>덱 편성</VRButton>
            </div>
            {deck.length === 0 ? <div className="text-base font-[Rajdhani] text-amber-300">편성된 덱이 없습니다.</div> : (
              <div className="grid grid-cols-8 gap-3">
                {deck.map((id, i) => (
                  <div key={id} className="flex flex-col items-center gap-1.5">
                    <SkillIcon skill={id} size={52} />
                    <span className="text-[11px] font-[Cinzel] text-center leading-tight" style={{ color: getSkill(id).color }}>{i + 1}. {getSkill(id).name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded border border-purple-900/40 bg-purple-950/15 p-5">
            <div className="text-sm font-[Rajdhani] font-semibold tracking-widest uppercase text-purple-400 mb-3">최근 대전</div>
            {error && <div className="text-red-300 font-[Rajdhani]">{error}</div>}
            {matches === null && !error && <div className="text-purple-500 font-[Rajdhani]">불러오는 중…</div>}
            {matches && matches.length === 0 && <div className="text-purple-500 font-[Rajdhani]">아직 대전 기록이 없습니다. 첫 대전을 시작해보세요!</div>}
            <div className="flex flex-col divide-y divide-purple-900/30">
              {(matches ?? []).map(m => (
                <div key={m.id} className="grid grid-cols-[70px_90px_1fr_80px_80px_70px_90px] items-center gap-3 py-3 font-[Rajdhani] text-base">
                  <span className="font-[Cinzel] font-bold text-sm tracking-widest" style={{ color: RES[m.result].c }}>{RES[m.result].long}</span>
                  <span className="text-purple-400">{MODE_LABEL[m.mode]}</span>
                  <span className="text-purple-100 truncate">vs {m.opponent}</span>
                  <span className="text-purple-400">{fmtTime(m.durationSec)}</span>
                  <span className="text-purple-400">{m.casts}회 시전</span>
                  <span className="font-semibold" style={{ color: m.ratingDelta > 0 ? '#67e8f9' : m.ratingDelta < 0 ? '#fca5a5' : '#6b6a8a' }}>{m.ratingDelta > 0 ? `+${m.ratingDelta}` : m.ratingDelta === 0 ? '±0' : m.ratingDelta}</span>
                  <span className="text-purple-600 text-sm text-right">{timeAgo(m.endedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
