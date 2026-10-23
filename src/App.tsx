import { useEffect, useState } from 'react'
import { AppProvider, useApp } from './lib/store'
import { CANVASES, type Screen } from './lib/nav'
import LoginScreen from './screens/LoginScreen'
import SignUpScreen from './screens/SignUpScreen'
import LobbyScreen from './screens/LobbyScreen'
import MyPageScreen from './screens/MyPageScreen'
import SettingsScreen from './screens/SettingsScreen'
import FriendsScreen from './screens/FriendsScreen'
import RoomScreen from './screens/RoomScreen'
import MailboxScreen from './screens/MailboxScreen'
import RankingScreen from './screens/RankingScreen'
import SpellbookScreen from './screens/SpellbookScreen'
import QueueScreen from './screens/QueueScreen'
import CountdownScreen from './screens/CountdownScreen'
import BattleScreen from './screens/BattleScreen'
import ResultScreen from './screens/ResultScreen'

export type { Screen }

const PUBLIC: Screen[] = ['login', 'signup']

function Screens({ screen, onNav }: { screen: Screen; onNav: (s: Screen) => void }) {
  switch (screen) {
    case 'login':     return <LoginScreen onNav={onNav} />
    case 'signup':    return <SignUpScreen onNav={onNav} />
    case 'lobby':     return <LobbyScreen onNav={onNav} />
    case 'mypage':    return <MyPageScreen onNav={onNav} />
    case 'settings':  return <SettingsScreen onNav={onNav} />
    case 'friends':   return <FriendsScreen onNav={onNav} />
    case 'room':      return <RoomScreen onNav={onNav} />
    case 'mailbox':   return <MailboxScreen onNav={onNav} />
    case 'ranking':   return <RankingScreen onNav={onNav} />
    case 'spellbook': return <SpellbookScreen onNav={onNav} />
    case 'queue':     return <QueueScreen onNav={onNav} />
    case 'countdown': return <CountdownScreen onNav={onNav} />
    case 'battle':    return <BattleScreen onNav={onNav} />
    case 'result':    return <ResultScreen onNav={onNav} />
  }
}

function Root() {
  const { ready, user, toasts, dismissToast, backend } = useApp()
  const [screen, setScreen] = useState<Screen>('login')
  const [devOpen, setDevOpen] = useState(false)

  // 로그인하지 않은 상태에서는 인증 화면만 접근 가능, 로그인 후 인증 화면에 남아 있으면 로비로
  useEffect(() => {
    if (!ready) return
    if (!user && !PUBLIC.includes(screen)) setScreen('login')
    if (user && PUBLIC.includes(screen)) setScreen('lobby')
  }, [ready, user, screen])

  if (!ready) {
    return <div className="w-screen h-screen bg-[#06060f] flex items-center justify-center font-[Cinzel] text-purple-300 tracking-widest">LOADING…</div>
  }

  const current = screen === 'signup' ? 'login' : screen

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#06060f] relative">
      {/* 개발/QA 화면 이동 (캔버스 13종) */}
      <div className="absolute top-2 left-2 z-[60] flex items-center gap-1 flex-wrap max-w-[calc(100vw-1rem)]">
        <button onClick={() => setDevOpen(v => !v)}
          className="px-3 py-1 rounded-full text-[11px] font-bold tracking-widest font-[Rajdhani] bg-black/70 border border-purple-900/50 text-purple-400 hover:text-white">
          {devOpen ? '✕' : '☰'} DEV · {backend === 'mock' ? 'Mock' : backend === 'server' ? '서버' : 'Supabase'}
        </button>
        {devOpen && (
          <div className="flex items-center gap-1 flex-wrap bg-black/80 backdrop-blur-sm border border-purple-900/40 rounded-full px-2 py-1">
            {CANVASES.map(c => (
              <button key={c.id} onClick={() => setScreen(c.id)}
                disabled={!user && !PUBLIC.includes(c.id)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold font-[Rajdhani] transition-all disabled:opacity-30 ${current === c.id ? 'bg-purple-700 text-white' : 'text-purple-400 hover:text-white hover:bg-purple-900/40'}`}>
                {c.no}. {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Screens screen={screen} onNav={setScreen} />

      {/* 토스트 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 items-center pointer-events-none" aria-live="polite">
        {toasts.map(t => (
          <button key={t.id} onClick={() => dismissToast(t.id)}
            className="pointer-events-auto px-6 py-3 rounded border font-[Rajdhani] text-base font-semibold shadow-lg backdrop-blur"
            style={{
              color: t.tone === 'error' ? '#fecaca' : t.tone === 'success' ? '#a7f3d0' : '#e8e4ff',
              borderColor: t.tone === 'error' ? 'rgba(239,68,68,0.6)' : t.tone === 'success' ? 'rgba(52,211,153,0.6)' : 'rgba(124,58,237,0.6)',
              background: t.tone === 'error' ? 'rgba(60,10,10,0.92)' : t.tone === 'success' ? 'rgba(6,50,40,0.92)' : 'rgba(20,10,50,0.92)',
            }}>
            {t.msg}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  )
}
