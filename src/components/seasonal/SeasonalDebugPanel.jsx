/**
 * SeasonalDebugPanel — development-only QA tool for seasonal scenes & moon phase.
 */

import { useState, useMemo } from 'react';
import { WHEEL_OF_THE_YEAR, getActiveEvent, getEventProgress } from '@/lib/wheelOfTheYear';
import { getMoonSVGProps, getMoonPhase, getSeasonalEventDate } from '@/lib/astronomyUtils';
import SceneForEvent from './SeasonalScenes';

export default function SeasonalDebugPanel() {
  if (process.env.NODE_ENV !== 'development') return null;

  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState('live');
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));

  const overrideDate = useMemo(() => new Date(dateStr + 'T12:00:00'), [dateStr]);
  const year = overrideDate.getFullYear();

  const moon = useMemo(() => getMoonPhase(overrideDate), [overrideDate]);
  const moonProps = useMemo(() => getMoonSVGProps(overrideDate), [overrideDate]);

  const liveEvent = useMemo(() => getActiveEvent(overrideDate), [overrideDate]);
  const activeEvent = selectedKey === 'live'
    ? liveEvent
    : WHEEL_OF_THE_YEAR.find(e => e.key === selectedKey) || null;

  const progress = activeEvent ? getEventProgress(activeEvent, overrideDate) : { phase: 'none', opacity: 0 };

  const eventStart = activeEvent ? getSeasonalEventDate(activeEvent.key, year) : null;
  const eventEnd = eventStart ? new Date(eventStart.getTime() + (activeEvent?.durationHours || 48) * 3600000) : null;

  const allDates = useMemo(() =>
    WHEEL_OF_THE_YEAR.map(e => ({
      key: e.key,
      glyph: e.glyph,
      date: getSeasonalEventDate(e.key, year),
    })),
    [year]
  );

  const fmt = (d) => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const s = {
    panel: { position: 'fixed', bottom: 16, left: 16, zIndex: 9999, width: 320, background: '#1a1a2a', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: '#c8d0d8', fontFamily: 'system-ui, sans-serif', fontSize: 12 },
    toggle: { background: '#2a2a3a', border: 'none', color: '#a0b0c0', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, width: '100%', textAlign: 'left' },
    body: { padding: 12 },
    label: { display: 'block', marginBottom: 2, color: '#708090', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
    select: { width: '100%', background: '#0a0a14', color: '#c8d0d8', border: '1px solid #2a3040', borderRadius: 4, padding: '4px 6px', fontSize: 12, marginBottom: 8 },
    input: { width: '100%', background: '#0a0a14', color: '#c8d0d8', border: '1px solid #2a3040', borderRadius: 4, padding: '4px 6px', fontSize: 12, marginBottom: 8 },
    preview: { width: '100%', height: 160, borderRadius: 6, overflow: 'hidden', marginBottom: 8, background: '#0a0a14' },
    mono: { fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 },
    row: { display: 'flex', justifyContent: 'space-between' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: 'monospace' },
    th: { textAlign: 'left', padding: '2px 4px', color: '#708090', borderBottom: '1px solid #2a3040' },
    td: { padding: '2px 4px', borderBottom: '1px solid #1a1a2a' },
    heading: { fontSize: 11, color: '#f0ece4', marginBottom: 8, fontWeight: 600 },
    divider: { borderTop: '1px solid #2a3040', margin: '8px 0' },
  };

  if (!open) {
    return (
      <div style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 9999 }}>
        <button style={s.toggle} onClick={() => setOpen(true)}>🌲 Season Debug</button>
      </div>
    );
  }

  return (
    <div style={s.panel}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #2a3040', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={s.heading}>🌲 Seasonal Debug — development only</span>
        <button style={{ ...s.toggle, width: 'auto', padding: '2px 8px' }} onClick={() => setOpen(false)}>✕</button>
      </div>

      <div style={s.body}>
        {/* Event selector */}
        <label style={s.label}>Event</label>
        <select style={s.select} value={selectedKey} onChange={e => setSelectedKey(e.target.value)}>
          <option value="live">none (live)</option>
          {WHEEL_OF_THE_YEAR.map(e => (
            <option key={e.key} value={e.key}>{e.glyph} {e.key}</option>
          ))}
        </select>

        {/* Date override */}
        <label style={s.label}>Date override</label>
        <input type="date" style={s.input} value={dateStr} onChange={e => setDateStr(e.target.value)} />

        {/* Scene preview */}
        <div style={s.preview}>
          {activeEvent ? (
            <SceneForEvent eventKey={activeEvent.key} width={296} height={160} moonProps={moonProps} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#506070', fontSize: 11 }}>No active event</div>
          )}
        </div>

        {/* Data readout */}
        <div style={s.mono}>
          <div style={s.row}><span style={{ color: '#708090' }}>Event:</span><span>{activeEvent?.key || 'none active'}</span></div>
          <div style={s.row}><span style={{ color: '#708090' }}>Window:</span><span>{fmt(eventStart)} → {fmt(eventEnd)}</span></div>
          <div style={s.row}><span style={{ color: '#708090' }}>Progress:</span><span>{progress.phase} ({(progress.opacity * 100).toFixed(0)}%)</span></div>
          <div style={s.divider} />
          <div style={s.row}><span style={{ color: '#708090' }}>Moon phase:</span><span>{moon.phase}</span></div>
          <div style={s.row}><span style={{ color: '#708090' }}>cyclePosition:</span><span>{moon.cyclePosition.toFixed(4)}</span></div>
          <div style={s.row}><span style={{ color: '#708090' }}>illumination:</span><span>{(moon.illumination * 100).toFixed(1)}%</span></div>
          <div style={s.row}><span style={{ color: '#708090' }}>isVisible:</span><span>{moon.isVisible ? 'true' : 'false'}</span></div>
          <div style={s.row}><span style={{ color: '#708090' }}>clipDirection:</span><span>{moonProps.clipDirection}</span></div>
          {moon.phase === 'new' && (
            <div style={{ marginTop: 4, color: '#708090' }}>🌑 New moon — no moon rendered in scene</div>
          )}
        </div>

        <div style={s.divider} />

        {/* Event dates for current year */}
        <label style={s.label}>Event dates ({year})</label>
        <table style={s.table}>
          <thead>
            <tr><th style={s.th}>Event</th><th style={s.th}>Date</th></tr>
          </thead>
          <tbody>
            {allDates.map(({ key, glyph, date }) => (
              <tr key={key}>
                <td style={s.td}>{glyph} {key}</td>
                <td style={s.td}>{fmt(date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
