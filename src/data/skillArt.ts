// ── 스킬 아트 (Notion "그림 → 스킬" 페이지 기준) ──────────────────────────────
// · circle : 마법진 아이콘 (마법서·HUD 슬롯에 표시)
// · rune   : 플레이어가 손으로 그려야 하는 룬 그림 (흰 획 + 투명 배경, UI 에서 스킬 색으로 틴트)
//
//   src/assets/skills/rune_line/S01.png ~ H06.png (룬을 허공에 그리는 궤적 연출용 가는 선 버전. 룬 그림에서 자동 생성한 것)
//
// 이미지가 수정되면 같은 파일명으로 덮어쓰기만 하면 됩니다. (코드 수정 불필요)
//   src/assets/skills/circle/S01.png ~ H06.png
//   src/assets/skills/rune/S01.png   ~ H06.png
// 파일이 없는 스킬은 SkillIcon 이 기본 도형 아이콘으로 자동 대체합니다.

const circles = import.meta.glob('../assets/skills/circle/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const runes = import.meta.glob('../assets/skills/rune/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const runeLines = import.meta.glob('../assets/skills/rune_line/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export const circleArt = (id: string): string | undefined => circles[`../assets/skills/circle/${id}.png`]
export const runeArt = (id: string): string | undefined => runes[`../assets/skills/rune/${id}.png`]
export const runeLineArt = (id: string): string | undefined => runeLines[`../assets/skills/rune_line/${id}.png`] ?? runeArt(id)
