import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  Api, AuthUser, FriendEntry, MailItem, MatchInput, MatchRecord, Profile, RankEntry,
} from './types'

// Supabase 연동 구현. 테이블/RLS/함수 정의는 supabase/schema.sql 참고.
// DB 타입을 생성하지 않았으므로 경계에서만 any 를 사용한다.
/* eslint-disable @typescript-eslint/no-explicit-any */

const noticeReadKey = (uid: string) => `wow.noticeRead.${uid}`

export function friendly(err: { message?: string; code?: string } | null | undefined, fallback = '요청 처리 중 오류가 발생했습니다.'): Error {
  const m = err?.message ?? ''
  if (/invalid login credentials/i.test(m)) return new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
  if (/user already registered/i.test(m)) return new Error('이미 가입된 이메일입니다.')
  if (/email not confirmed/i.test(m)) return new Error('이메일 인증을 완료한 뒤 로그인해주세요.')
  if (/password should be at least/i.test(m)) return new Error('비밀번호는 6자 이상이어야 합니다.')
  if (/provider is not enabled|unsupported provider/i.test(m)) return new Error('Supabase에서 Google 로그인이 아직 켜져 있지 않습니다. (대시보드 → Authentication → Sign In / Providers → Google)')
  if (/redirect.*(not allowed|mismatch)|redirect_uri_mismatch/i.test(m)) return new Error('로그인 후 돌아올 주소가 허용 목록에 없습니다. (Supabase → Authentication → URL Configuration → Redirect URLs)')
  if (/access_denied/i.test(m)) return new Error('구글 로그인이 취소되었거나 이 계정으로는 허용되지 않았습니다.')
  if (/rate limit/i.test(m)) return new Error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')
  if (err?.code === '23505') return new Error('이미 존재하는 항목입니다.')
  // 트리거/함수에서 raise exception 한 한글 메시지는 그대로 노출
  if (/[가-힣]/.test(m)) return new Error(m)
  return new Error(m || fallback)
}

const toUser = (u: { id: string; email?: string | null }): AuthUser => ({ id: u.id, email: u.email ?? '' })

export interface SupabaseApiOptions {
  /** 구글 로그인 주소로 이동하는 방법. 기본은 현재 창 이동이고, 테스트에서는 이동 대신 주소만 받아 검증한다. */
  navigate?: (url: string) => void
}

export function createSupabaseApi(url: string, anonKey: string, opts: SupabaseApiOptions = {}): Api {
  const navigate = opts.navigate ?? ((u: string) => window.location.assign(u))
  const sb: SupabaseClient = createClient(url, anonKey)

  return {
    mode: 'supabase',

    async getSession() {
      const { data } = await sb.auth.getSession()
      return data.session ? toUser(data.session.user) : null
    },

    async signUp(email, password, nickname) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { nickname: nickname.trim() } } })
      if (error) throw friendly(error)
      return { user: data.user ? toUser(data.user) : null, needsConfirm: !data.session }
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password })
      if (error || !data.user) throw friendly(error)
      return toUser(data.user)
    },

    // 구글 로그인: Supabase 가 만든 인증 주소로 이동 → 구글 로그인 → Supabase 콜백 → 이 앱(redirectTo)으로 복귀.
    // 복귀하면 supabase-js 가 주소의 토큰으로 세션을 만들고, 앱 시작 시 getSession() 이 그 세션을 가져온다.
    async signInWithGoogle() {
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },   // 매번 계정을 고르게 함 (공용 PC·팀 테스트용)
          skipBrowserRedirect: true,
        },
      })
      if (error) throw friendly(error)
      if (!data?.url) throw new Error('구글 로그인 주소를 만들지 못했습니다. Supabase 설정을 확인해주세요.')
      navigate(data.url)
    },

    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      if (error) throw friendly(error)
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async isNicknameAvailable(nickname) {
      const { data, error } = await sb.rpc('nickname_available', { p_nickname: nickname.trim() })
      if (error) throw friendly(error)
      return data === true
    },

    async getProfile(userId) {
      const { data, error } = await sb.from('profiles').select('id,nickname,rating,wins,losses').eq('id', userId).single()
      if (error) throw friendly(error, '프로필을 불러오지 못했습니다.')
      return data as Profile
    },

    async updateNickname(userId, nickname) {
      const nick = nickname.trim()
      if (!/^[A-Za-z0-9가-힣_]{2,12}$/.test(nick)) throw new Error('닉네임은 2~12자, 한글·영문·숫자·_ 만 사용할 수 있습니다.')
      const { data: free, error: e1 } = await sb.rpc('nickname_available', { p_nickname: nick })
      if (e1) throw friendly(e1)
      const mine = await this.getProfile(userId)
      if (free !== true && mine.nickname.toLowerCase() !== nick.toLowerCase()) throw new Error('이미 사용 중인 닉네임입니다.')
      const { error } = await sb.from('profiles').update({ nickname: nick }).eq('id', userId)
      if (error) throw error.code === '23505' ? new Error('이미 사용 중인 닉네임입니다.') : friendly(error, '닉네임을 바꾸지 못했습니다.')
    },

    async loadDeck(userId) {
      const { data, error } = await sb.from('decks').select('skills').eq('user_id', userId).maybeSingle()
      if (error) throw friendly(error)
      return (data?.skills as string[] | undefined) ?? []
    },

    async saveDeck(userId, skills) {
      const { error } = await sb.from('decks').upsert({ user_id: userId, skills, updated_at: new Date().toISOString() })
      if (error) throw friendly(error, '덱 저장에 실패했습니다.')
    },

    async listMatches(userId, limit) {
      const { data, error } = await sb.from('matches').select('*').eq('user_id', userId).order('ended_at', { ascending: false }).limit(limit)
      if (error) throw friendly(error)
      return (data as any[]).map(toMatch)
    },

    // ⚠ 프로토타입: 클라이언트가 결과를 직접 보고한다.
    //   실서비스에서는 Photon 전용 서버(ㅈㅈㅇ)가 service_role 로 record_match_for(...) 를 호출해야 한다.
    async recordMatch(_userId, input: MatchInput) {
      const { data, error } = await sb.rpc('record_match', {
        p_mode: input.mode, p_result: input.result, p_opponent: input.opponent,
        p_duration: Math.round(input.durationSec), p_casts: input.casts,
      })
      if (error) throw friendly(error, '전적 저장에 실패했습니다.')
      return toMatch(Array.isArray(data) ? data[0] : data)
    },

    async getRanking(limit) {
      const { data, error } = await sb.from('profiles').select('id,nickname,rating,wins,losses')
        .order('rating', { ascending: false }).order('wins', { ascending: false }).limit(limit)
      if (error) throw friendly(error)
      return (data as any[]).map((p, i): RankEntry => ({ rank: i + 1, userId: p.id, nickname: p.nickname, rating: p.rating, wins: p.wins, losses: p.losses }))
    },

    async listFriends(userId) {
      const { data, error } = await sb.from('friendships').select('requester,addressee,status')
        .or(`requester.eq.${userId},addressee.eq.${userId}`)
      if (error) throw friendly(error)
      const rows = data as { requester: string; addressee: string; status: 'pending' | 'accepted' }[]
      if (rows.length === 0) return []
      const otherIds = rows.map(r => (r.requester === userId ? r.addressee : r.requester))
      const { data: profs, error: e2 } = await sb.from('profiles').select('id,nickname,rating').in('id', otherIds)
      if (e2) throw friendly(e2)
      const map = new Map((profs as any[]).map(p => [p.id, p]))
      const out: FriendEntry[] = []
      for (const r of rows) {
        const otherId = r.requester === userId ? r.addressee : r.requester
        const p = map.get(otherId)
        if (!p) continue
        out.push({
          id: otherId, nickname: p.nickname, rating: p.rating,
          relation: r.status === 'accepted' ? 'friend' : r.requester === userId ? 'outgoing' : 'incoming',
        })
      }
      return out
    },

    async requestFriend(userId, nickname) {
      const esc = nickname.trim().replace(/[\\%_]/g, m => `\\${m}`)
      const { data: target, error } = await sb.from('profiles').select('id').ilike('nickname', esc).maybeSingle()
      if (error) throw friendly(error)
      if (!target) throw new Error('해당 닉네임의 마법사를 찾을 수 없습니다.')
      if (target.id === userId) throw new Error('자기 자신에게는 친구 요청을 보낼 수 없습니다.')
      const { data: exists } = await sb.from('friendships').select('status')
        .or(`and(requester.eq.${userId},addressee.eq.${target.id}),and(requester.eq.${target.id},addressee.eq.${userId})`).maybeSingle()
      if (exists) throw new Error(exists.status === 'accepted' ? '이미 친구입니다.' : '이미 친구 요청이 진행 중입니다.')
      const { error: e2 } = await sb.from('friendships').insert({ requester: userId, addressee: target.id, status: 'pending' })
      if (e2) throw friendly(e2)
    },

    async respondFriend(userId, otherId, accept) {
      const q = accept
        ? sb.from('friendships').update({ status: 'accepted' })
        : sb.from('friendships').delete()
      const { error } = await q.eq('requester', otherId).eq('addressee', userId).eq('status', 'pending')
      if (error) throw friendly(error)
    },

    async removeFriend(userId, otherId) {
      const { error } = await sb.from('friendships').delete()
        .or(`and(requester.eq.${userId},addressee.eq.${otherId}),and(requester.eq.${otherId},addressee.eq.${userId})`)
      if (error) throw friendly(error)
    },

    // Realtime Presence 로 접속 상태를 공유한다. (별도 테이블 불필요)
    subscribePresence(userId, cb) {
      const ch = sb.channel('presence:lobby', { config: { presence: { key: userId } } })
      ch.on('presence', { event: 'sync' }, () => cb(Object.keys(ch.presenceState())))
        .subscribe(async status => {
          if (status === 'SUBSCRIBED') await ch.track({ at: Date.now() })
        })
      return () => { void sb.removeChannel(ch) }
    },

    async listMail(userId) {
      const [{ data: mails, error: e1 }, { data: notices, error: e2 }] = await Promise.all([
        sb.from('mails').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        sb.from('notices').select('*').order('created_at', { ascending: false }).limit(30),
      ])
      if (e1) throw friendly(e1)
      if (e2) throw friendly(e2)
      let readIds: string[] = []
      try { readIds = JSON.parse(localStorage.getItem(noticeReadKey(userId)) ?? '[]') } catch { /* 무시 */ }
      const a: MailItem[] = (mails as any[]).map(m => ({
        id: m.id, kind: m.kind, title: m.title, body: m.body, from: m.from_nick ?? undefined,
        roomCode: m.room_code ?? undefined, read: m.read, createdAt: m.created_at,
      }))
      const b: MailItem[] = (notices as any[]).map(n => ({
        id: n.id, kind: 'notice', title: n.title, body: n.body, read: readIds.includes(n.id), createdAt: n.created_at,
      }))
      return [...a, ...b].sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    },

    async markMailRead(userId, mail) {
      if (mail.kind === 'notice') {
        let ids: string[] = []
        try { ids = JSON.parse(localStorage.getItem(noticeReadKey(userId)) ?? '[]') } catch { /* 무시 */ }
        if (!ids.includes(mail.id)) localStorage.setItem(noticeReadKey(userId), JSON.stringify([...ids, mail.id]))
        return
      }
      const { error } = await sb.from('mails').update({ read: true }).eq('id', mail.id)
      if (error) throw friendly(error)
    },

    async sendInvite(userId, friendId, roomCode) {
      const me = await this.getProfile(userId)
      const { error } = await sb.from('mails').insert({
        user_id: friendId, from_user: userId, from_nick: me.nickname, kind: 'invite',
        title: `${me.nickname} 님의 친선전 초대`, body: `${me.nickname} 님이 친선전에 초대했습니다.`, room_code: roomCode,
      })
      if (error) throw friendly(error, '초대를 보내지 못했습니다.')
    },
  }
}

function toMatch(m: any): MatchRecord {
  return {
    id: m.id, mode: m.mode, result: m.result, opponent: m.opponent_name,
    durationSec: m.duration_sec, casts: m.casts, ratingDelta: m.rating_delta, endedAt: m.ended_at,
  }
}
