import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

const GroveRevenue = () => {
  const [pinesActive, setPinesActive] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [annualCount, setAnnualCount] = useState(0);
  const [creatorFees, setCreatorFees] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [grossVol, setGrossVol] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: subs }, { data: earnings }] = await Promise.all([
        supabase.from('pines_plus_subscriptions').select('plan').eq('status', 'active'),
        supabase.from('creator_earnings').select('amount_cents, platform_fee_cents'),
      ]);

      const monthly = subs?.filter(s => s.plan === 'monthly').length ?? 0;
      const annual = subs?.filter(s => s.plan === 'annual').length ?? 0;
      setPinesActive(monthly + annual);
      setMonthlyCount(monthly);
      setAnnualCount(annual);

      const totalFees = earnings?.reduce((s, e) => s + (e.platform_fee_cents || 0), 0) ?? 0;
      const totalGross = earnings?.reduce((s, e) => s + (e.amount_cents || 0), 0) ?? 0;
      setCreatorFees(totalFees);
      setGrossVol(totalGross);
      setTransactionCount(earnings?.length ?? 0);
      setLoading(false);
    };
    load();
  }, []);

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

  if (loading) return <p className="text-sm text-[hsl(var(--pine-light)/0.5)]">Loading…</p>;

  const monthlyRev = monthlyCount * 100; // $1/mo in cents
  const annualRevMonthly = Math.round((annualCount * 1000) / 12); // $10/yr annualized monthly
  const totalMonthly = monthlyRev + annualRevMonthly + creatorFees;

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="font-display text-xl font-bold text-[hsl(var(--pine-pale))]">Revenue</h1>

      <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
        <CardContent className="p-4 space-y-2">
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(var(--amber-mid))]">Pines+</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-[hsl(var(--pine-light)/0.7)]">Active subscribers</span>
            <span className="text-[hsl(var(--pine-pale))]">{pinesActive}</span>
            <span className="text-[hsl(var(--pine-light)/0.7)]">Monthly plan</span>
            <span className="text-[hsl(var(--pine-pale))]">{monthlyCount} ({fmt(monthlyRev)}/mo)</span>
            <span className="text-[hsl(var(--pine-light)/0.7)]">Annual plan</span>
            <span className="text-[hsl(var(--pine-pale))]">{annualCount} ({fmt(annualRevMonthly)}/mo annualized)</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--pine-mid)/0.3)]">
        <CardContent className="p-4 space-y-2">
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(var(--amber-mid))]">Creator Fees (5%)</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-[hsl(var(--pine-light)/0.7)]">Transactions</span>
            <span className="text-[hsl(var(--pine-pale))]">{transactionCount}</span>
            <span className="text-[hsl(var(--pine-light)/0.7)]">Gross volume</span>
            <span className="text-[hsl(var(--pine-pale))]">{fmt(grossVol)}</span>
            <span className="text-[hsl(var(--pine-light)/0.7)]">Platform fee</span>
            <span className="text-[hsl(var(--pine-pale))]">{fmt(creatorFees)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[hsl(var(--pine-dark))] border-[hsl(var(--amber-deep)/0.2)]">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <span className="font-display text-sm font-semibold text-[hsl(var(--amber-mid))]">Estimated Monthly Total</span>
            <span className="font-display text-lg font-bold text-[hsl(var(--pine-pale))]">{fmt(totalMonthly)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroveRevenue;
