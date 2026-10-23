import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createServerApi, type ServerApi } from '../src/lib/serverApi'

// 실제 Backend/wow_server.py 를 임시 DB 로 띄워서 끝에서 끝까지 검증한다 (Python 3.10+ 필요).
// 서버 파일이나 python 이 없으면 이 파일은 건너뛴다.
const SERVER = path.resolve(process.cwd(), '../wow_server.py')      // 테스트는 항상 프로젝트 루트(Backend/web-client)에서 실행
const python = ['python3', 'python'].find(c => spawnSync(c, ['--version']).status === 0)
const available = !!python && existsSync(SERVER)

class MemStorage implements Storage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.get(k) ?? null }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  removeItem(k: string) { this.m.delete(k) }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
}

const freePort = () => new Promise<number>(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => res(p)) }) })
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

let proc: ChildProcess | undefined
let base = ''
const dbFile = path.join(os.tmpdir(), `wow-e2e-${process.pid}.sqlite`)
const uniq = Date.now().toString(36)

const client = () => createServerApi(base, { storage: new MemStorage(), requestGoogleToken: async () => 'unused' })
async function newUser(tag: string): Promise<{ api: ServerApi; id: string; nickname: string; email: string }> {
  const api = client()
  const nickname = `${tag}${uniq}`.slice(0, 12)
  const email = `${tag}.${uniq}@test.dev`
  const { user } = await api.signUp(email, 'secret1', nickname)
  return { api, id: user!.id, nickname, email }
}

describe.skipIf(!available)('실제 서버(wow_server.py) 연동', () => {
  beforeAll(async () => {
    const port = await freePort()
    base = `http://127.0.0.1:${port}`
    rmSync(dbFile, { force: true })
    proc = spawn(python!, [SERVER, String(port)], { env: { ...process.env, WOW_DB_FILE: dbFile, PYTHONUNBUFFERED: '1' }, stdio: 'ignore' })
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${base}/api/health`)).ok) return } catch { /* 아직 부팅 중 */ }
      await sleep(250)
    }
    throw new Error('서버가 켜지지 않았습니다.')
  }, 30_000)
  afterAll(() => { proc?.kill(); rmSync(dbFile, { force: true }) })

  it('데모 계정 로그인 → 세션 → 프로필 → 로그아웃', async () => {
    const api = client()
    expect(api.mode).toBe('server')
    expect(await api.getSession()).toBeNull()
    const u = await api.signIn('demo@wow.dev', 'demo1234')
    expect(u.email).toBe('demo@wow.dev')
    expect(await api.getSession()).toEqual(u)
    expect((await api.getProfile(u.id)).nickname).toBe('데모마법사')
    await api.signOut()
    expect(await api.getSession()).toBeNull()
  })

  it('잘못된 비밀번호 · 중복 가입 · 닉네임 규칙은 서버 문구 그대로 보여준다', async () => {
    const api = client()
    await expect(api.signIn('demo@wow.dev', 'wrong!')).rejects.toThrow('이메일 또는 비밀번호가 올바르지 않습니다.')
    await expect(api.signUp('demo@wow.dev', 'secret1', `n${uniq}`)).rejects.toThrow('이미 가입된 이메일입니다.')
    await expect(api.signUp(`x.${uniq}@test.dev`, 'secret1', '데모마법사')).rejects.toThrow('이미 사용 중인 닉네임입니다.')
    await expect(api.signUp(`y.${uniq}@test.dev`, '123', `n${uniq}`)).rejects.toThrow('비밀번호는 6자 이상')
    await expect(api.signUp(`z.${uniq}@test.dev`, 'secret1', 'a')).rejects.toThrow('닉네임은 2~12자')
  })

  it('가입하면 바로 로그인되고, 닉네임 중복 확인과 변경이 동작한다', async () => {
    const a = await newUser('wa')
    expect(await a.api.getSession()).toEqual({ id: a.id, email: a.email })
    expect(await a.api.isNicknameAvailable(a.nickname)).toBe(false)
    expect(await a.api.isNicknameAvailable(`free${uniq}`.slice(0, 12))).toBe(true)
    await a.api.updateNickname(a.id, `new${uniq}`.slice(0, 12))
    expect((await a.api.getProfile(a.id)).nickname).toBe(`new${uniq}`.slice(0, 12))
    await expect(a.api.updateNickname(a.id, '데모마법사')).rejects.toThrow('이미 사용 중인 닉네임입니다.')
  })

  it('덱 저장·불러오기, 서버가 8장·중복을 검증한다', async () => {
    const { api, id } = await newUser('wd')
    const initial = await api.loadDeck(id)                  // 서버는 새 플레이어에게 기본 덱 8장을 준다
    expect(initial).toHaveLength(8)
    expect(new Set(initial).size).toBe(8)
    const deck = ['S03', 'S02', 'S07', 'S08', 'S11', 'S13', 'H01', 'H02']
    await api.saveDeck(id, deck)
    expect(await api.loadDeck(id)).toEqual(deck)
    await expect(api.saveDeck(id, deck.slice(0, 7))).rejects.toThrow('덱은 정확히 8장')
    await expect(api.saveDeck(id, ['S03', 'S03', 'S07', 'S08', 'S11', 'S13', 'H01', 'H02'])).rejects.toThrow('중복')
    await expect(api.saveDeck(id, ['S03', 'S02', 'S07', 'S08', 'S11', 'S13', 'H01', 'H02'].map((s, i) => (i === 0 ? 'Z99' : s)))).rejects.toThrow('존재하지 않는 스킬')
    expect(await api.loadDeck(id)).toEqual(deck)           // 거부된 저장은 기존 덱을 건드리지 않는다
  })

  it('전적 기록 → 레이팅 반영 → 전적 목록 · 랭킹', async () => {
    const { api, id, nickname } = await newUser('wm')
    const before = await api.getProfile(id)
    const rec = await api.recordMatch(id, { mode: 'ranked', result: 'win', opponent: 'Bot', durationSec: 123, casts: 17 })
    expect(rec.ratingDelta).toBeGreaterThan(0)
    const after = await api.getProfile(id)
    expect(after.rating).toBe(before.rating + rec.ratingDelta)
    expect(after.wins).toBe(before.wins + 1)

    await api.recordMatch(id, { mode: 'bot', result: 'lose', opponent: 'Bot', durationSec: 60, casts: 3 })
    const list = await api.listMatches(id, 10)
    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({ mode: 'bot', result: 'lose', ratingDelta: 0, durationSec: 60, casts: 3 })   // 봇 연습은 레이팅 변화 없음, 최신순
    expect(list[1]).toMatchObject({ mode: 'ranked', result: 'win', opponent: 'Bot' })
    expect(Number.isNaN(Date.parse(list[0].endedAt))).toBe(false)                                            // 서버 시각을 ISO 로 변환

    const rank = await api.getRanking(100)
    expect(rank.length).toBeGreaterThan(0)
    expect(rank.map(r => r.rank)).toEqual([...rank.map(r => r.rank)].sort((a, b) => a - b))
    expect(rank.find(r => r.nickname === nickname)?.rating).toBe(after.rating)
  })

  it('친구 요청 → 수락 → 삭제, 접속 상태', async () => {
    const a = await newUser('fa'), b = await newUser('fb')
    await a.api.requestFriend(a.id, b.nickname)
    expect((await a.api.listFriends(a.id)).find(f => f.id === b.id)?.relation).toBe('outgoing')
    expect((await b.api.listFriends(b.id)).find(f => f.id === a.id)?.relation).toBe('incoming')
    await b.api.respondFriend(b.id, a.id, true)
    expect((await a.api.listFriends(a.id)).find(f => f.id === b.id)?.relation).toBe('friend')

    const online = await new Promise<string[]>(res => { const stop = b.api.subscribePresence(b.id, ids => { stop(); res(ids) }) })
    expect(online).toContain(b.id)

    await a.api.removeFriend(a.id, b.id)
    expect((await a.api.listFriends(a.id)).some(f => f.id === b.id)).toBe(false)
  })

  it('우편: 초대 보내기 → 받은 사람 우편함에 룸 코드와 함께 도착 → 읽음 처리', async () => {
    const a = await newUser('ma'), b = await newUser('mb')
    await a.api.requestFriend(a.id, b.nickname)
    await b.api.respondFriend(b.id, a.id, true)
    await a.api.sendInvite(a.id, b.id, 'ABC123')
    const mails = await b.api.listMail(b.id)
    const invite = mails.find(m => m.kind === 'invite')
    expect(invite).toBeTruthy()
    expect(invite!.roomCode).toBe('ABC123')
    expect(invite!.read).toBe(false)
    expect(invite!.from).toBe(a.nickname)
    await b.api.markMailRead(b.id, invite!)
    expect((await b.api.listMail(b.id)).find(m => m.id === invite!.id)?.read).toBe(true)
  })

  it('로그인하지 않은 요청과 무효 토큰은 401 → 토큰을 지운다', async () => {
    const storage = new MemStorage()
    const api = createServerApi(base, { storage, requestGoogleToken: async () => 'x' })
    await expect(api.loadDeck('1')).rejects.toThrow('로그인이 필요합니다.')
    storage.setItem('wow.spring.token', 'not.a.valid.jwt')
    expect(await api.getSession()).toBeNull()
    expect(storage.getItem('wow.spring.token')).toBeNull()
  })

  it('구글 로그인: 서버에 클라이언트 ID 가 없으면 설정 방법을 알려준다', async () => {
    const api = client()
    expect((await api.getAuthConfig()).googleClientId).toBe('')
    await expect(api.signInWithGoogle()).rejects.toThrow(/google_client_id\.txt/)
  })

  it('관리자 계정은 플레이어가 아니므로 웹 앱 로그인을 막고 안내한다', async () => {
    const storage = new MemStorage()
    const api = createServerApi(base, { storage, requestGoogleToken: async () => 'x' })
    await api.signIn('admin@wow.dev', 'admin1234').then(
      () => { /* 서버가 관리자에게도 플레이어를 만들어 둔 경우 */ expect(storage.getItem('wow.spring.token')).toBeTruthy() },
      e => { expect((e as Error).message).toMatch(/플레이어 정보가 없습니다/); expect(storage.getItem('wow.spring.token')).toBeNull() },
    )
  })

  it('앱 전체: 이메일 로그인 폼 → 실제 서버 → 로비 (서버 닉네임·기본 덱 표시)', async () => {
    localStorage.clear()
    vi.stubEnv('VITE_API_BASE', base)
    vi.resetModules()
    const { default: App } = await import('../src/App')
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByPlaceholderText('wizard@example.com'), 'demo@wow.dev')
    await user.type(screen.getByPlaceholderText('••••••••'), 'demo1234')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    await screen.findByText('메인 로비', {}, { timeout: 12_000 })
    expect(screen.getAllByText('데모마법사').length).toBeGreaterThan(0)
    expect(screen.getByText(/DEV · 서버/)).toBeTruthy()
    vi.unstubAllEnvs()
  })
})
