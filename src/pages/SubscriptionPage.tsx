import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { PackageType } from '@revenuecat/purchases-js';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import PineTreeLoading from '@/components/PineTreeLoading';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const {
    isProActive,
    customerInfo,
    offerings,
    loading,
    purchasing,
    purchase,
    presentPaywall,
    manageSubscription,
  } = useRevenueCat();
  const paywallRef = useRef<HTMLDivElement>(null);

  const handlePurchase = useCallback(async (pkg: typeof offerings[0]) => {
    try {
      await purchase(pkg);
      toast.success('Welcome to Under Pines Pro!');
    } catch {
      toast.error('Something went wrong. Try again.');
    }
  }, [purchase]);

  const handleShowPaywall = useCallback(async () => {
    if (!paywallRef.current) return;
    try {
      await presentPaywall(paywallRef.current);
      toast.success('Welcome to Under Pines Pro!');
    } catch {
      toast.error('Could not complete purchase.');
    }
  }, [presentPaywall]);

  if (loading) return <PineTreeLoading />;

  const activeEntitlement = customerInfo?.entitlements.active['Under Pines Pro'];
  const expiresDate = activeEntitlement?.expirationDate
    ? new Date(activeEntitlement.expirationDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const monthlyPkg = offerings.find(p => p.packageType === PackageType.Monthly);
  const annualPkg = offerings.find(p => p.packageType === PackageType.Annual);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-foreground mb-6">Your Subscription</h1>

      {/* Active subscription */}
      {isProActive && activeEntitlement && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌲</span>
            <div>
              <p className="font-body text-sm font-medium text-foreground">Under Pines Pro · Active</p>
              {expiresDate && (
                <p className="font-body text-xs text-muted-foreground">
                  {activeEntitlement.willRenew ? `Renews ${expiresDate}` : `Expires ${expiresDate}`}
                </p>
              )}
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="flex gap-2">
            {customerInfo?.managementURL && (
              <button
                onClick={manageSubscription}
                className="px-4 py-2 rounded-full border border-border font-body text-xs text-foreground hover:bg-muted"
              >
                Manage subscription
              </button>
            )}
          </div>
        </div>
      )}

      {/* Free tier — show offerings or paywall */}
      {!isProActive && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="font-body text-sm text-foreground mb-1">You're on the free plan.</p>
            <p className="font-body text-xs text-muted-foreground">
              The full Under Pines experience is free. Pro adds a little more.
            </p>
          </div>

          {/* RevenueCat Paywall container */}
          <div ref={paywallRef} id="rc-paywall-container" />

          {/* Show paywall button */}
          <button
            onClick={handleShowPaywall}
            disabled={purchasing}
            className="w-full py-3 rounded-full bg-primary text-primary-foreground font-body text-sm disabled:opacity-50"
          >
            {purchasing ? 'Loading...' : 'View upgrade options'}
          </button>

          {/* Manual package cards as fallback */}
          {offerings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {monthlyPkg && (
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <p className="font-body text-sm font-medium text-foreground">Monthly</p>
                  <p className="font-display text-2xl text-foreground">
                    {monthlyPkg.webBillingProduct.price.formattedPrice}
                    <span className="text-sm font-body text-muted-foreground">/month</span>
                  </p>
                  <button
                    onClick={() => handlePurchase(monthlyPkg)}
                    disabled={purchasing}
                    className="w-full py-2.5 rounded-full border border-primary text-primary font-body text-sm disabled:opacity-50 hover:bg-primary/5"
                  >
                    {purchasing ? 'Loading...' : 'Upgrade'}
                  </button>
                </div>
              )}
              {annualPkg && (
                <div className="rounded-xl border-2 border-primary bg-card p-5 space-y-3 relative">
                  <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-primary text-primary-foreground font-body text-[10px] rounded-full">Best value</div>
                  <p className="font-body text-sm font-medium text-foreground">Annual</p>
                  <p className="font-display text-2xl text-foreground">
                    {annualPkg.webBillingProduct.price.formattedPrice}
                    <span className="text-sm font-body text-muted-foreground">/year</span>
                  </p>
                  <button
                    onClick={() => handlePurchase(annualPkg)}
                    disabled={purchasing}
                    className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm disabled:opacity-50"
                  >
                    {purchasing ? 'Loading...' : 'Upgrade to Pro'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl bg-muted/50 p-4">
            <p className="font-body text-xs text-muted-foreground font-medium mb-2">What Pro includes:</p>
            <ul className="space-y-1 font-body text-xs text-muted-foreground">
              <li>🌲 8 atmospheres (vs. 3 free)</li>
              <li>🎟️ 8 invite slots (vs. 3 free)</li>
              <li>🔥 Campfire messages kept forever</li>
              <li>🧩 Widget shelf on your Cabin</li>
              <li>🌿 A quiet pine cone badge beside your name</li>
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
