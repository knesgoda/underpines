import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, Reorder } from 'framer-motion';
import { ArrowLeft, Plus, X, GripVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PineTreeLoading from '@/components/PineTreeLoading';

interface PostItem {
  id: string;
  title: string | null;
  content: string | null;
  post_type: string;
}

const CollectionEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState('');

  // Step 2
  const [isPaid, setIsPaid] = useState(false);
  const [priceCents, setPriceCents] = useState(300);
  const [priceType, setPriceType] = useState('month');

  // Step 3
  const [userPosts, setUserPosts] = useState<PostItem[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<PostItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Stats (edit mode)
  const [waitlistCount, setWaitlistCount] = useState(0);

  const loadExisting = useCallback(async () => {
    if (!id || !user) return;
    const { data: col } = await supabase.from('collections').select('*').eq('id', id).maybeSingle();
    if (!col || col.author_id !== user.id) { navigate('/'); return; }

    setTitle(col.title);
    setDescription(col.description || '');
    setCoverUrl(col.cover_image_url || '');
    setIsPaid(!!col.is_paid);
    setPriceCents(col.price_cents || 300);
    setPriceType(col.price_type || 'month');

    // Load collection posts
    const { data: cposts } = await supabase
      .from('collection_posts')
      .select('post_id, position')
      .eq('collection_id', id)
      .order('position', { ascending: true });

    if (cposts && cposts.length > 0) {
      const { data: posts } = await supabase
        .from('posts')
        .select('id, title, content, post_type')
        .in('id', cposts.map(cp => cp.post_id));

      if (posts) {
        const ordered = cposts.map(cp => posts.find(p => p.id === cp.post_id)).filter(Boolean) as PostItem[];
        setSelectedPosts(ordered);
      }
    }

    // Waitlist count
    const { count } = await supabase
      .from('collection_waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', id);
    setWaitlistCount(count || 0);

    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => { if (isEdit) loadExisting(); }, [isEdit, loadExisting]);

  // Load user's posts for step 3
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, title, content, post_type')
        .eq('author_id', user.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      setUserPosts(data || []);
    };
    load();
  }, [user]);

  const uploadCover = async (): Promise<string> => {
    if (!coverFile || !user) return coverUrl;
    const path = `collection-covers/${user.id}/${Date.now()}-${coverFile.name}`;
    const { error } = await supabase.storage.from('post-media').upload(path, coverFile);
    if (error) { toast.error('Cover upload failed'); return coverUrl; }
    const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path);
    return publicUrl;
  };

  const handlePublish = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);

    const finalCover = await uploadCover();

    if (isEdit && id) {
      await supabase.from('collections').update({
        title: title.trim(),
        description: description.trim() || null,
        cover_image_url: finalCover || null,
        is_paid: isPaid,
        price_cents: isPaid ? priceCents : null,
        price_type: isPaid ? priceType : null,
      }).eq('id', id);

      // Re-sync posts
      await supabase.from('collection_posts').delete().eq('collection_id', id);
      if (selectedPosts.length > 0) {
        await supabase.from('collection_posts').insert(
          selectedPosts.map((p, i) => ({ collection_id: id, post_id: p.id, position: i }))
        );
      }

      toast.success('Collection updated');
      navigate(`/${user.id}`);
    } else {
      const { data: newCol } = await supabase.from('collections').insert({
        author_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        cover_image_url: finalCover || null,
        is_paid: isPaid,
        price_cents: isPaid ? priceCents : null,
        price_type: isPaid ? priceType : null,
        is_published: true,
      }).select().single();

      if (newCol && selectedPosts.length > 0) {
        await supabase.from('collection_posts').insert(
          selectedPosts.map((p, i) => ({ collection_id: newCol.id, post_id: p.id, position: i }))
        );
      }

      toast.success('Collection published!');
      navigate('/cabin');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!id || !confirm('Delete this Collection? Your posts aren\'t deleted — only this Collection.')) return;
    await supabase.from('collections').update({ is_published: false }).eq('id', id);
    toast.success('Collection removed');
    navigate('/cabin');
  };

  const addPost = (post: PostItem) => {
    if (!selectedPosts.find(p => p.id === post.id)) {
      setSelectedPosts(prev => [...prev, post]);
    }
  };

  const removePost = (postId: string) => {
    setSelectedPosts(prev => prev.filter(p => p.id !== postId));
  };

  const postLabel = (p: PostItem) => {
    if (p.post_type === 'story' && p.title) return p.title;
    if (p.content) return p.content.slice(0, 60) + (p.content.length > 60 ? '...' : '');
    return `${p.post_type} post`;
  };

  const availablePosts = userPosts.filter(p =>
    !selectedPosts.find(sp => sp.id === p.id) &&
    (!searchTerm || postLabel(p).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-xl text-foreground">{isEdit ? 'Edit Collection' : 'Create a Collection'}</h1>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      {/* Step 1: Cover & Identity */}
      {step === 1 && (
        <div className="space-y-4">
          <div
            className="w-full aspect-square max-w-[200px] mx-auto rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center cursor-pointer overflow-hidden"
            onClick={() => document.getElementById('cover-input')?.click()}
          >
            {(coverFile || coverUrl) ? (
              <img src={coverFile ? URL.createObjectURL(coverFile) : coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <p className="text-3xl mb-1">📷</p>
                <p className="font-body text-xs text-muted-foreground">Upload cover image</p>
              </div>
            )}
          </div>
          <input id="cover-input" type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && setCoverFile(e.target.files[0])} />

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background font-body text-sm outline-none"
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="One-line description"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background font-body text-sm outline-none"
          />

          <button
            onClick={() => setStep(2)}
            disabled={!title.trim()}
            className="w-full py-3 rounded-full bg-primary text-primary-foreground font-body text-sm disabled:opacity-50"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 2: Access */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="font-body text-sm text-foreground mb-2">Who can read this Collection?</p>

          <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${!isPaid ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <input type="radio" checked={!isPaid} onChange={() => setIsPaid(false)} className="mt-1" />
            <div>
              <p className="font-body text-sm font-medium text-foreground">Free — anyone in your Circle</p>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${isPaid ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <input type="radio" checked={isPaid} onChange={() => setIsPaid(true)} className="mt-1" />
            <div>
              <p className="font-body text-sm font-medium text-foreground">Paid — subscribers only</p>
            </div>
          </label>

          {isPaid && (
            <div className="pl-7 space-y-3">
              <div className="flex gap-2">
                <div className="flex items-center gap-1 flex-1">
                  <span className="font-body text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={priceCents / 100}
                    onChange={e => setPriceCents(Math.max(1, Number(e.target.value)) * 100)}
                    className="w-20 px-3 py-2 rounded-lg border border-border bg-background font-body text-sm outline-none"
                  />
                </div>
                <select
                  value={priceType}
                  onChange={e => setPriceType(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-background font-body text-sm outline-none"
                >
                  <option value="month">per month</option>
                  <option value="one-time">one-time</option>
                </select>
              </div>
              <p className="font-body text-xs text-muted-foreground">
                Paid subscriptions are coming soon. You can set this up now and start accepting subscribers when it launches.
              </p>
            </div>
          )}

          <button onClick={() => setStep(3)} className="w-full py-3 rounded-full bg-primary text-primary-foreground font-body text-sm">
            Continue →
          </button>
        </div>
      )}

      {/* Step 3: Add Posts */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="font-body text-sm text-foreground mb-2">Add posts to your Collection</p>

          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search your posts..."
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background font-body text-sm outline-none"
          />

          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {availablePosts.map(p => (
              <button key={p.id} onClick={() => addPost(p)} className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
                <span className="font-body text-sm text-foreground truncate flex-1">{postLabel(p)}</span>
                <Plus size={14} className="text-primary shrink-0 ml-2" />
              </button>
            ))}
            {availablePosts.length === 0 && (
              <p className="font-body text-xs text-muted-foreground text-center py-4">No more posts to add.</p>
            )}
          </div>

          {selectedPosts.length > 0 && (
            <div>
              <p className="font-body text-xs text-muted-foreground mb-2">Posts in this Collection ({selectedPosts.length}):</p>
              <Reorder.Group axis="y" values={selectedPosts} onReorder={setSelectedPosts} className="space-y-1">
                {selectedPosts.map(p => (
                  <Reorder.Item key={p.id} value={p} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border cursor-grab active:cursor-grabbing">
                    <GripVertical size={14} className="text-muted-foreground shrink-0" />
                    <span className="font-body text-sm text-foreground truncate flex-1">{postLabel(p)}</span>
                    <button onClick={() => removePost(p.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X size={14} />
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          )}

          <button
            onClick={handlePublish}
            disabled={saving}
            className="w-full py-3 rounded-full bg-primary text-primary-foreground font-body text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Collection' : 'Publish Collection →'}
          </button>

          {isEdit && (
            <>
              {/* Stats */}
              {isPaid && (
                <div className="mt-4 p-4 rounded-xl border border-border bg-card">
                  <p className="font-body text-xs text-muted-foreground">Waitlist: {waitlistCount} people interested</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">Subscription revenue dashboard coming soon</p>
                </div>
              )}

              <button onClick={handleDelete} className="w-full mt-2 py-2.5 rounded-full border border-destructive/30 text-destructive font-body text-sm flex items-center justify-center gap-2">
                <Trash2 size={14} /> Delete Collection
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default CollectionEditor;
