import { useEffect, useRef, useState } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import { api } from '../lib/api'
import type { FriendEntry } from '../lib/types'
import { validateDeck } from '../data/skills'
import { makeRoomCode, ROOM_CODE_RE } from '../lib/format'
import Shell from '../components/Shell'
import VRButton from '../components/VRButton'

interface Guest { name: string; rating: number; isBot: boolean }

function Slot({ label, name, sub, empty }: { label: string; name?: string; sub?: string; empty?: boolean }) {
  return (
    <div className="flex-1 rounded border p-5 flex flex-col gap-1"
      style={{ borderColor: empty ? 'rgba(124,58,237,0.25)' : 'rgba(6,182,212,0.5)', background: empty ? 'rgba(0,0,0,0.25)' : 'rgba(6,182,212,0.08)', borderStyle: empty ? 'dashed' : 'solid' }}>
      <span className="text-xs font-[Rajdhani] tracking-widest uppercase text-purple-500">{label}</span>
      {empty
        ? <span className="font-[Rajdhani] text-lg text-purple-600 animate-pulse">대기 중…</span>
        : <span className="font-[Cinzel] font-bold text-xl text-purple-100">{name}</span>}
      {sub && <span className="text-sm font-[Rajdhani] text-cyan-400">{sub}</span>}
    </div>
  )
}

export default function RoomScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { user, profile, deck, room, setRoom, beginMatch, online, toast } = useApp()
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [guest, setGuest] = useState<Guest | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [ready, setReady] = useState(false)
  const timers = useRef<number[]>([])
  const deckErr = validateDeck(deck)
  const me = profile?.nickname ?? '나'

  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  useEffect(() => {
    if (!user) return
    api.listFriends(user.id).then(l => setFriends(l.filter(f => f.relation === 'friend'))).catch(() => undefined)
  }, [user])

  // 게스트: 준비 완료 후 호스트가 시작한 것으로 시뮬레이션 (실서비스는 Photon 세션 이벤트)
  useEffect(() => {
    if (room?.role !== 'guest' || !ready) return
    const t = window.setTimeout(() => {
      beginMatch('friendly', { name: room.hostName, rating: 1000, isBot: false })
      onNav('countdown')
    }, 2000)
    return () => clearTimeout(t)
  }, [room, ready, beginMatch, onNav])

  const create = () => { setRoom({ code: makeRoomCode(), role: 'host', hostName: me }); setGuest(null); setReady(false) }
  const close = () => { setRoom(null); setGuest(null); setReady(false) }

  const join = () => {
    const code = joinCode.trim().toUpperCase()
    if (!ROOM_CODE_RE.test(code)) { toast('룸 코드는 영문 대문자·숫자 6자리입니다.', 'error'); return }
    setRoom({ code, role: 'guest', hostName: '호스트' })
    setReady(false)
  }

  const invite = async (f: FriendEntry) => {
    if (!user || room?.role !== 'host') return
    try {
      await api.sendInvite(user.id, f.id, room.code)
      toast(`${f.nickname} 님에게 초대장을 보냈습니다.`, 'success')
      // 프로토타입: 초대받은 친구가 잠시 후 입장하는 것으로 시뮬레이션
      timers.current.push(window.setTimeout(() => {
        setGuest(g => g ?? { name: f.nickname, rating: f.rating, isBot: false })
        toast(`${f.nickname} 님이 입장했습니다. (시뮬레이션)`, 'info')
      }, 2500))
    } catch (e) { toast((e as Error).message, 'error') }
  }

  const start = () => {
    if (!guest) return
    if (deckErr) { toast(deckErr, 'error'); return }
    beginMatch('friendly', { name: guest.name, rating: guest.rating, isBot: guest.isBot })
    onNav('countdown')
  }

  const copy = async () => {
    if (!room) return
    try { await navigator.clipboard.writeText(room.code); toast('룸 코드를 복사했습니다.', 'success') }
    catch { toast('복사하지 못했습니다. 코드를 직접 입력해 전달해주세요.', 'error') }
  }

  return (
    <Shell title="친선전 룸" onBack={() => onNav('lobby')} backLabel="← 로비">
      <div className="max-w-[1000px] mx-auto">
        {!room && (
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded border border-purple-700/40 bg-black/30 p-8 flex flex-col gap-4">
              <h3 className="font-[Cinzel] font-bold text-2xl text-purple-100">룸 만들기</h3>
              <p className="font-[Rajdhani] text-lg text-purple-400">방을 만들면 6자리 코드가 발급됩니다. 친구를 초대하거나 봇으로 빈 자리를 채울 수 있어요.</p>
              <VRButton variant="primary" size="md" className="w-full mt-auto" onClick={create}>룸 생성</VRButton>
            </div>
            <div className="rounded border border-cyan-700/40 bg-black/30 p-8 flex flex-col gap-4">
              <h3 className="font-[Cinzel] font-bold text-2xl text-purple-100">코드로 입장</h3>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                onKeyDown={e => { if (e.key === 'Enter') join() }}
                placeholder="ABC123"
                aria-label="룸 코드"
                className="bg-black/40 border border-purple-700/40 rounded px-5 py-4 text-3xl tracking-[0.4em] text-center font-[Cinzel] font-bold text-cyan-300 placeholder-purple-800 outline-none focus:border-cyan-500/70"
              />
              <VRButton variant="secondary" size="md" className="w-full mt-auto" onClick={join} disabled={joinCode.length !== 6}>입장</VRButton>
            </div>
          </div>
        )}

        {room?.role === 'host' && (
          <div className="flex flex-col gap-6">
            <div className="rounded border border-purple-700/40 bg-black/30 p-8 flex items-center justify-between">
              <div>
                <div className="text-xs font-[Rajdhani] tracking-widest uppercase text-purple-500">룸 코드</div>
                <div className="font-[Cinzel] font-black text-5xl tracking-[0.35em] text-cyan-300 glow-text-cyan">{room.code}</div>
              </div>
              <div className="flex gap-3">
                <VRButton variant="ghost" size="sm" onClick={copy}>복사</VRButton>
                <VRButton variant="ghost" size="sm" onClick={close}>룸 닫기</VRButton>
              </div>
            </div>

            <div className="flex gap-5">
              <Slot label="호스트" name={me} sub="준비 완료" />
              {guest
                ? <Slot label="게스트" name={guest.name} sub={guest.isBot ? 'Bot' : '입장 완료'} />
                : <Slot label="게스트" empty />}
            </div>

            <div className="flex gap-3">
              <VRButton variant="secondary" size="md" disabled={!!guest} onClick={() => setGuest({ name: 'Bot', rating: profile?.rating ?? 1000, isBot: true })}>봇으로 채우기</VRButton>
              {guest && <VRButton variant="ghost" size="md" onClick={() => setGuest(null)}>내보내기</VRButton>}
              <div className="flex-1" />
              <VRButton variant="primary" size="md" disabled={!guest || !!deckErr} onClick={start}>대전 시작</VRButton>
            </div>
            {deckErr && <div className="font-[Rajdhani] text-amber-300">{deckErr} 마법서에서 덱을 편성해주세요.</div>}

            <div className="rounded border border-purple-900/40 bg-purple-950/15 p-5">
              <div className="text-sm font-[Rajdhani] font-semibold tracking-widest uppercase text-purple-400 mb-3">접속 중인 친구 초대</div>
              {friends.filter(f => online.includes(f.id)).length === 0 && <div className="font-[Rajdhani] text-purple-600">접속 중인 친구가 없습니다.</div>}
              {friends.filter(f => online.includes(f.id)).map(f => (
                <div key={f.id} className="flex items-center gap-4 py-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  <span className="flex-1 font-[Rajdhani] text-lg text-purple-100">{f.nickname}</span>
                  <VRButton size="sm" variant="secondary" className="!min-w-0" onClick={() => invite(f)} disabled={!!guest}>초대</VRButton>
                </div>
              ))}
            </div>
          </div>
        )}

        {room?.role === 'guest' && (
          <div className="flex flex-col gap-6">
            <div className="rounded border border-cyan-700/40 bg-black/30 p-8 flex items-center justify-between">
              <div>
                <div className="text-xs font-[Rajdhani] tracking-widest uppercase text-purple-500">입장한 룸</div>
                <div className="font-[Cinzel] font-black text-5xl tracking-[0.35em] text-cyan-300">{room.code}</div>
              </div>
              <VRButton variant="ghost" size="sm" onClick={close}>나가기</VRButton>
            </div>
            <div className="flex gap-5">
              <Slot label="호스트" name={room.hostName} sub="대기 중" />
              <Slot label="게스트 (나)" name={me} sub={ready ? '준비 완료' : '준비 전'} />
            </div>
            {deckErr && <div className="font-[Rajdhani] text-amber-300">{deckErr} 마법서에서 덱을 편성해주세요.</div>}
            <div className="flex justify-end">
              <VRButton variant="primary" size="md" disabled={!!deckErr || ready} onClick={() => setReady(true)}>{ready ? '호스트가 시작하길 기다리는 중…' : '준비 완료'}</VRButton>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
