import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { X, Search } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: (campfireId: string) => void;
}

interface CircleMember {
  id: string;
  display_name: string;
  handle: string;
}

const NewCampfireSheet = ({ onClose, onCreated }: Props) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isFlicker, setIsFlicker] = useState(false);
  const [step, setStep] = useState<'pick' | 'name'>('pick');
  const [groupName, setGroupName] = useState('');
  const [vibe, setVibe] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: circles } = await supabase
        .from('circles')
        .select('requester_id, requestee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},requestee_id.eq.${user.id}`);

      if (circles) {
        const otherIds = circles.map(c => c.requester_id === user.id ? c.requestee_id : c.requester_id);
        if (otherIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, handle')
            .in('id', otherIds);
          setMembers(profiles || []);
        }
      }
    };
    load();
  }, [user]);

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleNext = async () => {
    if (selected.length === 0 || !user) return;

    if (selected.length === 1 && !isFlicker) {
      // Check for existing 1-on-1
      const otherId = selected[0];
      const { data: myParts } = await supabase
        .from('campfire_participants')
        .select('campfire_id')
        .eq('user_id', user.id);

      if (myParts) {
        for (const p of myParts) {
          const { data: otherPart } = await supabase
            .from('campfire_participants')
            .select('user_id')
            .eq('campfire_id', p.campfire_id)
            .eq('user_id', otherId)
            .maybeSingle();

          if (otherPart) {
            const { data: cf } = await supabase
              .from('campfires')
              .select('id')
              .eq('id', p.campfire_id)
              .eq('campfire_type', 'one_on_one')
              .eq('is_active', true)
              .maybeSingle();

            if (cf) {
              onCreated(cf.id);
              return;
            }
          }
        }
      }

      // Create new 1-on-1
      setCreating(true);
      const otherMember = members.find(m => m.id === otherId);
      const { data: newCf } = await supabase
        .from('campfires')
        .insert({
          campfire_type: 'one_on_one',
          firekeeper_id: user.id,
          name: otherMember?.display_name || null,
        })
        .select()
        .single();

      if (newCf) {
        await supabase.from('campfire_participants').insert([
          { campfire_id: newCf.id, user_id: user.id },
          { campfire_id: newCf.id, user_id: otherId },
        ]);
        onCreated(newCf.id);
      }
      setCreating(false);
      return;
    }

    if (isFlicker) {
      // Create flicker immediately
      setCreating(true);
      const { data: newCf } = await supabase
        .from('campfires')
        .insert({
          campfire_type: 'flicker',
          firekeeper_id: user.id,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        })
        .select()
        .single();

      if (newCf) {
        await supabase.from('campfire_participants').insert(
          [user.id, ...selected].map(uid => ({ campfire_id: newCf.id, user_id: uid }))
        );
        onCreated(newCf.id);
      }
      setCreating(false);
      return;
    }

    // Group — need name
    setStep('name');
  };

  const createGroup = async () => {
    if (!user || !groupName.trim()) return;
    setCreating(true);

    const { data: newCf } = await supabase
      .from('campfires')
      .insert({
        campfire_type: 'group',
        firekeeper_id: user.id,
        name: groupName.trim(),
        vibe: vibe.trim() || null,
      })
      .select()
      .single();

    if (newCf) {
      await supabase.from('campfire_participants').insert(
        [user.id, ...selected].map(uid => ({ campfire_id: newCf.id, user_id: uid }))
      );
      onCreated(newCf.id);
    }
    setCreating(false);
  };

  const filtered = members.filter(m =>
    !search || m.display_name.toLowerCase().includes(search.toLowerCase()) || m.handle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-border shadow-lg"
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-body text-sm font-medium text-foreground">
            {step === 'pick' ? 'Start a Campfire with...' : 'Name this Campfire'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {step === 'pick' ? (
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search your Circles..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background font-body text-sm outline-none"
              />
            </div>

            <div className="max-h-[250px] overflow-y-auto space-y-1">
              {filtered.length === 0 ? (
                <p className="text-sm font-body text-muted-foreground text-center py-4">No Circle members found.</p>
              ) : (
                filtered.map(m => (
                  <button
                    key={m.id}
                    onClick={() => toggleSelect(m.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                      selected.includes(m.id) ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      selected.includes(m.id) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {m.display_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-body text-sm text-foreground">{m.display_name}</p>
                      <p className="font-body text-xs text-muted-foreground">@{m.handle}</p>
                    </div>
                    {selected.includes(m.id) && <span className="ml-auto text-primary">✓</span>}
                  </button>
                ))
              )}
            </div>

            {/* Flicker toggle */}
            <div className="flex items-center justify-between px-1 py-2 border-t border-border">
              <div>
                <p className="font-body text-sm text-foreground">🕯️ Make this a Flicker</p>
                <p className="font-body text-xs text-muted-foreground">Burns for 24 hours, then it's gone.</p>
              </div>
              <button
                onClick={() => setIsFlicker(!isFlicker)}
                className={`w-11 h-6 rounded-full transition-colors ${isFlicker ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-card shadow-sm transition-transform ${isFlicker ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <button
              onClick={handleNext}
              disabled={selected.length === 0 || creating}
              className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-50"
            >
              {creating ? 'Creating...' : selected.length <= 1 ? 'Start Campfire' : isFlicker ? 'Light it →' : 'Next →'}
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Name this Campfire"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background font-body text-sm outline-none"
              autoFocus
            />
            <input
              value={vibe}
              onChange={e => setVibe(e.target.value)}
              placeholder="What this fire is about (optional)"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background font-body text-sm outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setStep('pick')} className="flex-1 py-2.5 rounded-full border border-border font-body text-sm text-muted-foreground">Cancel</button>
              <button
                onClick={createGroup}
                disabled={!groupName.trim() || creating}
                className="flex-1 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Light it →'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default NewCampfireSheet;
