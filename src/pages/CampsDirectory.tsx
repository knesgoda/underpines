import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Search, Plus, Flame } from 'lucide-react';
import PineTreeLoading from '@/components/PineTreeLoading';

interface CampRow {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  visibility: string;
  member_count: number | null;
}

const CampsDirectory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [camps, setCamps] = useState<CampRow[]>([]);
  const [myCamps, setMyCamps] = useState<{ camp_id: string; role: string; scout_ends_at: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const perPage = 20;

  const load = useCallback(async () => {
    if (!user) return;

    const [campsRes, myRes] = await Promise.all([
      supabase
        .from('camps')
        .select('id, name, description, cover_image_url, visibility, member_count')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('camp_members')
        .select('camp_id, role, scout_ends_at')
        .eq('user_id', user.id),
    ]);

    setCamps(campsRes.data || []);
    setMyCamps(myRes.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const filtered = camps.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const isMember = (campId: string) => myCamps.some(m => m.camp_id === campId);

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-foreground">🏕️ Camps</h1>
        <button
          onClick={() => navigate('/camps/new')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> Start a Camp
        </button>
      </div>

      {/* My Camps link */}
      {myCamps.length > 0 && (
        <button
          onClick={() => navigate('/camps/mine')}
          className="w-full text-left mb-4 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
        >
          <p className="font-body text-sm font-medium text-foreground">My Camps ({myCamps.length})</p>
          <p className="font-body text-xs text-muted-foreground">View your camps and activity</p>
        </button>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search camps by name..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Camp list */}
      {paged.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">🏕️</p>
          <p className="font-body text-sm text-muted-foreground">
            {search ? 'No camps match your search.' : 'No camps yet. Be the first to start one.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paged.map(camp => (
            <button
              key={camp.id}
              onClick={() => navigate(`/camps/${camp.id}`)}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
            >
              {camp.cover_image_url ? (
                <img src={camp.cover_image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Flame size={20} className="text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-body text-sm font-medium text-foreground truncate">{camp.name}</p>
                  {camp.visibility === 'ember' && (
                    <span className="text-[10px] font-body text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">🔥 Ember</span>
                  )}
                  {isMember(camp.id) && (
                    <span className="text-[10px] font-body text-primary px-1.5 py-0.5 rounded-full bg-primary/10">Joined</span>
                  )}
                </div>
                <p className="font-body text-xs text-muted-foreground truncate">
                  {camp.member_count || 1} member{(camp.member_count || 1) > 1 ? 's' : ''}
                  {camp.description && ` · ${camp.description}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg font-body text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="font-body text-xs text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg font-body text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default CampsDirectory;
