import type { Api, AuthUser, FriendEntry, MailItem, MatchMode, MatchRecord, Profile, RankEntry } from './types'

// ── Python 백엔드(Backend/wow_server.py) 연동 ───────────────────────────────
// 서버 API 는 Docs/Backend/WebUiServer.md 와 wow_server.py 를 기준으로 구현했다.
//
// 구글 로그인:
//   1) GET  /api/auth/config            → { googleClientId, googleEnabled }
//   2) 프론트가 구글 팝업으로 access_token 을 받는다 (Google Identity Services)
//   3) POST /api/auth/google  { accessToken }
//        → { accessToken(서버 JWT), userId, email, role, playerId, nickname }
//   4) 이후 모든 API 는 Authorization: Bearer {JWT}  (토큰 키: localStorage 'wow.spring.token' — 서버 웹 화면 · Unity WebGL 과 같은 키)
//
// 사용자 id 는 서버의 playerId 다 (프로필 · 덱 · 친구 · 전적 모두 playerId 기준).

export interface ServerSession {
  accessToken: string
  userId: string | number
  email: string
  role?: string
  playerId?: string | number | null
  nickname?: string
}

const TOKEN_KEY = 'wow.spring.token'
const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client'

// ── HTTP 공통: Bearer 토큰 자동 부착, 서버 오류 메시지 해석 ──
function messageOf(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    for (const k of ['message', 'error', 'detail', 'msg']) if (typeof b[k] === 'string' && b[k]) return b[k] as string
  }
  if (typeof body === 'string' && body.trim()) return body.trim().slice(0, 200)
  if (status === 401) return '로그인이 필요하거나 만료되었습니다.'
  if (status === 403) return '권한이 없습니다.'
  return `서버 오류 (${status})`
}

export interface Http {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  put<T>(path: string, body?: unknown): Promise<T>
  del<T>(path: string): Promise<T>
}

export function createHttp(baseUrl: string, getToken: () => string | null, fetchImpl: typeof fetch = (i, o) => fetch(i, o)): Http {
  const base = baseUrl.replace(/\/+$/, '')
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    let res: Response
    try {
      res = await fetchImpl(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    } catch {
      throw new Error('서버에 연결할 수 없습니다. 서버가 실행 중인지, 서버 주소(VITE_API_BASE · API_TARGET)와 CORS 설정을 확인해주세요.')
    }
    const text = await res.text()
    let data: unknown = text
    try { data = text ? JSON.parse(text) : null } catch { /* 텍스트 응답 */ }
    if (!res.ok) throw Object.assign(new Error(messageOf(data, res.status)), { status: res.status })
    return data as T
  }
  return { get: p => request('GET', p), post: (p, b) => request('POST', p, b), put: (p, b) => request('PUT', p, b), del: p => request('DELETE', p) }
}

// ── 구글 팝업으로 access_token 받기 (Google Identity Services) ──
interface GisTokenResponse { access_token?: string; error?: string; error_description?: string }
interface GisClient { requestAccessToken(o?: { prompt?: string }): void }
interface GisApi {
  accounts?: { oauth2?: { initTokenClient(c: {
    client_id: string; scope: string
    callback: (r: GisTokenResponse) => void
    error_callback?: (e: { type?: string; message?: string }) => void
  }): GisClient } }
}
const gis = (): GisApi | undefined => (globalThis as unknown as { google?: GisApi }).google
const hasGis = () => !!gis()?.accounts?.oauth2

let scriptPromise: Promise<void> | null = null
export function loadGoogleScript(): Promise<void> {
  if (hasGis()) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GOOGLE_SCRIPT
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => { scriptPromise = null; reject(new Error('구글 로그인 스크립트를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.')) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

export async function requestGoogleAccessToken(clientId: string): Promise<string> {
  await loadGoogleScript()
  const oauth2 = gis()?.accounts?.oauth2
  if (!oauth2) throw new Error('구글 로그인을 사용할 수 없습니다.')
  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: r => {
        if (r.access_token) resolve(r.access_token)
        else reject(new Error(r.error_description || r.error || '구글 로그인에 실패했습니다.'))
      },
      error_callback: e => {
        reject(new Error(e.type === 'popup_closed' ? '구글 로그인 창이 닫혔습니다.'
          : e.type === 'popup_failed_to_open' ? '팝업이 차단되었습니다. 브라우저에서 이 사이트의 팝업을 허용해주세요.'
          : (e.message || '구글 로그인에 실패했습니다.')))
      },
    })
    client.requestAccessToken({ prompt: 'select_account' })   // 매번 계정 선택
  })
}

// ── 서버 API ──
export interface ServerDeps {
  storage?: Storage
  fetchImpl?: typeof fetch
  /** 테스트용: 구글 팝업 대신 토큰을 돌려주는 함수 */
  requestGoogleToken?: (clientId: string) => Promise<string>
}
export interface AuthConfig { googleClientId: string; googleEnabled?: boolean }
export type ServerApi = Api & { http: Http; getAuthConfig(): Promise<AuthConfig> }

// 서버 시간 "2026-10-13 09:12:00"(UTC) → ISO 문자열
const iso = (t?: string | null) => {
  if (!t) return new Date().toISOString()
  return /Z$|[+-]\d\d:?\d\d$/.test(t) ? t : `${t.replace(' ', 'T')}Z`
}

const modeOf = (m: string | undefined): MatchMode => {
  const s = String(m ?? '').toLowerCase()
  if (['ranked', 'matchmaking', 'rank'].includes(s)) return 'ranked'
  return s.includes('bot') ? 'bot' : 'friendly'
}

interface AuthRes { accessToken?: string; userId?: number; email: string; role?: string; playerId?: number | null; nickname?: string }
interface PlayerRes { id: number; nickname: string; rating: number; wins: number; losses: number }

export function createServerApi(baseUrl: string, deps: ServerDeps = {}): ServerApi {
  const storage = deps.storage ?? globalThis.localStorage
  const getToken = () => { try { return storage.getItem(TOKEN_KEY) } catch { return null } }
  const setToken = (t: string | null | undefined) => { try { t ? storage.setItem(TOKEN_KEY, t) : storage.removeItem(TOKEN_KEY) } catch { /* 저장 불가(사생활 모드) */ } }
  const http = createHttp(baseUrl, getToken, deps.fetchImpl)

  // 로그인 이후 요청이 401 이면 토큰이 만료·무효이므로 지운다
  const call = async <T,>(fn: () => Promise<T>): Promise<T> => {
    try { return await fn() }
    catch (e) { if ((e as { status?: number }).status === 401 && getToken()) setToken(null); throw e }
  }

  const toUser = (a: AuthRes): AuthUser => {
    if (a.playerId === undefined || a.playerId === null) {
      setToken(null)
      throw new Error('이 계정에는 플레이어 정보가 없습니다. (관리자 계정은 서버 관리자 콘솔 #/admin 에서 로그인하세요)')
    }
    return { id: String(a.playerId), email: a.email }
  }
  const login = (a: AuthRes): AuthUser => {
    if (!a.accessToken) throw new Error('서버 응답에 로그인 토큰이 없습니다.')
    setToken(a.accessToken)
    return toUser(a)
  }

  let cfg: Promise<AuthConfig> | null = null
  const getAuthConfig = () => (cfg ??= http.get<AuthConfig>('/api/auth/config').catch(e => { cfg = null; throw e }))

  // 버튼을 누르는 순간 팝업이 막히지 않도록 설정·스크립트를 미리 받아둔다
  if (typeof window !== 'undefined' && !deps.requestGoogleToken) {
    void getAuthConfig().catch(() => {})
    void loadGoogleScript().catch(() => {})
  }

  return {
    mode: 'server',
    http,
    getAuthConfig,

    // ── 인증 ──
    async getSession() {
      if (!getToken()) return null
      try {
        const a = await http.get<AuthRes>('/api/auth/me')
        if (a.accessToken) setToken(a.accessToken)           // 서버가 새 토큰을 주면 갱신 (만료 연장)
        return a.playerId ? toUser(a) : null
      } catch (e) {
        const st = (e as { status?: number }).status
        if (st === 401 || st === 404) { setToken(null); return null }
        throw e
      }
    },
    async signUp(email, password, nickname) {
      const a = await http.post<AuthRes>('/api/auth/register', { email, password, nickname: nickname.trim() })
      return { user: login(a), needsConfirm: false }
    },
    async signIn(email, password) {
      return login(await http.post<AuthRes>('/api/auth/login', { email, password }))
    },
    async signInWithGoogle() {
      const { googleClientId } = await getAuthConfig()
      if (!googleClientId) {
        throw new Error('서버에 구글 클라이언트 ID 가 아직 없습니다. (Backend/google_client_id.txt 에 넣고 서버를 다시 켜세요 — Docs/Backend/WebUiServer.md 3번)')
      }
      const token = await (deps.requestGoogleToken ?? requestGoogleAccessToken)(googleClientId)
      login(await http.post<AuthRes>('/api/auth/google', { accessToken: token }))
    },
    async resetPassword(email) {
      await http.post('/api/auth/password-reset', { email })
    },
    async signOut() {
      try { await http.post('/api/auth/logout', {}) } catch { /* 서버가 꺼져 있어도 로그아웃은 된다 */ }
      setToken(null)
    },
    async isNicknameAvailable(nickname) {
      const r = await http.get<{ available: boolean }>(`/api/auth/nickname-available?nickname=${encodeURIComponent(nickname.trim())}`)
      return !!r.available
    },

    // ── 프로필 · 덱 · 전적 · 랭킹 ──
    async getProfile(userId): Promise<Profile> {
      const p = await call(() => http.get<PlayerRes>(`/api/players/${userId}`))
      return { id: String(p.id), nickname: p.nickname, rating: p.rating, wins: p.wins, losses: p.losses }
    },
    async updateNickname(_userId, nickname) {
      await call(() => http.put('/api/players/me', { nickname: nickname.trim() }))
    },
    async loadDeck() {
      const r = await call(() => http.get<{ skills?: string[] }>('/api/decks/me'))
      return r?.skills ?? []
    },
    async saveDeck(_userId, skills) {
      await call(() => http.put('/api/decks/me', { skills }))
    },
    async listMatches(userId, limit): Promise<MatchRecord[]> {
      const rows = await call(() => http.get<{ id: number; mode?: string; result?: string; opponent?: string; durationSec?: number; casts?: number; ratingDelta?: number; recordedAt?: string }[]>(`/api/matches/player/${userId}?limit=${limit || 30}`))
      return rows.map(m => ({
        id: String(m.id), mode: modeOf(m.mode), result: String(m.result ?? '').toLowerCase() as MatchRecord['result'],
        opponent: m.opponent ?? '', durationSec: m.durationSec ?? 0, casts: m.casts ?? 0,
        ratingDelta: m.ratingDelta ?? 0, endedAt: iso(m.recordedAt),
      }))
    },
    async recordMatch(_userId, input): Promise<MatchRecord> {
      const r = await call(() => http.post<{ matchId: number; ratingDelta: number; newRating: number }>('/api/matches', {
        mode: input.mode, result: input.result.toUpperCase(), opponent: input.opponent, durationSec: input.durationSec, casts: input.casts,
      }))
      return { ...input, id: String(r.matchId), ratingDelta: r.ratingDelta, endedAt: new Date().toISOString() }
    },
    async getRanking(limit): Promise<RankEntry[]> {
      const rows = await call(() => http.get<(PlayerRes & { rank?: number })[]>(`/api/players/ranking?limit=${limit || 100}`))
      return rows.map((r, i) => ({ rank: r.rank ?? i + 1, userId: String(r.id), nickname: r.nickname, rating: r.rating, wins: r.wins, losses: r.losses }))
    },

    // ── 친구 · 접속 ──
    async listFriends(): Promise<FriendEntry[]> {
      const rows = await call(() => http.get<{ friendPlayerId: number; nickname: string; rating: number; relation: FriendEntry['relation'] }[]>('/api/friends?all=1'))
      return rows.map(f => ({ id: String(f.friendPlayerId), nickname: f.nickname, rating: f.rating, relation: f.relation }))
    },
    async requestFriend(_userId, nickname) {
      await call(() => http.post('/api/friends/requests', { nickname: nickname.trim() }))
    },
    async respondFriend(_userId, otherId, accept) {
      await call(() => http.post('/api/friends/respond', { playerId: Number(otherId), accept: !!accept }))
    },
    async removeFriend(_userId, otherId) {
      await call(() => http.del(`/api/friends/player/${otherId}`))
    },
    subscribePresence(_userId, cb) {
      let stopped = false
      const tick = () => {
        if (stopped) return
        http.post('/api/presence/heartbeat', {})
          .then(() => http.get<{ online?: (number | string)[] }>('/api/presence/online'))
          .then(r => { if (!stopped) cb((r?.online ?? []).map(String)) })
          .catch(() => { /* 다음 주기에 다시 */ })
      }
      tick()
      const timer = setInterval(tick, 15_000)
      return () => { stopped = true; clearInterval(timer) }
    },

    // ── 우편 · 공지 · 초대 ──
    async listMail(): Promise<MailItem[]> {
      const rows = await call(() => http.get<{ id: string; kind: MailItem['kind']; title: string; body: string; from?: string | null; roomCode?: string | null; read: boolean; createdAt?: string }[]>('/api/mailbox'))
      return rows.map(m => ({ id: m.id, kind: m.kind, title: m.title, body: m.body, from: m.from ?? undefined, roomCode: m.roomCode ?? undefined, read: !!m.read, createdAt: iso(m.createdAt) }))
    },
    async markMailRead(_userId, mail) {
      await call(() => http.post('/api/mailbox/read', { id: mail.id }))
    },
    async sendInvite(_userId, friendId, roomCode) {
      await call(() => http.post('/api/mails/invite', { friendId: Number(friendId), roomCode }))
    },
  }
}
