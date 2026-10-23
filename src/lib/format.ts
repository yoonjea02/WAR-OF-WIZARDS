export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function winRate(wins: number, losses: number): number {
  const n = wins + losses
  return n === 0 ? 0 : Math.round((wins / n) * 100)
}

export function tierOf(rating: number): { name: string; color: string } {
  if (rating >= 1500) return { name: '대마법사', color: '#fbbf24' }
  if (rating >= 1300) return { name: '마법사',   color: '#c084fc' }
  if (rating >= 1100) return { name: '숙련 마법사', color: '#22d3ee' }
  if (rating >= 900)  return { name: '견습 마법사', color: '#a78bfa' }
  return { name: '입문자', color: '#94a3b8' }
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export const ROOM_CODE_RE = /^[A-Z0-9]{6}$/
