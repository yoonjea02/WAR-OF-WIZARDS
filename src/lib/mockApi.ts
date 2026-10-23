import { validateDeck } from '../data/skills'
import type {
  Api, AuthUser, FriendEntry, MailItem, MatchInput, MatchRecord, Profile, RankEntry,
} from './types'

// Supabase 없이도 전 기능을 시연/QA 할 수 있게 하는 localStorage 백엔드.
// 데이터 모양은 supabase/schema.sql 과 동일하게 맞춰두었다.

const KEY = 'wow.mock.v1'
const RATING_STEP = 16 // 랭크전 승/패 시 레이팅 변동 (supabase record_match 와 동일)

interface MockUser { id: string; email: string; password: string; nickname: string }
interface Friendship { requester: string; addressee: string; status: 'pending' | 'accepted' }
interface Db {
  users: MockUser[]
  profiles: Record<string, Profile>
  decks: Record<string, string[]>
  matches: Record<string, MatchRecord[]>
  friendships: Friendship[]
  mails: Record<string, MailItem[]>
  notices: MailItem[]
  noticeRead: Record<string, string[]>
  online: string[]
  session: string | null
}

const uid = () =>
  (globalThis.crypto && 'randomUUID' in globalThis.crypto)
    ? globalThis.crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const iso = (minAgo: number) => new Date(Date.now() - minAgo * 60_000).toISOString()

const BOTS: { nick: string; rating: number; wins: number; losses: number }[] = [
  { nick: 'Merlin',     rating: 1720, wins: 88, losses: 21 },
  { nick: 'LunaSpell',  rating: 1655, wins: 74, losses: 26 },
  { nick: 'StormCaller', rating: 1590, wins: 61, losses: 30 },
  { nick: 'FrostWitch', rating: 1522, wins: 55, losses: 31 },
  { nick: 'Gandalf_K',  rating: 1470, wins: 49, losses: 33 },
  { nick: 'Aria',       rating: 1415, wins: 44, losses: 35 },
  { nick: 'Nyx',        rating: 1362, wins: 40, losses: 36 },
  { nick: 'Ember',      rating: 1310, wins: 37, losses: 35 },
  { nick: 'Orion',      rating: 1265, wins: 33, losses: 34 },
  { nick: 'Selene',     rating: 1218, wins: 30, losses: 33 },
  { nick: 'Kael',       rating: 1170, wins: 27, losses: 33 },
  { nick: 'Zephyr',     rating: 1122, wins: 24, losses: 31 },
  { nick: 'Mira',       rating: 1080, wins: 21, losses: 29 },
  { nick: 'Thorn',      rating: 1035, wins: 18, losses: 27 },
  { nick: 'Vex',        rating: 990,  wins: 15, losses: 25 },
  { nick: 'Lyra',       rating: 940,  wins: 12, losses: 22 },
  { nick: 'Draco',      rating: 880,  wins: 9,  losses: 20 },
  { nick: 'Iris',       rating: 820,  wins: 6,  losses: 18 },
]

function seed(): Db {
  const db: Db = {
    users: [], profiles: {}, decks: {}, matches: {}, friendships: [], mails: {},
    notices: [
      { id: 'n1', kind: 'notice', title: '[공지] 프로토타입 테스트 안내', body: '현재 War of Wizards 프로토타입 테스트 중입니다.\n버그는 팀 노션 QA 페이지에 남겨주세요.', read: false, createdAt: iso(60 * 5) },
      { id: 'n2', kind: 'notice', title: '[공지] 스킬 19종 · 덱 규칙', body: '덱은 19종 중 8장, 고위력 스킬은 최대 2장까지 편성할 수 있습니다.\n고위력 스킬은 게임당 스킬별 3회까지 시전 가능합니다.', read: false, createdAt: iso(60 * 30) },
    ],
    noticeRead: {}, online: [], session: null,
  }
  const ids: Record<string, string> = {}
  for (const b of BOTS) {
    const id = uid()
    ids[b.nick] = id
    db.profiles[id] = { id, nickname: b.nick, rating: b.rating, wins: b.wins, losses: b.losses }
  }
  db.online = ['Aria', 'Mira', 'Kael', 'Nyx'].map(n => ids[n])

  // 데모 계정
  const demoId = uid()
  db.users.push({ id: demoId, email: 'demo@wow.dev', password: 'demo1234', nickname: 'DemoWizard' })
  db.profiles[demoId] = { id: demoId, nickname: 'DemoWizard', rating: 1000, wins: 3, losses: 2 }
  db.decks[demoId] = ['S03', 'S02', 'S07', 'S08', 'S11', 'S13', 'H01', 'H02']
  const modes: MatchRecord['mode'][] = ['ranked', 'ranked', 'bot', 'friendly', 'ranked']
  const results: MatchRecord['result'][] = ['win', 'lose', 'win', 'win', 'lose']
  db.matches[demoId] = results.map((r, i) => ({
    id: uid(), mode: modes[i], result: r,
    opponent: ['Kael', 'Merlin', 'Bot', 'Aria', 'Nyx'][i],
    durationSec: 300 + i * 95, casts: 24 + i * 6,
    ratingDelta: modes[i] === 'ranked' ? (r === 'win' ? RATING_STEP : -RATING_STEP) : 0,
    endedAt: iso(60 * (i + 1) * 7),
  }))
  db.friendships = [
    { requester: demoId, addressee: ids.Aria, status: 'accepted' },
    { requester: ids.Kael, addressee: demoId, status: 'accepted' },
    { requester: demoId, addressee: ids.Mira, status: 'accepted' },
    { requester: ids.Zephyr, addressee: demoId, status: 'pending' },
    { requester: demoId, addressee: ids.Draco, status: 'pending' },
  ]
  db.mails[demoId] = [
    { id: uid(), kind: 'mail', title: '가입을 환영합니다!', body: '마법사 등록을 축하드려요. 마법서에서 덱 8장을 편성하고 첫 대전을 시작해보세요.', read: false, createdAt: iso(120) },
    { id: uid(), kind: 'invite', title: 'Aria 님의 친선전 초대', body: 'Aria 님이 친선전에 초대했습니다.', from: 'Aria', roomCode: 'AB12CD', read: false, createdAt: iso(8) },
  ]
  return db
}

export function createMockApi(storage: Storage = globalThis.localStorage): Api {
  const load = (): Db => {
    const raw = storage.getItem(KEY)
    if (raw) { try { return JSON.parse(raw) as Db } catch { /* 손상 시 재시드 */ } }
    const fresh = seed()
    storage.setItem(KEY, JSON.stringify(fresh))
    return fresh
  }
  const save = (db: Db) => storage.setItem(KEY, JSON.stringify(db))
  const delay = <T,>(v: T, ms = 120): Promise<T> => new Promise(r => setTimeout(() => r(v), ms))
  const fail = (msg: string): Promise<never> => new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), 120))

  const toUser = (u: MockUser): AuthUser => ({ id: u.id, email: u.email })
  const nickTaken = (db: Db, nick: string) =>
    Object.values(db.profiles).some(p => p.nickname.toLowerCase() === nick.trim().toLowerCase())

  return {
    mode: 'mock',


    async getSession() {
      const db = load()
      const u = db.users.find(x => x.id === db.session)
      return delay(u ? toUser(u) : null, 30)
    },

    async signUp(email, password, nickname) {
      const db = load()
      const nick = nickname.trim()
      if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) return fail('이미 가입된 이메일입니다.')
      if (nickTaken(db, nick)) return fail('이미 사용 중인 닉네임입니다.')
      const id = uid()
      db.users.push({ id, email, password, nickname: nick })
      db.profiles[id] = { id, nickname: nick, rating: 1000, wins: 0, losses: 0 }
      db.decks[id] = []
      db.matches[id] = []
      db.mails[id] = [{ id: uid(), kind: 'mail', title: '가입을 환영합니다!', body: '마법사 등록을 축하드려요. 마법서에서 덱 8장을 편성하고 첫 대전을 시작해보세요.', read: false, createdAt: new Date().toISOString() }]
      save(db)
      return delay({ user: toUser(db.users[db.users.length - 1]), needsConfirm: false })
    },

    async signIn(email, password) {
      const db = load()
      const u = db.users.find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === password)
      if (!u) return fail('이메일 또는 비밀번호가 올바르지 않습니다.')
      db.session = u.id
      save(db)
      return delay(toUser(u))
    },

    async signInWithGoogle() {
      return fail('Google 로그인은 Supabase 연결 후 사용할 수 있습니다. (.env 설정 필요)')
    },

    async resetPassword(email) {
      const db = load()
      if (!db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) return fail('가입되지 않은 이메일입니다.')
      return delay(undefined)
    },

    async signOut() {
      const db = load(); db.session = null; save(db)
      return delay(undefined, 20)
    },

    async isNicknameAvailable(nickname) {
      return delay(!nickTaken(load(), nickname), 60)
    },

    async getProfile(userId) {
      const p = load().profiles[userId]
      return p ? delay({ ...p }, 40) : fail('프로필을 찾을 수 없습니다.')
    },

    async updateNickname(userId, nickname) {
      const db = load()
      const nick = nickname.trim()
      if (!/^[A-Za-z0-9가-힣_]{2,12}$/.test(nick)) return fail('닉네임은 2~12자, 한글·영문·숫자·_ 만 사용할 수 있습니다.')
      const taken = Object.values(db.profiles).some(p => p.id !== userId && p.nickname.toLowerCase() === nick.toLowerCase())
      if (taken) return fail('이미 사용 중인 닉네임입니다.')
      if (!db.profiles[userId]) return fail('프로필을 찾을 수 없습니다.')
      db.profiles[userId].nickname = nick
      const u = db.users.find(x => x.id === userId); if (u) u.nickname = nick
      save(db)
      return delay(undefined)
    },

    async loadDeck(userId) {
      return delay([...(load().decks[userId] ?? [])], 40)
    },

    async saveDeck(userId, skills) {
      const err = validateDeck(skills)
      if (err) return fail(err)
      const db = load(); db.decks[userId] = [...skills]; save(db)
      return delay(undefined)
    },

    async listMatches(userId, limit) {
      const list = [...(load().matches[userId] ?? [])].sort((a, b) => b.endedAt.localeCompare(a.endedAt))
      return delay(list.slice(0, limit), 60)
    },

    async recordMatch(userId, input: MatchInput) {
      const db = load()
      const p = db.profiles[userId]
      if (!p) return fail('프로필을 찾을 수 없습니다.')
      const ratingDelta = input.mode === 'ranked' ? (input.result === 'win' ? RATING_STEP : -RATING_STEP) : 0
      if (input.result === 'win') p.wins++; else p.losses++
      p.rating = Math.max(0, p.rating + ratingDelta)
      const rec: MatchRecord = { ...input, id: uid(), ratingDelta, endedAt: new Date().toISOString() }
      ;(db.matches[userId] ??= []).push(rec)
      save(db)
      return delay(rec)
    },

    async getRanking(limit) {
      const list = Object.values(load().profiles)
        .sort((a, b) => b.rating - a.rating || b.wins - a.wins)
        .slice(0, limit)
      return delay(list.map((p, i) => ({ rank: i + 1, userId: p.id, nickname: p.nickname, rating: p.rating, wins: p.wins, losses: p.losses } as RankEntry)), 80)
    },

    async listFriends(userId) {
      const db = load()
      const out: FriendEntry[] = []
      for (const f of db.friendships) {
        if (f.requester !== userId && f.addressee !== userId) continue
        const otherId = f.requester === userId ? f.addressee : f.requester
        const p = db.profiles[otherId]
        if (!p) continue
        const relation: FriendEntry['relation'] =
          f.status === 'accepted' ? 'friend' : f.requester === userId ? 'outgoing' : 'incoming'
        out.push({ id: otherId, nickname: p.nickname, rating: p.rating, relation })
      }
      return delay(out, 60)
    },

    async requestFriend(userId, nickname) {
      const db = load()
      const target = Object.values(db.profiles).find(p => p.nickname.toLowerCase() === nickname.trim().toLowerCase())
      if (!target) return fail('해당 닉네임의 마법사를 찾을 수 없습니다.')
      if (target.id === userId) return fail('자기 자신에게는 친구 요청을 보낼 수 없습니다.')
      const exists = db.friendships.find(f =>
        (f.requester === userId && f.addressee === target.id) || (f.requester === target.id && f.addressee === userId))
      if (exists) return fail(exists.status === 'accepted' ? '이미 친구입니다.' : '이미 친구 요청이 진행 중입니다.')
      db.friendships.push({ requester: userId, addressee: target.id, status: 'pending' })
      save(db)
      return delay(undefined)
    },

    async respondFriend(userId, otherId, accept) {
      const db = load()
      const f = db.friendships.find(x => x.requester === otherId && x.addressee === userId && x.status === 'pending')
      if (!f) return fail('처리할 친구 요청이 없습니다.')
      if (accept) f.status = 'accepted'
      else db.friendships = db.friendships.filter(x => x !== f)
      save(db)
      return delay(undefined)
    },

    async removeFriend(userId, otherId) {
      const db = load()
      db.friendships = db.friendships.filter(f =>
        !((f.requester === userId && f.addressee === otherId) || (f.requester === otherId && f.addressee === userId)))
      save(db)
      return delay(undefined)
    },

    subscribePresence(_userId, cb) {
      const t = setTimeout(() => cb(load().online), 50)
      return () => clearTimeout(t)
    },

    async listMail(userId) {
      const db = load()
      const readSet = new Set(db.noticeRead[userId] ?? [])
      const notices = db.notices.map(n => ({ ...n, read: readSet.has(n.id) }))
      const mails = db.mails[userId] ?? []
      return delay([...mails, ...notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), 60)
    },

    async markMailRead(userId, mail) {
      const db = load()
      if (mail.kind === 'notice') {
        const arr = (db.noticeRead[userId] ??= [])
        if (!arr.includes(mail.id)) arr.push(mail.id)
      } else {
        const m = (db.mails[userId] ?? []).find(x => x.id === mail.id)
        if (m) m.read = true
      }
      save(db)
      return delay(undefined, 20)
    },

    async sendInvite(userId, friendId, roomCode) {
      const db = load()
      const me = db.profiles[userId]
      const isFriend = db.friendships.some(f => f.status === 'accepted' &&
        ((f.requester === userId && f.addressee === friendId) || (f.requester === friendId && f.addressee === userId)))
      if (!isFriend) return fail('친구에게만 초대를 보낼 수 있습니다.')
      ;(db.mails[friendId] ??= []).push({
        id: uid(), kind: 'invite', title: `${me.nickname} 님의 친선전 초대`,
        body: `${me.nickname} 님이 친선전에 초대했습니다.`, from: me.nickname,
        roomCode, read: false, createdAt: new Date().toISOString(),
      })
      save(db)
      return delay(undefined)
    },
  }
}
