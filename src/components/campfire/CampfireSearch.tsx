import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatTimeAgo } from '@/lib/time';
import PineTreeLoading from '@/components/PineTreeLoading';

interface Props {
  campfireId: string;
  campfireName: string;
  onBack: () => void;
  onJumpToMessage: (messageId: string) => void;
}

type Filter = 'all' | 'photos';

const Highlight = ({ text, query }: { text: string; query: string }) => {
  if (!query || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-light/40 text-foreground rounded-sm px-0.5">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
};

const CampfireSearch = ({ campfireId, campfireName, onBack, onJumpToMessage }: Props) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch();
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, filter]);

  const runSearch = async () => {
    setLoading(true);
    try {
      if (filter === 'photos') {
        const { data } = await supabase
          .from('campfire_messages')
          .select('*, profiles!campfire_messages_sender_id_fkey(display_name, handle)')
          .eq('campfire_id', campfireId)
          .eq('message_type', 'photo')
          .eq('is_faded', false)
          .order('created_at', { ascending: false })
          .limit(50);
        setResults(data || []);
      } else {
        if (!query.trim()) {
          setResults([]);
          setLoading(false);
          return;
        }
        const pattern = `%${query.trim()}%`;
        const { data } = await supabase
          .from('campfire_messages')
          .select('*, profiles!campfire_messages_sender_id_fkey(display_name, handle)')
          .eq('campfire_id', campfireId)
          .eq('is_faded', false)
          .ilike('content', pattern)
          .order('created_at', { ascending: false })
          .limit(30);
        setResults(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <span className="font-body text-sm text-muted-foreground">Back to {campfireName}</span>
      </div>

      {/* Search input */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${campfireName}...`}
            className="pl-9 font-body text-sm bg-card"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pb-2 flex gap-2">
        {(['all', 'photos'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full font-body text-xs transition-colors ${
              filter === f ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {f === 'all' ? 'All' : 'Photos'}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="py-12"><PineTreeLoading /></div>
        ) : filter === 'photos' ? (
          results.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-body text-sm text-muted-foreground">No photos in this Campfire yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 mt-2">
              {results.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onJumpToMessage(m.id)}
                  className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                >
                  <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )
        ) : !query.trim() ? (
          <div className="text-center py-12">
            <Search size={24} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="font-body text-sm text-muted-foreground">Search messages in this Campfire.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-2xl">🔥</span>
            <p className="font-body text-sm text-foreground mt-2">
              Nothing found for "<span className="font-medium">{query}</span>" in this Campfire.
            </p>
          </div>
        ) : (
          <div className="space-y-1 mt-2">
            {results.map((m) => (
              <button
                key={m.id}
                onClick={() => onJumpToMessage(m.id)}
                className="w-full text-left p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-[9px]">
                        {m.profiles?.display_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-body text-xs font-medium text-foreground">{m.profiles?.display_name}</span>
                  </div>
                  <span className="font-body text-[10px] text-muted-foreground">{formatTimeAgo(m.created_at)}</span>
                </div>
                {m.message_type === 'voice' ? (
                  <p className="font-body text-sm text-muted-foreground flex items-center gap-1">
                    <Mic size={12} /> Voice message ({m.voice_duration_seconds ? `${Math.floor(m.voice_duration_seconds / 60)}:${String(m.voice_duration_seconds % 60).padStart(2, '0')}` : '0:00'})
                  </p>
                ) : (
                  <p className="font-body text-sm text-foreground line-clamp-2">
                    "<Highlight text={m.content || ''} query={query} />"
                  </p>
                )}
                <span className="font-body text-[10px] text-primary mt-1 inline-block">Jump to →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampfireSearch;
