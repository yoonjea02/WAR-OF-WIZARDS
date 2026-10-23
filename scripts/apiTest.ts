// 실행: npm run test:api  — Mock API(localStorage) 의 인증/덱/친구/우편/전적/랭킹 동작 검증
import fs from 'node:fs'
import { createMockApi } from '../src/lib/mockApi'

class MemStorage implements Storage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.get(k) ?? null }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  removeItem(k: string) { this.m.delete(k) }
  setItem(k: string, v: string) { this.m.set(k, v) }
}

let pass = 0, failN = 0
const ok = (c: boolean, n: string, x = '') => { if (c) { pass++; console.log(`  ✓ ${n}`) } else { failN++; console.log(`  ✗ ${n} ${x}`) } }
const rejects = async (p: Promise<unknown>) => { try { await p; return null } catch (e) { return (e as Error).message } }

async function main() {
  const api = createMockApi(new MemStorage())

  console.log('\n[인증]')
  ok((await api.getSession()) === null, '초기 세션 없음')
  ok((await rejects(api.signIn('demo@wow.dev', 'wrong'))) !== null, '틀린 비밀번호 거부')
  const demo = await api.signIn('demo@wow.dev', 'demo1234')
  ok(demo.email === 'demo@wow.dev', '데모 로그인')
  ok((await api.getSession())?.id === demo.id, '세션 유지')
  await api.signOut()
  ok((await api.getSession()) === null, '로그아웃')
  ok(!(await api.isNicknameAvailable('demowizard')), '닉네임 중복 확인 (대소문자 무시)')
  ok(await api.isNicknameAvailable('NewWizard'), '사용 가능한 닉네임')
  ok((await rejects(api.signUp('demo@wow.dev', 'abcdef', 'Other1'))) === '이미 가입된 이메일입니다.', '이메일 중복 가입 거부')
  ok((await rejects(api.signUp('x@y.z', 'abcdef', 'Merlin'))) === '이미 사용 중인 닉네임입니다.', '닉네임 중복 가입 거부')
  const r = await api.signUp('new@wow.dev', 'abcdef', 'NewWizard')
  ok(r.user !== null && !r.needsConfirm, '회원가입')
  const me = await api.signIn('new@wow.dev', 'abcdef')
  const p0 = await api.getProfile(me.id)
  ok(p0.rating === 1000 && p0.wins === 0 && p0.nickname === 'NewWizard', '신규 프로필 초기값')
  const welcome = (await api.listMail(me.id)).filter(m => m.title.includes('환영'))
  ok(welcome.length === 1, '가입 환영 우편')
  ok(!JSON.stringify(welcome).includes('골드') && !JSON.stringify(welcome).includes('reward'), '환영 우편에 보상 없음 (§23.1)')

  console.log('\n[닉네임 변경 (구글 첫 로그인)]')
  ok((await rejects(api.updateNickname(me.id, 'a'))) !== null, '1자 거부')
  ok((await rejects(api.updateNickname(me.id, 'bad name!'))) !== null, '공백/특수문자 거부')
  ok((await rejects(api.updateNickname(me.id, 'abcdefghijklm'))) !== null, '13자 거부')
  ok((await rejects(api.updateNickname(me.id, 'merlin'))) === '이미 사용 중인 닉네임입니다.', '다른 사람과 중복(대소문자 무시) 거부')
  await api.updateNickname(me.id, '새마법사')
  ok((await api.getProfile(me.id)).nickname === '새마법사', '닉네임 변경')
  await api.updateNickname(me.id, '새마법사')
  ok(true, '내 현재 닉네임으로 다시 저장해도 중복으로 막히지 않음')
  await api.updateNickname(me.id, 'NewWizard')

  console.log('\n[스키마 가드]')
  const sql = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
  const m = sql.match(/nick := 'Wiz_' \|\| substr\(md5\([^)]*\)[^,]*, 1, (\d+)\)/)
  ok(!!m, '가입 트리거에 임시 닉네임 생성 규칙이 있음')
  if (m) ok(('Wiz_'.length + Number(m[1])) <= 12, `임시 닉네임이 DB 제약(2~12자)을 넘지 않음 (${'Wiz_'.length + Number(m[1])}자)`)
  ok(!/'Wizard_'/.test(sql), '13자가 되는 옛 임시 닉네임(Wizard_)이 남아 있지 않음')

  console.log('\n[덱]')
  ok((await api.loadDeck(me.id)).length === 0, '신규 유저 덱 비어있음')
  ok((await rejects(api.saveDeck(me.id, ['S01', 'S02']))) !== null, '8장 미만 저장 거부')
  ok((await rejects(api.saveDeck(me.id, ['S01', 'S02', 'S03', 'S04', 'S05', 'H01', 'H02', 'H03']))) !== null, '고위력 3장 저장 거부')
  const deck = ['S03', 'S02', 'S07', 'S08', 'S11', 'S13', 'H01', 'H02']
  await api.saveDeck(me.id, deck)
  ok(JSON.stringify(await api.loadDeck(me.id)) === JSON.stringify(deck), '덱 저장/불러오기 (순서 유지)')

  console.log('\n[전적/랭킹]')
  const win = await api.recordMatch(me.id, { mode: 'ranked', result: 'win', opponent: 'Bot', durationSec: 200, casts: 30 })
  ok(win.ratingDelta === 16, '랭킹전 승리 +16')
  const lose = await api.recordMatch(me.id, { mode: 'bot', result: 'lose', opponent: 'Bot', durationSec: 100, casts: 10 })
  ok(lose.ratingDelta === 0, '봇 연습전은 레이팅 변동 없음')
  await api.recordMatch(me.id, { mode: 'ranked', result: 'lose', opponent: 'Bot', durationSec: 100, casts: 5 })
  const p1 = await api.getProfile(me.id)
  ok(p1.wins === 1 && p1.losses === 2 && p1.rating === 1000, `프로필 집계 (${p1.wins}승 ${p1.losses}패 ${p1.rating})`)
  const ms = await api.listMatches(me.id, 10)
  ok(ms.length === 3 && ms[0].endedAt >= ms[1].endedAt, '전적 최신순 조회')
  const rank = await api.getRanking(100)
  ok(rank[0].rank === 1 && rank.every((x, i) => i === 0 || rank[i - 1].rating >= x.rating), '랭킹 레이팅 내림차순')
  ok(rank.some(x => x.userId === me.id), '랭킹에 내 계정 포함')

  console.log('\n[친구]')
  await api.signIn('demo@wow.dev', 'demo1234')
  const dm = (await api.getSession())!
  const fl = await api.listFriends(dm.id)
  ok(fl.filter(f => f.relation === 'friend').length === 3, '데모 친구 3명')
  ok(fl.some(f => f.relation === 'incoming' && f.nickname === 'Zephyr'), '받은 요청')
  ok(fl.some(f => f.relation === 'outgoing' && f.nickname === 'Draco'), '보낸 요청')
  ok((await rejects(api.requestFriend(dm.id, 'DemoWizard'))) !== null, '자기 자신 요청 거부')
  ok((await rejects(api.requestFriend(dm.id, 'Aria'))) === '이미 친구입니다.', '이미 친구 거부')
  ok((await rejects(api.requestFriend(dm.id, 'NoSuchUser'))) !== null, '없는 닉네임 거부')
  await api.requestFriend(dm.id, 'nyx')
  ok((await api.listFriends(dm.id)).some(f => f.nickname === 'Nyx' && f.relation === 'outgoing'), '친구 요청 전송 (대소문자 무시)')
  const zep = fl.find(f => f.nickname === 'Zephyr')!
  await api.respondFriend(dm.id, zep.id, true)
  ok((await api.listFriends(dm.id)).find(f => f.id === zep.id)?.relation === 'friend', '요청 수락')
  const aria = fl.find(f => f.nickname === 'Aria')!
  await api.removeFriend(dm.id, aria.id)
  ok(!(await api.listFriends(dm.id)).some(f => f.id === aria.id), '친구 삭제')

  console.log('\n[우편/초대]')
  const mails = await api.listMail(dm.id)
  ok(mails.some(m => m.kind === 'invite' && m.roomCode === 'AB12CD'), '초대 우편 (룸 코드 포함)')
  ok(mails.some(m => m.kind === 'notice'), '공지 포함')
  const unread0 = mails.filter(m => !m.read).length
  const notice = mails.find(m => m.kind === 'notice')!
  await api.markMailRead(dm.id, notice)
  await api.markMailRead(dm.id, mails.find(m => m.kind === 'invite')!)
  ok((await api.listMail(dm.id)).filter(m => !m.read).length === unread0 - 2, '읽음 처리 (우편/공지)')
  const kael = fl.find(f => f.nickname === 'Kael')!
  await api.sendInvite(dm.id, kael.id, 'ZZ99ZZ')
  ok(true, '친구에게 초대 전송')
  ok((await rejects(api.sendInvite(dm.id, aria.id, 'ZZ99ZZ'))) !== null, '친구가 아니면 초대 거부')

  console.log(`\n결과: ${pass} 통과, ${failN} 실패`)
  process.exit(failN ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
