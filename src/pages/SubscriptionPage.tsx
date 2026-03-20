import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import PineTreeLoading from '@/components/PineTreeLoading';

const MONTHLY_PRICE_ID = 'price_1TCuaNLCNzcoFWpRAk30CvqF';
const ANNUAL_PRICE_ID = 'price_1TCuaiLCNzcoFWpRb9str7XZ';

interface SubInfo {
  subscribed: boolean;
  status?: string;
  plan?: string;
  subscription_end?: string;
  cancel_at_period_end?: boolean;
}

const SubscriptionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const cancelled = searchParams.get('cancelled') === 'true';

  const checkSub = async () => {
    if (!user) return;
    const { data, error } = await supabase.functions.invoke('check-subscription');
    if (!error && data) setSub(data);
    setLoading(false);
  };

  useEffect(() => { checkSub(); }, [user]);

  const handleUpgrade = async (plan: 'monthly' | 'annual') => {
    if (!user) return;
    setActionLoading(true);
    const priceId = plan === 'monthly' ? MONTHLY_PRICE_ID : ANNUAL_PRICE_ID;
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId },
    });
    if (data?.url) {
      window.location.href = data.url;
    } else {
      toast.error('Could not start checkout. Try again.');
      setActionLoading(false);
    }
  };

  const handleManagePayment = async () => {
    setActionLoading(true);
    const { data, error } = await supabase.functions.invoke('create-portal-session');
    if (data?.url) {
      window.location.href = data.url;
    } else {
      toast.error('Could not open payment management.');
      setActionLoading(false);
    }
  };

  if (loading) return <PineTreeLoading />;

  const isActive = sub?.subscribed && sub.status === 'active';
  const isCancelled = sub?.subscribed && (sub.status === 'cancelled' || sub?.cancel_at_period_end);
  const isPastDue = sub?.status === 'past_due';
  const endDate = sub?.subscription_end ? new Date(sub.subscription_end).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-foreground mb-6">Your Subscription</h1>

      {cancelled && (
        <div className="mb-4 p-4 rounded-xl bg-muted">
          <p className="font-body text-sm text-muted-foreground">No worries. Your Cabin is still yours. Upgrade whenever you're ready.</p>
        </div>
      )}

      {/* Active subscription */}
      {isActive && !isCancelled && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌲</span>
            <div>
              <p className="font-body text-sm font-medium text-foreground">Pines+ · Active</p>
              <p className="font-body text-xs text-muted-foreground">
                Plan: {sub.plan === 'monthly' ? 'Monthly · $1/month' : 'Annual · $10/year'}
              </p>
            </div>
          </div>
          <div className="h-px bg-border" />
          <p className="font-body text-xs text-muted-foreground">Next renewal: {endDate}</p>

          <div className="flex gap-2">
            <button onClick={handleManagePayment} disabled={actionLoading} className="px-4 py-2 rounded-full border border-border font-body text-xs text-foreground hover:bg-muted disabled:opacity-50">
              Update payment method
            </button>
            <button onClick={() => setShowCancelConfirm(true)} className="px-4 py-2 rounded-full border border-border font-body text-xs text-muted-foreground hover:bg-muted">
              Cancel subscription
            </button>
          </div>
        </div>
      )}

      {/* Cancellation confirm */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-display text-lg text-foreground">Cancel your Pines+ subscription?</h2>
            <p className="font-body text-sm text-muted-foreground">
              Your Pines+ benefits continue until {endDate}. After that you'll move back to the free experience.
            </p>
            <p className="font-body text-sm text-muted-foreground">
              Your Cabin, posts, and Campfires stay exactly as they are. Always.
            </p>
            <p className="font-body text-sm text-muted-foreground">
              Your invite count will reduce to the free tier limit when your subscription ends.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm">
                Keep my Pines+
              </button>
              <button
                onClick={handleManagePayment}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-full border border-destructive/30 text-destructive font-body text-sm disabled:opacity-50"
              >
                Cancel subscription
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancelled but still in period */}
      {isCancelled && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌲</span>
            <div>
              <p className="font-body text-sm font-medium text-foreground">Pines+ · Cancels {endDate}</p>
              <p className="font-body text-xs text-muted-foreground">Your benefits are active until then.</p>
            </div>
          </div>
          <button onClick={handleManagePayment} disabled={actionLoading} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm disabled:opacity-50">
            Reactivate Pines+
          </button>
        </div>
      )}

      {/* Past due */}
      {isPastDue && (
        <div className="rounded-xl border border-destructive/30 bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-body text-sm font-medium text-foreground">Pines+ · Payment issue</p>
              <p className="font-body text-xs text-muted-foreground">Your last payment didn't go through. Your benefits are still active while we retry.</p>
            </div>
          </div>
          <button onClick={handleManagePayment} disabled={actionLoading} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm disabled:opacity-50">
            Update payment method
          </button>
        </div>
      )}

      {/* Free tier */}
      {!sub?.subscribed && !isPastDue && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="font-body text-sm text-foreground mb-1">You're on the free plan.</p>
            <p className="font-body text-xs text-muted-foreground">
              The full Under Pines experience is free. Pines+ adds a little more.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="font-body text-sm font-medium text-foreground">Monthly</p>
              <p className="font-display text-2xl text-foreground">$1<span className="text-sm font-body text-muted-foreground">/month</span></p>
              <button
                onClick={() => handleUpgrade('monthly')}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-full border border-primary text-primary font-body text-sm disabled:opacity-50 hover:bg-primary/5"
              >
                {actionLoading ? 'Loading...' : 'Upgrade'}
              </button>
            </div>
            <div className="rounded-xl border-2 border-primary bg-card p-5 space-y-3 relative">
              <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-primary text-primary-foreground font-body text-[10px] rounded-full">Best value</div>
              <p className="font-body text-sm font-medium text-foreground">Annual</p>
              <p className="font-display text-2xl text-foreground">$10<span className="text-sm font-body text-muted-foreground">/year</span></p>
              <p className="font-body text-[10px] text-muted-foreground">Less than a coffee.</p>
              <button
                onClick={() => handleUpgrade('annual')}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm disabled:opacity-50"
              >
                {actionLoading ? 'Loading...' : 'Upgrade to Pines+'}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-muted/50 p-4">
            <p className="font-body text-xs text-muted-foreground font-medium mb-2">What Pines+ includes:</p>
            <ul className="space-y-1 font-body text-xs text-muted-foreground">
              <li>🌲 8 atmospheres (vs. 3 free)</li>
              <li>🎟️ 25 invite slots (vs. 8 free)</li>
              <li>🔥 Campfire messages kept forever</li>
              <li>🧩 Widget shelf on your Cabin</li>
              <li>🔍 Campfire search (coming soon)</li>
            </ul>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/settings')} className="mt-6 font-body text-xs text-muted-foreground hover:underline">
        ← Back to Settings
      </button>
    </motion.div>
  );
};

export default SubscriptionPage;
