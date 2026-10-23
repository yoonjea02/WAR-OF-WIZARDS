import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SKILLS } from '../src/data/skills'
import { circleArt, runeArt, runeLineArt } from '../src/data/skillArt'
import SkillIcon from '../src/components/SkillIcon'
import RuneGlyph from '../src/components/RuneGlyph'

describe('스킬 아트 (그림 → 스킬 페이지)', () => {
  it('19종 모두 마법진 이미지와 룬 그림이 연결되어 있다', () => {
    expect(SKILLS).toHaveLength(19)
    const missing = SKILLS.filter(k => !circleArt(k.id) || !runeArt(k.id) || !runeLineArt(k.id)).map(k => k.id)
    expect(missing).toEqual([])
  })

  it('SkillIcon 은 마법진 이미지를 표시하고, 고위력 스킬에는 별 표시가 붙는다', () => {
    const { container, rerender } = render(<SkillIcon skill="S03" size={52} />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe(circleArt('S03'))
    expect(container.textContent).not.toContain('★')
    rerender(<SkillIcon skill="H01" size={52} />)
    expect(container.textContent).toContain('★')
  })

  it('RuneGlyph 는 해당 스킬의 룬 그림을 마스크로 사용한다', () => {
    render(<RuneGlyph id="S06" color="#a78bfa" />)
    const el = screen.getByRole('img', { name: 'S06 룬 그림' })
    expect(el.getAttribute('style')).toContain(runeArt('S06')!)
  })
})
