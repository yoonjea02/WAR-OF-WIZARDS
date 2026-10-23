import type { ReactNode } from 'react'
import Particles from './Particles'
import VRButton from './VRButton'

interface Props {
  title: string
  eyebrow?: string
  onBack?: () => void
  backLabel?: string
  right?: ReactNode
  footer?: ReactNode
  children: ReactNode
  padded?: boolean
  particles?: number
}

// 로비/메타 캔버스 공통 레이아웃 (헤더 + 스크롤 본문 + 푸터)
// VR 가독성을 위해 큰 타이틀/버튼을 유지한다. 실제 Unity World Space Canvas 로 옮길 때도 같은 영역 구성을 사용.
export default function Shell({ title, eyebrow = 'War of Wizards', onBack, backLabel = '← 로비', right, footer, children, padded = true, particles = 12 }: Props) {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(30,10,60,0.7) 0%, rgba(6,6,15,1) 65%)' }} />
      <Particles count={particles} />
      <header className="relative z-10 flex items-center justify-between px-12 pt-16 pb-5 border-b border-purple-900/30">
        <div>
          <div className="text-[11px] tracking-[0.5em] font-[Rajdhani] text-purple-500 uppercase mb-1">{eyebrow}</div>
          <h2 className="font-[Cinzel] font-bold text-3xl text-purple-100 glow-text-purple">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          {right}
          {onBack && <VRButton onClick={onBack} variant="ghost" size="sm">{backLabel}</VRButton>}
        </div>
      </header>
      <div className={`relative z-10 flex-1 overflow-y-auto ${padded ? 'px-12 py-8' : ''}`}>{children}</div>
      {footer && <div className="relative z-10 border-t border-purple-900/30 px-12 py-4 bg-black/40 backdrop-blur-sm">{footer}</div>}
    </div>
  )
}
