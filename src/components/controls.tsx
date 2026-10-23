export function Slider({ label, value, onChange, min = 0, max = 100, color = 'purple', unit = '' }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number
  color?: 'purple' | 'cyan' | 'orange'; unit?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  const track = color === 'cyan' ? 'rgba(6,182,212,1)' : color === 'orange' ? 'rgba(249,115,22,1)' : 'rgba(124,58,237,1)'
  const glow = track.replace(',1)', ',0.6)')
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="font-[Rajdhani] font-semibold text-lg text-purple-200 tracking-wide">{label}</span>
        <span className="font-[Cinzel] font-bold text-xl" style={{ color: track }}>{value}{unit}</span>
      </div>
      <div className="relative h-10 flex items-center">
        <div className="absolute inset-x-0 h-2 rounded-full bg-purple-950/60 border border-purple-800/30" />
        <div className="absolute left-0 h-2 rounded-full transition-all duration-100" style={{ width: `${pct}%`, background: track, boxShadow: `0 0 8px ${glow}` }} />
        <input
          type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-10"
          aria-label={label}
        />
        <div className="absolute h-6 w-6 rounded-full border-2 pointer-events-none"
          style={{ left: `calc(${pct}% - 12px)`, background: '#0a0a1a', borderColor: track, boxShadow: `0 0 12px ${glow}` }} />
      </div>
    </div>
  )
}

export function Toggle({ value, onChange, color = 'purple', label }: {
  value: boolean; onChange: (v: boolean) => void; color?: 'purple' | 'cyan' | 'orange'; label?: string
}) {
  const on = color === 'cyan' ? '#06b6d4' : color === 'orange' ? '#f97316' : '#7c3aed'
  const glow = color === 'cyan' ? 'rgba(6,182,212,0.5)' : color === 'orange' ? 'rgba(249,115,22,0.5)' : 'rgba(124,58,237,0.5)'
  return (
    <button
      type="button" role="switch" aria-checked={value} aria-label={label}
      onClick={() => onChange(!value)}
      className="relative w-14 h-7 rounded-full border transition-all duration-300 cursor-pointer flex-shrink-0"
      style={{
        background: value ? `${on}33` : 'rgba(255,255,255,0.03)',
        borderColor: value ? on : 'rgba(124,58,237,0.25)',
        boxShadow: value ? `0 0 10px ${glow}` : 'none',
      }}
    >
      <div className="absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300"
        style={{ left: value ? 'calc(100% - 26px)' : '2px', background: value ? on : 'rgba(124,58,237,0.3)', boxShadow: value ? `0 0 8px ${glow}` : 'none' }} />
    </button>
  )
}
