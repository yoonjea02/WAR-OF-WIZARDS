import { useState } from 'react'

interface VRButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'lg' | 'md' | 'sm'
  className?: string
  disabled?: boolean
}

export default function VRButton({
  children, onClick, variant = 'primary', size = 'lg', className = '', disabled = false
}: VRButtonProps) {
  const [hovered, setHovered] = useState(false)

  const base = 'relative font-[Cinzel] font-semibold tracking-widest uppercase transition-all duration-200 select-none border cursor-pointer overflow-hidden'

  const sizes = {
    lg: 'px-12 py-4 text-xl min-w-[260px]',
    md: 'px-8 py-3 text-base min-w-[200px]',
    sm: 'px-5 py-2 text-sm min-w-[140px]',
  }

  const variants = {
    primary: `
      bg-purple-900/30 border-purple-500/60 text-purple-100
      ${hovered ? 'bg-purple-700/50 border-purple-400 shadow-[0_0_30px_rgba(124,58,237,0.7),0_0_60px_rgba(124,58,237,0.3)] scale-105' : 'shadow-[0_0_15px_rgba(124,58,237,0.3)]'}
    `,
    secondary: `
      bg-cyan-900/20 border-cyan-500/50 text-cyan-100
      ${hovered ? 'bg-cyan-700/40 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.6),0_0_60px_rgba(6,182,212,0.3)] scale-105' : 'shadow-[0_0_12px_rgba(6,182,212,0.25)]'}
    `,
    ghost: `
      bg-transparent border-purple-800/40 text-purple-300
      ${hovered ? 'border-purple-500/60 text-purple-100 scale-105' : ''}
    `,
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      style={{ borderRadius: '4px', fontFamily: 'Cinzel, serif' }}
    >
      {/* Corner accents */}
      <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-purple-400/60" />
      <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-purple-400/60" />
      <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-purple-400/60" />
      <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-purple-400/60" />
      {/* Scan line on hover */}
      {hovered && (
        <span className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
          animation: 'scanline 0.6s linear'
        }} />
      )}
      {children}
    </button>
  )
}
