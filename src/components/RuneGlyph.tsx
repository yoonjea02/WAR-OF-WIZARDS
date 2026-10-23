import { runeArt, runeLineArt } from '../data/skillArt'

// 플레이어가 그려야 하는 룬 그림. 흰 획 PNG 를 마스크로 써서 원하는 색으로 칠한다.
export default function RuneGlyph({ id, size = 48, color = '#e8e4ff', className = '', line = false }: { id: string; size?: number; color?: string; className?: string; line?: boolean }) {
  const url = line ? runeLineArt(id) : runeArt(id)
  if (!url) return <span className={className} style={{ display: 'inline-block', width: size, height: size }} aria-hidden="true" />
  return (
    <span
      role="img"
      aria-label={`${id} 룬 그림`}
      className={className}
      style={{
        display: 'inline-block', width: size, height: size, backgroundColor: color,
        WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`,
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
      }}
    />
  )
}
