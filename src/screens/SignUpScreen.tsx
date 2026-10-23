import { useState } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import { api } from '../lib/api'
import MagicCircle from '../components/MagicCircle'
import Particles from '../components/Particles'
import MagicInput from '../components/MagicInput'

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconEmail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M2 7l10 7 10-7"/>
  </svg>
)
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="5" y="11" width="14" height="10" rx="2"/>
    <path d="M8 11V7a4 4 0 018 0v4"/>
    <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
)
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
)
const IconEye = ({ open }: { open: boolean }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

const StrengthBar = ({ password }: { password: string }) => {
  const score = (() => {
    if (password.length === 0) return 0
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  })()
  const labels = ['', '약함', '보통', '강함', '매우 강함']
  const colors = ['', '#ef4444', '#f97316', '#06b6d4', '#22c55e']
  if (!password) return null
  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i <= score ? colors[score] : 'rgba(124,58,237,0.15)', boxShadow: i <= score ? `0 0 6px ${colors[score]}80` : 'none' }} />
        ))}
      </div>
      <span className="text-[11px] font-[Rajdhani] font-semibold" style={{ color: colors[score] }}>
        비밀번호 강도: {labels[score]}
      </span>
    </div>
  )
}

export default function SignUpScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreeAge, setAgreeAge] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [serverError, setServerError] = useState('')
  const { signUp, toast } = useApp()

  const validate = () => {
    const e: Record<string,string> = {}
    if (!/^[A-Za-z0-9가-힣_]{2,12}$/.test(nickname.trim())) e.nickname = '닉네임은 2~12자, 한글·영문·숫자·_ 만 사용할 수 있습니다.'
    if (!email.includes('@')) e.email = '올바른 이메일을 입력해주세요.'
    if (password.length < 6) e.password = '비밀번호는 6자 이상이어야 합니다.'
    if (confirm !== password) e.confirm = '비밀번호가 일치하지 않습니다.'
    if (!agreeTerms) e.terms = '필수 약관에 동의해주세요.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSignUp = async () => {
    if (loading || !validate()) return
    setLoading(true)
    setServerError('')
    try {
      const nick = nickname.trim()
      if (!(await api.isNicknameAvailable(nick))) {
        setErrors(prev => ({ ...prev, nickname: '이미 사용 중인 닉네임입니다.' }))
        return
      }
      const r = await signUp(email.trim(), password, nick)
      if (r.needsConfirm) {
        toast('인증 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해주세요.', 'success')
        onNav('login')
      } else {
        toast(`${nick} 마법사님, 환영합니다!`, 'success')
        onNav('lobby')
      }
    } catch (e) {
      setServerError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(10,30,50,0.65) 0%, rgba(6,6,15,1) 68%)'
      }} />

      {/* Magic circle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15">
        <MagicCircle size={720} />
      </div>

      <Particles count={12} />

      {/* Cyan ambient glow (theme contrast to login's purple) */}
      <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full opacity-8 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5), transparent 70%)', filter: 'blur(70px)' }} />
      <div className="absolute bottom-1/4 left-1/4 w-60 h-60 rounded-full opacity-8 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.5), transparent 70%)', filter: 'blur(60px)' }} />

      {/* Card — slightly wider for the extra fields */}
{/* 낮은 화면에서는 스크롤, 충분하면 세로 가운데 정렬 */}
      <div className="absolute inset-0 z-10 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-[520px] flex flex-col gap-7"
        style={{
          background: 'rgba(6,4,22,0.88)',
          border: '1px solid rgba(6,182,212,0.22)',
          borderRadius: 8,
          boxShadow: '0 0 60px rgba(6,182,212,0.12), 0 24px 80px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(16px)',
          padding: '44px 52px',
        }}
      >
        {/* Cyan-tinted corner accents (vs. purple for login) */}
        {['top-0 left-0 border-t border-l','top-0 right-0 border-t border-r','bottom-0 left-0 border-b border-l','bottom-0 right-0 border-b border-r'].map((c,i)=>(
          <span key={i} className={`absolute ${c} border-cyan-500/40 w-5 h-5`} />
        ))}

        {/* Header */}
        <div className="text-center flex flex-col items-center gap-1.5">
          <div className="text-[10px] tracking-[0.5em] font-[Rajdhani] font-semibold text-purple-500 uppercase">Join the Realm</div>
          <h1 className="font-[Cinzel] font-black leading-tight"
            style={{
              fontSize: 30,
              background: 'linear-gradient(135deg, #a5f3fc 0%, #06b6d4 45%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 14px rgba(6,182,212,0.6))',
            }}>
            마법사 등록
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-cyan-600 opacity-60" />
            <div className="w-1.5 h-1.5 rotate-45 bg-cyan-500 opacity-80" />
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-purple-600 opacity-60" />
          </div>
          <p className="text-sm font-[Rajdhani] text-purple-500 tracking-wide">새 계정을 생성하고 전장에 참여하세요</p>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4">
          <MagicInput
            label="마법사 이름 (닉네임)"
            icon={<IconUser />}
            placeholder="Arcane_Wizard"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            error={errors.nickname}
            hint="2~12자, 한글·영문·숫자·_ 사용 가능"
            autoComplete="username"
          />
          <MagicInput
            label="이메일"
            icon={<IconEmail />}
            type="email"
            placeholder="wizard@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
          />
          <div className="flex flex-col gap-1">
            <MagicInput
              label="비밀번호"
              icon={<IconLock />}
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="new-password"
              rightSlot={
                <button type="button" onClick={() => setShowPw(v => !v)} className="text-purple-500 hover:text-cyan-400 transition-colors duration-200">
                  <IconEye open={showPw} />
                </button>
              }
            />
            <StrengthBar password={password} />
          </div>
          <MagicInput
            label="비밀번호 확인"
            icon={<IconShield />}
            type={showCf ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            error={errors.confirm}
            autoComplete="new-password"
            rightSlot={
              <button type="button" onClick={() => setShowCf(v => !v)} className="text-purple-500 hover:text-cyan-400 transition-colors duration-200">
                <IconEye open={showCf} />
              </button>
            }
          />
        </div>

        {/* Agreements */}
        <div className="flex flex-col gap-2.5">
          {errors.terms && (
            <p className="text-xs font-[Rajdhani] text-red-400 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              {errors.terms}
            </p>
          )}
          <CheckRow
            checked={agreeTerms}
            onChange={() => setAgreeTerms(v => !v)}
            error={!!errors.terms}
          >
            <span className="text-purple-300">[필수] </span>
            <button className="text-cyan-400 hover:text-cyan-300 underline transition-colors">이용약관</button>
            <span className="text-purple-400"> 및 </span>
            <button className="text-cyan-400 hover:text-cyan-300 underline transition-colors">개인정보처리방침</button>
            <span className="text-purple-400">에 동의합니다.</span>
          </CheckRow>
          <CheckRow checked={agreeAge} onChange={() => setAgreeAge(v => !v)}>
            <span className="text-purple-500">[선택] 마케팅 정보 수신에 동의합니다.</span>
          </CheckRow>
        </div>

        {serverError && (
          <div role="alert" className="-mt-3 px-4 py-3 rounded border border-red-500/40 bg-red-950/30 text-sm font-[Rajdhani] text-red-300">
            {serverError}
          </div>
        )}

        {/* Sign up button */}
        <button
          onClick={handleSignUp}
          disabled={loading}
          className="w-full py-4 font-[Cinzel] font-bold text-lg tracking-widest uppercase relative overflow-hidden transition-all duration-200 rounded-sm border disabled:opacity-60"
          style={{
            background: 'rgba(6,182,212,0.18)',
            borderColor: 'rgba(6,182,212,0.6)',
            color: '#cffafe',
            boxShadow: '0 0 20px rgba(6,182,212,0.3)',
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 35px rgba(6,182,212,0.6), 0 0 60px rgba(6,182,212,0.25)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(6,182,212,0.3)' }}
        >
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-400/60" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-400/60" />
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-4 h-4 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
              계정 생성 중…
            </span>
          ) : '마법사 등록하기'}
        </button>

        {/* Login link */}
        <p className="text-center text-sm font-[Rajdhani] text-purple-600 -mt-2">
          이미 계정이 있으신가요?{' '}
          <button onClick={() => onNav('login')} className="text-purple-400 hover:text-purple-200 font-semibold tracking-wide transition-colors duration-200">
            로그인
          </button>
        </p>
      </div>

              </div>
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-purple-800/40 text-[10px] font-[Rajdhani] tracking-[0.3em] uppercase">
        Sign Up Screen · 1920 × 1080
      </div>
    </div>
  )
}

function CheckRow({ checked, onChange, children, error = false }: {
  checked: boolean; onChange: () => void; children: React.ReactNode; error?: boolean
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button
        type="button"
        onClick={onChange}
        className="mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-sm border transition-all duration-200"
        style={{
          background: checked ? 'rgba(124,58,237,0.3)' : 'rgba(0,0,0,0.4)',
          borderColor: error ? '#ef4444' : checked ? 'rgba(124,58,237,0.8)' : 'rgba(124,58,237,0.3)',
          boxShadow: checked ? '0 0 8px rgba(124,58,237,0.5)' : 'none',
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <span className="text-sm font-[Rajdhani] leading-relaxed">{children}</span>
    </label>
  )
}
