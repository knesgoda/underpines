import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Plus, Lock } from 'lucide-react';
import PineTreeLoading from '@/components/PineTreeLoading';

interface Collection {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_paid: boolean | null;
  price_cents: number | null;
  price_type: string | null;
  is_published: boolean | null;
  author_id: string;
  postCount?: number;
}

const CollectionsList = () => {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [profileName, setProfileName] = useState('');
  const [profileId, setProfileId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!handle) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('handle', handle)
        .maybeSingle();

      if (!profile) { setLoading(false); return; }
      setProfileName(profile.display_name);
      setProfileId(profile.id);

      const isOwner = user?.id === profile.id;

      let query = supabase.from('collections').select('*').eq('author_id', profile.id);
      if (!isOwner) query = query.eq('is_published', true);

      const { data: cols } = await query.order('created_at', { ascending: false });

      if (cols) {
        const enriched = await Promise.all(cols.map(async (c) => {
          const { count } = await supabase
            .from('collection_posts')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', c.id);
          return { ...c, postCount: count || 0 };
        }));
        setCollections(enriched);
      }
      setLoading(false);
    };
    load();
  }, [handle, user]);

  const isOwner = user?.id === profileId;

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-foreground">{profileName}'s Collections</h1>
        {isOwner && (
          <button
            onClick={() => navigate('/collections/new')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm"
          >
            <Plus size={14} /> New Collection
          </button>
        )}
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">📚</p>
          <p className="font-body text-sm text-muted-foreground">No Collections published yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {collections.map(c => (
            <div key={c.id} className="flex gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
              <div className="w-[120px] h-[120px] rounded-lg bg-muted overflow-hidden shrink-0">
                {c.cover_image_url ? (
                  <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">📚</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg text-foreground">{c.title}</h2>
                  {c.is_paid && <Lock size={14} className="text-muted-foreground" />}
                </div>
                {c.description && (
                  <p className="font-body text-sm text-muted-foreground mt-1">{c.description}</p>
                )}
                <p className="font-body text-xs text-muted-foreground mt-2">
                  {c.is_paid ? `$${((c.price_cents || 0) / 100).toFixed(0)}/${c.price_type || 'month'}` : 'Free'} · {c.postCount} posts
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Link
                    to={`/${handle}/collections/${c.id}`}
                    className="font-body text-xs text-primary hover:underline"
                  >
                    {c.is_paid ? 'Subscribe →' : 'Open →'}
                  </Link>
                  {isOwner && (
                    <Link
                      to={`/collections/edit/${c.id}`}
                      className="font-body text-xs text-muted-foreground hover:underline"
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CollectionsList;
