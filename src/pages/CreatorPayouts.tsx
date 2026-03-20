import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import PineTreeLoading from '@/components/PineTreeLoading';
import { ExternalLink, Download } from 'lucide-react';

const CreatorPayouts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  const connected = searchParams.get('connected') === 'true';
  const refresh = searchParams.get('refresh') === 'true';

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const [acctRes, earningsRes, payoutsRes, colRes] = await Promise.all([
      supabase.from('creator_stripe_accounts').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('creator_earnings').select('*').eq('creator_id', user.id).order('earned_at', { ascending: false }),
      supabase.from('creator_payout_summaries').select('*').eq('creator_id', user.id).order('period_end', { ascending: false }),
      supabase.from('collections').select('id, title, price_cents, price_type, is_paid').eq('author_id', user.id).eq('is_paid', true),
    ]);

    setAccount(acctRes.data);
    setEarnings(earningsRes.data || []);
    setPayouts(payoutsRes.data || []);
    setCollections(colRes.data || []);
    setLoading(false);
  };

  const startConnect = async () => {
    setActionLoading(true);
    const { data, error } = await supabase.functions.invoke('create-connect-account');
    if (data?.url) {
      window.location.href = data.url;
    } else {
      toast.error('Could not start Stripe onboarding');
      setActionLoading(false);
    }
  };

  const openStripeDashboard = async () => {
    setActionLoading(true);
    const { data, error } = await supabase.functions.invoke('create-connect-login-link');
    if (data?.url) {
      window.open(data.url, '_blank');
    } else {
      toast.error('Could not open Stripe dashboard');
    }
    setActionLoading(false);
  };

  const downloadCSV = () => {
    const rows = earnings.map(e => ({
      date: new Date(e.earned_at).toLocaleDateString(),
      amount: (e.amount_cents / 100).toFixed(2),
      platform_fee: (e.platform_fee_cents / 100).toFixed(2),
      your_earnings: (e.creator_amount_cents / 100).toFixed(2),
      status: e.status,
    }));
    const header = 'Date,Amount,Platform Fee,Your Earnings,Status\n';
    const csv = header + rows.map(r => `${r.date},$${r.amount},$${r.platform_fee},$${r.your_earnings},${r.status}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'underpines-earnings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <PineTreeLoading />;

  const isActive = account?.account_status === 'active';
  const isPending = account && account.account_status !== 'active';
  const noAccount = !account;

  const pendingEarnings = earnings.filter(e => e.status === 'pending');
  const totalPending = pendingEarnings.reduce((s, e) => s + e.creator_amount_cents, 0);

  // Get subscriber counts per collection
  const collectionEarnings = collections.map(c => {
    const colEarnings = earnings.filter(e => e.collection_id === c.id);
    const subscriberIds = new Set(colEarnings.map(e => e.subscriber_id).filter(Boolean));
    const totalEarned = colEarnings.reduce((s, e) => s + e.creator_amount_cents, 0);
    return { ...c, subscriberCount: subscriberIds.size, totalEarned };
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-foreground mb-6">Your Earnings</h1>

      {/* Connected success */}
      {connected && isActive && (
        <div className="mb-6 rounded-xl bg-primary/10 p-5 text-center">
          <p className="text-2xl mb-2">🌲</p>
          <p className="font-body text-sm text-foreground font-medium">You're all set.</p>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Your earnings will be sent to your connected account monthly.
          </p>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Minimum payout: $10 · Payout date: 1st of each month
          </p>
        </div>
      )}

      {/* No account — onboarding */}
      {noAccount && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="font-body text-sm text-foreground mb-2">Set up payouts to publish paid Collections.</p>
          <p className="font-body text-xs text-muted-foreground mb-1">
            Under Pines uses Stripe to send your earnings directly to your bank account.
          </p>
          <p className="font-body text-xs text-muted-foreground mb-4">
            You keep 95%. Under Pines keeps 5%. Payouts happen monthly.
          </p>
          <button
            onClick={startConnect}
            disabled={actionLoading}
            className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm disabled:opacity-50"
          >
            {actionLoading ? 'Loading...' : 'Connect with Stripe →'}
          </button>
        </div>
      )}

      {/* Pending account */}
      {isPending && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <p className="font-body text-sm text-foreground mb-2">Your Stripe account is {account.account_status}.</p>
          <p className="font-body text-xs text-muted-foreground mb-3">Complete your onboarding to start receiving payouts.</p>
          <button
            onClick={startConnect}
            disabled={actionLoading}
            className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm disabled:opacity-50"
          >
            {actionLoading ? 'Loading...' : 'Continue onboarding →'}
          </button>
        </div>
      )}

      {/* Active account */}
      {isActive && (
        <>
          {/* Account info */}
          <div className="rounded-xl border border-border bg-card p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="font-body text-xs text-muted-foreground">Connected account</p>
              <p className="font-body text-sm text-foreground">••••{account.stripe_account_id.slice(-4)}</p>
            </div>
            <button
              onClick={openStripeDashboard}
              disabled={actionLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border font-body text-xs text-foreground hover:bg-muted disabled:opacity-50"
            >
              Manage <ExternalLink size={12} />
            </button>
          </div>

          {/* Collections summary */}
          {collectionEarnings.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 mb-4">
              <h2 className="font-display text-sm text-foreground mb-3">Collections</h2>
              <div className="space-y-3">
                {collectionEarnings.map(c => (
                  <div key={c.id} className="flex items-start gap-3">
                    <span className="text-lg">📚</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-medium text-foreground truncate">{c.title}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        ${((c.price_cents || 0) / 100).toFixed(0)}{c.price_type === 'month' || c.price_type === 'monthly' ? '/month' : ' one-time'} · {c.subscriberCount} subscriber{c.subscriberCount !== 1 ? 's' : ''}
                      </p>
                      <p className="font-body text-xs text-foreground">${(c.totalEarned / 100).toFixed(2)} earned</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming payout */}
          {totalPending > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-4">
              <p className="font-body text-xs text-muted-foreground">Upcoming payout</p>
              <p className="font-display text-xl text-foreground">${(totalPending / 100).toFixed(2)}</p>
              <p className="font-body text-xs text-muted-foreground">
                on {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="font-body text-[10px] text-muted-foreground mt-1">After 5% platform fee</p>
            </div>
          )}

          {/* Earnings history */}
          {payouts.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-sm text-foreground">Earnings History</h2>
                <button onClick={downloadCSV} className="flex items-center gap-1 font-body text-xs text-primary hover:underline">
                  <Download size={12} /> Download CSV
                </button>
              </div>
              <div className="space-y-2">
                {payouts.map(p => {
                  const month = new Date(p.period_end).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                  return (
                    <div key={p.id} className="flex items-center justify-between py-1">
                      <span className="font-body text-sm text-foreground">{month}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-body text-sm text-foreground">${(p.creator_amount_cents / 100).toFixed(2)}</span>
                        <span className={`font-body text-[10px] ${p.status === 'paid' ? 'text-primary' : 'text-muted-foreground'}`}>
                          {p.status === 'paid' ? 'Paid ✓' : p.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {earnings.length === 0 && collections.length === 0 && (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">📚</p>
              <p className="font-body text-sm text-muted-foreground">
                No earnings yet. Publish a paid Collection to start earning.
              </p>
              <button onClick={() => navigate('/collections/new')} className="mt-3 font-body text-xs text-primary hover:underline">
                Create a Collection →
              </button>
            </div>
          )}
        </>
      )}

      <button onClick={() => navigate('/settings')} className="mt-6 font-body text-xs text-muted-foreground hover:underline">
        ← Back to Settings
      </button>
    </motion.div>
  );
};

export default CreatorPayouts;
