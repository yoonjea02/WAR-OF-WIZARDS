import { useState } from 'react'
import VRButton from './VRButton'

// 구글 로그인으로 처음 들어온 사용자가 마법사 닉네임을 정하는 창 (임시 닉네임 Wiz_xxxxxx 를 바꾼다)
export default function NicknameDialog({ current, onSave, onLater }: { current: string; onSave: (nick: string) => Promise<void>; onLater: () => void }) {
  const [nick, setNick] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const n = nick.trim()
    if (!/^[A-Za-z0-9가-힣_]{2,12}$/.test(n)) { setErr('닉네임은 2~12자, 한글·영문·숫자·_ 만 사용할 수 있습니다.'); return }
    setBusy(true); setErr('')
    try { await onSave(n) }
    catch (e) { setErr((e as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="닉네임 설정">
      <div className="w-[460px] rounded-lg border border-purple-600/50 bg-[#0b0820] p-8 flex flex-col gap-4 shadow-[0_0_60px_rgba(124,58,237,0.35)]">
        <div>
          <div className="text-[11px] tracking-[0.4em] font-[Rajdhani] text-cyan-400 uppercase">Welcome, Wizard</div>
          <h3 className="font-[Cinzel] font-bold text-2xl text-purple-100 mt-1">닉네임 설정</h3>
        </div>
        <p className="font-[Rajdhani] text-base text-purple-300 leading-relaxed">
          구글 계정으로 처음 오셨네요! 대전에서 쓸 마법사 이름을 정해주세요.<br />
          지금은 임시 닉네임 <b className="text-amber-300">{current}</b> 입니다.
        </p>
        <input
          autoFocus value={nick} onChange={e => setNick(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void submit() }}
          placeholder="Arcane_Wizard" aria-label="새 닉네임"
          className="bg-black/40 border border-purple-700/40 rounded px-4 py-3 text-lg font-[Rajdhani] text-purple-100 placeholder-purple-800 outline-none focus:border-cyan-500/70"
        />
        <div className="text-sm font-[Rajdhani] text-purple-500">2~12자 · 한글/영문/숫자/_ 사용 가능</div>
        {err && <div role="alert" className="px-3 py-2 rounded border border-red-500/40 bg-red-950/30 text-sm font-[Rajdhani] text-red-300">{err}</div>}
        <div className="flex gap-3 justify-end pt-1">
          <VRButton variant="ghost" size="sm" onClick={onLater} disabled={busy}>나중에</VRButton>
          <VRButton variant="primary" size="md" onClick={submit} disabled={busy}>{busy ? '저장 중…' : '저장'}</VRButton>
        </div>
      </div>
    </div>
  )
}
