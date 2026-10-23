import { useCallback, useEffect, useState } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import { api } from '../lib/api'
import type { FriendEntry } from '../lib/types'
import { tierOf } from '../lib/format'
import Shell from '../components/Shell'
import VRButton from '../components/VRButton'

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className="w-3 h-3 rounded-full flex-shrink-0"
      title={on ? '접속 중' : '오프라인'}
      style={{ background: on ? '#34d399' : '#4a4a6a', boxShadow: on ? '0 0 8px rgba(52,211,153,0.9)' : 'none' }}
    />
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded border border-purple-900/40 bg-purple-950/15 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-[Rajdhani] font-semibold tracking-widest uppercase text-purple-400">{title}</span>
        <span className="text-xs font-[Rajdhani] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300">{count}</span>
      </div>
      <div className="flex flex-col divide-y divide-purple-900/30">{children}</div>
    </div>
  )
}

export default function FriendsScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { user, online, room, toast } = useApp()
  const [list, setList] = useState<FriendEntry[] | null>(null)
  const [nick, setNick] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    if (!user) return
    try { setList(await api.listFriends(user.id)) }
    catch (e) { toast((e as Error).message, 'error') }
  }, [user, toast])

  useEffect(() => { void reload() }, [reload])

  const run = async (fn: () => Promise<void>, okMsg?: string) => {
    if (busy) return
    setBusy(true)
    try { await fn(); if (okMsg) toast(okMsg, 'success'); await reload() }
    catch (e) { toast((e as Error).message, 'error') }
    finally { setBusy(false) }
  }

  const request = () => {
    const n = nick.trim()
    if (!user || n.length < 2) { toast('닉네임을 2자 이상 입력해주세요.', 'error'); return }
    void run(async () => { await api.requestFriend(user.id, n); setNick('') }, `${n} 님에게 친구 요청을 보냈습니다.`)
  }

  const invite = (f: FriendEntry) => {
    if (!user) return
    if (!room || room.role !== 'host') {
      toast('먼저 친선전 룸을 만들어야 초대할 수 있습니다.', 'error')
      return
    }
    void run(() => api.sendInvite(user.id, f.id, room.code), `${f.nickname} 님에게 초대장을 보냈습니다. (룸 ${room.code})`)
  }

  const friends = (list ?? []).filter(f => f.relation === 'friend').sort((a, b) => Number(online.includes(b.id)) - Number(online.includes(a.id)) || a.nickname.localeCompare(b.nickname))
  const incoming = (list ?? []).filter(f => f.relation === 'incoming')
  const outgoing = (list ?? []).filter(f => f.relation === 'outgoing')

  return (
    <Shell
      title="친구 목록"
      onBack={() => onNav('lobby')}
      right={<VRButton variant="secondary" size="sm" onClick={() => onNav('room')}>{room ? `룸 ${room.code}` : '친선전 룸 만들기'}</VRButton>}
    >
      <div className="max-w-[900px] mx-auto flex flex-col gap-5">
        <div className="flex gap-3">
          <input
            value={nick}
            onChange={e => setNick(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') request() }}
            placeholder="닉네임으로 친구 요청 보내기"
            aria-label="친구 닉네임"
            className="flex-1 bg-black/40 border border-purple-700/40 rounded px-5 py-3 text-lg font-[Rajdhani] text-purple-100 placeholder-purple-700 outline-none focus:border-cyan-500/70"
          />
          <VRButton variant="primary" size="md" onClick={request} disabled={busy}>요청</VRButton>
        </div>

        {list === null && <div className="text-purple-500 font-[Rajdhani]">불러오는 중…</div>}

        {incoming.length > 0 && (
          <Section title="받은 요청" count={incoming.length}>
            {incoming.map(f => (
              <div key={f.id} className="flex items-center gap-4 py-3">
                <span className="flex-1 font-[Rajdhani] text-lg text-purple-100">{f.nickname} <span className="text-sm text-purple-600">· {f.rating}</span></span>
                <VRButton size="sm" variant="secondary" className="!min-w-0" disabled={busy} onClick={() => user && run(() => api.respondFriend(user.id, f.id, true), `${f.nickname} 님과 친구가 되었습니다.`)}>수락</VRButton>
                <VRButton size="sm" variant="ghost" className="!min-w-0" disabled={busy} onClick={() => user && run(() => api.respondFriend(user.id, f.id, false))}>거절</VRButton>
              </div>
            ))}
          </Section>
        )}

        <Section title="친구" count={friends.length}>
          {list && friends.length === 0 && <div className="py-4 font-[Rajdhani] text-purple-500">아직 친구가 없습니다. 닉네임으로 친구 요청을 보내보세요.</div>}
          {friends.map(f => {
            const on = online.includes(f.id)
            const t = tierOf(f.rating)
            return (
              <div key={f.id} className="flex items-center gap-4 py-3">
                <Dot on={on} />
                <span className="flex-1 font-[Rajdhani] text-lg text-purple-100">
                  {f.nickname}
                  <span className="ml-2 text-sm" style={{ color: t.color }}>{t.name} · {f.rating}</span>
                </span>
                <span className="text-sm font-[Rajdhani] text-purple-600 w-16 text-right">{on ? '접속 중' : '오프라인'}</span>
                <VRButton size="sm" variant="secondary" className="!min-w-0" disabled={busy || !on} onClick={() => invite(f)}>초대</VRButton>
                <VRButton size="sm" variant="ghost" className="!min-w-0" disabled={busy} onClick={() => user && run(() => api.removeFriend(user.id, f.id), `${f.nickname} 님을 삭제했습니다.`)}>삭제</VRButton>
              </div>
            )
          })}
        </Section>

        {outgoing.length > 0 && (
          <Section title="보낸 요청" count={outgoing.length}>
            {outgoing.map(f => (
              <div key={f.id} className="flex items-center gap-4 py-3">
                <span className="flex-1 font-[Rajdhani] text-lg text-purple-300">{f.nickname}</span>
                <span className="text-sm font-[Rajdhani] text-purple-600">수락 대기 중</span>
                <VRButton size="sm" variant="ghost" className="!min-w-0" disabled={busy} onClick={() => user && run(() => api.removeFriend(user.id, f.id))}>취소</VRButton>
              </div>
            ))}
          </Section>
        )}
      </div>
    </Shell>
  )
}
