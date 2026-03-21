/**
 * SceneDebugPanel — development-only QA tool for the CabinScene.
 * Floating, collapsible, bottom-right. Injects overrides via SceneDebugContext.
 */

import { useState, useMemo } from 'react';
import { useSceneDebug } from '@/contexts/SceneDebugContext';
import { WHEEL_OF_THE_YEAR } from '@/lib/wheelOfTheYear';

const ALL_BIOMES = [
  'default', 'pacific-northwest', 'british-isles', 'nordic',
  'northeast', 'southeast', 'midwest', 'mountain-west',
  'california-southwest', 'mediterranean',
];

const WEATHER_CONDITIONS = [
  'clear', 'partly-cloudy', 'overcast', 'fog',
  'light-rain', 'heavy-rain', 'thunderstorm',
  'light-snow', 'heavy-snow', 'hail',
];

export default function SceneDebugPanel() {
  if (process.env.NODE_ENV !== 'development') return null;

  const ctx = useSceneDebug();
  const [open, setOpen] = useState(false);

  if (!ctx) return null;
  const { overrides, setOverrides, resetOverrides, triggerCreature, triggerCompanion } = ctx;

  const timeLabel = useMemo(() => {
    if (overrides.timeOverride == null) return 'Live';
    const h = Math.floor(overrides.timeOverride / 60);
    const m = overrides.timeOverride % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, [overrides.timeOverride]);

  // Styles — inline to keep this self-contained and dev-only
  const s = {
    panel: { position: 'fixed', bottom: 16, right: 16, zIndex: 9999, width: 340, maxHeight: '80vh', overflowY: 'auto', background: '#1a1a2a', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: '#c8d0d8', fontFamily: 'system-ui, sans-serif', fontSize: 12 },
    toggle: { background: '#2a2a3a', border: 'none', color: '#a0b0c0', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, width: '100%', textAlign: 'left' },
    body: { padding: 12 },
    label: { display: 'block', marginBottom: 2, color: '#708090', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
    select: { width: '100%', background: '#0a0a14', color: '#c8d0d8', border: '1px solid #2a3040', borderRadius: 4, padding: '4px 6px', fontSize: 12, marginBottom: 8 },
    input: { width: '100%', background: '#0a0a14', color: '#c8d0d8', border: '1px solid #2a3040', borderRadius: 4, padding: '4px 6px', fontSize: 12, marginBottom: 8 },
    slider: { width: '100%', marginBottom: 8, accentColor: '#4a9a5a' },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    heading: { fontSize: 11, color: '#f0ece4', marginBottom: 8, fontWeight: 600 },
    divider: { borderTop: '1px solid #2a3040', margin: '8px 0' },
    btn: { background: '#2a3a2a', border: '1px solid #3a4a3a', color: '#8fbc8f', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4, marginBottom: 4 },
    resetBtn: { background: '#3a2a2a', border: '1px solid #4a3a3a', color: '#e88', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 },
    activeIndicator: { position: 'fixed', bottom: 60, right: 16, zIndex: 9998, background: '#f59e0b', color: '#1a1a2a', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1 },
    halfInput: { width: '48%', background: '#0a0a14', color: '#c8d0d8', border: '1px solid #2a3040', borderRadius: 4, padding: '4px 6px', fontSize: 12 },
  };

  // Known companion movement styles
  const companionStyles = ['direct_gaze_wave', 'mincing_trot', 'always_present_hover'];

  if (!open) {
    return (
      <>
        {overrides.active && <div style={s.activeIndicator}>OVERRIDES ACTIVE</div>}
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}>
          <button style={s.toggle} onClick={() => setOpen(true)}>🌲 Scene Debug</button>
        </div>
      </>
    );
  }

  return (
    <>
      {overrides.active && <div style={s.activeIndicator}>OVERRIDES ACTIVE</div>}
      <div style={s.panel}>
        {/* Header */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #2a3040', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={s.heading}>🌲 Scene Debug — development only</span>
          <button style={{ ...s.toggle, width: 'auto', padding: '2px 8px' }} onClick={() => setOpen(false)}>✕</button>
        </div>

        <div style={s.body}>
          {/* ── Time of Day ── */}
          <label style={s.label}>Time of Day ({timeLabel})</label>
          <input
            type="range"
            min={0}
            max={1439}
            step={1}
            value={overrides.timeOverride ?? new Date().getHours() * 60 + new Date().getMinutes()}
            onChange={e => setOverrides({ timeOverride: Number(e.target.value) })}
            style={s.slider}
          />

          <div style={s.divider} />

          {/* ── Weather Condition ── */}
          <label style={s.label}>Weather Condition</label>
          <select
            style={s.select}
            value={overrides.weatherCondition ?? ''}
            onChange={e => setOverrides({ weatherCondition: e.target.value || null })}
          >
            <option value="">Live</option>
            {WEATHER_CONDITIONS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* ── Wind Speed ── */}
          <label style={s.label}>Wind Speed ({overrides.windSpeed ?? '—'} km/h)</label>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={overrides.windSpeed ?? 0}
            onChange={e => setOverrides({ windSpeed: Number(e.target.value) })}
            style={s.slider}
          />

          {/* ── Cloud Cover ── */}
          <label style={s.label}>Cloud Cover ({overrides.cloudCover ?? '—'}%)</label>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={overrides.cloudCover ?? 50}
            onChange={e => setOverrides({ cloudCover: Number(e.target.value) })}
            style={s.slider}
          />

          {/* ── Temperature ── */}
          <label style={s.label}>Temperature ({overrides.temperature ?? '—'}°C)</label>
          <input
            type="range"
            min={-20}
            max={45}
            step={1}
            value={overrides.temperature ?? 20}
            onChange={e => setOverrides({ temperature: Number(e.target.value) })}
            style={s.slider}
          />

          <div style={s.divider} />

          {/* ── Biome ── */}
          <label style={s.label}>Biome</label>
          <select
            style={s.select}
            value={overrides.biome ?? ''}
            onChange={e => setOverrides({ biome: e.target.value || null })}
          >
            <option value="">Live</option>
            {ALL_BIOMES.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* ── Seasonal Event ── */}
          <label style={s.label}>Seasonal Event</label>
          <select
            style={s.select}
            value={overrides.seasonalEvent ?? ''}
            onChange={e => setOverrides({ seasonalEvent: e.target.value || null })}
          >
            <option value="">None (live)</option>
            {WHEEL_OF_THE_YEAR.map(ev => (
              <option key={ev.key} value={ev.key}>{ev.glyph} {ev.key}</option>
            ))}
          </select>

          {/* ── Moon Phase ── */}
          <label style={s.label}>Moon Phase ({overrides.moonPhase != null ? overrides.moonPhase.toFixed(2) : '—'})</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={overrides.moonPhase ?? 0.5}
            onChange={e => setOverrides({ moonPhase: Number(e.target.value) })}
            style={s.slider}
          />

          <div style={s.divider} />

          {/* ── Lat/Lng ── */}
          <label style={s.label}>Latitude / Longitude</label>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <input
              type="number"
              step="0.1"
              placeholder="Lat"
              value={overrides.latitude ?? ''}
              onChange={e => setOverrides({ latitude: e.target.value ? Number(e.target.value) : null })}
              style={s.halfInput}
            />
            <input
              type="number"
              step="0.1"
              placeholder="Lng"
              value={overrides.longitude ?? ''}
              onChange={e => setOverrides({ longitude: e.target.value ? Number(e.target.value) : null })}
              style={s.halfInput}
            />
          </div>

          <div style={s.divider} />

          {/* ── Triggers ── */}
          <label style={s.label}>Creature & Companion Triggers</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 4 }}>
            <button style={s.btn} onClick={triggerCreature}>
              🦊 Trigger Creature
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {companionStyles.map(style => (
              <button key={style} style={s.btn} onClick={() => triggerCompanion(style)}>
                🐾 {style.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div style={s.divider} />

          {/* ── Reset ── */}
          <button style={s.resetBtn} onClick={resetOverrides}>
            ✕ Reset All Overrides
          </button>
        </div>
      </div>
    </>
  );
}
