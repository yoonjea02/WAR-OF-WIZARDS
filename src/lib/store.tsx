import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { api } from './api'
import type { AuthUser, MailItem, MatchMode, MatchRecord, Profile } from './types'
import type { BattleStats } from './battleSim'
import { validateDeck } from '../data/skills'
import { isTempNickname, readOAuthError } from './oauthError'

// ── 설정 (캔버스 4: 환경설정) ─────────────────────────────────────────────
export interface Settings {
  camSensitivity: number
  comfortVignette: boolean
  snapTurning: boolean
  sfx: number
  bgm: number
  spatialAudio: boolean
  gestureSensitivity: number
  holdFrames: number
  haptics: boolean
  subtitles: boolean
  uiLarge: boolean
  colorblind: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  camSensitivity: 65, comfortVignette: true, snapTurning: false,
  sfx: 80, bgm: 45, spatialAudio: true,
  gestureSensitivity: 70, holdFrames: 15, haptics: true,
  subtitles: false, uiLarge: true, colorblind: false,
}
const SETTINGS_KEY = 'wow.settings.v1'

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* 손상된 값 무시 */ }
  return DEFAULT_SETTINGS
}

// ── 매치 ────────────────────────────────────────────────────────────────
export interface Opponent { name: string; rating: number; isBot: boolean }

export interface LastMatch {
  result: 'win' | 'lose'
  reason: string
  stats: BattleStats
  durationSec: number
  opponent: string
  mode: MatchMode
  record?: MatchRecord
  saveError?: string
}

export interface RoomInfo { code: string; role: 'host' | 'guest'; hostName: string }

export interface ToastItem { id: number; msg: string; tone: 'info' | 'error' | 'success' }

interface Ctx {
  backend: 'mock' | 'supabase' | 'server'
  ready: boolean
  user: AuthUser | null
  profile: Profile | null
  needsNickname: boolean
  deck: string[]
  mails: MailItem[]
  unread: number
  online: string[]
  settings: Settings
  matchMode: MatchMode
  room: RoomInfo | null
  opponent: Opponent | null
  lastMatch: LastMatch | null
  toasts: ToastItem[]

  toast: (msg: string, tone?: ToastItem['tone']) => void
  dismissToast: (id: number) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, nickname: string) => Promise<{ needsConfirm: boolean }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  demoLogin: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateNickname: (nickname: string) => Promise<void>
  refreshMails: () => Promise<void>
  markMailRead: (m: MailItem) => Promise<void>
  saveDeck: (ids: string[]) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
  beginMatch: (mode: MatchMode, opponent: Opponent) => void
  setRoom: (r: RoomInfo | null) => void
  finishMatch: (r: { result: 'win' | 'lose'; reason: string; stats: BattleStats; durationSec: number }) => void
}

const AppCtx = createContext<Ctx | null>(null)

export function useApp(): Ctx {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp 은 AppProvider 안에서만 사용할 수 있습니다.')
  return c
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [deck, setDeck] = useState<string[]>([])
  const [mails, setMails] = useState<MailItem[]>([])
  const [online, setOnline] = useState<string[]>([])
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [matchMode, setMatchMode] = useState<MatchMode>('bot')
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [opponent, setOpponent] = useState<Opponent | null>(null)
  const [lastMatch, setLastMatch] = useState<LastMatch | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)
  const matchCtx = useRef<{ mode: MatchMode; opponent: string } | null>(null)
  const finished = useRef(false)

  const toast = useCallback((msg: string, tone: ToastItem['tone'] = 'info') => {
    const id = ++toastId.current
    setToasts(t => [...t.slice(-3), { id, msg, tone }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3600)
  }, [])
  const dismissToast = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), [])

  const loadUserData = useCallback(async (u: AuthUser) => {
    const [p, d, m] = await Promise.all([api.getProfile(u.id), api.loadDeck(u.id), api.listMail(u.id)])
    setProfile(p); setDeck(d); setMails(m)
  }, [])

  // 앱 시작 시 세션 복구
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // 구글 로그인에 실패해 돌아온 경우: 오류를 안내하고 주소에서 오류 정보를 지운다
        const oauthErr = readOAuthError(window.location.hash, window.location.search)
        if (oauthErr) {
          toast(oauthErr, 'error')
          window.history.replaceState(null, '', window.location.pathname)
        }
        const u = await api.getSession()
        if (u && alive) { await loadUserData(u); if (alive) setUser(u) }
      } catch (e) {
        console.warn('세션 복구 실패', e)
      } finally {
        if (alive) setReady(true)
      }
    })()
    return () => { alive = false }
  }, [loadUserData, toast])

  // 접속 상태(Presence) 구독
  useEffect(() => {
    if (!user) { setOnline([]); return }
    return api.subscribePresence(user.id, setOnline)
  }, [user])

  // 설정 적용 (UI 크기)
  useEffect(() => {
    document.documentElement.style.fontSize = settings.uiLarge ? '18px' : '16px'
  }, [settings.uiLarge])

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await api.signIn(email, password)
    await loadUserData(u)   // 프로필·덱·우편을 먼저 채운 뒤 로그인 상태로 전환 (로비가 빈 값으로 먼저 그려지는 것 방지)
    setUser(u)
  }, [loadUserData])

  // 구글 로그인: 서버 모드에서는 팝업 → 서버 JWT 발급까지 끝나고 돌아오고, Supabase 모드에서는 구글 화면으로 이동한다(돌아오면 앱 시작 시 세션이 복원됨)
  const signInWithGoogle = useCallback(async () => {
    await api.signInWithGoogle()
    const u = await api.getSession()
    if (u) { await loadUserData(u); setUser(u) }
  }, [loadUserData])

  const signUp = useCallback(async (email: string, password: string, nickname: string) => {
    const r = await api.signUp(email, password, nickname)
    if (r.needsConfirm) return { needsConfirm: true }
    await signIn(email, password)
    return { needsConfirm: false }
  }, [signIn])

  const signOut = useCallback(async () => {
    await api.signOut()
    setUser(null); setProfile(null); setDeck([]); setMails([])
    setRoom(null); setOpponent(null); setLastMatch(null)
  }, [])

  const demoLogin = useCallback(async () => { await signIn('demo@wow.dev', 'demo1234') }, [signIn])

  const refreshProfile = useCallback(async () => {
    if (user) setProfile(await api.getProfile(user.id))
  }, [user])

  const updateNickname = useCallback(async (nickname: string) => {
    if (!user) throw new Error('로그인이 필요합니다.')
    await api.updateNickname(user.id, nickname)
    setProfile(await api.getProfile(user.id))
  }, [user])

  const refreshMails = useCallback(async () => {
    if (user) setMails(await api.listMail(user.id))
  }, [user])

  const markMailRead = useCallback(async (m: MailItem) => {
    if (!user || m.read) return
    setMails(list => list.map(x => (x.id === m.id ? { ...x, read: true } : x)))
    try { await api.markMailRead(user.id, m) } catch (e) { toast((e as Error).message, 'error') }
  }, [user, toast])

  const saveDeck = useCallback(async (ids: string[]) => {
    if (!user) throw new Error('로그인이 필요합니다.')
    const err = validateDeck(ids)
    if (err) throw new Error(err)
    await api.saveDeck(user.id, ids)
    setDeck([...ids])
  }, [user])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(s => {
      const n = { ...s, ...patch }
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(n)) } catch { /* 저장 실패 무시 */ }
      return n
    })
  }, [])
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS)) } catch { /* 무시 */ }
  }, [])

  const beginMatch = useCallback((mode: MatchMode, opp: Opponent) => {
    setMatchMode(mode)
    setOpponent(opp)
    matchCtx.current = { mode, opponent: opp.name }
    finished.current = false
    setLastMatch(null)
  }, [])

  const finishMatch = useCallback((r: { result: 'win' | 'lose'; reason: string; stats: BattleStats; durationSec: number }) => {
    if (finished.current) return
    finished.current = true
    const ctx = matchCtx.current ?? { mode: 'bot' as MatchMode, opponent: 'Bot' }
    const base: LastMatch = { ...r, opponent: ctx.opponent, mode: ctx.mode }
    setLastMatch(base)
    if (!user) return
    api.recordMatch(user.id, {
      mode: ctx.mode, result: r.result, opponent: ctx.opponent,
      durationSec: r.durationSec, casts: r.stats.casts,
    }).then(async rec => {
      setLastMatch(m => (m ? { ...m, record: rec } : m))
      setProfile(await api.getProfile(user.id))
    }).catch(e => {
      setLastMatch(m => (m ? { ...m, saveError: (e as Error).message } : m))
    })
  }, [user])

  const unread = useMemo(() => mails.filter(m => !m.read).length, [mails])

  const value: Ctx = {
    backend: api.mode, ready, user, profile, needsNickname: isTempNickname(profile?.nickname), deck, mails, unread, online, settings,
    matchMode, room, opponent, lastMatch, toasts,
    toast, dismissToast, signIn, signUp, signOut, signInWithGoogle, demoLogin, refreshProfile, updateNickname, refreshMails, markMailRead,
    saveDeck, updateSettings, resetSettings, beginMatch, setRoom, finishMatch,
  }
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
