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

    // Batch-fetch last messages for all campfires
    const campfireIds = campfireRows.map(c => c.id);

    // Get all participants for the user's campfires (for 1-on-1 names)
    const { data: allParticipants } = await supabase
      .from('campfire_participants')
      .select('campfire_id, user_id')
      .in('campfire_id', campfireIds)
      .neq('user_id', user.id);

    // Get other participant profile IDs
    const otherUserIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
    const { data: otherProfiles } = otherUserIds.length > 0
      ? await supabase.from('profiles').select('id, display_name').in('id', otherUserIds)
      : { data: [] };
    const profileMap = new Map<string, string>(otherProfiles?.map(p => [p.id, p.display_name || ''] as [string, string]) || []);

    // Build participant lookup: campfireId -> other user's display name
    const participantNameMap = new Map<string, string>();
    for (const p of allParticipants || []) {
      if (!participantNameMap.has(p.campfire_id)) {
        participantNameMap.set(p.campfire_id, profileMap.get(p.user_id) || '');
      }
    }

    // Fetch last message per campfire using a single query
    const { data: recentMessages } = await supabase
      .from('campfire_messages')
      .select('campfire_id, content, created_at, sender_id')
      .in('campfire_id', campfireIds)
      .order('created_at', { ascending: false })
      .limit(campfireIds.length * 2);

    const lastMessageMap = new Map<string, { content: string | null; created_at: string; sender_id: string }>();
    for (const msg of recentMessages || []) {
      if (!lastMessageMap.has(msg.campfire_id)) {
        lastMessageMap.set(msg.campfire_id, msg);
      }
    }

    const enriched: CampfireItem[] = campfireRows.map(c => {
      const lastMsg = lastMessageMap.get(c.id);
      const otherName = c.campfire_type === 'one_on_one' ? (participantNameMap.get(c.id) || '') : '';
      const daysSince = lastMsg?.created_at
        ? Math.floor((Date.now() - new Date(lastMsg.created_at).getTime()) / 86400000)
        : undefined;

      return {
        ...c,
        lastMessage: lastMsg?.content || (lastMsg ? '📷 Photo' : undefined),
        lastMessageTime: lastMsg?.created_at || undefined,
        otherParticipantName: otherName,
        daysSinceLastMessage: daysSince,
      } as CampfireItem;
    });

    // Sort by most recent message first, then by created_at for campfires with no messages
    enriched.sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });

    setCampfires(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadCampfires(); }, [loadCampfires]);

  // Realtime: re-sort list when any campfire message arrives
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('campfire-list-reorder')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'campfire_messages' },
        () => { loadCampfires(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadCampfires]);

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

  const handleCreated = (id: string) => {
    setShowNewSheet(false);
    setSelectedId(id);
    loadCampfires();
  };

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col" style={{ height: 'calc(100dvh - 56px)' }}>
        <CampfireListHeader filter={filter} setFilter={setFilter} />
        <div className="flex-1 overflow-y-auto overscroll-y-contain" style={{ touchAction: 'pan-y' }}>
          <CampfireList
            campfires={filtered}
            displayName={displayName}
            isFlickerExpired={isFlickerExpired}
            onSelect={(id) => { setStokeMode(false); setSelectedId(id); }}
            onStoke={(id) => { setStokeMode(true); setSelectedId(id); }}
          />
        </div>

        {/* Mobile FAB */}
        <button
          onClick={() => setShowNewSheet(true)}
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Start a new Campfire"
        >
          <Flame size={22} />
        </button>

        {showNewSheet && <NewCampfireSheet onClose={() => setShowNewSheet(false)} onCreated={handleCreated} />}
      </motion.div>
    );
  }

  // Desktop: split panel
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-dvh">
      {/* Left panel */}
      <div className="w-[320px] border-r border-border flex flex-col shrink-0">
        <CampfireListHeader filter={filter} setFilter={setFilter} />
        <div className="flex-1 overflow-y-auto overscroll-y-contain" style={{ touchAction: 'pan-y' }}>
          <CampfireList
            campfires={filtered}
            displayName={displayName}
            isFlickerExpired={isFlickerExpired}
            onSelect={(id) => { setStokeMode(false); setSelectedId(id); }}
            onStoke={(id) => { setStokeMode(true); setSelectedId(id); }}
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

      {showNewSheet && <NewCampfireSheet onClose={() => setShowNewSheet(false)} onCreated={handleCreated} />}
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
  campfires, displayName, isFlickerExpired, onSelect, onStoke, selectedId,
}: {
  campfires: CampfireItem[];
  displayName: (c: CampfireItem) => string;
  isFlickerExpired: (c: CampfireItem) => boolean;
  onSelect: (id: string) => void;
  onStoke?: (id: string) => void;
  selectedId?: string | null;
}) => {
  if (campfires.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-16 px-6">
        <div className="text-center">
          <p className="text-3xl mb-3">🔥</p>
          <p className="font-body text-sm text-muted-foreground">
            No Campfires yet. Tap the flame to start one.
          </p>
        </div>
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
                        <div className="flex items-center gap-1.5">
                          <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 opacity-60">
                            <circle cx="4" cy="12" r="1.5" fill="hsl(var(--primary))" opacity="0.3">
                              <animate attributeName="opacity" values="0.3;0.15;0.3" dur="3s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="8" cy="11" r="2" fill="hsl(var(--primary))" opacity="0.25">
                              <animate attributeName="opacity" values="0.25;0.1;0.25" dur="4s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="12" cy="12.5" r="1.2" fill="hsl(var(--primary))" opacity="0.2">
                              <animate attributeName="opacity" values="0.2;0.08;0.2" dur="3.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="6" cy="10" r="0.6" fill="hsl(var(--destructive))" opacity="0.4">
                              <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="10" cy="10.5" r="0.5" fill="hsl(var(--destructive))" opacity="0.35">
                              <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2.8s" repeatCount="indefinite" />
                            </circle>
                          </svg>
                          <p className="font-body text-xs text-muted-foreground/60 italic">Burned down to embers</p>
                        </div>
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
                      <span
                        className="font-body text-xs text-primary cursor-pointer hover:underline"
                        onClick={(e) => { e.stopPropagation(); onStoke?.(c.id); }}
                        role="button"
                        tabIndex={0}
                      >Stoke it?</span>
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
