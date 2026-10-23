interface EnergyBarProps {
  value: number // 0-100
  max?: number
  color?: 'purple' | 'cyan' | 'orange' | 'red'
  label?: string
  height?: number
  className?: string
  showValue?: boolean
}

const colorMap = {
  purple: { bar: 'rgba(139,92,246,1)', glow: 'rgba(139,92,246,0.6)', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
  cyan:   { bar: 'rgba(6,182,212,1)',  glow: 'rgba(6,182,212,0.6)',  bg: 'rgba(6,182,212,0.1)',  border: 'rgba(6,182,212,0.3)' },
  orange: { bar: 'rgba(249,115,22,1)', glow: 'rgba(249,115,22,0.6)', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
  red:    { bar: 'rgba(239,68,68,1)',  glow: 'rgba(239,68,68,0.6)',  bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)' },
}

export default function EnergyBar({ value, max = 100, color = 'purple', label, height = 12, className = '', showValue = false }: EnergyBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const c = colorMap[color]

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs font-semibold tracking-widest uppercase text-purple-300 font-[Rajdhani]">{label}</span>}
          {showValue && <span className="text-xs font-bold text-purple-200 font-[Rajdhani]">{value}/{max}</span>}
        </div>
      )}
      <div
        className="relative rounded-sm overflow-hidden"
        style={{ height, background: c.bg, border: `1px solid ${c.border}` }}
      >
        {/* Tick marks */}
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${(i + 1) * 10}%`, background: 'rgba(255,255,255,0.05)' }} />
        ))}
        {/* Fill */}
        <div
          className="absolute left-0 top-0 bottom-0 transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${c.bar.replace('1)', '0.7)')}, ${c.bar})`,
            boxShadow: `0 0 ${height}px ${c.glow}, inset 0 0 ${height / 2}px rgba(255,255,255,0.1)`,
          }}
        />
        {/* Shimmer highlight */}
        <div className="absolute top-0 left-0 right-0 h-1/3 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), transparent)' }} />
      </div>
    </div>
  )
}
