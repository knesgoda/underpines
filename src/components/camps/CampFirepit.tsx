import { useState, useEffect, useCallback } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Trash2, Pin } from 'lucide-react';
import { toast } from 'sonner';
import { formatTimeAgo } from '@/lib/time';

interface CampPost {
  id: string;
  camp_id: string;
  author_id: string;
  post_type: string;
  content: string | null;
  title: string | null;
  is_pinned: boolean | null;
  created_at: string | null;
  author?: { display_name: string; handle: string };
}

interface Props {
  campId: string;
  isScout: boolean;
  scoutDays: number | null;
  canModerate: boolean;
}

const CampFirepit = ({ campId, isScout, scoutDays, canModerate }: Props) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CampPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerType, setComposerType] = useState<'spark' | 'story' | 'ember' | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [posting, setPosting] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('camp_posts')
      .select('*')
      .eq('camp_id', campId)
      .eq('is_published', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    const rows = (data || []) as CampPost[];

    // Fetch authors
    const authorIds = [...new Set(rows.map(p => p.author_id))];
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle')
        .in('id', authorIds);
      const pMap: Record<string, any> = {};
      (profiles || []).forEach(p => { pMap[p.id] = p; });
      rows.forEach(r => { r.author = pMap[r.author_id]; });
    }

    setPosts(rows);
    setLoading(false);
  }, [campId]);

  useEffect(() => { load(); }, [load]);

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setPosting(true);

    const { error } = await supabase.from('camp_posts').insert({
      camp_id: campId,
      author_id: user.id,
      post_type: composerType || 'spark',
      content: content.trim(),
      title: composerType === 'story' ? title.trim() || null : null,
    });

    if (error) {
      toast.error('Could not post');
    } else {
      setContent('');
      setTitle('');
      setComposerType(null);
      load();
    }
    setPosting(false);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Remove this post?')) return;
    await supabase.from('camp_posts').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast('Post removed.');
  };

  const openComposer = (type: 'spark' | 'story' | 'ember') => {
    if (isScout) return;
    setComposerType(type);
    setContent('');
    setTitle('');
  };

  return (
    <div>
      {/* Composer */}
      {isScout ? (
        <div className="rounded-xl border border-border bg-card p-4 mb-4 text-center">
          <p className="font-body text-sm text-muted-foreground">
            🌱 You're a Scout in this Camp for {scoutDays ?? 0} more days. Explore and react — posting unlocks soon.
          </p>
        </div>
      ) : (
        <div className="mb-4">
          {!composerType ? (
            <div className="flex gap-2">
              {(['spark', 'story', 'ember'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => openComposer(type)}
                  className="flex-1 py-2.5 rounded-xl border border-border bg-card font-body text-xs text-muted-foreground hover:bg-muted transition-colors capitalize"
                >
                  {type === 'spark' ? '✨ ' : type === 'story' ? '📖 ' : '🔥 '}{type}
                </button>
              ))}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-body text-xs text-muted-foreground capitalize">{composerType}</span>
                <button onClick={() => setComposerType(null)} className="font-body text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
              {composerType === 'story' && (
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full bg-transparent font-display text-base text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              )}
              <textarea
                value={content}
                onChange={e => setContent(e.target.value.slice(0, composerType === 'spark' ? 300 : 5000))}
                placeholder={composerType === 'spark' ? "What's on your mind?" : 'Write here...'}
                className="w-full bg-transparent font-body text-sm text-foreground resize-none outline-none placeholder:text-muted-foreground/50 min-h-[80px]"
                rows={composerType === 'spark' ? 3 : 6}
              />
              <div className="flex justify-end">
                <button
                  onClick={handlePost}
                  disabled={!content.trim() || posting}
                  className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-40"
                >
                  Post to Camp ↑
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="text-center py-8">
          <p className="font-body text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">🔥</p>
          <p className="font-body text-sm text-muted-foreground">The Firepit is quiet. Be the first to post.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border bg-card p-4 ${post.is_pinned ? 'border-primary/30' : 'border-border'}`}
            >
              {post.is_pinned && (
                <div className="flex items-center gap-1 mb-2">
                  <Pin size={12} className="text-primary" />
                  <span className="font-body text-[10px] text-primary">Pinned</span>
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground shrink-0">
                    {post.author?.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <span className="font-body text-xs font-medium text-foreground">{post.author?.display_name || 'Unknown'}</span>
                    <span className="font-body text-[10px] text-muted-foreground ml-2">{post.created_at ? formatTimeAgo(post.created_at) : ''}</span>
                  </div>
                </div>

                {(canModerate || post.author_id === user?.id) && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === post.id ? null : post.id)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      <MoreHorizontal size={14} className="text-muted-foreground" />
                    </button>
                    {menuOpenId === post.id && (
                      <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                        <button
                          onClick={() => { handleDelete(post.id); setMenuOpenId(null); }}
                          className="w-full text-left px-3 py-1.5 font-body text-xs text-destructive hover:bg-muted flex items-center gap-2"
                        >
                          <Trash2 size={12} /> Remove post
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {post.title && <h3 className="font-display text-base text-foreground mb-1">{post.title}</h3>}
              {post.content && <p className="font-body text-sm text-foreground whitespace-pre-wrap">{post.content}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CampFirepit;
