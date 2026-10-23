import { useState } from 'react'
import type { Screen } from '../lib/nav'
import MagicCircle from '../components/MagicCircle'
import Particles from '../components/Particles'
import VRButton from '../components/VRButton'
import MagicInput from '../components/MagicInput'
import { useApp } from '../lib/store'
import { api } from '../lib/api'

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
const IconEye = ({ open }: { open: boolean }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const IconGoogle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export default function LoginScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [pwError, setPwError] = useState('')
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const { signIn, signInWithGoogle, demoLogin, toast, backend } = useApp()

  const validate = () => {
    let ok = true
    if (!email.includes('@')) { setEmailError('올바른 이메일 주소를 입력해주세요.'); ok = false } else setEmailError('')
    if (password.length < 6) { setPwError('비밀번호는 6자 이상이어야 합니다.'); ok = false } else setPwError('')
    return ok
  }

  const handleLogin = async () => {
    if (loading || !validate()) return
    setLoading(true)
    setServerError('')
    try {
      await signIn(email.trim(), password)
      onNav('lobby')
    } catch (e) {
      setServerError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleDemo = async () => {
    setLoading(true)
    setServerError('')
    try { await demoLogin(); onNav('lobby') }
    catch (e) { setServerError((e as Error).message) }
    finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    try { await signInWithGoogle() }
    catch (e) { toast((e as Error).message, 'error') }
  }

  const handleReset = async () => {
    if (!email.includes('@')) { setEmailError('비밀번호를 재설정할 이메일을 먼저 입력해주세요.'); return }
    try {
      await api.resetPassword(email.trim())
      toast('비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요.', 'success')
    } catch (e) { toast((e as Error).message, 'error') }
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(40,10,80,0.65) 0%, rgba(6,6,15,1) 68%)'
      }} />

      {/* Magic circle — subtle, centered */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
        <MagicCircle size={700} />
      </div>

      {/* Low-density particles */}
      <Particles count={14} />

      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full opacity-8 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.6), transparent 70%)', filter: 'blur(70px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full opacity-8 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5), transparent 70%)', filter: 'blur(60px)' }} />

      {/* Card */}
{/* 낮은 화면에서는 스크롤, 충분하면 세로 가운데 정렬 */}
      <div className="absolute inset-0 z-10 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-[480px] flex flex-col gap-8"
        style={{
          background: 'rgba(8,6,24,0.85)',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 8,
          boxShadow: '0 0 60px rgba(124,58,237,0.15), 0 24px 80px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(16px)',
          padding: '48px 52px',
        }}
      >
        {/* Corner accents */}
        {['top-0 left-0 border-t border-l','top-0 right-0 border-t border-r','bottom-0 left-0 border-b border-l','bottom-0 right-0 border-b border-r'].map((c,i)=>(
          <span key={i} className={`absolute ${c} border-purple-500/50 w-5 h-5`} />
        ))}

        {/* Logo */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="text-[10px] tracking-[0.5em] font-[Rajdhani] font-semibold text-cyan-500 uppercase">VR Magic Battle</div>
          <h1 className="font-[Cinzel] font-black leading-tight"
            style={{
              fontSize: 32,
              background: 'linear-gradient(135deg, #c4b5fd 0%, #7c3aed 45%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 16px rgba(124,58,237,0.7))',
            }}>
            War of Wizards
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-600 opacity-60" />
            <div className="w-1.5 h-1.5 rotate-45 bg-purple-500 opacity-80" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-600 opacity-60" />
          </div>
          <p className="text-sm font-[Rajdhani] text-purple-500 tracking-wide mt-1">마법사 계정으로 로그인</p>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4">
          <MagicInput
            label="이메일"
            icon={<IconEmail />}
            type="email"
            placeholder="wizard@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={emailError}
            autoComplete="email"
          />
          <MagicInput
            label="비밀번호"
            icon={<IconLock />}
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={pwError}
            autoComplete="current-password"
            onKeyDown={e => { if (e.key === 'Enter') void handleLogin() }}
            rightSlot={
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="text-purple-500 hover:text-cyan-400 transition-colors duration-200">
                <IconEye open={showPw} />
              </button>
            }
          />
          <div className="flex justify-end -mt-1">
            <button type="button" onClick={handleReset} className="text-sm font-[Rajdhani] text-purple-500 hover:text-cyan-400 transition-colors duration-200 tracking-wide">
              비밀번호를 잊으셨나요?
            </button>
          </div>
        </div>

        {serverError && (
          <div role="alert" className="-mt-4 px-4 py-3 rounded border border-red-500/40 bg-red-950/30 text-sm font-[Rajdhani] text-red-300">
            {serverError}
          </div>
        )}

        {/* Login button */}
        <div className="flex flex-col gap-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 font-[Cinzel] font-bold text-lg tracking-widest uppercase relative overflow-hidden transition-all duration-200 rounded-sm border disabled:opacity-60"
            style={{
              background: loading ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.35)',
              borderColor: 'rgba(124,58,237,0.7)',
              color: '#e8e4ff',
              boxShadow: '0 0 20px rgba(124,58,237,0.4)',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 35px rgba(124,58,237,0.7), 0 0 60px rgba(124,58,237,0.3)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(124,58,237,0.4)' }}
          >
            {/* Corner accents */}
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-purple-400/60" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-purple-400/60" />
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-4 h-4 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" />
                주문 시전 중…
              </span>
            ) : '로그인'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-purple-900/50" />
            <span className="text-xs font-[Rajdhani] text-purple-600 tracking-widest">또는</span>
            <div className="flex-1 h-px bg-purple-900/50" />
          </div>

          {/* Google login */}
          <button
            type="button" onClick={handleGoogle}
            className="w-full py-3.5 flex items-center justify-center gap-3 font-[Rajdhani] font-semibold text-base tracking-wide text-purple-200 rounded-sm border transition-all duration-200 hover:border-purple-600/50 hover:bg-purple-950/40"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(124,58,237,0.2)' }}
          >
            <IconGoogle />
            Google 계정으로 계속하기
          </button>
          {backend === 'mock' && (
            <button type="button" onClick={handleDemo} disabled={loading}
              className="text-sm font-[Rajdhani] text-cyan-500 hover:text-cyan-300 tracking-wide transition-colors disabled:opacity-50">
              데모 계정으로 바로 시작 (Mock 모드)
            </button>
          )}
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm font-[Rajdhani] text-purple-600">
          계정이 없으신가요?{' '}
          <button onClick={() => onNav('signup')} className="text-cyan-400 hover:text-cyan-300 font-semibold tracking-wide transition-colors duration-200">
            회원가입
          </button>
        </p>
      </div>

              </div>
      </div>

      {/* Frame label */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-purple-800/40 text-[10px] font-[Rajdhani] tracking-[0.3em] uppercase">
        캔버스 1 · 로그인
      </div>
    </div>
  )
}
