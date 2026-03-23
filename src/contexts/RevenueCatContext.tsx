import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import Purchases, { type CustomerInfo, type Package, type PurchasesError, ErrorCode } from '@revenuecat/purchases-js';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const RC_API_KEY = 'test_yDcyukMSOIftLUVEMPyBENdGhaN';
const ENTITLEMENT_ID = 'Under Pines Pro';

interface RevenueCatContextType {
  isProActive: boolean;
  customerInfo: CustomerInfo | null;
  offerings: Package[];
  loading: boolean;
  purchasing: boolean;
  purchase: (pkg: Package) => Promise<void>;
  presentPaywall: (container: HTMLElement) => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  manageSubscription: () => void;
}

const RevenueCatContext = createContext<RevenueCatContextType>({
  isProActive: false,
  customerInfo: null,
  offerings: [],
  loading: true,
  purchasing: false,
  purchase: async () => {},
  presentPaywall: async () => {},
  refreshCustomerInfo: async () => {},
  manageSubscription: () => {},
});

export const useRevenueCat = () => useContext(RevenueCatContext);

export const RevenueCatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize SDK when user changes
  useEffect(() => {
    if (!user) {
      setCustomerInfo(null);
      setOfferings([]);
      setLoading(false);
      setInitialized(false);
      return;
    }

    try {
      Purchases.configure({
        apiKey: RC_API_KEY,
        appUserId: user.id,
      });
      setInitialized(true);
    } catch (e) {
      console.error('[RevenueCat] Configuration error:', e);
      setLoading(false);
    }
  }, [user]);

  // Fetch customer info and offerings after init
  useEffect(() => {
    if (!initialized) return;

    const fetchData = async () => {
      try {
        const [info, offeringsResult] = await Promise.all([
          Purchases.getSharedInstance().getCustomerInfo(),
          Purchases.getSharedInstance().getOfferings(),
        ]);

        setCustomerInfo(info);

        if (offeringsResult.current?.availablePackages) {
          setOfferings(offeringsResult.current.availablePackages);
        }
      } catch (e) {
        console.error('[RevenueCat] Fetch error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialized]);

  // Sync entitlement status to Supabase profile
  const syncEntitlementToProfile = useCallback(async (info: CustomerInfo) => {
    if (!user) return;
    const isActive = ENTITLEMENT_ID in info.entitlements.active;
    await supabase
      .from('profiles')
      .update({ is_pines_plus: isActive })
      .eq('id', user.id);
  }, [user]);

  // Sync whenever customerInfo changes
  useEffect(() => {
    if (customerInfo) {
      syncEntitlementToProfile(customerInfo);
    }
  }, [customerInfo, syncEntitlementToProfile]);

  const isProActive = customerInfo
    ? ENTITLEMENT_ID in customerInfo.entitlements.active
    : false;

  const refreshCustomerInfo = useCallback(async () => {
    if (!initialized) return;
    try {
      const info = await Purchases.getSharedInstance().getCustomerInfo();
      setCustomerInfo(info);
    } catch (e) {
      console.error('[RevenueCat] Refresh error:', e);
    }
  }, [initialized]);

  // Re-check on window focus
  useEffect(() => {
    if (!initialized) return;
    const onFocus = () => refreshCustomerInfo();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [initialized, refreshCustomerInfo]);

  const purchase = useCallback(async (pkg: Package) => {
    if (!initialized) return;
    setPurchasing(true);
    try {
      const result = await Purchases.getSharedInstance().purchase({ rcPackage: pkg });
      setCustomerInfo(result.customerInfo);
    } catch (e: any) {
      if (e?.errorCode === ErrorCode.UserCancelledError) {
        // User cancelled — do nothing
      } else {
        console.error('[RevenueCat] Purchase error:', e);
        throw e;
      }
    } finally {
      setPurchasing(false);
    }
  }, [initialized]);

  const presentPaywall = useCallback(async (container: HTMLElement) => {
    if (!initialized) return;
    setPurchasing(true);
    try {
      const result = await Purchases.getSharedInstance().presentPaywall({
        htmlTarget: container,
      });
      setCustomerInfo(result.customerInfo);
    } catch (e: any) {
      if (e?.errorCode === ErrorCode.UserCancelledError) {
        // User cancelled
      } else {
        console.error('[RevenueCat] Paywall error:', e);
        throw e;
      }
    } finally {
      setPurchasing(false);
    }
  }, [initialized]);

  const manageSubscription = useCallback(() => {
    if (!customerInfo) return;
    // RevenueCat Web SDK manages subscriptions through the management URL
    const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    if (activeEntitlement?.managementURL) {
      window.open(activeEntitlement.managementURL, '_blank');
    }
  }, [customerInfo]);

  return (
    <RevenueCatContext.Provider value={{
      isProActive,
      customerInfo,
      offerings,
      loading,
      purchasing,
      purchase,
      presentPaywall,
      refreshCustomerInfo,
      manageSubscription,
    }}>
      {children}
    </RevenueCatContext.Provider>
  );
};
