import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { api } from '../src/lib/api'

// 구글 로그인으로 처음 가입한 사용자를 흉내: DB 트리거가 만드는 임시 닉네임(Wiz_xxxxxx)으로 가입된 계정
async function loginAsFreshGoogleUser() {
  await api.signUp('g.user@gmail.com', 'abcdef', 'Wiz_a1b2c3')
  const user = userEvent.setup()
  render(<App />)
  await user.type(await screen.findByPlaceholderText('wizard@example.com'), 'g.user@gmail.com')
  await user.type(screen.getByPlaceholderText('••••••••'), 'abcdef')
  await user.click(screen.getByRole('button', { name: '로그인' }))
  return user
}

describe('구글 첫 로그인 후 닉네임 설정', () => {
  it('임시 닉네임이면 창이 뜨고, 규칙 위반·중복은 거부하며, 유효하면 바뀐다', async () => {
    const user = await loginAsFreshGoogleUser()
    const dialog = await screen.findByRole('dialog', { name: '닉네임 설정' }, { timeout: 12_000 })
    expect(dialog.textContent).toContain('Wiz_a1b2c3')

    const input = screen.getByLabelText('새 닉네임')
    await user.type(input, 'a')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByText(/2~12자, 한글·영문·숫자·_ 만/)).toBeTruthy()

    await user.clear(input)
    await user.type(input, 'Merlin')               // 이미 있는 닉네임
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByText('이미 사용 중인 닉네임입니다.')).toBeTruthy()

    await user.clear(input)
    await user.type(input, '구글마법사')
    await user.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '닉네임 설정' })).toBeNull(), { timeout: 8000 })
    expect(screen.getByText('구글마법사')).toBeTruthy()
  })

  it('"나중에"를 누르면 창이 닫히고 임시 닉네임이 유지된다', async () => {
    sessionStorage.clear()
    const user = await loginAsFreshGoogleUser()
    await screen.findByRole('dialog', { name: '닉네임 설정' }, { timeout: 12_000 })
    await user.click(screen.getByRole('button', { name: '나중에' }))
    expect(screen.queryByRole('dialog', { name: '닉네임 설정' })).toBeNull()
    expect(screen.getByText('Wiz_a1b2c3')).toBeTruthy()
  })

  it('일반 닉네임 계정(데모)은 창이 뜨지 않는다', async () => {
    sessionStorage.clear()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText(/데모 계정으로 바로 시작/))
    await screen.findByText('메인 로비', {}, { timeout: 12_000 })
    expect(screen.queryByRole('dialog', { name: '닉네임 설정' })).toBeNull()
  })
})
