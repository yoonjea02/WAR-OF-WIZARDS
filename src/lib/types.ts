export interface AuthUser { id: string; email: string }

export interface Profile {
  id: string
  nickname: string
  rating: number
  wins: number
  losses: number
}

export type MatchMode = 'ranked' | 'friendly' | 'bot'

export interface MatchInput {
  mode: MatchMode
  result: 'win' | 'lose'
  opponent: string
  durationSec: number
  casts: number
}

/** 서버는 무승부(DRAW)도 기록할 수 있다 */
export interface MatchRecord extends Omit<MatchInput, 'result'> {
  result: 'win' | 'lose' | 'draw'
  id: string
  ratingDelta: number
  endedAt: string
}

export interface FriendEntry {
  id: string
  nickname: string
  rating: number
  relation: 'friend' | 'incoming' | 'outgoing'
}

export interface MailItem {
  id: string
  kind: 'mail' | 'notice' | 'invite'
  title: string
  body: string
  from?: string
  roomCode?: string
  read: boolean
  createdAt: string
}

export interface RankEntry {
  rank: number
  userId: string
  nickname: string
  rating: number
  wins: number
  losses: number
}

export interface Api {
  mode: 'mock' | 'supabase' | 'server'
  // 인증 (캔버스 1)
  getSession(): Promise<AuthUser | null>
  signUp(email: string, password: string, nickname: string): Promise<{ user: AuthUser | null; needsConfirm: boolean }>
  signIn(email: string, password: string): Promise<AuthUser>
  signInWithGoogle(): Promise<void>
  resetPassword(email: string): Promise<void>
  signOut(): Promise<void>
  isNicknameAvailable(nickname: string): Promise<boolean>
  // 프로필 / 덱 / 전적 (캔버스 2·3·9·13)
  getProfile(userId: string): Promise<Profile>
  updateNickname(userId: string, nickname: string): Promise<void>
  loadDeck(userId: string): Promise<string[]>
  saveDeck(userId: string, skills: string[]): Promise<void>
  listMatches(userId: string, limit: number): Promise<MatchRecord[]>
  recordMatch(userId: string, input: MatchInput): Promise<MatchRecord>
  // 랭킹 (캔버스 8)
  getRanking(limit: number): Promise<RankEntry[]>
  // 친구 (캔버스 5)
  listFriends(userId: string): Promise<FriendEntry[]>
  requestFriend(userId: string, nickname: string): Promise<void>
  respondFriend(userId: string, otherId: string, accept: boolean): Promise<void>
  removeFriend(userId: string, otherId: string): Promise<void>
  subscribePresence(userId: string, cb: (onlineIds: string[]) => void): () => void
  // 우편 / 공지 / 초대 (캔버스 6·7)
  listMail(userId: string): Promise<MailItem[]>
  markMailRead(userId: string, mail: MailItem): Promise<void>
  sendInvite(userId: string, friendId: string, roomCode: string): Promise<void>
}
