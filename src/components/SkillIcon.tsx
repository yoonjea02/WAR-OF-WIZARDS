import { SKILL_MAP, type SkillData, type SkillKind } from '../data/skills'
import { circleArt } from '../data/skillArt'

interface Props {
  skill: SkillData | string
  size?: number
  active?: boolean
  dim?: boolean
  className?: string
}

// 종류(투사체/범위/빔/버프/소환/설치/전역)별 플레이스홀더 심볼.
// 실제 룬/아이콘 아트는 ㅇㅎㅅ 파트에서 교체 예정이므로 슬롯 구조만 확정해둔다.
function Glyph({ kind, color, s }: { kind: SkillKind; color: string; s: number }) {
  const common = { width: s, height: s, viewBox: '0 0 48 48', fill: 'none' } as const
  switch (kind) {
    case 'projectile':
      return (
        <svg {...common}>
          <circle cx="32" cy="24" r="8" fill={color} />
          <path d="M6 24h16M9 16l12 5M9 32l12-5" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        </svg>
      )
    case 'area':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="4" fill={color} />
          <circle cx="24" cy="24" r="11" stroke={color} strokeWidth="2.5" />
          <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
        </svg>
      )
    case 'beam':
      return (
        <svg {...common}>
          <rect x="20" y="3" width="8" height="42" rx="4" fill={color} />
          <rect x="14" y="3" width="20" height="42" rx="8" stroke={color} strokeWidth="2" opacity="0.5" />
        </svg>
      )
    case 'buff':
      return (
        <svg {...common}>
          <path d="M24 4 40 11v12c0 10-16 19-16 19S8 33 8 23V11z" fill={color} opacity="0.9" />
          <path d="M17 23l5 5 9-10" stroke="#0b0b1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'summon':
      return (
        <svg {...common}>
          <circle cx="24" cy="15" r="8" fill={color} />
          <path d="M9 42c0-11 6-16 15-16s15 5 15 16z" fill={color} opacity="0.75" />
        </svg>
      )
    case 'install':
      return (
        <svg {...common}>
          <path d="M10 42V22l14-14 14 14v20z" fill={color} opacity="0.85" />
          <rect x="19" y="28" width="10" height="14" fill="#0b0b1a" opacity="0.6" />
        </svg>
      )
    case 'global':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="17" stroke={color} strokeWidth="3" />
          <ellipse cx="24" cy="24" rx="8" ry="17" stroke={color} strokeWidth="2" opacity="0.8" />
          <path d="M7 24h34" stroke={color} strokeWidth="2" opacity="0.8" />
        </svg>
      )
  }
}

export default function SkillIcon({ skill, size = 64, active = true, dim = false, className = '' }: Props) {
  const k = typeof skill === 'string' ? SKILL_MAP[skill] : skill
  if (!k) return null
  const lit = active && !dim
  const high = k.tier === 'high'
  const art = circleArt(k.id)
  const ring = high ? '#fbbf24' : lit ? `${k.color}cc` : 'rgba(124,58,237,0.35)'

  // 마법진 아트가 있으면 원형 이미지로, 없으면 기존 도형 아이콘으로 표시
  if (art) {
    return (
      <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size, opacity: dim ? 0.4 : 1, transition: 'all .25s ease' }}>
        <img
          src={art} alt="" draggable={false}
          className="absolute inset-0 w-full h-full rounded-full object-cover"
          style={{
            border: `${high ? 2.5 : 1.5}px solid ${ring}`,
            boxShadow: lit ? `0 0 ${size * 0.35}px ${k.glow}` : 'none',
            filter: lit ? 'none' : 'grayscale(1) brightness(0.65)',
            background: '#000',
          }}
        />
        {high && (
          <span aria-hidden="true" className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-[9px] font-black text-black flex items-center justify-center font-[Rajdhani]">★</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size, opacity: dim ? 0.4 : 1, transition: 'all .25s ease' }}
    >
      <div
        className="hex-clip absolute inset-0 flex items-center justify-center"
        style={{
          background: lit ? `${k.color}22` : 'rgba(255,255,255,0.04)',
          boxShadow: lit ? `0 0 ${size * 0.4}px ${k.glow}` : 'none',
        }}
      >
        <Glyph kind={k.kind} color={lit ? k.color : '#6b6a8a'} s={size * 0.52} />
      </div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 pointer-events-none" fill="none">
        <polygon
          points={`${size / 2},2 ${size - 4},${size * 0.27} ${size - 4},${size * 0.73} ${size / 2},${size - 2} 4,${size * 0.73} 4,${size * 0.27}`}
          stroke={high ? '#fbbf24' : lit ? `${k.color}99` : 'rgba(124,58,237,0.3)'}
          strokeWidth={high ? 2.5 : 1.5}
        />
      </svg>
      {high && (
        <span aria-hidden="true" className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-[9px] font-black text-black flex items-center justify-center font-[Rajdhani]">
          ★
        </span>
      )}
    </div>
  )
}
