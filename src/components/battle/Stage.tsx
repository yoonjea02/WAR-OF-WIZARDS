import { useEffect, useRef, useState, type ReactNode } from 'react'

// 1280×720 가상 좌표계를 창 크기에 맞춰 비율 유지로 맞춘다. 장면(SVG)과 HUD(HTML)가 같은 좌표를 공유한다.
export const STAGE_W = 1280
export const STAGE_H = 720

export default function Stage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const fit = () => setScale(Math.min(el.clientWidth / STAGE_W, el.clientHeight / STAGE_H) || 1)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden flex items-center justify-center" style={{ background: '#3b2428' }}>
      <div style={{ width: STAGE_W, height: STAGE_H, flex: 'none', position: 'relative', transform: `scale(${scale})`, transformOrigin: 'center' }}>
        {children}
      </div>
    </div>
  )
}
