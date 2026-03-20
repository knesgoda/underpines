import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import PineTreeLoading from '@/components/PineTreeLoading';

interface Design {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  price_cents: number;
  is_free: boolean;
  is_seasonal: boolean;
  season: string | null;
  purchases: number;
  rating_yes: number;
  rating_no: number;
  creator_id: string;
  created_at: string;
  profiles: { handle: string; display_name: string } | null;
}

const getCurrentSeason = (): string => {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
};

const seasonEmoji: Record<string, string> = {
  spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️',
};

const StarRating = ({ yes, no }: { yes: number; no: number }) => {
  const total = yes + no;
  if (total === 0) return <span className="text-xs text-muted-foreground">No ratings yet</span>;
  const avg = (yes * 5 + no * 1) / total;
  const stars = Math.round(avg);
  return (
    <span className="text-xs text-muted-foreground">
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)} ({total})
    </span>
  );
};

const Marketplace = () => {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'seasonal' | 'new' | 'free' | 'all'>('all');
  const season = getCurrentSeason();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('cabin_designs')
        .select('*, profiles!cabin_designs_creator_id_fkey(handle, display_name)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      setDesigns((data as any) || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <PineTreeLoading />;

  const seasonal = designs.filter(d => d.is_seasonal && d.season === season);
  const free = designs.filter(d => d.is_free);

  const filtered = filter === 'seasonal' ? seasonal
    : filter === 'new' ? [...designs].slice(0, 20)
    : filter === 'free' ? free
    : designs;

  const tabs = [
    { key: 'seasonal' as const, label: `Seasonal picks ${seasonEmoji[season] || ''}` },
    { key: 'new' as const, label: 'New' },
    { key: 'free' as const, label: 'Free' },
    { key: 'all' as const, label: 'All' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-8 pt-16">
      <h1 className="font-display text-2xl text-foreground mb-6">Cabin Designs</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-body whitespace-nowrap transition-colors ${
              filter === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filter === 'all' && seasonal.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-4">
            {seasonEmoji[season]} Seasonal · {season}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {seasonal.map(d => (
              <DesignCard key={d.id} design={d} onClick={() => navigate(`/marketplace/${d.id}`)} />
            ))}
          </div>
        </div>
      )}

      <div>
        {filter === 'all' && <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-4">All Designs</h2>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(d => (
            <DesignCard key={d.id} design={d} onClick={() => navigate(`/marketplace/${d.id}`)} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">No designs found in this category yet.</p>
        )}
      </div>
    </motion.div>
  );
};

const DesignCard = ({ design, onClick }: { design: Design; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="text-left rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
  >
    {design.preview_image_url ? (
      <img src={design.preview_image_url} alt={design.name} className="w-full h-40 object-cover" />
    ) : (
      <div className="w-full h-40 bg-muted flex items-center justify-center text-3xl">🏕️</div>
    )}
    <div className="p-4 space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base text-foreground">{design.name}</h3>
        <span className="text-sm font-body text-primary font-medium">
          {design.is_free ? 'Free' : `$${(design.price_cents / 100).toFixed(0)}`}
        </span>
      </div>
      <p className="text-xs text-muted-foreground font-body">
        by {design.profiles?.handle || 'unknown'}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{design.purchases} cabins using this</span>
        <StarRating yes={design.rating_yes} no={design.rating_no} />
      </div>
    </div>
  </button>
);

export default Marketplace;
