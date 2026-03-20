import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface PendingDesign {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  price_cents: number;
  is_seasonal: boolean;
  season: string | null;
  design_data: any;
  created_at: string;
  creator_id: string;
  profiles: { handle: string; display_name: string } | null;
}

const GroveDesigns = () => {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<PendingDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDesign, setActionDesign] = useState<PendingDesign | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | ''>('');
  const [rejectReason, setRejectReason] = useState('');

  const fetchDesigns = async () => {
    const { data } = await supabase
      .from('cabin_designs')
      .select('*, profiles!cabin_designs_creator_id_fkey(handle, display_name)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });
    setDesigns((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDesigns(); }, []);

  const handleApprove = async (design: PendingDesign) => {
    if (!user) return;
    try {
      // If paid, create Stripe product/price via edge function
      if (design.price_cents > 0) {
        const { data, error } = await supabase.functions.invoke('create-design-stripe-price', {
          body: { designId: design.id },
        });
        if (error) console.warn('Stripe price creation deferred:', error.message);
      }

      await supabase.from('cabin_designs').update({
        status: 'published',
      }).eq('id', design.id);

      // Notify creator
      await supabase.from('notifications').insert({
        recipient_id: design.creator_id,
        notification_type: 'design_approved',
        is_delivered_in_ember: true,
      });

      toast.success(`${design.name} approved and published.`);
      setActionDesign(null);
      setActionType('');
      fetchDesigns();
    } catch {
      toast.error('Failed to approve design.');
    }
  };

  const handleReject = async (design: PendingDesign) => {
    if (!user) return;
    await supabase.from('cabin_designs').update({
      status: 'rejected',
      review_notes: rejectReason || 'Does not meet marketplace guidelines.',
    }).eq('id', design.id);

    await supabase.from('notifications').insert({
      recipient_id: design.creator_id,
      notification_type: 'design_rejected',
      is_delivered_in_ember: true,
    });

    toast.success(`${design.name} rejected.`);
    setActionDesign(null);
    setActionType('');
    setRejectReason('');
    fetchDesigns();
  };

  if (loading) return <p className="text-sm text-[hsl(var(--pine-light)/0.5)]">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-xl font-bold text-[hsl(var(--pine-pale))]">Pending Designs ({designs.length})</h1>

      {designs.length === 0 ? (
        <p className="text-sm text-[hsl(var(--pine-light)/0.4)] py-8 text-center">No designs pending review.</p>
      ) : (
        <div className="space-y-3">
          {designs.map(d => (
            <Card key={d.id} className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {d.preview_image_url ? (
                    <img src={d.preview_image_url} alt={d.name} className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-[hsl(var(--pine-mid)/0.3)] flex items-center justify-center text-2xl flex-shrink-0">🏕️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base text-[hsl(var(--pine-pale))]">{d.name}</h3>
                    <p className="text-xs text-[hsl(var(--pine-light)/0.5)] mt-0.5">
                      by {d.profiles?.handle || 'unknown'} · {d.price_cents > 0 ? `$${(d.price_cents / 100).toFixed(0)}` : 'Free'}
                      {d.is_seasonal && ` · ${d.season}`}
                    </p>
                    {d.description && (
                      <p className="text-xs text-[hsl(var(--pine-light)/0.6)] mt-2 line-clamp-2">{d.description}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => { setActionDesign(d); setActionType('approve'); }}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white">Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => { setActionDesign(d); setActionType('reject'); }}
                        className="text-xs border-red-500/30 text-red-400 hover:bg-red-400/10">Reject</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve dialog */}
      <AlertDialog open={actionType === 'approve' && !!actionDesign} onOpenChange={() => { setActionType(''); setActionDesign(null); }}>
        <AlertDialogContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[hsl(var(--pine-pale))]">Approve {actionDesign?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(var(--pine-light)/0.6)]">
              This will publish the design to the marketplace. {actionDesign?.price_cents ? 'A Stripe product will be created.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light)/0.7)]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => actionDesign && handleApprove(actionDesign)} className="bg-green-600 hover:bg-green-700">Approve</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <AlertDialog open={actionType === 'reject' && !!actionDesign} onOpenChange={() => { setActionType(''); setActionDesign(null); setRejectReason(''); }}>
        <AlertDialogContent className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[hsl(var(--pine-pale))]">Reject {actionDesign?.name}?</AlertDialogTitle>
          </AlertDialogHeader>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection…"
            className="bg-[hsl(var(--pine-darkest))] border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light))] text-sm" />
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[hsl(var(--pine-mid)/0.3)] text-[hsl(var(--pine-light)/0.7)]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => actionDesign && handleReject(actionDesign)} className="bg-destructive text-destructive-foreground">Reject</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroveDesigns;
