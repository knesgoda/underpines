import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Camp {
  id: string;
  name: string;
  member_count: number;
  health_status: string | null;
  firekeeper_id: string;
  firekeeper?: { handle: string };
}

const healthIcon = (s: string | null) => {
  if (s === 'concern') return '🔴';
  if (s === 'watch') return '🟡';
  return '🟢';
};

const GroveCamps = () => {
  const navigate = useNavigate();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('camps')
        .select('id, name, member_count, health_status, firekeeper_id, firekeeper:profiles!camps_firekeeper_id_fkey(handle)')
        .eq('is_active', true)
        .order('health_status', { ascending: true });

      setCamps((data as unknown as Camp[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-xl font-bold text-[hsl(var(--pine-pale))]">
        Camps <span className="text-sm font-normal text-[hsl(var(--muted-text))]">({camps.length})</span>
      </h1>

      {loading ? (
        <p className="text-sm text-[hsl(var(--pine-light)/0.5)]">Loading…</p>
      ) : (
        <div className="space-y-1">
          {camps.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/grove/camps/${c.id}`)}
              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-[hsl(var(--pine-mid)/0.15)] transition-colors"
            >
              <span>{healthIcon(c.health_status)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[hsl(var(--pine-pale))] truncate">{c.name}</p>
                <p className="text-xs text-[hsl(var(--muted-text))]">
                  {c.member_count} members · Firekeeper: {(c.firekeeper as any)?.handle || '—'}
                </p>
              </div>
              <span className="text-xs text-[hsl(var(--pine-light)/0.4)] capitalize">{c.health_status || 'healthy'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroveCamps;
