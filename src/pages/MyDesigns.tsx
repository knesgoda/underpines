import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import PineTreeLoading from '@/components/PineTreeLoading';
import { toast } from 'sonner';

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  published: 'Published',
  rejected: 'Rejected',
  archived: 'Archived',
};

const MyDesigns = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('cabin_designs')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      setDesigns(data || []);

      // Sum earnings from design purchases
      const { data: purchases } = await supabase
        .from('design_purchases')
        .select('creator_amount_cents')
        .eq('creator_id', user.id);
      const total = (purchases || []).reduce((sum, p) => sum + (p.creator_amount_cents || 0), 0);
      setEarnings(total);

      setLoading(false);
    };
    load();
  }, [user]);

  const handleArchive = async (id: string) => {
    await supabase.from('cabin_designs').update({ status: 'archived' }).eq('id', id);
    setDesigns(prev => prev.map(d => d.id === id ? { ...d, status: 'archived' } : d));
    toast.success('Design archived');
  };

  const handleDelete = async (id: string) => {
    await supabase.from('cabin_designs').update({ status: 'archived' }).eq('id', id);
    setDesigns(prev => prev.filter(d => d.id !== id));
    toast.success('Design removed');
  };

  if (loading) return <PineTreeLoading />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4 py-8 pt-16">
      <h1 className="font-display text-2xl text-foreground mb-6">Your Designs</h1>

      <div className="space-y-4">
        {designs.map(d => (
          <div key={d.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
            {d.preview_image_url ? (
              <img src={d.preview_image_url} alt={d.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">🏕️</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base text-foreground truncate">{d.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-body ${
                  d.status === 'published' ? 'bg-green-100 text-green-700' :
                  d.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  d.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {statusLabels[d.status] || d.status}
                </span>
              </div>
              {d.status === 'published' && (
                <p className="text-xs text-muted-foreground font-body mt-1">
                  {d.purchases} cabins · ${((d.price_cents || 0) > 0 ? 'Paid' : 'Free')}
                  {d.rating_yes + d.rating_no > 0 && ` · ${'★'.repeat(Math.round((d.rating_yes * 5 + d.rating_no) / (d.rating_yes + d.rating_no)))}`}
                </p>
              )}
              {d.status === 'rejected' && d.review_notes && (
                <p className="text-xs text-destructive font-body mt-1">{d.review_notes}</p>
              )}
              <div className="flex gap-2 mt-2">
                {d.status === 'published' && (
                  <Button variant="ghost" size="sm" onClick={() => handleArchive(d.id)} className="text-xs font-body h-7">Archive</Button>
                )}
                {d.status === 'draft' && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/designs/create`)} className="text-xs font-body h-7">Continue editing</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)} className="text-xs font-body h-7 text-destructive">Delete</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {designs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">You haven't created any designs yet.</p>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-6 space-y-4">
        <Button onClick={() => navigate('/designs/create')} className="rounded-full font-body text-sm w-full">
          Create a new design
        </Button>
      </div>

      {earnings > 0 && (
        <div className="mt-6 border-t border-border pt-6">
          <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-2">Earnings from designs</h2>
          <p className="text-lg font-display text-foreground">${(earnings / 100).toFixed(2)}</p>
          <button onClick={() => navigate('/settings/payouts')} className="text-xs text-primary font-body mt-1 hover:underline">
            View in payout dashboard →
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default MyDesigns;
