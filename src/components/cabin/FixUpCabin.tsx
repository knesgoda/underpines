/**
 * Fix Up Cabin 🛠️ (spec §8) — the playful edit mode, not a settings page.
 *
 * Two surfaces: placement (pick a zone, pick a thing that belongs there —
 * the valid-zones contract is enforced again by the DB trigger) and the
 * cabin's own knobs: theme, biome, window, weather source, lighting,
 * presence, and every privacy mode from spec §100.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import CabinSheet from './CabinSheet';
import biomes from '@/config/biomes';
import { CABIN_ZONES, zoneAllowed } from '@/lib/cabin/zones';
import { CABIN_LOCATIONS } from '@/lib/cabin/locations';
import {
  useInventory, useItemDefinitions, useCabinInvalidate,
} from '@/hooks/useCabin';
import {
  placeItem, removePlacement,
  type CabinConfig, type CabinPlacementView, type InventoryItem, type ItemDefinition,
} from '@/lib/cabinApi';

const THEMES: { key: string; label: string; hint: string }[] = [
  { key: 'ranger', label: 'Ranger Cabin', hint: 'Warm timber, the default' },
  { key: 'seventy_nine', label: 'The ’79', hint: 'Wood paneling, amber lamps, shag' },
  { key: 'ninety_four', label: 'The ’94', hint: 'CRT glow and mixtapes' },
  { key: 'fire_lookout', label: 'Fire Lookout', hint: 'All windows, all sky' },
  { key: 'a_frame', label: 'A-Frame', hint: 'One tall window, loft feel' },
  { key: 'lake_house', label: 'Lake House', hint: 'Water past the porch' },
  { key: 'snow_lodge', label: 'Snow Lodge', hint: 'Stone hearth, heavy beams' },
  { key: 'witch', label: 'Witch Cabin', hint: 'Herbs, candles, old books' },
  { key: 'haunted', label: 'Haunted Cabin', hint: 'Almost normal. Almost.' },
  { key: 'cozy', label: 'Cozy Cabin', hint: 'Blankets and warm clutter' },
];

const WINDOWS: { key: string; label: string }[] = [
  { key: 'classic_timber', label: 'Classic timber' },
  { key: 'picture', label: 'Giant picture window' },
  { key: 'bay', label: 'Bay window' },
  { key: 'cottage_panes', label: 'Cottage panes' },
  { key: 'a_frame_glass', label: 'A-frame glass' },
  { key: 'round', label: 'Round window' },
  { key: 'seventies', label: '1970s window' },
  { key: 'modern', label: 'Modern glass' },
  { key: 'victorian', label: 'Victorian' },
];

type Mode3 = 'everyone' | 'friends' | 'only_me';
type Mode4 = 'everyone' | 'friends' | 'only_me' | 'off';
type ModeOff = 'everyone' | 'friends' | 'off';

const ModePicker = <T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) => (
  <div className="cabin-mode-row">
    <span>{label}</span>
    <div role="group" aria-label={label}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`cabin-mode-pill ${value === o.value ? 'active' : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

const MODE3: { value: Mode3; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends' },
  { value: 'only_me', label: 'Only me' },
];
const MODE4: { value: Mode4; label: string }[] = [...MODE3, { value: 'off', label: 'Off' }];
const MODE_OFF: { value: ModeOff; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends' },
  { value: 'off', label: 'Off' },
];

const FixUpCabin = ({
  open, onClose, userId, cabin, placements, onSave,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  cabin: CabinConfig;
  placements: CabinPlacementView[];
  onSave: (patch: Partial<CabinConfig>) => void;
}) => {
  const invalidate = useCabinInvalidate();
  const { data: inventory } = useInventory(open);
  const { data: defs } = useItemDefinitions(open);
  const [tab, setTab] = useState<'place' | 'cabin' | 'privacy'>('place');
  const [pickingZone, setPickingZone] = useState<string | null>(null);

  const defByKey = useMemo(() => new Map((defs ?? []).map(d => [d.key, d])), [defs]);
  const placedByItemId = useMemo(
    () => new Map(placements.map(p => [p.user_item_id, p])),
    [placements],
  );
  const byZone = useMemo(() => {
    const m = new Map<string, CabinPlacementView[]>();
    for (const p of placements) {
      const list = m.get(p.zone) ?? [];
      list.push(p);
      m.set(p.zone, list);
    }
    return m;
  }, [placements]);

  const eligibleFor = (zone: string): { item: InventoryItem; def: ItemDefinition }[] =>
    (inventory ?? [])
      .map(item => ({ item, def: defByKey.get(item.item_key) }))
      .filter((x): x is { item: InventoryItem; def: ItemDefinition } =>
        !!x.def && zoneAllowed(x.def.valid_zones, zone))
      .sort((a, b) => (placedByItemId.has(a.item.id) ? 1 : 0) - (placedByItemId.has(b.item.id) ? 1 : 0));

  const put = async (zone: string, userItemId: string) => {
    const taken = (byZone.get(zone) ?? []).map(p => p.slot);
    const slot = [0, 1, 2, 3].find(s => !taken.includes(s));
    if (slot === undefined) {
      toast.error('That spot is full — take something down first.');
      return;
    }
    const res = await placeItem(userId, userItemId, zone, slot);
    if (res.error === 'zone_invalid') toast.error('That does not go there.');
    else if (res.error === 'spot_taken') toast.error('That spot is full.');
    else {
      invalidate(['cabin-view']);
      setPickingZone(null);
    }
  };

  const takeDown = async (userItemId: string) => {
    await removePlacement(userItemId);
    invalidate(['cabin-view']);
  };

  return (
    <CabinSheet open={open} onClose={onClose} title="Fix Up Cabin 🛠️" wide>
      <div className="tab-strip cabin-tabs" role="tablist">
        {([['place', 'Arrange'], ['cabin', 'The cabin'], ['privacy', 'Who sees what']] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k}
            className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'place' && (
        <div className="cabin-zone-list">
          {CABIN_ZONES.map(z => {
            const here = byZone.get(z.key) ?? [];
            return (
              <div key={z.key} className="cabin-zone-row">
                <div className="min-w-0">
                  <b>{z.label}</b>
                  <div className="cabin-zone-items">
                    {here.length === 0 && <small className="quiet">empty</small>}
                    {here.map(p => (
                      <button key={p.id} type="button" className="cabin-zone-chip"
                        onClick={() => takeDown(p.user_item_id)}
                        aria-label={`Take down ${p.custom_name || p.name}`}
                        title="Take down">
                        {p.emoji} {p.custom_name || p.name} ✕
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" className="outline-button"
                  onClick={() => setPickingZone(pickingZone === z.key ? null : z.key)}>
                  {pickingZone === z.key ? 'Close' : 'Put something here'}
                </button>
                {pickingZone === z.key && (
                  <div className="cabin-gift-grid cabin-zone-picker">
                    {eligibleFor(z.key).length === 0 && (
                      <p className="quiet">Nothing in your things fits here yet.</p>
                    )}
                    {eligibleFor(z.key).map(({ item, def }) => {
                      const placed = placedByItemId.get(item.id);
                      return (
                        <button key={item.id} type="button" className="cabin-gift-option"
                          onClick={() => put(z.key, item.id)}>
                          <span aria-hidden="true">{def.emoji}</span>
                          <b>{item.custom_name || def.name}</b>
                          {placed && <small>moves from {placed.zone.replace(/_/g, ' ')}</small>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'cabin' && (
        <div className="cabin-settings">
          <p className="cabin-label">Theme — a starting feel, never a cage</p>
          <div className="cabin-gift-grid">
            {THEMES.map(t => (
              <button key={t.key} type="button"
                className={`cabin-gift-option ${cabin.theme === t.key ? 'active' : ''}`}
                aria-pressed={cabin.theme === t.key}
                onClick={() => onSave({ theme: t.key })}>
                <b>{t.label}</b>
                <small>{t.hint}</small>
              </button>
            ))}
          </div>

          <p className="cabin-label">Out the window (biome)</p>
          <div className="cabin-gift-grid">
            {(Object.values(biomes) as { key: string; name: string }[]).filter(b => b.key !== 'default').map(b => (
              <button key={b.key} type="button"
                className={`cabin-gift-option ${(cabin.biome_key ?? '') === b.key ? 'active' : ''}`}
                aria-pressed={(cabin.biome_key ?? '') === b.key}
                onClick={() => onSave({ biome_key: b.key })}>
                <b>{b.name}</b>
              </button>
            ))}
          </div>

          <p className="cabin-label">Window style</p>
          <div className="cabin-gift-grid">
            {WINDOWS.map(w => (
              <button key={w.key} type="button"
                className={`cabin-gift-option ${cabin.window_style === w.key ? 'active' : ''}`}
                aria-pressed={cabin.window_style === w.key}
                onClick={() => onSave({ window_style: w.key })}>
                <b>{w.label}</b>
              </button>
            ))}
          </div>

          <p className="cabin-label">Weather comes from</p>
          <ModePicker
            label="Weather source"
            value={cabin.weather_source}
            options={[
              { value: 'account' as const, label: 'Around me' },
              { value: 'cabin_location' as const, label: 'The cabin’s place' },
              { value: 'default' as const, label: 'The pines' },
            ]}
            onChange={v => onSave({ weather_source: v })}
          />
          {cabin.weather_source === 'cabin_location' && (
            <select
              aria-label="Where the cabin lives"
              value={cabin.cabin_location_key ?? ''}
              onChange={e => onSave({ cabin_location_key: e.target.value || null })}
            >
              <option value="">Pick a place…</option>
              {CABIN_LOCATIONS.map(l => (
                <option key={l.key} value={l.key}>{l.label} — {l.region}</option>
              ))}
            </select>
          )}

          <label className="cabin-check">
            <input type="checkbox" checked={cabin.auto_lighting}
              onChange={e => onSave({ auto_lighting: e.target.checked })} />
            Lamps come on by themselves at dusk
          </label>
          <label className="cabin-check">
            <input type="checkbox" checked={cabin.presence_visible}
              onChange={e => onSave({ presence_visible: e.target.checked })} />
            Let the cabin show signs of life (porch light, chimney smoke)
          </label>
        </div>
      )}

      {tab === 'privacy' && (
        <div className="cabin-settings">
          <ModePicker label="Who can visit" value={cabin.visibility}
            options={MODE3} onChange={v => onSave({ visibility: v })} />
          <ModePicker label="Guestbook" value={cabin.guestbook_mode}
            options={MODE4} onChange={v => onSave({ guestbook_mode: v })} />
          <ModePicker label="Notes" value={cabin.notes_mode}
            options={MODE_OFF} onChange={v => onSave({ notes_mode: v })} />
          <ModePicker label="Porch gifts" value={cabin.gifts_mode}
            options={MODE_OFF} onChange={v => onSave({ gifts_mode: v })} />
          <ModePicker label="Knocking" value={cabin.knock_mode}
            options={MODE_OFF} onChange={v => onSave({ knock_mode: v })} />
          <ModePicker label="Pets" value={cabin.pets_visibility}
            options={MODE3} onChange={v => onSave({ pets_visibility: v })} />
          <ModePicker label="Cabin location" value={cabin.location_visibility}
            options={[
              { value: 'hidden' as const, label: 'Hidden' },
              { value: 'region' as const, label: 'General region' },
              { value: 'cabin_location' as const, label: 'Show it' },
            ]}
            onChange={v => onSave({ location_visibility: v })} />
          <p className="quiet">
            Real location is never shown to visitors — weather is displayed without
            saying where it comes from.
          </p>
        </div>
      )}
    </CabinSheet>
  );
};

export default FixUpCabin;
