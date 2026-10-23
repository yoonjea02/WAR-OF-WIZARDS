import { useState, InputHTMLAttributes } from 'react'

interface MagicInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: React.ReactNode
  error?: string
  hint?: string
  rightSlot?: React.ReactNode
}

export default function MagicInput({ label, icon, error, hint, rightSlot, className = '', ...props }: MagicInputProps) {
  const [focused, setFocused] = useState(false)

  const borderColor = error
    ? 'rgba(239,68,68,0.8)'
    : focused
    ? 'rgba(6,182,212,0.8)'
    : 'rgba(124,58,237,0.35)'

  const glowColor = error
    ? 'rgba(239,68,68,0.25)'
    : focused
    ? 'rgba(6,182,212,0.2)'
    : 'transparent'

  const iconColor = error
    ? '#ef4444'
    : focused
    ? '#06b6d4'
    : 'rgba(139,92,246,0.5)'

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm font-[Rajdhani] font-semibold tracking-widest uppercase text-purple-400">
        {label}
      </label>
      <div
        className="relative flex items-center transition-all duration-200"
        style={{
          background: 'rgba(6,4,20,0.8)',
          border: `1px solid ${borderColor}`,
          borderRadius: 4,
          boxShadow: `0 0 0 3px ${glowColor}, inset 0 0 20px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Left icon */}
        <span className="absolute left-4 flex items-center pointer-events-none transition-colors duration-200" style={{ color: iconColor }}>
          {icon}
        </span>

        <input
          {...props}
          onFocus={e => { setFocused(true); props.onFocus?.(e) }}
          onBlur={e => { setFocused(false); props.onBlur?.(e) }}
          className="w-full bg-transparent text-lg font-[Rajdhani] text-purple-100 placeholder-purple-700 outline-none px-12 py-4"
          style={{ caretColor: '#06b6d4' }}
        />

        {/* Right slot (e.g. eye toggle) */}
        {rightSlot && (
          <span className="absolute right-4 flex items-center">{rightSlot}</span>
        )}

        {/* Focus scan line */}
        {focused && !error && (
          <span className="absolute bottom-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.6), transparent)' }} />
        )}
      </div>

      {/* Error / hint */}
      {error && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span className="text-xs font-[Rajdhani] text-red-400">{error}</span>
        </div>
      )}
      {hint && !error && (
        <span className="text-xs font-[Rajdhani] text-purple-600">{hint}</span>
      )}
    </div>
  )
}
