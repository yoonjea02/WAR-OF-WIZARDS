import { useMemo, useState } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import { SKILLS, KIND_META, DECK_SIZE, MAX_HIGH_IN_DECK, getSkill, validateDeck, type SkillData } from '../data/skills'
import { RULES } from '../data/rules'
import Shell from '../components/Shell'
import VRButton from '../components/VRButton'
import SkillIcon from '../components/SkillIcon'
import RuneGlyph from '../components/RuneGlyph'

type Filter = 'all' | 'normal' | 'high'

export default function SpellbookScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { deck, saveDeck, toast } = useApp()
  const [sel, setSel] = useState<string[]>(deck)
  const [filter, setFilter] = useState<Filter>('all')
  const [focusId, setFocusId] = useState<string>(deck[0] ?? 'S03')
  const [saving, setSaving] = useState(false)

  const highCount = sel.filter(id => getSkill(id).tier === 'high').length
  const err = validateDeck(sel)
  const dirty = sel.length !== deck.length || sel.some((id, i) => id !== deck[i])
  const list = useMemo(() => SKILLS.filter(k => filter === 'all' || k.tier === filter), [filter])
  const focus = getSkill(focusId)

  const toggle = (k: SkillData) => {
    setFocusId(k.id)
    if (sel.includes(k.id)) { setSel(s => s.filter(x => x !== k.id)); return }
    if (sel.length >= DECK_SIZE) { toast(`덱이 가득 찼습니다. (${DECK_SIZE}/${DECK_SIZE}) 다른 스킬을 먼저 빼주세요.`, 'error'); return }
    if (k.tier === 'high' && highCount >= MAX_HIGH_IN_DECK) { toast(`고위력 스킬은 덱에 최대 ${MAX_HIGH_IN_DECK}장까지 넣을 수 있습니다.`, 'error'); return }
    setSel(s => [...s, k.id])
  }

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= sel.length) return
    setSel(s => { const n = [...s]; [n[i], n[j]] = [n[j], n[i]]; return n })
  }

  const save = async () => {
    if (err || saving) return
    setSaving(true)
    try { await saveDeck(sel); toast('마법서를 저장했습니다.', 'success') }
    catch (e) { toast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <Shell
      title="마법서 · 덱 편성"
      onBack={() => onNav('lobby')}
      backLabel={dirty ? '← 로비 (저장 안 됨)' : '← 로비'}
      right={
        <div className="flex items-center gap-3">
          <span className={`px-4 py-1.5 rounded-full border text-sm font-[Cinzel] font-semibold tracking-widest ${sel.length === DECK_SIZE ? 'border-cyan-500/60 text-cyan-300 bg-cyan-900/15' : 'border-purple-700/50 text-purple-300'}`}>{sel.length} / {DECK_SIZE}</span>
          <span className={`px-4 py-1.5 rounded-full border text-sm font-[Cinzel] font-semibold tracking-widest ${highCount >= MAX_HIGH_IN_DECK ? 'border-amber-500/60 text-amber-300 bg-amber-900/15' : 'border-purple-700/50 text-purple-300'}`}>★ {highCount} / {MAX_HIGH_IN_DECK}</span>
        </div>
      }
      padded={false}
    >
      <div className="grid grid-cols-[1fr_400px] h-full">
        {/* 스킬 풀 */}
        <div className="overflow-y-auto p-8 flex flex-col gap-5">
          <div className="flex gap-2">
            {([['all', '전체 19'], ['normal', '일반 13'], ['high', '고위력 6']] as [Filter, string][]).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-5 py-2 rounded-full text-sm font-[Cinzel] font-semibold tracking-widest border transition-all"
                style={{ borderColor: filter === f ? '#a78bfa' : 'rgba(124,58,237,0.25)', color: filter === f ? '#e8e4ff' : '#6b6a8a', background: filter === f ? 'rgba(124,58,237,0.25)' : 'transparent' }}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {list.map(k => {
              const on = sel.includes(k.id)
              return (
                <button key={k.id} onClick={() => toggle(k)} onMouseEnter={() => setFocusId(k.id)}
                  className="relative flex items-center gap-3 p-3 rounded border text-left transition-all hover:scale-[1.02]"
                  style={{ borderColor: on ? `${k.color}99` : 'rgba(124,58,237,0.2)', background: on ? `${k.color}18` : 'rgba(0,0,0,0.3)', boxShadow: on ? `0 0 16px ${k.glow.replace('0.65', '0.25')}` : 'none' }}>
                  <SkillIcon skill={k} size={54} active={on} />
                  <div className="min-w-0">
                    <div className="font-[Cinzel] font-bold text-base" style={{ color: on ? k.color : '#c4b5fd' }}>{k.name}</div>
                    <div className="text-xs font-[Rajdhani] tracking-widest text-purple-500">{k.id} · {KIND_META[k.kind].label} · {k.tier === 'high' ? `${RULES.cooldown.high}s` : `${RULES.cooldown.normal}s`}</div>
                  </div>
                  {on && <span className="absolute top-2 right-2 w-5 h-5 rounded-full text-[11px] font-black text-black flex items-center justify-center" style={{ background: k.color }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* 상세 + 덱 */}
        <div className="border-l border-purple-900/30 flex flex-col min-h-0">
          <div className="p-6 border-b border-purple-900/30">
            <div className="flex items-center gap-4">
              <SkillIcon skill={focus} size={72} />
              <div>
                <div className="font-[Cinzel] font-bold text-2xl" style={{ color: focus.color }}>{focus.name}</div>
                <div className="text-sm font-[Rajdhani] text-purple-400">
                  {focus.id} · {focus.tier === 'high' ? '고위력' : '일반'} · {KIND_META[focus.kind].label}
                </div>
              </div>
            </div>
            <p className="font-[Rajdhani] text-base text-purple-200 mt-3 leading-relaxed">{focus.effect}</p>
            <div className="mt-3 flex items-center gap-4 rounded border border-purple-900/40 bg-black/30 p-3">
              <div className="w-[84px] h-[84px] flex-shrink-0 flex items-center justify-center rounded bg-purple-950/40 border border-purple-900/30">
                <RuneGlyph id={focus.id} size={64} color={focus.color} />
              </div>
              <div className="text-sm font-[Rajdhani] text-purple-300 leading-snug">
                <div className="font-semibold text-purple-100 mb-0.5">그려야 할 룬</div>
                오른손 핀치를 누른 채 허공에 그립니다. 인식되면 주먹으로 준비하고, 검지로 조준합니다.
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ['쿨타임', `${focus.tier === 'high' ? RULES.cooldown.high : RULES.cooldown.normal}초`],
                ['조준', KIND_META[focus.kind].aim.split(' (')[0]],
                ['제한', focus.tier === 'high' ? `게임당 ${RULES.highUsesPerGame}회` : '없음'],
              ].map(([k, v]) => (
                <div key={k} className="rounded bg-black/30 border border-purple-900/30 py-2 px-1">
                  <div className="font-[Rajdhani] font-semibold text-sm text-purple-100">{v}</div>
                  <div className="text-[11px] font-[Rajdhani] tracking-widest text-purple-500">{k}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-xs font-[Rajdhani] tracking-widest uppercase text-purple-500 mb-3">내 덱 · HUD 슬롯 순서 (2줄 × 4칸)</div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: DECK_SIZE }, (_, i) => {
                const id = sel[i]
                return (
                  <div key={i} className="flex flex-col items-center gap-1 p-2 rounded border border-purple-900/30 bg-black/30 min-h-[104px]">
                    <span className="text-[10px] font-[Rajdhani] text-purple-600 self-start">{i + 1}</span>
                    {id ? (
                      <>
                        <SkillIcon skill={id} size={40} />
                        <span className="text-[10px] font-[Cinzel] text-center leading-tight" style={{ color: getSkill(id).color }}>{getSkill(id).name}</span>
                        <div className="flex gap-1">
                          <button aria-label="앞으로" onClick={() => move(i, -1)} disabled={i === 0} className="w-5 h-5 text-xs rounded bg-purple-900/40 text-purple-200 disabled:opacity-25">◀</button>
                          <button aria-label="뒤로" onClick={() => move(i, 1)} disabled={i === sel.length - 1} className="w-5 h-5 text-xs rounded bg-purple-900/40 text-purple-200 disabled:opacity-25">▶</button>
                          <button aria-label="빼기" onClick={() => setSel(s => s.filter(x => x !== id))} className="w-5 h-5 text-xs rounded bg-red-900/40 text-red-200">×</button>
                        </div>
                      </>
                    ) : <div className="w-10 h-10 mt-2 rounded border border-dashed border-purple-900/40" />}
                  </div>
                )
              })}
            </div>
            {sel.length > 0 && err && <div className="mt-3 text-sm font-[Rajdhani] text-amber-300">{err}</div>}
            <p className="mt-4 text-xs font-[Rajdhani] text-purple-600 leading-relaxed">
              전투 중에는 슬롯 순환 없이 8장이 고정 배치됩니다. 슬롯 번호는 전투 HUD의 단축키(1~8) 순서와 같아요.
            </p>
          </div>

          <div className="p-5 border-t border-purple-900/30 flex gap-3">
            <VRButton variant="ghost" size="sm" className="!min-w-0" onClick={() => setSel([])} disabled={sel.length === 0}>비우기</VRButton>
            <VRButton variant="primary" size="md" className="flex-1 !min-w-0" onClick={save} disabled={!!err || saving || !dirty}>
              {saving ? '저장 중…' : dirty ? '덱 저장' : '저장됨 ✓'}
            </VRButton>
          </div>
        </div>
      </div>
    </Shell>
  )
}
