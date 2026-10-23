import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createServerApi, requestGoogleAccessToken } from '../src/lib/serverApi'

// 구글 로그인 흐름: 실제 구글에는 접속할 수 없으므로, wow_server.py 와 같은 응답 형식({status, message})의 가짜 서버로 검증한다.
//   GET  /api/auth/config  → { googleClientId, googleEnabled }
//   POST /api/auth/google  { accessToken } → { accessToken(JWT), userId, email, role, playerId, nickname }
const SESSION = { accessToken: 'jwt.fake.token', userId: 7, email: 'wiz@gmail.com', role: 'ROLE_USER', playerId: 42, nickname: '구글마법사' }
let server: http.Server
let base = ''
let clientId = 'test-client.apps.googleusercontent.com'
const seen: { googleBodies: unknown[]; auth: (string | undefined)[] } = { googleBodies: [], auth: [] }

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const send = (code: number, body: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)) }
    const bearer = req.headers.authorization === 'Bearer jwt.fake.token'
    let raw = ''
    req.on('data', c => { raw += c })
    req.on('end', () => {
      seen.auth.push(req.headers.authorization)
      const url = req.url ?? ''
      if (req.method === 'GET' && url === '/api/auth/config') return send(200, { googleClientId: clientId, googleEnabled: !!clientId })
      if (req.method === 'POST' && url === '/api/auth/google') {
        const body = JSON.parse(raw || '{}'); seen.googleBodies.push(body)
        return body.accessToken === 'ya29.good' ? send(200, SESSION) : send(401, { status: 401, message: '다른 앱용으로 발급된 Google 토큰입니다.' })
      }
      if (url === '/api/probe') return bearer ? send(200, { ok: true }) : send(401, { status: 401, message: '로그인이 필요합니다.' })
      if (!bearer) return send(401, { status: 401, message: '로그인이 필요합니다.' })
      if (url === '/api/auth/me') return send(200, { ...SESSION })
      if (url === '/api/players/42') return send(200, { id: 42, nickname: '구글마법사', rating: 1200, wins: 0, losses: 0 })
      if (url === '/api/decks/me') return send(200, { playerId: 42, skills: ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08'] })
      if (url === '/api/presence/online') return send(200, { online: [] })
      if (url === '/api/presence/heartbeat') return send(200, {})
      if (url === '/api/mailbox' || url.startsWith('/api/friends') || url.startsWith('/api/matches/player/')) return send(200, [])
      send(404, { status: 404, message: 'not found' })
    })
  })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>(r => server.close(() => r())))
afterEach(() => { clientId = 'test-client.apps.googleusercontent.com'; seen.auth.length = 0; seen.googleBodies.length = 0; delete (globalThis as { google?: unknown }).google; vi.unstubAllEnvs() })

class MemStorage implements Storage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.get(k) ?? null }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  removeItem(k: string) { this.m.delete(k) }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
}
const make = (token = 'ya29.good', serverBase = base) => {
  const storage = new MemStorage()
  return { storage, api: createServerApi(serverBase, { storage, requestGoogleToken: async () => token }) }
}

describe('서버 구글 로그인 (POST /api/auth/google)', () => {
  it('GET /api/auth/config 에서 googleClientId 를 받는다', async () => {
    expect((await make().api.getAuthConfig()).googleClientId).toBe('test-client.apps.googleusercontent.com')
  })

  it('구글 access_token 을 보내 서버 JWT 를 받고, 세션·프로필이 서버 playerId 로 만들어진다', async () => {
    const { api, storage } = make()
    expect(await api.getSession()).toBeNull()
    await api.signInWithGoogle()
    expect(seen.googleBodies).toEqual([{ accessToken: 'ya29.good' }])              // 요청 본문 형식
    expect(storage.getItem('wow.spring.token')).toBe('jwt.fake.token')              // 서버 웹 화면·Unity WebGL 과 같은 토큰 키
    expect(await api.getSession()).toEqual({ id: '42', email: 'wiz@gmail.com' })    // 사용자 id = playerId
    expect((await api.getProfile('42')).nickname).toBe('구글마법사')
  })

  it('이후 요청에 Authorization: Bearer {JWT} 헤더가 붙는다 (로그인 전에는 안 붙는다)', async () => {
    const { api } = make()
    await expect(api.http.get('/api/probe')).rejects.toThrow('로그인이 필요합니다.')
    expect(seen.auth.at(-1)).toBeUndefined()
    await api.signInWithGoogle()
    expect(await api.http.get('/api/probe')).toEqual({ ok: true })
    expect(seen.auth.at(-1)).toBe('Bearer jwt.fake.token')
  })

  it('서버가 토큰을 거부하면 서버의 오류 문구를 보여주고 토큰을 저장하지 않는다', async () => {
    const { api, storage } = make('ya29.bad')
    await expect(api.signInWithGoogle()).rejects.toThrow('다른 앱용으로 발급된 Google 토큰입니다.')
    expect(storage.getItem('wow.spring.token')).toBeNull()
  })

  it('서버에 구글 클라이언트 ID 가 비어 있으면 설정 방법(google_client_id.txt)을 알려준다', async () => {
    clientId = ''
    await expect(make().api.signInWithGoogle()).rejects.toThrow(/google_client_id\.txt/)
  })

  it('서버에 연결할 수 없으면 확인할 항목을 알려준다', async () => {
    const { api } = make('ya29.good', 'http://127.0.0.1:1')
    await expect(api.signInWithGoogle()).rejects.toThrow(/서버에 연결할 수 없습니다.*CORS/)
  })

  it('로그아웃하면 토큰이 지워진다', async () => {
    const { api, storage } = make()
    await api.signInWithGoogle()
    await api.signOut()
    expect(storage.getItem('wow.spring.token')).toBeNull()
    expect(await api.getSession()).toBeNull()
  })
})

describe('구글 팝업 (Google Identity Services)', () => {
  const fakeGoogle = (behave: (cfg: { callback: (r: object) => void; error_callback?: (e: object) => void }) => void) => {
    const captured: { cfg?: Record<string, unknown>; opts?: unknown } = {}
    ;(globalThis as { google?: unknown }).google = { accounts: { oauth2: { initTokenClient: (cfg: never) => { captured.cfg = cfg; return { requestAccessToken: (o: unknown) => { captured.opts = o; behave(cfg) } } } } } }
    return captured
  }

  it('클라이언트 ID·scope 를 넘기고 access_token 을 돌려받는다', async () => {
    const cap = fakeGoogle(cfg => cfg.callback({ access_token: 'ya29.good' }))
    expect(await requestGoogleAccessToken('cid-123')).toBe('ya29.good')
    expect(cap.cfg?.client_id).toBe('cid-123')
    expect(cap.cfg?.scope).toBe('openid email profile')
    expect(cap.opts).toEqual({ prompt: 'select_account' })
  })

  it('팝업을 닫으면 · 팝업이 막히면 · 구글이 오류를 주면 한글 문구로 알려준다', async () => {
    fakeGoogle(cfg => cfg.error_callback?.({ type: 'popup_closed' }))
    await expect(requestGoogleAccessToken('c')).rejects.toThrow('구글 로그인 창이 닫혔습니다.')
    fakeGoogle(cfg => cfg.error_callback?.({ type: 'popup_failed_to_open' }))
    await expect(requestGoogleAccessToken('c')).rejects.toThrow(/팝업이 차단/)
    fakeGoogle(cfg => cfg.callback({ error: 'access_denied' }))
    await expect(requestGoogleAccessToken('c')).rejects.toThrow('access_denied')
  })
})

describe('앱 전체 (서버 모드): 구글 버튼 → 서버 로그인 → 로비', () => {
  it('Google 계정으로 계속하기를 누르면 서버 닉네임으로 로비에 들어간다', async () => {
    localStorage.clear()
    vi.stubEnv('VITE_API_BASE', base)
    ;(globalThis as { google?: unknown }).google = { accounts: { oauth2: { initTokenClient: (cfg: { callback: (r: object) => void }) => ({ requestAccessToken: () => cfg.callback({ access_token: 'ya29.good' }) }) } } }
    vi.resetModules()
    const { default: App } = await import('../src/App')
    const user = userEvent.setup()
    render(<App />)
    expect(screen.queryByText(/데모 계정으로 바로 시작/)).toBeNull()            // 서버 모드에서는 데모 로그인 숨김
    await user.click(await screen.findByText(/Google 계정으로 계속하기/))
    await screen.findByText('메인 로비', {}, { timeout: 12_000 })
    expect(screen.getByText('구글마법사')).toBeTruthy()
    expect(seen.googleBodies).toEqual([{ accessToken: 'ya29.good' }])
    expect(screen.getByText(/DEV · 서버/)).toBeTruthy()
  })
})
