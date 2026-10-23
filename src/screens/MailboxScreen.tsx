import { useEffect, useMemo, useState } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import type { MailItem } from '../lib/types'
import { timeAgo } from '../lib/format'
import Shell from '../components/Shell'
import VRButton from '../components/VRButton'

const KIND_LABEL = { mail: '우편', invite: '초대', notice: '공지' } as const
const KIND_COLOR = { mail: '#a78bfa', invite: '#22d3ee', notice: '#fbbf24' } as const

export default function MailboxScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { mails, refreshMails, markMailRead, setRoom, toast } = useApp()
  const [tab, setTab] = useState<'mail' | 'notice'>('mail')
  const [selId, setSelId] = useState<string | null>(null)

  useEffect(() => { void refreshMails() }, [refreshMails])

  const list = useMemo(() => mails.filter(m => (tab === 'notice' ? m.kind === 'notice' : m.kind !== 'notice')), [mails, tab])
  const sel = list.find(m => m.id === selId) ?? null
  const unreadOf = (t: 'mail' | 'notice') => mails.filter(m => !m.read && (t === 'notice' ? m.kind === 'notice' : m.kind !== 'notice')).length

  const open = (m: MailItem) => {
    setSelId(m.id)
    void markMailRead(m)
  }

  const joinInvite = (m: MailItem) => {
    if (!m.roomCode) return
    void markMailRead(m)
    setRoom({ code: m.roomCode, role: 'guest', hostName: m.from ?? '호스트' })
    onNav('room')
  }

  return (
    <Shell title="우편함 · 공지" onBack={() => onNav('lobby')} padded={false}>
      <div className="grid grid-cols-[420px_1fr] h-full">
        <div className="border-r border-purple-900/30 flex flex-col min-h-0">
          <div className="flex border-b border-purple-900/30">
            {(['mail', 'notice'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setSelId(null) }}
                className="flex-1 py-4 font-[Cinzel] font-semibold tracking-widest text-base transition-colors relative"
                style={{ color: tab === t ? '#e8e4ff' : '#6b6a8a', background: tab === t ? 'rgba(124,58,237,0.18)' : 'transparent', borderBottom: tab === t ? '2px solid #7c3aed' : '2px solid transparent' }}>
                {t === 'mail' ? '우편함' : '공지사항'}
                {unreadOf(t) > 0 && <span className="ml-2 inline-flex min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold items-center justify-center">{unreadOf(t)}</span>}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {list.length === 0 && <div className="p-6 font-[Rajdhani] text-purple-500">{tab === 'mail' ? '받은 우편이 없습니다.' : '등록된 공지가 없습니다.'}</div>}
            {list.map(m => (
              <button key={m.id} onClick={() => open(m)}
                className="w-full text-left px-5 py-4 border-b border-purple-900/25 hover:bg-purple-900/20 transition-colors"
                style={{ background: sel?.id === m.id ? 'rgba(124,58,237,0.22)' : undefined }}>
                <div className="flex items-center gap-2 mb-1">
                  {!m.read && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />}
                  <span className="text-[11px] font-[Rajdhani] font-bold tracking-widest px-2 py-0.5 rounded" style={{ color: KIND_COLOR[m.kind], background: `${KIND_COLOR[m.kind]}22` }}>{KIND_LABEL[m.kind]}</span>
                  <span className="ml-auto text-xs font-[Rajdhani] text-purple-600">{timeAgo(m.createdAt)}</span>
                </div>
                <div className={`font-[Rajdhani] text-lg truncate ${m.read ? 'text-purple-400' : 'text-purple-100 font-semibold'}`}>{m.title}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-10 overflow-y-auto">
          {!sel ? (
            <div className="h-full flex items-center justify-center font-[Rajdhani] text-purple-600 text-lg">왼쪽에서 항목을 선택하세요.</div>
          ) : (
            <div className="max-w-[720px] flex flex-col gap-5">
              <div>
                <span className="text-xs font-[Rajdhani] font-bold tracking-widest px-2 py-1 rounded" style={{ color: KIND_COLOR[sel.kind], background: `${KIND_COLOR[sel.kind]}22` }}>{KIND_LABEL[sel.kind]}</span>
                <h3 className="font-[Cinzel] font-bold text-2xl text-purple-100 mt-3">{sel.title}</h3>
                <div className="text-sm font-[Rajdhani] text-purple-600 mt-1">{sel.from ? `보낸 사람: ${sel.from} · ` : ''}{timeAgo(sel.createdAt)}</div>
              </div>
              <p className="font-[Rajdhani] text-lg text-purple-200 leading-relaxed whitespace-pre-line">{sel.body}</p>

              {sel.kind === 'invite' && sel.roomCode && (
                <div className="rounded border border-cyan-500/40 bg-cyan-950/20 p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-[Rajdhani] tracking-widest text-cyan-500 uppercase">룸 코드</div>
                    <div className="font-[Cinzel] font-black text-3xl tracking-[0.3em] text-cyan-300">{sel.roomCode}</div>
                  </div>
                  <VRButton variant="secondary" size="sm" onClick={() => joinInvite(sel)}>바로 입장</VRButton>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
