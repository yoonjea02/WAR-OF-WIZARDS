// 오른손 실루엣 (Unity MVP 의 검은 핸드 메시 자리 표시자). 포즈는 MVP 조작에 대응한다.
//   pinch = 룬 그리기(엄지+검지 링)  /  fist = 시전 준비  /  point = 검지 조준  /  open = 대기·시전 직후
export type HandPose = 'open' | 'pinch' | 'fist' | 'point'

interface FingerDef { kx: number; ky: number; w: number; len: number; ang: number }
const FINGERS: Record<'index' | 'middle' | 'ring' | 'pinky', FingerDef> = {
  index:  { kx: 70,  ky: 124, w: 21, len: 78, ang: -7 },
  middle: { kx: 94,  ky: 117, w: 22, len: 86, ang: -1 },
  ring:   { kx: 117, ky: 121, w: 20, len: 78, ang: 5 },
  pinky:  { kx: 138, ky: 132, w: 17, len: 60, ang: 12 },
}

const CURL: Record<HandPose, Record<keyof typeof FINGERS, number>> = {
  open:  { index: 0.12, middle: 0.1, ring: 0.16, pinky: 0.24 },
  pinch: { index: 0.0,  middle: 0.62, ring: 0.7, pinky: 0.78 },
  fist:  { index: 1, middle: 1, ring: 1, pinky: 1 },
  point: { index: 0, middle: 1, ring: 1, pinky: 1 },
}
const ROT: Record<HandPose, number> = { open: 8, pinch: -8, fist: 0, point: -14 }

function Finger({ d, curl, fill }: { d: FingerDef; curl: number; fill: string }) {
  const len = d.len * (1 - 0.66 * curl)
  return (
    <g transform={`translate(${d.kx} ${d.ky}) rotate(${d.ang * (1 - 0.4 * curl)})`}>
      <rect x={-d.w / 2} y={-len} width={d.w} height={len + 14} rx={d.w / 2} fill={fill} stroke="#7a7a96" strokeOpacity="0.35" strokeWidth="1.2" />
      {curl > 0.5 && <ellipse cx="0" cy="2" rx={d.w * 0.52} ry={d.w * 0.42} fill={fill} stroke="#7a7a96" strokeOpacity="0.3" strokeWidth="1" />}
      <path d={`M${-d.w * 0.25} ${-len + d.w * 0.5} L${-d.w * 0.25} ${-len * 0.45}`} stroke="#fff" strokeOpacity="0.14" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  )
}

export default function Hand({ pose, x, y, scale = 1 }: { pose: HandPose; x: number; y: number; scale?: number }) {
  const fill = 'url(#handGrad)'
  const c = CURL[pose]
  return (
    <g transform={`translate(${x} ${y}) rotate(${ROT[pose]} 100 190) scale(${scale})`} style={{ transition: 'transform .25s ease' }} data-pose={pose}>
      <defs>
        <linearGradient id="handGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4a4a5c" />
          <stop offset="0.45" stopColor="#1c1c26" />
          <stop offset="1" stopColor="#0b0b11" />
        </linearGradient>
      </defs>
      {/* 손목 + 손바닥 */}
      <path d="M62 300 L70 214 L140 214 L150 300 Z" fill={fill} stroke="#7a7a96" strokeOpacity="0.3" />
      <rect x="52" y="118" width="102" height="106" rx="34" fill={fill} stroke="#7a7a96" strokeOpacity="0.35" strokeWidth="1.2" />
      <path d="M62 150 Q60 190 76 212" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="3" strokeLinecap="round" />

      <Finger d={FINGERS.pinky} curl={c.pinky} fill={fill} />
      <Finger d={FINGERS.ring} curl={c.ring} fill={fill} />
      <Finger d={FINGERS.middle} curl={c.middle} fill={fill} />
      {pose !== 'pinch' && <Finger d={FINGERS.index} curl={c.index} fill={fill} />}

      {/* 엄지 */}
      {pose === 'open' && <g transform="translate(56 186) rotate(-58)"><rect x="-12" y="-72" width="24" height="86" rx="12" fill={fill} stroke="#7a7a96" strokeOpacity="0.35" strokeWidth="1.2" /></g>}
      {pose === 'point' && <g transform="translate(58 180) rotate(24)"><rect x="-12" y="-44" width="24" height="56" rx="12" fill={fill} stroke="#7a7a96" strokeOpacity="0.35" strokeWidth="1.2" /></g>}
      {pose === 'fist' && <g transform="translate(60 176) rotate(48)"><rect x="-12" y="-52" width="24" height="64" rx="12" fill={fill} stroke="#7a7a96" strokeOpacity="0.4" strokeWidth="1.2" /></g>}
      {/* 핀치: 엄지+검지가 만드는 링 */}
      {pose === 'pinch' && (
        <g>
          <ellipse cx="64" cy="106" rx="28" ry="34" fill="none" stroke="#14141c" strokeWidth="24" transform="rotate(-14 64 106)" />
          <ellipse cx="64" cy="106" rx="28" ry="34" fill="none" stroke="url(#handGrad)" strokeWidth="22" transform="rotate(-14 64 106)" />
          <ellipse cx="64" cy="106" rx="39" ry="45" fill="none" stroke="#7a7a96" strokeOpacity="0.3" strokeWidth="1.2" transform="rotate(-14 64 106)" />
        </g>
      )}
    </g>
  )
}
