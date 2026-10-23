// ── 전투 장면 좌표계 (Unity MVP 화면 구도) ───────────────────────────────────
// 월드: x = 레인(-1 좌, 0 중, 1 우, 레인 폭 1), z = 깊이(0 = 카메라 앞, 클수록 멀리), h = 높이.
// 화면: 1280×720 가상 좌표. 카메라가 내 타워 뒤쪽 위에서 전장을 내려다보는 시점이라 지평선이 화면 위쪽에 있다.

import type { Column } from '../data/rules'

export const VW = 1280
export const VH = 720
export const HORIZON = 118

// sy = HORIZON + A/(z+Z0),  sx = VW/2 + (x - camX) * B/(z+Z0)
const A = 14285
const Z0 = 22.1
const B = 10800

export interface P { x: number; y: number; u: number }

/** 월드 → 화면. u 는 해당 깊이에서 월드 1칸(레인 폭)이 차지하는 픽셀 수. */
export function proj(x: number, z: number, camX = 0, h = 0): P {
  const d = z + Z0
  const u = B / d
  return { x: VW / 2 + (x - camX) * u, y: HORIZON + A / d - h * u, u }
}

export const LANE_X = [-1, 0, 1] as const
export const laneX = (c: Column | number) => LANE_X[c] ?? 0

// MVP 스크린샷 배치: 내 타워가 화면 앞쪽, 적 타워는 전장 중간, 그 뒤로 넥서스 기둥, 맨 끝에 게이트 3개
export const Z = { myTower: 12, foeTower: 46, foeNexus: 53, foeAvatar: 88, gates: 102, aim: 74, unitMin: 17, unitMax: 97 } as const

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** 양쪽 유닛 수 차이로 전선(두 군대가 만나는 깊이)을 정한다. 우세하면 상대 타워 쪽으로 밀고 올라간다. */
export function frontLine(meUnits: number, foeUnits: number): number {
  return clamp(30 + (meUnits - foeUnits) * 1.6, 20, 40)
}

export interface UnitPos { side: 'me' | 'foe'; i: number; x: number; z: number }

/** 유닛 N 기를 3레인에 줄 세워 배치한다. 아군은 전선 뒤쪽(작은 z), 적은 전선 앞쪽(큰 z). */
export function layoutUnits(count: number, side: 'me' | 'foe', front: number): UnitPos[] {
  const n = Math.max(0, Math.round(count))
  const out: UnitPos[] = []
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3)
    const lane = i % 3
    const jitter = (row % 2 === 0 ? -1 : 1) * 0.12
    const z = side === 'me'
      ? Math.max(Z.unitMin, front - 3 - row * 3.4)
      : Math.min(Z.unitMax, front + 3 + row * 3.4)
    out.push({ side, i, x: LANE_X[lane] + jitter, z })
  }
  return out
}

/** 레인 바닥(사다리꼴) 꼭짓점 문자열 — SVG polygon points */
export function lanePolygon(col: number, z0: number, z1: number, camX: number, half = 0.5): string {
  const x = laneX(col)
  const pts = [proj(x - half, z0, camX), proj(x + half, z0, camX), proj(x + half, z1, camX), proj(x - half, z1, camX)]
  return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}
