// 구글 로그인 후 Supabase 가 오류와 함께 앱으로 돌려보내면 주소(#… 또는 ?…)에
// error / error_code / error_description 이 붙어 온다. 이를 사용자가 이해할 수 있는 한글 문장으로 바꾼다.
export function readOAuthError(hash: string, search: string): string | null {
  const h = new URLSearchParams(hash.replace(/^#/, ''))
  const q = new URLSearchParams(search.replace(/^\?/, ''))
  const code = h.get('error_code') ?? q.get('error_code') ?? ''
  const err = h.get('error') ?? q.get('error') ?? ''
  const desc = h.get('error_description') ?? q.get('error_description') ?? ''
  if (!err && !desc && !code) return null
  const all = `${code} ${err} ${desc}`.toLowerCase()
  if (all.includes('access_denied')) return '구글 로그인이 취소되었거나 이 계정으로는 허용되지 않았습니다. (구글 콘솔이 "테스트" 상태면 테스트 사용자로 등록된 계정만 로그인할 수 있습니다.)'
  if (all.includes('redirect') ) return '로그인 후 돌아올 주소가 허용 목록에 없습니다. (Supabase → Authentication → URL Configuration → Redirect URLs)'
  if (all.includes('database error saving new user')) return '가입 처리 중 데이터베이스 오류가 났습니다. supabase/schema.sql 의 최신 버전을 다시 실행했는지 확인해주세요.'
  return desc || err || code
}

/** 기본(임시) 닉네임인지 — 구글 로그인으로 처음 가입하면 DB 트리거가 Wiz_xxxxxx 를 만든다. */
export const isTempNickname = (nick: string | undefined | null) => !!nick && /^Wiz_[0-9a-f]{6}$/i.test(nick)
