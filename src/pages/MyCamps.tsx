import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import PineTreeLoading from '@/components/PineTreeLoading';

interface MyCampItem {
  camp_id: string;
  role: string;
  scout_ends_at: string | null;
  camp: {
    id: string;
    name: string;
    description: string | null;
    cover_image_url: string | null;
    member_count: number | null;
  };
  newPostCount?: number;
}

const MyCamps = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MyCampItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;

    const { data: memberships } = await supabase
      .from('camp_members')
      .select('camp_id, role, scout_ends_at')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const campIds = memberships.map(m => m.camp_id);
    const { data: camps } = await supabase
      .from('camps')
      .select('id, name, description, cover_image_url, member_count')
      .in('id', campIds)
      .eq('is_active', true);

    const enriched: MyCampItem[] = memberships.map(m => ({
      ...m,
      camp: (camps || []).find(c => c.id === m.camp_id) || { id: m.camp_id, name: 'Camp', description: null, cover_image_url: null, member_count: 1 },
    }));

    setItems(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const scoutDaysLeft = (endsAt: string | null) => {
    if (!endsAt) return null;
    const days = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000));
    return days > 0 ? days : null;
  };

  const roleLabel = (role: string) => {
    if (role === 'firekeeper') return '🔑 Firekeeper';
    if (role === 'trailblazer') return '🌿 Trailblazer';
    if (role === 'scout') return '🌱 Scout';
    return 'Member';
  };

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-foreground mb-6">My Camps</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">🏕️</p>
          <p className="font-body text-sm text-muted-foreground mb-4">You haven't joined any Camps yet.</p>
          <button
            onClick={() => navigate('/camps')}
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium"
          >
            Explore Camps →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const days = scoutDaysLeft(item.scout_ends_at);
            return (
              <button
                key={item.camp_id}
                onClick={() => navigate(`/camps/${item.camp_id}`)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
              >
                {item.camp.cover_image_url ? (
                  <img src={item.camp.cover_image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Flame size={20} className="text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm font-medium text-foreground truncate">{item.camp.name}</p>
                  <p className="font-body text-xs text-muted-foreground">
                    {roleLabel(item.role)} · {item.camp.member_count || 1} members
                    {days !== null && ` · ${days} days left`}
                  </p>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => navigate('/camps')}
            className="w-full text-center font-body text-xs text-muted-foreground hover:text-foreground transition-colors py-3"
          >
            Explore more Camps →
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default MyCamps;
