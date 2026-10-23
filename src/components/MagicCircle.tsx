export default function MagicCircle({ size = 600, className = '' }: { size?: number; className?: string }) {
  const r1 = size * 0.46
  const r2 = size * 0.38
  const r3 = size * 0.28
  const cx = size / 2

  const pentagram = (r: number, cx: number) => {
    const pts = Array.from({ length: 5 }, (_, i) => {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2
      return `${cx + r * Math.cos(a)},${cx + r * Math.sin(a)}`
    })
    return pts.join(' ')
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ position: 'absolute', pointerEvents: 'none' }}
    >
      <defs>
        <filter id="glow-purple">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-cyan">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Outer ring */}
      <circle cx={cx} cy={cx} r={r1} fill="none" stroke="rgba(124,58,237,0.5)" strokeWidth="1.5" filter="url(#glow-purple)" className="spin-slow" style={{ transformOrigin: `${cx}px ${cx}px` }} />
      {/* Rune dashes on outer ring */}
      <circle cx={cx} cy={cx} r={r1} fill="none" stroke="rgba(124,58,237,0.25)" strokeWidth="0.5" strokeDasharray="3 18" className="spin-reverse" style={{ transformOrigin: `${cx}px ${cx}px` }} />
      {/* Mid ring */}
      <circle cx={cx} cy={cx} r={r2} fill="none" stroke="rgba(6,182,212,0.45)" strokeWidth="1" filter="url(#glow-cyan)" className="spin-reverse" style={{ transformOrigin: `${cx}px ${cx}px` }} />
      <circle cx={cx} cy={cx} r={r2} fill="none" stroke="rgba(6,182,212,0.15)" strokeWidth="0.5" strokeDasharray="6 12" className="spin-slow" style={{ transformOrigin: `${cx}px ${cx}px` }} />
      {/* Inner ring */}
      <circle cx={cx} cy={cx} r={r3} fill="none" stroke="rgba(167,139,250,0.4)" strokeWidth="1" filter="url(#glow-purple)" className="spin-slow" style={{ transformOrigin: `${cx}px ${cx}px`, animationDuration: '8s' }} />
      {/* Pentagram */}
      <polygon points={pentagram(r2 * 0.92, cx)} fill="none" stroke="rgba(124,58,237,0.3)" strokeWidth="0.75" filter="url(#glow-purple)" />
      {/* Center orb */}
      <circle cx={cx} cy={cx} r={size * 0.04} fill="rgba(124,58,237,0.15)" stroke="rgba(167,139,250,0.6)" strokeWidth="1" filter="url(#glow-purple)" className="pulse-glow" />
      {/* Cross lines */}
      <line x1={cx} y1={cx - r1} x2={cx} y2={cx + r1} stroke="rgba(124,58,237,0.1)" strokeWidth="0.5" />
      <line x1={cx - r1} y1={cx} x2={cx + r1} y2={cx} stroke="rgba(124,58,237,0.1)" strokeWidth="0.5" />
      <line x1={cx - r1 * 0.707} y1={cx - r1 * 0.707} x2={cx + r1 * 0.707} y2={cx + r1 * 0.707} stroke="rgba(6,182,212,0.08)" strokeWidth="0.5" />
      <line x1={cx + r1 * 0.707} y1={cx - r1 * 0.707} x2={cx - r1 * 0.707} y2={cx + r1 * 0.707} stroke="rgba(6,182,212,0.08)" strokeWidth="0.5" />
    </svg>
  )
}
