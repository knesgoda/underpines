import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Plus } from 'lucide-react';

interface CollectionItem {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_paid: boolean | null;
  price_cents: number | null;
  price_type: string | null;
  postCount: number;
}

interface Props {
  profileId: string;
  handle: string;
  isOwner: boolean;
  atmosphere: any;
}

const CollectionsShelf = ({ profileId, handle, isOwner, atmosphere }: Props) => {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      let query = supabase.from('collections').select('*').eq('author_id', profileId);
      if (!isOwner) query = query.eq('is_published', true);

      const { data } = await query.order('created_at', { ascending: false }).limit(3);
      if (data) {
        const enriched = await Promise.all(data.map(async (c) => {
          const { count } = await supabase
            .from('collection_posts')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', c.id);
          return { ...c, postCount: count || 0 };
        }));
        setCollections(enriched);
      }
    };
    load();
  }, [profileId, isOwner]);

  const hasCollections = collections.length > 0;

  return (
    <div
      className="rounded-2xl p-5 shadow-soft transition-colors duration-700"
      style={{ backgroundColor: atmosphere.cardBg, borderColor: atmosphere.border, borderWidth: 1 }}
    >
      <h3 className="font-display text-sm mb-1" style={{ color: atmosphere.text, opacity: 0.6 }}>Collections</h3>
      <p className="font-body text-sm mb-3 text-muted-foreground">Curated sets of posts organized around a theme — yours to keep, share, or sell.</p>

      {!hasCollections && !isOwner && (
        <p className="font-body text-xs" style={{ color: atmosphere.text, opacity: 0.35 }}>No Collections yet.</p>
      )}

      {!hasCollections && isOwner && (
        <div className="text-center py-4">
          <p className="text-2xl mb-1">📚</p>
          <p className="font-body text-xs mb-2" style={{ color: atmosphere.text, opacity: 0.5 }}>
            Your shelf is empty. Collections are a way to share what you're made of.
          </p>
          <button
            onClick={() => navigate('/collections/new')}
            className="font-body text-xs text-primary hover:underline"
          >
            Create your first Collection →
          </button>
        </div>
      )}

      {hasCollections && (
        <div className="space-y-3">
          {collections.map(c => (
            <Link key={c.id} to={`/${handle}/collections/${c.id}`} className="flex items-center gap-3 group">
              <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                {c.cover_image_url ? (
                  <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">📚</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-body text-sm font-medium group-hover:opacity-80 truncate" style={{ color: atmosphere.text }}>
                  {c.title}
                  {c.is_paid && <Lock size={10} className="inline ml-1 opacity-50" />}
                </p>
                {c.description && (
                  <p className="font-body text-xs truncate" style={{ color: atmosphere.text, opacity: 0.5 }}>{c.description}</p>
                )}
                <p className="font-body text-[10px]" style={{ color: atmosphere.text, opacity: 0.4 }}>
                  {c.is_paid ? `$${((c.price_cents || 0) / 100).toFixed(0)}/${c.price_type || 'month'}` : 'Free'} · {c.postCount} posts
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {hasCollections && (
        <Link to={`/${handle}/collections`} className="block mt-3 font-body text-xs text-primary hover:underline">
          See all collections →
        </Link>
      )}

      {isOwner && hasCollections && (
        <button
          onClick={() => navigate('/collections/new')}
          className="flex items-center gap-1 mt-2 font-body text-xs hover:underline"
          style={{ color: atmosphere.text, opacity: 0.5 }}
        >
          <Plus size={12} /> New Collection
        </button>
      )}
    </div>
  );
};

export default CollectionsShelf;
