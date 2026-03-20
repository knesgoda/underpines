import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Flame, Moon, CandlestickChart, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import CampfireView from '@/components/campfire/CampfireView';
import NewCampfireSheet from '@/components/campfire/NewCampfireSheet';
import PineTreeLoading from '@/components/PineTreeLoading';
import { formatTimeAgo } from '@/lib/time';

interface CampfireItem {
  id: string;
  name: string | null;
  campfire_type: string;
  is_active: boolean | null;
  is_embers: boolean | null;
  expires_at: string | null;
  firekeeper_id: string | null;
  vibe: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  otherParticipantName?: string;
  daysSinceLastMessage?: number;
}

type FilterTab = 'all' | 'active' | 'embers' | 'flickers';

const Campfires = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [campfires, setCampfires] = useState<CampfireItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stokeMode, setStokeMode] = useState(false);
  const [showNewSheet, setShowNewSheet] = useState(false);

  const loadCampfires = useCallback(async () => {
    if (!user) return;

    const { data: participations } = await supabase
      .from('campfire_participants')
      .select('campfire_id')
      .eq('user_id', user.id);

    if (!participations || participations.length === 0) {
      setCampfires([]);
      setLoading(false);
      return;
    }

    const ids = participations.map(p => p.campfire_id);
    const { data: campfireRows } = await supabase
      .from('campfires')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (!campfireRows) {
      setCampfires([]);
      setLoading(false);
      return;
    }

    // Get last message for each campfire
    const enriched: CampfireItem[] = [];
    for (const c of campfireRows) {
      const { data: lastMsg } = await supabase
        .from('campfire_messages')
        .select('content, created_at, sender_id')
        .eq('campfire_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // For 1-on-1, get other participant name
      let otherName = '';
      if (c.campfire_type === 'one_on_one') {
        const { data: parts } = await supabase
          .from('campfire_participants')
          .select('user_id')
          .eq('campfire_id', c.id)
          .neq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (parts) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', parts.user_id)
            .maybeSingle();
          otherName = prof?.display_name || '';
        }
      }

      let daysSince: number | undefined;
      if (lastMsg?.created_at) {
        daysSince = Math.floor((Date.now() - new Date(lastMsg.created_at).getTime()) / 86400000);
      }

      enriched.push({
        ...c,
        lastMessage: lastMsg?.content || (lastMsg ? 'Sent a photo' : undefined),
        lastMessageTime: lastMsg?.created_at || undefined,
        otherParticipantName: otherName,
        daysSinceLastMessage: daysSince,
      });
    }

    setCampfires(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadCampfires(); }, [loadCampfires]);

  const filtered = campfires.filter(c => {
    if (filter === 'active') return c.is_active && !c.is_embers && c.campfire_type !== 'flicker';
    if (filter === 'embers') return c.is_embers;
    if (filter === 'flickers') return c.campfire_type === 'flicker';
    return true;
  });

  const isFlickerExpired = (c: CampfireItem) =>
    c.campfire_type === 'flicker' && c.expires_at && new Date(c.expires_at) < new Date();

  const displayName = (c: CampfireItem) =>
    c.campfire_type === 'one_on_one' ? (c.otherParticipantName || 'Campfire') : (c.name || 'Group Campfire');

  if (loading) return <PineTreeLoading />;

  const selectedCampfire = campfires.find(c => c.id === selectedId);

  // Mobile: show either list or chat
  if (isMobile) {
    if (selectedId) {
      return (
        <CampfireView
          campfireId={selectedId}
          onBack={() => { setSelectedId(null); setStokeMode(false); }}
          onRefreshList={loadCampfires}
          autoFocusInput={stokeMode}
        />
      );
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-64px)]">
        <CampfireListHeader filter={filter} setFilter={setFilter} />
        <div className="flex-1 overflow-y-auto">
          <CampfireList
            campfires={filtered}
            displayName={displayName}
            isFlickerExpired={isFlickerExpired}
            onSelect={setSelectedId}
          />
        </div>
        <div className="p-4 border-t border-border">
          <button onClick={() => setShowNewSheet(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium">
            <Plus size={16} /> Start a new Campfire
          </button>
        </div>
        {showNewSheet && <NewCampfireSheet onClose={() => setShowNewSheet(false)} onCreated={(id) => { setShowNewSheet(false); setSelectedId(id); loadCampfires(); }} />}
      </motion.div>
    );
  }

  // Desktop: split panel
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-[calc(100vh-0px)]">
      {/* Left panel */}
      <div className="w-[320px] border-r border-border flex flex-col shrink-0">
        <CampfireListHeader filter={filter} setFilter={setFilter} />
        <div className="flex-1 overflow-y-auto">
          <CampfireList
            campfires={filtered}
            displayName={displayName}
            isFlickerExpired={isFlickerExpired}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
        </div>
        <div className="p-3 border-t border-border">
          <button onClick={() => setShowNewSheet(true)} className="w-full flex items-center justify-center gap-2 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium">
            <Plus size={16} /> Start a new Campfire
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedId ? (
          <CampfireView
            campfireId={selectedId}
            onBack={() => { setSelectedId(null); setStokeMode(false); }}
            onRefreshList={loadCampfires}
            autoFocusInput={stokeMode}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl mb-3">🔥</p>
              <p className="font-body text-sm text-muted-foreground">Select a Campfire or start a new one.</p>
            </div>
          </div>
        )}
      </div>

      {showNewSheet && <NewCampfireSheet onClose={() => setShowNewSheet(false)} onCreated={(id) => { setShowNewSheet(false); setSelectedId(id); loadCampfires(); }} />}
    </motion.div>
  );
};

// Sub-components

const CampfireListHeader = ({ filter, setFilter }: { filter: FilterTab; setFilter: (f: FilterTab) => void }) => (
  <div className="p-4 border-b border-border">
    <h1 className="font-display text-lg text-foreground mb-3">Campfires</h1>
    <div className="flex gap-1 bg-muted rounded-lg p-0.5">
      {([
        { key: 'all', label: 'All', icon: '🔥' },
        { key: 'active', label: 'Active', icon: '🔥' },
        { key: 'embers', label: 'Embers', icon: '🌙' },
        { key: 'flickers', label: 'Flickers', icon: '🕯️' },
      ] as const).map(t => (
        <button
          key={t.key}
          onClick={() => setFilter(t.key)}
          className={`flex-1 py-1.5 rounded-md font-body text-xs transition-colors ${filter === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  </div>
);

const flickerTimeRemaining = (expiresAt: string | null): string => {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
};

const CampfireList = ({
  campfires, displayName, isFlickerExpired, onSelect, selectedId,
}: {
  campfires: CampfireItem[];
  displayName: (c: CampfireItem) => string;
  isFlickerExpired: (c: CampfireItem) => boolean;
  onSelect: (id: string) => void;
  selectedId?: string | null;
}) => {
  if (campfires.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-3xl mb-2">🔥</p>
        <p className="font-body text-sm text-muted-foreground">No campfires yet. Start one with someone from your Circle.</p>
      </div>
    );
  }

  const flickers = campfires.filter(c => c.campfire_type === 'flicker');
  const others = campfires.filter(c => c.campfire_type !== 'flicker');

  return (
    <div>
      {/* Flickers section */}
      {flickers.length > 0 && (
        <div>
          <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground px-4 pt-4 pb-2">
            🕯️ Flickers
          </p>
          <div className="divide-y divide-border">
            {flickers.map(c => {
              const expired = isFlickerExpired(c);
              const timeLeft = flickerTimeRemaining(c.expires_at);
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedId === c.id ? 'bg-primary/8' : 'hover:bg-muted/50'
                  } ${expired ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg shrink-0">🕯️</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-medium text-foreground truncate">{displayName(c)}</p>
                      {expired ? (
                        <p className="font-body text-xs text-muted-foreground italic">This Flicker has burned out.</p>
                      ) : (
                        <p className="font-body text-xs text-muted-foreground">
                          Burns out in <span className="text-foreground/70">{timeLeft}</span>
                        </p>
                      )}
                    </div>
                    {!expired && timeLeft && (
                      <span className="font-body text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                        {timeLeft}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Regular campfires */}
      {others.length > 0 && flickers.length > 0 && (
        <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground px-4 pt-4 pb-2">
          🔥 Campfires
        </p>
      )}
      <div className="divide-y divide-border">
        {others.map(c => {
          const isEmbers = c.is_embers;

          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                selectedId === c.id ? 'bg-primary/8' : 'hover:bg-muted/50'
              } ${isEmbers ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg shrink-0">
                  {isEmbers ? '🌙' : '🔥'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm font-medium text-foreground truncate">{displayName(c)}</p>
                  {isEmbers && c.daysSinceLastMessage ? (
                    <div className="flex items-center gap-2">
                      <p className="font-body text-xs text-muted-foreground">Quiet for {c.daysSinceLastMessage} days</p>
                      <span className="font-body text-xs text-primary cursor-pointer hover:underline">Stoke it?</span>
                    </div>
                  ) : c.lastMessage ? (
                    <p className="font-body text-xs text-muted-foreground truncate">
                      {c.lastMessage} · {c.lastMessageTime ? formatTimeAgo(c.lastMessageTime) : ''}
                    </p>
                  ) : (
                    <p className="font-body text-xs text-muted-foreground">New campfire</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Campfires;
