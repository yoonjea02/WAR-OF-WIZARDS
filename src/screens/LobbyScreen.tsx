import { useEffect, useState, type ReactNode } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import { api } from '../lib/api'
import { validateDeck } from '../data/skills'
import { tierOf, winRate } from '../lib/format'
import Shell from '../components/Shell'
import VRButton from '../components/VRButton'
import SkillIcon from '../components/SkillIcon'
import MagicCircle from '../components/MagicCircle'
import NicknameDialog from '../components/NicknameDialog'

function Tile({ icon, title, sub, badge, onClick }: { icon: ReactNode; title: string; sub?: string; badge?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative group flex flex-col items-start gap-2 p-5 text-left rounded border border-purple-900/40 bg-purple-950/15 hover:bg-purple-900/25 hover:border-purple-500/60 hover:shadow-[0_0_24px_rgba(124,58,237,0.35)] transition-all duration-200"
    >
      <div className="text-purple-300 group-hover:text-cyan-300 transition-colors">{icon}</div>
      <div className="font-[Cinzel] font-semibold text-lg text-purple-100 tracking-wide">{title}</div>
      {sub && <div className="text-sm font-[Rajdhani] text-purple-500">{sub}</div>}
      {!!badge && badge > 0 && (
        <span className="absolute top-3 right-3 min-w-6 h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold font-[Rajdhani] flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.7)]">
          {badge}
        </span>
      )}
    </button>
  )
}

const ico = (d: ReactNode) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)

export default function LobbyScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { user, profile, needsNickname, updateNickname, deck, unread, online, signOut, beginMatch, toast } = useApp()
  const [laterNick, setLaterNick] = useState(() => sessionStorage.getItem('wow.nickLater') === '1')
  const [friendsOnline, setFriendsOnline] = useState<number | null>(null)
  const deckErr = validateDeck(deck)

  useEffect(() => {
    if (!user) return
    let alive = true
    api.listFriends(user.id).then(list => {
      if (alive) setFriendsOnline(list.filter(f => f.relation === 'friend' && online.includes(f.id)).length)
    }).catch(() => { if (alive) setFriendsOnline(null) })
    return () => { alive = false }
  }, [user, online])

  const tier = tierOf(profile?.rating ?? 1000)

  const startRanked = () => {
    if (deckErr) { toast(deckErr, 'error'); return }
    beginMatch('ranked', { name: '탐색 중…', rating: 0, isBot: false })
    onNav('queue')
  }
  const startBot = () => {
    if (deckErr) { toast(deckErr, 'error'); return }
    beginMatch('bot', { name: 'Bot', rating: profile?.rating ?? 1000, isBot: true })
    onNav('countdown')
  }

  return (
    <Shell
      title="메인 로비"
      right={
        <>
          <div className="text-right mr-2">
            <div className="font-[Cinzel] font-bold text-xl text-purple-100">{profile?.nickname ?? '…'}</div>
            <div className="text-sm font-[Rajdhani]" style={{ color: tier.color }}>{tier.name} · {profile?.rating ?? '-'}</div>
          </div>
          <VRButton variant="ghost" size="sm" onClick={async () => { await signOut(); onNav('login') }}>로그아웃</VRButton>
        </>
      }
    >
      <div className="relative grid grid-cols-[1.15fr_1fr] gap-8 max-w-[1300px] mx-auto">
        {/* 대전 */}
        <div className="relative overflow-hidden rounded border border-purple-700/40 bg-black/30 p-8 flex flex-col gap-6">
          <div className="absolute -right-24 -top-24 opacity-15 pointer-events-none"><MagicCircle size={420} /></div>
          <div>
            <div className="text-xs tracking-[0.4em] font-[Rajdhani] text-cyan-500 uppercase mb-1">Battle</div>
            <h3 className="font-[Cinzel] font-black text-3xl text-purple-100">1 : 1 마법 대전</h3>
            <p className="text-base font-[Rajdhani] text-purple-400 mt-1">룬을 그려 마법을 시전하고, 상대 넥서스를 파괴해 돌파하세요.</p>
          </div>

          <div className="relative z-10 flex flex-col gap-3">
            <VRButton onClick={startRanked} variant="primary" size="lg" className="w-full" disabled={!!deckErr}>랭킹전 매칭</VRButton>
            <div className="grid grid-cols-2 gap-3">
              <VRButton onClick={() => onNav('room')} variant="secondary" size="md" className="w-full !min-w-0">친선전</VRButton>
              <VRButton onClick={startBot} variant="ghost" size="md" className="w-full !min-w-0" disabled={!!deckErr}>봇 연습전</VRButton>
            </div>
          </div>

          {/* 덱 상태 */}
          <div className="relative z-10 rounded border border-purple-900/40 bg-purple-950/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-[Rajdhani] font-semibold tracking-widest uppercase text-purple-400">내 마법서</span>
              <button onClick={() => onNav('spellbook')} className="text-sm font-[Rajdhani] text-cyan-400 hover:text-cyan-300">편성하기 →</button>
            </div>
            {deck.length === 0 ? (
              <div className="text-base font-[Rajdhani] text-amber-300">아직 덱이 없습니다. 마법서에서 스킬 8장을 편성해야 대전을 시작할 수 있어요.</div>
            ) : deckErr ? (
              <div className="text-base font-[Rajdhani] text-amber-300">{deckErr}</div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {deck.map(id => <SkillIcon key={id} skill={id} size={46} />)}
              </div>
            )}
          </div>
        </div>

        {/* 메뉴 타일 */}
        <div className="grid grid-cols-2 gap-4 content-start">
          <Tile onClick={() => onNav('spellbook')} title="마법서" sub="19종 중 8장 덱 편성" icon={ico(<><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z" /><path d="M4 21V5M9 7h6" /></>)} />
          <Tile onClick={() => onNav('mypage')} title="마이페이지" sub={profile ? `${profile.wins}승 ${profile.losses}패 · 승률 ${winRate(profile.wins, profile.losses)}%` : ''} icon={ico(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>)} />
          <Tile onClick={() => onNav('friends')} title="친구" sub={friendsOnline === null ? '' : `접속 중 ${friendsOnline}명`} icon={ico(<><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.5" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 14c3 0 5 1.8 5 4.5" /></>)} />
          <Tile onClick={() => onNav('mailbox')} title="우편함 · 공지" sub={unread > 0 ? `읽지 않음 ${unread}건` : '새 우편 없음'} badge={unread} icon={ico(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 7l10 7 10-7" /></>)} />
          <Tile onClick={() => onNav('ranking')} title="랭킹" sub="랭킹전 레이팅 기준" icon={ico(<><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" /><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" /></>)} />
          <Tile onClick={() => onNav('settings')} title="환경설정" sub="볼륨 · 비네팅 · 제스처" icon={ico(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>)} />
        </div>
      </div>
      {needsNickname && !laterNick && profile && (
        <NicknameDialog
          current={profile.nickname}
          onSave={async n => { await updateNickname(n); toast(`${n} 마법사님, 환영합니다!`, 'success') }}
          onLater={() => { sessionStorage.setItem('wow.nickLater', '1'); setLaterNick(true) }}
        />
      )}
    </Shell>
  )
}
