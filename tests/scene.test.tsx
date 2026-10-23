import { describe, expect, it } from 'vitest'
import { HORIZON, VH, VW, Z, frontLine, layoutUnits, proj } from '../src/lib/scene'

describe('전투 장면 투영 (MVP 화면 구도)', () => {
  it('멀수록 작아지고 지평선에 가까워진다', () => {
    const near = proj(0, Z.myTower), far = proj(0, Z.foeTower), gate = proj(0, Z.gates)
    expect(near.u).toBeGreaterThan(far.u)
    expect(far.u).toBeGreaterThan(gate.u)
    expect(near.y).toBeGreaterThan(far.y)
    expect(far.y).toBeGreaterThan(gate.y)
    expect(gate.y).toBeGreaterThan(HORIZON)
  })

  it('중앙 레인은 화면 가운데, 좌/우는 대칭이며 카메라가 이동하면 장면이 반대로 밀린다', () => {
    expect(proj(0, 40).x).toBeCloseTo(VW / 2)
    const l = proj(-1, 40), r = proj(1, 40)
    expect(VW / 2 - l.x).toBeCloseTo(r.x - VW / 2)
    expect(proj(0, 40, 0.8).x).toBeLessThan(VW / 2)
  })

  it('내 타워는 화면 아래쪽, 적 타워는 위쪽, 게이트는 화면 안에 있다 (스크린샷 구도)', () => {
    const my = proj(0, Z.myTower), foe = proj(0, Z.foeTower), g = proj(0, Z.gates)
    expect(my.y).toBeGreaterThan(VH * 0.7)
    expect(my.y).toBeLessThan(VH)
    expect(foe.y).toBeLessThan(VH * 0.5)
    expect(g.y).toBeGreaterThan(HORIZON)
    expect(g.y).toBeLessThan(VH * 0.4)
  })

  it('높이는 위쪽(작은 y)으로 올라간다', () => {
    expect(proj(0, 30, 0, 1).y).toBeLessThan(proj(0, 30, 0, 0).y)
  })

  it('전선은 유닛이 많은 쪽이 밀고 올라가며 범위를 벗어나지 않는다', () => {
    expect(frontLine(5, 5)).toBe(30)
    expect(frontLine(10, 2)).toBeGreaterThan(frontLine(5, 5))
    expect(frontLine(2, 10)).toBeLessThan(frontLine(5, 5))
    expect(frontLine(20, 0)).toBe(40)           // 적 타워(z=46) 앞에서 멈춘다
    expect(frontLine(0, 20)).toBe(20)           // 내 타워(z=10) 앞에서 멈춘다
  })

  it('유닛 배치: 개수 일치, 3레인 순환, 아군은 전선 뒤 · 적은 전선 앞, 범위 이내', () => {
    const front = 30
    const me = layoutUnits(7, 'me', front), foe = layoutUnits(7, 'foe', front)
    expect(me).toHaveLength(7)
    expect(new Set(me.slice(0, 3).map(u => Math.round(u.x)))).toEqual(new Set([-1, 0, 1]))
    expect(me.every(u => u.z < front && u.z >= Z.unitMin)).toBe(true)
    expect(foe.every(u => u.z > front && u.z <= Z.unitMax)).toBe(true)
    expect(layoutUnits(20, 'me', 20).every(u => u.z >= Z.unitMin)).toBe(true)
    expect(layoutUnits(0, 'foe', front)).toHaveLength(0)
    expect(layoutUnits(2.6, 'me', front)).toHaveLength(3)
  })
})
