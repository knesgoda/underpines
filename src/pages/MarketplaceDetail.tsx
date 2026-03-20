import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import PineTreeLoading from '@/components/PineTreeLoading';
import { toast } from 'sonner';

const MarketplaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const purchased = searchParams.get('purchased') === 'true';
  const navigate = useNavigate();
  const { user } = useAuth();

  const [design, setDesign] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState(false);
  const [applied, setApplied] = useState(false);
  const [buying, setBuying] = useState(false);
  const [showPurchased, setShowPurchased] = useState(purchased);
  const [creatorDesignCount, setCreatorDesignCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data: d } = await supabase
        .from('cabin_designs')
        .select('*')
        .eq('id', id)
        .single();
      if (!d) { setLoading(false); return; }
      setDesign(d);

      const { data: p } = await supabase.from('profiles').select('handle, display_name').eq('id', d.creator_id).single();
      setCreator(p);

      const { count } = await supabase.from('cabin_designs').select('id', { count: 'exact', head: true }).eq('creator_id', d.creator_id).eq('status', 'published');
      setCreatorDesignCount(count || 0);

      if (user) {
        const { data: purchase } = await supabase.from('design_purchases').select('id').eq('design_id', id).eq('buyer_id', user.id).maybeSingle();
        setOwned(!!purchase);
        const { data: prof } = await supabase.from('profiles').select('applied_design_id').eq('id', user.id).single();
        setApplied(prof?.applied_design_id === id);
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  const handleApply = async () => {
    if (!user || !id) return;
    await supabase.from('profiles').update({ applied_design_id: id }).eq('id', user.id);
    setApplied(true);
    toast.success(`${design.name} is now your Cabin design.`);
  };

  const handleBuyFree = async () => {
    if (!user || !design) return;
    setBuying(true);
    await supabase.from('design_purchases').insert({
      design_id: design.id,
      buyer_id: user.id,
      creator_id: design.creator_id,
      amount_cents: 0,
      platform_fee_cents: 0,
      creator_amount_cents: 0,
    });
    await supabase.from('cabin_designs').update({ purchases: (design.purchases || 0) + 1 }).eq('id', design.id);
    await supabase.from('profiles').update({ applied_design_id: design.id }).eq('id', user.id);
    setOwned(true);
    setApplied(true);
    setBuying(false);
    toast.success(`${design.name} is now your Cabin design.`);
  };

  const handleBuyPaid = async () => {
    if (!user || !design) return;
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-design-checkout', {
        body: { designId: design.id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (e: any) {
      toast.error(e.message || 'Could not start checkout');
    }
    setBuying(false);
  };

  const handlePreview = () => {
    if (!design) return;
    // Store preview data in sessionStorage and navigate to own cabin
    sessionStorage.setItem('cabin_preview_design', JSON.stringify({
      id: design.id,
      name: design.name,
      price_cents: design.price_cents,
      design_data: design.design_data,
    }));
    navigate('/cabin?preview=true');
  };

  if (loading) return <PineTreeLoading />;
  if (!design) return <div className="text-center py-16 text-muted-foreground">Design not found.</div>;

  const totalRatings = (design.rating_yes || 0) + (design.rating_no || 0);
  const avgRating = totalRatings > 0 ? ((design.rating_yes * 5 + design.rating_no * 1) / totalRatings) : 0;
  const stars = Math.round(avgRating);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto px-4 py-8 pt-16">
      {/* Purchased overlay */}
      <AnimatePresence>
        {showPurchased && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowPurchased(false)}
          >
            <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <p className="text-3xl mb-4">🌲</p>
              <h2 className="font-display text-xl text-foreground mb-2">{design.name} is yours.</h2>
              <div className="flex gap-2 justify-center mt-6">
                <Button onClick={() => { setShowPurchased(false); handleApply(); }} className="rounded-full font-body text-sm">
                  Apply to my Cabin now →
                </Button>
                <Button variant="ghost" onClick={() => setShowPurchased(false)} className="rounded-full font-body text-sm">
                  Keep browsing
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview image */}
      {design.preview_image_url ? (
        <img src={design.preview_image_url} alt={design.name} className="w-full h-64 object-cover rounded-2xl mb-6" />
      ) : (
        <div className="w-full h-64 bg-muted rounded-2xl mb-6 flex items-center justify-center text-5xl">🏕️</div>
      )}

      <h1 className="font-display text-2xl text-foreground">{design.name}</h1>
      <p className="text-sm text-muted-foreground font-body mt-1">by {creator?.handle || 'unknown'}</p>

      {design.description && (
        <p className="text-sm font-body text-foreground/80 mt-4 leading-relaxed">{design.description}</p>
      )}

      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
        <span className="font-medium text-primary">
          {design.is_free ? 'Free' : `$${(design.price_cents / 100).toFixed(0)} · One-time purchase`}
        </span>
        <span>{design.purchases} cabins using this</span>
        {totalRatings > 0 && <span>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)} ({totalRatings})</span>}
      </div>

      <div className="flex gap-3 mt-6">
        {owned ? (
          <>
            {applied ? (
              <Button disabled className="rounded-full font-body text-sm">Already applied ✓</Button>
            ) : (
              <Button onClick={handleApply} className="rounded-full font-body text-sm">Apply to my Cabin →</Button>
            )}
            <span className="text-sm text-muted-foreground self-center">You own this design.</span>
          </>
        ) : (
          <>
            {user && (
              <Button variant="outline" onClick={handlePreview} className="rounded-full font-body text-sm">
                Preview on my Cabin →
              </Button>
            )}
            {design.is_free ? (
              <Button onClick={handleBuyFree} disabled={buying || !user} className="rounded-full font-body text-sm">
                {buying ? 'Applying…' : 'Apply for free'}
              </Button>
            ) : (
              <Button onClick={handleBuyPaid} disabled={buying || !user} className="rounded-full font-body text-sm">
                {buying ? 'Starting checkout…' : `Buy for $${(design.price_cents / 100).toFixed(0)}`}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Design info */}
      <div className="mt-8 border-t border-border pt-6 space-y-2 text-sm font-body text-muted-foreground">
        <h3 className="font-display text-xs uppercase tracking-wider text-foreground/60 mb-3">About this design</h3>
        {(design.design_data as any)?.atmosphere && <p>Atmosphere: {(design.design_data as any).atmosphere}</p>}
        {(design.design_data as any)?.layout && <p>Layout: {(design.design_data as any).layout}</p>}
        {design.is_seasonal && design.season && <p>Season: {design.season}</p>}
      </div>

      {/* Creator info */}
      <div className="mt-8 border-t border-border pt-6">
        <h3 className="font-display text-xs uppercase tracking-wider text-foreground/60 mb-3">By {creator?.handle}</h3>
        <p className="text-sm text-muted-foreground font-body">
          {creator?.display_name} has {creatorDesignCount} design{creatorDesignCount !== 1 ? 's' : ''} in the marketplace.
        </p>
      </div>
    </motion.div>
  );
};

export default MarketplaceDetail;
