import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'

const T = { timeout: 12_000 }

async function loginDemo() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByText(/데모 계정으로 바로 시작/))
  await screen.findByText('메인 로비', {}, T)
  return user
}

describe('인증', () => {
  it('로그인 전에는 로그인 화면이고, 빈 값으로 로그인하면 검증 오류를 보여준다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('War of Wizards')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText('올바른 이메일 주소를 입력해주세요.')).toBeTruthy()
    expect(screen.getByText('비밀번호는 6자 이상이어야 합니다.')).toBeTruthy()
  })

  it('틀린 비밀번호는 서버 오류 메시지를 보여주고, 올바르면 로비로 이동한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByPlaceholderText('wizard@example.com'), 'demo@wow.dev')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다.', {}, T)).toBeTruthy()
    const pw = screen.getByPlaceholderText('••••••••')
    await user.clear(pw)
    await user.type(pw, 'demo1234')
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText('메인 로비', {}, T)).toBeTruthy()
    expect(screen.getByText('DemoWizard')).toBeTruthy()
  })
})

describe('로비 · 마이페이지 · 랭킹 · 설정', () => {
  it('로비에서 각 캔버스로 이동하고 돌아올 수 있다', async () => {
    const user = await loginDemo()

    await user.click(screen.getByText('마이페이지'))
    await screen.findByText('전적 분석', { exact: false }, T)
    expect(await screen.findAllByText(/vs /, {}, T)).not.toHaveLength(0)
    await user.click(screen.getByRole('button', { name: /← 로비/ }))

    await user.click(await screen.findByText('랭킹'))
    expect(await screen.findByText('Merlin', {}, T)).toBeTruthy()
    expect(screen.getByText('나')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /← 로비/ }))

    await user.click(await screen.findByText('환경설정'))
    const vignette = await screen.findByRole('switch', { name: '비네팅' })
    expect(vignette.getAttribute('aria-checked')).toBe('true')
    await user.click(vignette)
    expect(vignette.getAttribute('aria-checked')).toBe('false')
    expect(JSON.parse(localStorage.getItem('wow.settings.v1')!).comfortVignette).toBe(false)
  })
})

describe('마법서', () => {
  it('고위력 2장 제한 · 8장 제한을 지키고 저장하면 로비에 반영된다', async () => {
    const user = await loginDemo()
    await user.click(screen.getByText('마법서'))
    await screen.findByText('마법서 · 덱 편성', {}, T)

    await user.click(screen.getByRole('button', { name: '비우기' }))
    for (const n of ['프리즈', '레이저 빔', '흡혈']) await user.click(screen.getByRole('button', { name: new RegExp(`^${n}`) }))
    expect(await screen.findByText('고위력 스킬은 덱에 최대 2장까지 넣을 수 있습니다.')).toBeTruthy()

    for (const n of ['파이어볼', '독 장판', '총난사', '방어 쉴드', '도끼 전사', '터렛']) await user.click(screen.getByRole('button', { name: new RegExp(`^${n}`) }))
    await user.click(screen.getByRole('button', { name: /^연막/ }))
    expect(await screen.findByText(/덱이 가득 찼습니다/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '덱 저장' }))
    expect(await screen.findByText('마법서를 저장했습니다.', {}, T)).toBeTruthy()
    expect(await screen.findByRole('button', { name: '저장됨 ✓' })).toBeTruthy()
  })
})

describe('친선전', () => {
  it('룸 생성 → 봇으로 채우기 → 대전 시작 → 카운트다운', async () => {
    const user = await loginDemo()
    await user.click(screen.getByRole('button', { name: '친선전' }))
    await user.click(await screen.findByRole('button', { name: '룸 생성' }))
    const code = await screen.findByText(/^[A-Z0-9]{6}$/)
    expect(code.textContent).toMatch(/^[A-Z0-9]{6}$/)
    const start = screen.getByRole('button', { name: '대전 시작' })
    expect((start as HTMLButtonElement).disabled).toBe(true)
    await user.click(screen.getByRole('button', { name: '봇으로 채우기' }))
    await waitFor(() => expect((screen.getByRole('button', { name: '대전 시작' }) as HTMLButtonElement).disabled).toBe(false))
    await user.click(screen.getByRole('button', { name: '대전 시작' }))
    expect(await screen.findByText('VS', {}, T)).toBeTruthy()
  })

  it('우편함의 초대장으로 바로 입장하면 룸 코드가 표시된다', async () => {
    const user = await loginDemo()
    await user.click(screen.getByText('우편함 · 공지'))
    await user.click(await screen.findByText('Aria 님의 친선전 초대', {}, T))
    expect(await screen.findByText('AB12CD')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '바로 입장' }))
    await screen.findByText('입장한 룸', {}, T)
    expect(screen.getByText('AB12CD')).toBeTruthy()
  })

  it('룸 없이 친구를 초대하려 하면 안내 메시지를 보여준다', async () => {
    const user = await loginDemo()
    await user.click(screen.getByText('친구'))
    await screen.findByText('친구 목록', {}, T)
    const invites = await screen.findAllByRole('button', { name: '초대' }, T)
    const enabled = invites.find(b => !(b as HTMLButtonElement).disabled)
    expect(enabled).toBeTruthy()
    await user.click(enabled!)
    expect(await screen.findByText('먼저 친선전 룸을 만들어야 초대할 수 있습니다.')).toBeTruthy()
  })
})

describe('전투 전체 흐름', () => {
  it('봇 연습전: 카운트다운 → 조준 시전 → 결과 저장 → 마이페이지 전적 반영', async () => {
    const user = await loginDemo()
    await user.click(screen.getByRole('button', { name: '봇 연습전' }))

    // 카운트다운 후 전투 HUD 진입
    await screen.findByText('시전 상태', {}, { timeout: 15_000 })
    expect(screen.getByRole('button', { name: '1번 파이어볼' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^\d번 / })).toHaveLength(8)

    // 파이어볼 시전 → Aiming → 중앙 열 조준
    await user.click(screen.getByRole('button', { name: '1번 파이어볼' }))
    await user.click(await screen.findByRole('button', { name: '중 열 조준' }, T))
    await waitFor(() => {
      const slot = screen.getByRole('button', { name: '1번 파이어볼' })
      expect(within(slot).getByText('5')).toBeTruthy() // 쿨타임 5초 표시
    }, T)

    // 고위력 스킬은 사용 횟수 3회 표시
    const h01 = screen.getByRole('button', { name: '7번 프리즈' })
    expect(h01.querySelectorAll('span.w-2.h-2').length).toBe(3)

    // MVP 스타일 HUD 문구: 양측 타워 락(dmg 20%), 다음 웨이브, 위치
    expect(screen.getAllByText(/dmg 20%/)).toHaveLength(2)
    expect(screen.getAllByText(/T:O N:O/)).toHaveLength(2)
    expect(screen.getByText(/Next wave \d+s/)).toBeTruthy()
    expect(screen.getByText(/POS/)).toBeTruthy()

    // 개발용 강제 승리 → 결과 화면
    await user.click(screen.getByRole('button', { name: '강제 승리' }))
    expect(await screen.findByText('VICTORY', {}, T)).toBeTruthy()
    await screen.findByText('봇 연습전은 레이팅에 반영되지 않습니다. 전적은 저장되었습니다.', {}, { timeout: 15_000 })
    expect(screen.getByText(/시전 횟수/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '로비로' }))
    await user.click(await screen.findByText('마이페이지'))
    await waitFor(() => expect(screen.getAllByText('vs Bot').length).toBeGreaterThanOrEqual(2), T)
  })

  it('MVP 스타일: 손 포즈가 핀치 → 주먹 → 검지로 바뀌고, 레인 위에서 1초 유지하면 클릭 없이 시전된다', async () => {
    const user = await loginDemo()
    await user.click(screen.getByRole('button', { name: '봇 연습전' }))
    await screen.findByText('시전 상태', {}, { timeout: 15_000 })
    const pose = () => document.querySelector('[data-pose]')?.getAttribute('data-pose')
    expect(pose()).toBe('open')

    await user.click(screen.getByRole('button', { name: '1번 파이어볼' }))
    await waitFor(() => expect(pose()).toBe('pinch'), T)       // 룬 그리기
    await waitFor(() => expect(pose()).toBe('fist'), T)        // 인식 후 시전 준비
    await waitFor(() => expect(pose()).toBe('point'), T)       // 조준
    expect(screen.getByText(/파이어볼/, { selector: 'text' })).toBeTruthy()   // 구체 위 스킬명

    const lane = await screen.findByRole('button', { name: '좌 열 조준' })
    await user.hover(lane)                                     // 클릭 없이 포인팅만 유지
    await waitFor(() => {
      const slot = screen.getByRole('button', { name: '1번 파이어볼' })
      expect(within(slot).getByText('5')).toBeTruthy()         // 1초 뒤 자동 시전 → 쿨타임 5초
    }, T)
    await waitFor(() => expect(pose()).toBe('open'), T)
  })

  it('30초 무활동 기권패: 경고 후 패배 처리', async () => {
    const user = await loginDemo()
    await user.click(screen.getByRole('button', { name: '봇 연습전' }))
    await screen.findByText('시전 상태', {}, { timeout: 15_000 })
    await user.click(screen.getByRole('button', { name: 'AFK 경고 테스트' }))
    expect(await screen.findByRole('alert', {}, T)).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toMatch(/기권패/)
  })
})
