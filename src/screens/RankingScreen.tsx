import { useEffect, useState } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import { api } from '../lib/api'
import type { RankEntry } from '../lib/types'
import { tierOf, winRate } from '../lib/format'
import Shell from '../components/Shell'

const MEDAL = ['#fbbf24', '#cbd5e1', '#d97706']

function Row({ r, me }: { r: RankEntry; me: boolean }) {
  const t = tierOf(r.rating)
  return (
    <div
      className="grid grid-cols-[70px_1fr_150px_90px_120px_80px] items-center gap-3 px-5 py-3 font-[Rajdhani] text-lg border-b border-purple-900/25"
      style={me ? { background: 'rgba(6,182,212,0.12)', borderLeft: '3px solid #06b6d4' } : undefined}
    >
      <span className="font-[Cinzel] font-black text-xl" style={{ color: r.rank <= 3 ? MEDAL[r.rank - 1] : '#8b80c8' }}>{r.rank}</span>
      <span className="text-purple-100 truncate">{r.nickname}{me && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-cyan-900/50 text-cyan-300">나</span>}</span>
      <span style={{ color: t.color }}>{t.name}</span>
      <span className="font-[Cinzel] font-bold text-purple-100">{r.rating}</span>
      <span className="text-purple-400">{r.wins}승 {r.losses}패</span>
      <span className="text-purple-400 text-right">{winRate(r.wins, r.losses)}%</span>
    </div>
  )
}

export default function RankingScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { user, profile } = useApp()
  const [rows, setRows] = useState<RankEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api.getRanking(100).then(r => { if (alive) setRows(r) }).catch(e => { if (alive) setError((e as Error).message) })
    return () => { alive = false }
  }, [])

  const mine = rows?.find(r => r.userId === user?.id)

  return (
    <Shell
      title="랭킹"
      eyebrow="War of Wizards · 랭킹전 레이팅 기준"
      onBack={() => onNav('lobby')}
      padded={false}
      footer={
        <div className="flex items-center justify-between font-[Rajdhani] text-lg max-w-[1100px] mx-auto">
          <span className="text-purple-500 text-sm tracking-widest uppercase">내 순위</span>
          {mine
            ? <span className="text-cyan-300 font-semibold">{mine.rank}위 · {mine.rating}점 · {mine.wins}승 {mine.losses}패</span>
            : <span className="text-purple-300">{rows ? `Top 100 밖 · ${profile?.rating ?? '-'}점` : '…'}</span>}
        </div>
      }
    >
      <div className="max-w-[1100px] mx-auto py-6">
        <div className="grid grid-cols-[70px_1fr_150px_90px_120px_80px] gap-3 px-5 pb-2 text-xs font-[Rajdhani] tracking-widest uppercase text-purple-500 border-b border-purple-800/40">
          <span>순위</span><span>닉네임</span><span>등급</span><span>레이팅</span><span>전적</span><span className="text-right">승률</span>
        </div>
        {error && <div className="p-6 text-red-300 font-[Rajdhani]">{error}</div>}
        {!rows && !error && <div className="p-6 text-purple-500 font-[Rajdhani]">불러오는 중…</div>}
        {rows?.map(r => <Row key={r.userId} r={r} me={r.userId === user?.id} />)}
      </div>
    </Shell>
  )
}
