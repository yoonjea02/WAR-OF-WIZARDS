import { describe, expect, it } from 'vitest'
import { createSupabaseApi, friendly } from '../src/lib/supabaseApi'
import { isTempNickname, readOAuthError } from '../src/lib/oauthError'

describe('구글 로그인 연결 (Supabase OAuth)', () => {
  it('Supabase 인증 주소를 만들어 이동한다: provider=google, 돌아올 주소, 계정 선택 화면', async () => {
    let went = ''
    const api = createSupabaseApi('https://abcdefgh.supabase.co', 'test-anon-key', { navigate: u => { went = u } })
    await api.signInWithGoogle()
    const u = new URL(went)
    expect(u.origin + u.pathname).toBe('https://abcdefgh.supabase.co/auth/v1/authorize')
    expect(u.searchParams.get('provider')).toBe('google')
    expect(u.searchParams.get('redirect_to')).toBe(window.location.origin)
    expect(u.searchParams.get('prompt')).toBe('select_account')
  })

  it('Supabase/구글 설정 오류를 사람이 이해할 수 있는 한글로 바꾼다', () => {
    expect(friendly({ message: 'Unsupported provider: provider is not enabled' }).message).toMatch(/Google 로그인이 아직 켜져 있지 않습니다/)
    expect(friendly({ message: 'redirect_uri_mismatch' }).message).toMatch(/Redirect URLs/)
    expect(friendly({ message: 'requested path is invalid: redirect URL not allowed' }).message).toMatch(/허용 목록/)
    expect(friendly({ message: 'Invalid login credentials' }).message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
  })

  it('로그인 실패로 돌아온 주소의 오류를 해석한다 (#, ? 모두)', () => {
    expect(readOAuthError('#error=access_denied&error_code=bad&error_description=Access+denied', '')).toMatch(/테스트 사용자/)
    expect(readOAuthError('', '?error=server_error&error_description=Database+error+saving+new+user')).toMatch(/schema\.sql/)
    expect(readOAuthError('#error=invalid_request&error_description=redirect+url+not+allowed', '')).toMatch(/Redirect URLs/)
    expect(readOAuthError('#access_token=abc&token_type=bearer', '')).toBeNull()
    expect(readOAuthError('', '')).toBeNull()
  })

  it('구글로 처음 가입하면 DB 가 만드는 임시 닉네임(Wiz_xxxxxx)만 닉네임 설정 대상이다', () => {
    expect(isTempNickname('Wiz_a1b2c3')).toBe(true)
    expect(isTempNickname('Wiz_A1B2C3')).toBe(true)
    expect(isTempNickname('Wizard_a1b2c3')).toBe(false)
    expect(isTempNickname('DemoWizard')).toBe(false)
    expect(isTempNickname(undefined)).toBe(false)
    // 임시 닉네임이 DB 닉네임 규칙(2~12자)을 만족해야 가입이 실패하지 않는다
    expect(/^[A-Za-z0-9가-힣_]{2,12}$/.test('Wiz_a1b2c3')).toBe(true)
  })
})
