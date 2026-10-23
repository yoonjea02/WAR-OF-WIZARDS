import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { SKILLS, SKILL_MAP, codeToSpellId, deckToSpellIds, spellIdToCode, spellIdsToDeck } from '../src/data/skills'

describe('백엔드 통합 안내 반영', () => {
  it('스킬 코드 ↔ 서버/게임 번호 변환 (S03↔3, H02↔102)', () => {
    expect(codeToSpellId('S03')).toBe(3)
    expect(codeToSpellId('S13')).toBe(13)
    expect(codeToSpellId('H02')).toBe(102)
    expect(codeToSpellId('H06')).toBe(106)
    expect(spellIdToCode(3)).toBe('S03')
    expect(spellIdToCode(102)).toBe('H02')
    for (const k of SKILLS) expect(spellIdToCode(codeToSpellId(k.id))).toBe(k.id)   // 19종 왕복
    expect(new Set(SKILLS.map(k => codeToSpellId(k.id))).size).toBe(19)             // 번호 충돌 없음
    const deck = ['S03', 'S02', 'S07', 'S08', 'S11', 'S13', 'H01', 'H02']
    expect(deckToSpellIds(deck)).toEqual([3, 2, 7, 8, 11, 13, 101, 102])
    expect(spellIdsToDeck(deckToSpellIds(deck))).toEqual(deck)
  })

  it('잘못된 코드/번호는 거부한다', () => {
    for (const bad of ['S00', 'S14', 'H07', 'X01', 's03', '', 'S3']) expect(() => codeToSpellId(bad)).toThrow()
    for (const bad of [0, 14, 100, 107, 3.5, -1]) expect(() => spellIdToCode(bad)).toThrow()
  })

  it('S12 는 기획서 §14.3 / 게임 SpellDefinition 에 맞춰 "드래곤"', () => {
    expect(SKILL_MAP.S12.name).toBe('드래곤')
    expect(SKILLS.some(k => k.name === '마법사')).toBe(false)
  })

  it('우편함에는 보상·아이템이 없다 (§23.1): 환영 우편에 보상 영역·수령 버튼이 없다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText(/데모 계정으로 바로 시작/))
    await screen.findByText('메인 로비', {}, { timeout: 12_000 })
    await user.click(screen.getByText('우편함 · 공지'))
    await user.click(await screen.findByText('가입을 환영합니다!', {}, { timeout: 12_000 }))
    expect(await screen.findByText(/마법서에서 덱 8장/)).toBeTruthy()
    expect(screen.queryByText('첨부 보상')).toBeNull()
    expect(screen.queryByRole('button', { name: /수령/ })).toBeNull()
    expect(document.body.textContent).not.toContain('골드')
  })
})
