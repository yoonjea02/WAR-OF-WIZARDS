import type { ReactNode } from 'react'
import type { Screen } from '../lib/nav'
import { useApp } from '../lib/store'
import Shell from '../components/Shell'
import VRButton from '../components/VRButton'
import { Slider, Toggle } from '../components/controls'

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="border border-purple-900/40 bg-purple-950/15 rounded p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3 border-b border-purple-900/30 pb-4">
        <div className="w-8 h-8 flex items-center justify-center text-purple-400">{icon}</div>
        <h3 className="font-[Cinzel] font-semibold text-xl text-purple-100 tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-[Rajdhani] text-lg text-purple-200">{label}</div>
        {hint && <div className="font-[Rajdhani] text-sm text-purple-600">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

const svg = (d: ReactNode) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">{d}</svg>

export default function SettingsScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const { settings: s, updateSettings, resetSettings, toast } = useApp()

  return (
    <Shell
      title="환경설정"
      onBack={() => onNav('lobby')}
      right={<VRButton variant="ghost" size="sm" onClick={() => { resetSettings(); toast('기본값으로 되돌렸습니다.', 'success') }}>기본값</VRButton>}
      footer={
        <div className="flex items-center justify-between">
          <span className="text-sm font-[Rajdhani] text-purple-500">변경 사항은 자동으로 저장됩니다.</span>
          <VRButton onClick={() => onNav('lobby')} variant="primary" size="md">완료</VRButton>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-6 content-start max-w-[1300px] mx-auto">
        <Section title="카메라 · 멀미 방지" icon={svg(<><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" /></>)}>
          <Slider label="카메라 감도" value={s.camSensitivity} onChange={v => updateSettings({ camSensitivity: v })} />
          <Row label="비네팅" hint="전투 중 시야 가장자리를 어둡게 하여 멀미를 줄입니다."><Toggle label="비네팅" value={s.comfortVignette} onChange={v => updateSettings({ comfortVignette: v })} /></Row>
          <Row label="스냅 이동" hint="왼손 스냅으로 좌/중/우 열을 한 칸씩 순간 이동합니다."><Toggle label="스냅 이동" value={s.snapTurning} onChange={v => updateSettings({ snapTurning: v })} /></Row>
        </Section>

        <Section title="사운드" icon={svg(<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></>)}>
          <Slider label="효과음" value={s.sfx} onChange={v => updateSettings({ sfx: v })} color="cyan" unit="%" />
          <Slider label="배경음" value={s.bgm} onChange={v => updateSettings({ bgm: v })} color="cyan" unit="%" />
          <Row label="공간 음향"><Toggle label="공간 음향" value={s.spatialAudio} onChange={v => updateSettings({ spatialAudio: v })} color="cyan" /></Row>
        </Section>

        <Section title="제스처 인식" icon={svg(<path d="M18 11V6a2 2 0 00-4 0M14 10V4a2 2 0 00-4 0v6M10 10.5V6a2 2 0 00-4 0v8M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 012.8-2.8L7 15" />)}>
          <Slider label="인식 민감도" value={s.gestureSensitivity} onChange={v => updateSettings({ gestureSensitivity: v })} color="orange" unit="%" />
          <Slider label="유지 시간 (포인팅)" value={s.holdFrames} onChange={v => updateSettings({ holdFrames: v })} min={5} max={30} color="orange" unit=" f" />
          <Row label="햅틱 피드백"><Toggle label="햅틱" value={s.haptics} onChange={v => updateSettings({ haptics: v })} color="orange" /></Row>
        </Section>

        <Section title="접근성" icon={svg(<><circle cx="12" cy="12" r="10" /><path d="M12 8h.01M11 12h1v4h1" /></>)}>
          <Row label="자막" hint="전투 이벤트를 화면 하단에 큰 글씨로 표시합니다."><Toggle label="자막" value={s.subtitles} onChange={v => updateSettings({ subtitles: v })} /></Row>
          <Row label="UI 크기: 크게" hint="VR 가독성을 위해 기본값은 켜짐입니다."><Toggle label="UI 크게" value={s.uiLarge} onChange={v => updateSettings({ uiLarge: v })} /></Row>
          <Row label="색약 모드" hint="적/아군 표시를 색 외에 아이콘으로도 구분합니다."><Toggle label="색약 모드" value={s.colorblind} onChange={v => updateSettings({ colorblind: v })} /></Row>
          <div className="p-3 border border-cyan-900/30 bg-cyan-950/10 rounded text-sm font-[Rajdhani] text-cyan-400/70">
            로비·메타 UI는 Hand Ray 로 조작하며, 전투에 진입하면 UI Ray 는 자동으로 비활성화됩니다.
          </div>
        </Section>
      </div>
    </Shell>
  )
}
