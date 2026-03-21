import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { creatures } from '@/config/creatures';

// Creature preview - renders inline SVG mini-preview
import * as Common from '@/components/creatures/common';
import * as Uncommon from '@/components/creatures/uncommon';
import * as Rare from '@/components/creatures/rare';
import * as Legendary from '@/components/creatures/legendary';
import * as Mythical from '@/components/creatures/mythical';

const COMPONENT_MAP: Record<string, any> = {
  'rabbit': Common.Rabbit, 'raccoon': Common.Raccoon, 'badger': Common.Badger,
  'hedgehog': Common.Hedgehog, 'squirrel': Common.Squirrel, 'red-fox': Common.RedFox,
  'grey-fox': Common.GreyFox, 'finch': Common.Finch, 'hummingbird': Common.Hummingbird,
  'robin': Common.Robin, 'frog': Common.Frog, 'otter': Common.Otter,
  'beaver': Common.Beaver, 'fireflies': Common.Fireflies,
  'white-tailed-deer': Uncommon.WhiteTailedDeer, 'red-deer-stag': Uncommon.RedDeerStag,
  'elk': Uncommon.Elk, 'caribou': Uncommon.Caribou, 'moose': Uncommon.Moose,
  'brown-bear': Uncommon.BrownBear, 'black-bear': Uncommon.BlackBear,
  'coyote': Uncommon.Coyote, 'eagle': Uncommon.Eagle, 'hawk': Uncommon.Hawk,
  'owl': Uncommon.Owl, 'raven': Uncommon.Raven, 'salmon': Uncommon.Salmon,
  'wild-boar': Uncommon.WildBoar, 'stork': Uncommon.Stork, 'puffin': Uncommon.Puffin,
  'arctic-fox': Uncommon.ArcticFox, 'fennec-fox': Uncommon.FennecFox,
  'timberwolf': Rare.Timberwolf, 'grey-wolf': Rare.GreyWolf, 'red-wolf': Rare.RedWolf,
  'mountain-lion': Rare.MountainLion, 'lynx': Rare.Lynx, 'wolverine': Rare.Wolverine,
  'orca': Rare.Orca, 'whale': Rare.Whale, 'shark': Rare.Shark,
  'hippo': Rare.Hippo, 'rhino': Rare.Rhino, 'vulture': Rare.Vulture,
  'sasquatch': Legendary.Sasquatch, 'loch-ness-monster': Legendary.LochNessMonster,
  'yeti': Legendary.Yeti, 'dire-wolf': Legendary.DireWolf,
  'nuckelavee': Legendary.Nuckelavee, 'dragon': Legendary.Dragon,
  'wendigo': Legendary.Wendigo, 'kraken': Legendary.Kraken,
  'thunderbird': Legendary.Thunderbird, 'phoenix': Legendary.Phoenix,
  'fairy': Mythical.Fairy, 'leprechaun': Mythical.Leprechaun,
  'will-o-the-wisp': Mythical.WillOTheWisp, 'mermaid': Mythical.Mermaid,
  'selkie': Mythical.Selkie, 'ghost': Mythical.Ghost, 'witch': Mythical.Witch,
  'jackalope': Mythical.Jackalope, 'vampire': Mythical.Vampire,
  'werewolf': Mythical.Werewolf, 'banshee': Mythical.Banshee,
  'kelpie': Mythical.Kelpie, 'troll': Mythical.Troll, 'huldra': Mythical.Huldra,
  'puckwudgie': Mythical.Puckwudgie, 'zombie': Mythical.Zombie,
  'ghoul': Mythical.Ghoul, 'headless-horseman': Mythical.HeadlessHorseman,
};

const BEHAVIORS = ['always_present', 'daily_visit', 'passing_through'];
const ACTIVE_HOURS = ['dawn', 'morning', 'afternoon', 'dusk', 'night', 'day', 'all'];
const DIRECTIONS = ['random', 'ltr', 'rtl'];

interface Profile {
  id: string;
  handle: string;
  display_name: string;
}

interface Companion {
  id: string;
  user_id: string;
  creature_key: string;
  behavior: string;
  active_hours: string;
  movement_style: string | null;
  direction: string;
  priority: number;
  notes: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  creature_key: '',
  behavior: 'daily_visit',
  active_hours: 'day',
  movement_style: '',
  direction: 'random',
  priority: 1,
  notes: '',
};

function CreaturePreview({ creatureKey }: { creatureKey: string }) {
  const Component = COMPONENT_MAP[creatureKey];
  if (!Component) return <div className="w-16 h-16 rounded bg-[hsl(var(--pine-mid)/0.2)] flex items-center justify-center text-xs text-[hsl(var(--muted-text))]">?</div>;
  return (
    <div className="w-16 h-16 rounded bg-[hsl(var(--pine-mid)/0.15)] flex items-center justify-center overflow-hidden">
      <div style={{ transform: 'scale(0.8)' }}>
        <Component variant={0} direction="ltr" />
      </div>
    </div>
  );
}

const GroveCompanions = () => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [loadingCompanions, setLoadingCompanions] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Companion | null>(null);

  // Search members
  useEffect(() => {
    if (!search || search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, handle, display_name')
        .or(`handle.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(10);
      setResults((data as Profile[]) || []);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load companions for selected member
  const loadCompanions = useCallback(async (userId: string) => {
    setLoadingCompanions(true);
    const { data, error } = await supabase
      .from('cabin_companions')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: true });
    if (error) {
      toast.error('Failed to load companions');
    } else {
      setCompanions((data as Companion[]) || []);
    }
    setLoadingCompanions(false);
  }, []);

  const selectMember = (member: Profile) => {
    setSelectedMember(member);
    setSearch('');
    setResults([]);
    loadCompanions(member.id);
    setShowForm(false);
    setEditingId(null);
  };

  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (c: Companion) => {
    setForm({
      creature_key: c.creature_key,
      behavior: c.behavior,
      active_hours: c.active_hours,
      movement_style: c.movement_style || '',
      direction: c.direction,
      priority: c.priority,
      notes: c.notes || '',
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!selectedMember || !form.creature_key) {
      toast.error('Please select a creature');
      return;
    }
    setSaving(true);

    const payload = {
      user_id: selectedMember.id,
      creature_key: form.creature_key,
      behavior: form.behavior,
      active_hours: form.active_hours,
      movement_style: form.movement_style || null,
      direction: form.direction,
      priority: form.priority,
      notes: form.notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from('cabin_companions').update(payload).eq('id', editingId);
      if (error) toast.error('Failed to update companion');
      else toast.success('Companion updated');
    } else {
      const { error } = await supabase.from('cabin_companions').insert(payload);
      if (error) toast.error('Failed to add companion');
      else toast.success('Companion added');
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    loadCompanions(selectedMember.id);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !selectedMember) return;
    const { error } = await supabase.from('cabin_companions').delete().eq('id', deleteTarget.id);
    if (error) toast.error('Failed to remove companion');
    else toast.success('Companion removed');
    setDeleteTarget(null);
    loadCompanions(selectedMember.id);
  };

  const creatureName = (key: string) => {
    const c = creatures.find((cr: any) => cr.key === key);
    return c ? c.name : key;
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-xl font-bold text-[hsl(var(--pine-pale))]">
        Memorial Companions
      </h1>
      <p className="text-sm text-[hsl(var(--muted-text))]">
        Assign creatures that appear in a member's cabin scene. Handle with care.
      </p>

      {/* Member search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-text))]" />
        <Input
          placeholder="Search member by name or handle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-pale))] placeholder:text-[hsl(var(--muted-text))]"
        />
        {results.length > 0 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[hsl(var(--pine-dark))] border border-[hsl(var(--pine-mid)/0.3)] rounded-md shadow-lg max-h-60 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => selectMember(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-[hsl(var(--pine-mid)/0.2)] text-sm transition-colors"
              >
                <span className="text-[hsl(var(--pine-pale))]">{r.display_name}</span>
                <span className="text-[hsl(var(--muted-text))] ml-2">@{r.handle}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected member */}
      {selectedMember && (
        <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[hsl(var(--pine-pale))]">
                {selectedMember.display_name}
                <span className="text-[hsl(var(--muted-text))] font-normal ml-2">@{selectedMember.handle}</span>
              </CardTitle>
              <Button
                size="sm"
                onClick={openAddForm}
                className="bg-[hsl(var(--amber-deep)/0.2)] text-[hsl(var(--amber-mid))] hover:bg-[hsl(var(--amber-deep)/0.3)] border-none h-8 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Companion
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingCompanions ? (
              <p className="text-xs text-[hsl(var(--muted-text))]">Loading…</p>
            ) : companions.length === 0 ? (
              <p className="text-xs text-[hsl(var(--muted-text))]">No companions assigned.</p>
            ) : (
              companions.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-md bg-[hsl(var(--pine-darkest)/0.5)] border border-[hsl(var(--pine-mid)/0.15)]">
                  <CreaturePreview creatureKey={c.creature_key} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--pine-pale))]">{creatureName(c.creature_key)}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--muted-text))]">
                        {c.behavior.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--muted-text))]">
                        {c.active_hours}
                      </Badge>
                      {c.movement_style && (
                        <Badge variant="outline" className="text-[10px] border-[hsl(var(--amber-deep)/0.3)] text-[hsl(var(--amber-mid)/0.7)]">
                          {c.movement_style}
                        </Badge>
                      )}
                    </div>
                    {c.notes && (
                      <p className="text-[10px] text-[hsl(var(--muted-text)/0.6)] mt-1.5 italic truncate">{c.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEditForm(c)} className="p-1.5 rounded hover:bg-[hsl(var(--pine-mid)/0.2)] text-[hsl(var(--muted-text))] transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded hover:bg-red-900/20 text-[hsl(var(--muted-text))] hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form */}
      {showForm && selectedMember && (
        <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[hsl(var(--pine-pale))]">
              {editingId ? 'Edit Companion' : 'Add Companion'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview */}
            {form.creature_key && (
              <div className="flex items-center gap-3 p-3 rounded bg-[hsl(var(--pine-darkest)/0.5)] border border-[hsl(var(--pine-mid)/0.1)]">
                <Eye className="w-3.5 h-3.5 text-[hsl(var(--muted-text))]" />
                <span className="text-xs text-[hsl(var(--muted-text))]">Preview:</span>
                <div className="relative w-20 h-16 overflow-hidden rounded">
                  <CreaturePreview creatureKey={form.creature_key} />
                </div>
                <span className="text-xs text-[hsl(var(--pine-pale))]">{creatureName(form.creature_key)}</span>
              </div>
            )}

            {/* Creature */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-text))]">Creature</Label>
              <Select value={form.creature_key} onValueChange={(v) => setForm(f => ({ ...f, creature_key: v }))}>
                <SelectTrigger className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-pale))] text-sm">
                  <SelectValue placeholder="Select creature…" />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)] max-h-60">
                  {creatures.map((c: any) => (
                    <SelectItem key={c.key} value={c.key} className="text-[hsl(var(--pine-pale))] text-sm">
                      {c.name} <span className="text-[hsl(var(--muted-text))]">({c.tier})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Behavior */}
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-text))]">Behavior</Label>
                <Select value={form.behavior} onValueChange={(v) => setForm(f => ({ ...f, behavior: v }))}>
                  <SelectTrigger className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-pale))] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
                    {BEHAVIORS.map((b) => (
                      <SelectItem key={b} value={b} className="text-[hsl(var(--pine-pale))] text-sm">{b.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active Hours */}
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-text))]">Active Hours</Label>
                <Select value={form.active_hours} onValueChange={(v) => setForm(f => ({ ...f, active_hours: v }))}>
                  <SelectTrigger className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-pale))] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
                    {ACTIVE_HOURS.map((h) => (
                      <SelectItem key={h} value={h} className="text-[hsl(var(--pine-pale))] text-sm">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Direction */}
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-text))]">Direction</Label>
                <Select value={form.direction} onValueChange={(v) => setForm(f => ({ ...f, direction: v }))}>
                  <SelectTrigger className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-pale))] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
                    {DIRECTIONS.map((d) => (
                      <SelectItem key={d} value={d} className="text-[hsl(var(--pine-pale))] text-sm">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--muted-text))]">Priority</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.priority}
                  onChange={(e) => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 1 }))}
                  className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-pale))] text-sm"
                />
              </div>
            </div>

            {/* Movement Style */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-text))]">Movement Style <span className="opacity-50">(optional — special variants)</span></Label>
              <Input
                placeholder="e.g. direct_gaze_wave, mincing_trot, always_present_hover"
                value={form.movement_style}
                onChange={(e) => setForm(f => ({ ...f, movement_style: e.target.value }))}
                className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-pale))] text-sm placeholder:text-[hsl(var(--muted-text)/0.5)]"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[hsl(var(--muted-text))]">Private context — what this companion represents. Never shown to the member.</Label>
              <Textarea
                placeholder="Who was this? What should you remember?"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-pale))] text-sm placeholder:text-[hsl(var(--muted-text)/0.4)] resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={saving || !form.creature_key}
                className="bg-[hsl(var(--amber-deep)/0.3)] text-[hsl(var(--amber-mid))] hover:bg-[hsl(var(--amber-deep)/0.4)] border-none text-sm"
              >
                {saving ? 'Saving…' : editingId ? 'Update' : 'Add Companion'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="text-[hsl(var(--muted-text))] text-sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--pine-pale))]">Remove Companion</DialogTitle>
            <DialogDescription className="text-[hsl(var(--muted-text))]">
              This companion will no longer appear in {selectedMember?.display_name}'s scene. This action is permanent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-[hsl(var(--muted-text))]">
              Cancel
            </Button>
            <Button onClick={handleDelete} className="bg-red-900/30 text-red-400 hover:bg-red-900/40 border-none">
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroveCompanions;
