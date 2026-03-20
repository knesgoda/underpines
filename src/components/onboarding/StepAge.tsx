// LEGAL-REVIEW-NEEDED: Age gate component for COPPA compliance
// Consider Yoti or equivalent age verification API before public launch

import { useState, useMemo } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const StepAge = () => {
  const { setData, setStep } = useOnboarding();
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= currentYear - 100; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const daysInMonth = useMemo(() => {
    if (!month || !year) return 31;
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  }, [month, year]);

  const days = useMemo(() => {
    const arr: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [daysInMonth]);

  const calculateAge = (): { age: number; bracket: 'under_13' | '13_to_17' | '18_plus' } => {
    const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    const bracket = age < 13 ? 'under_13' : age < 18 ? '13_to_17' : '18_plus';
    return { age, bracket };
  };

  const handleContinue = async () => {
    if (!month || !day || !year) return;
    setChecking(true);

    const { bracket } = calculateAge();
    const birthYear = parseInt(year);

    // Log to audit for COPPA compliance
    try {
      await supabase.from('age_gate_audit_log' as any).insert({
        age_bracket: bracket,
        action: bracket === 'under_13' ? 'blocked' : 'passed',
        ip_hash: null, // IP hash would be set server-side in production
      });
    } catch {
      // Non-blocking audit log
    }

    if (bracket === 'under_13') {
      setBlocked(true);
      setChecking(false);
      return;
    }

    // Store age data in onboarding context (not full DOB)
    setData({ ageBracket: bracket, birthYear });
    setChecking(false);
    setStep(2); // Proceed to display name
  };

  if (blocked) {
    return (
      <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
        <div className="text-5xl">🌲</div>
        <h2 className="text-2xl font-display text-foreground">
          Under Pines is for people 13 and older.
        </h2>
        <p className="text-muted-foreground font-body text-sm leading-relaxed">
          Come back when you're ready — the fire will still be here.
        </p>
      </div>
    );
  }

  const isComplete = month && day && year;

  return (
    <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
      <h2 className="text-2xl font-display text-foreground">
        Before you find your seat by the fire — how old are you?
      </h2>

      <div className="flex gap-3 w-full max-w-xs">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="flex-1 h-12 rounded-xl border-border bg-card shadow-soft font-body text-sm">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="max-h-48">
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={day} onValueChange={setDay}>
          <SelectTrigger className="w-20 h-12 rounded-xl border-border bg-card shadow-soft font-body text-sm">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent className="max-h-48">
            {days.map(d => (
              <SelectItem key={d} value={String(d)}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-24 h-12 rounded-xl border-border bg-card shadow-soft font-body text-sm">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-48">
            {years.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleContinue}
        disabled={!isComplete || checking}
        className="rounded-pill px-8 h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
      >
        {checking ? 'Checking…' : 'Continue →'}
      </Button>

      {/* LEGAL-REVIEW-NEEDED: Links must be present before public launch */}
      <p className="text-xs text-muted-foreground font-body">
        By continuing, you agree to our{' '}
        <a href="/terms" className="underline hover:text-foreground">Terms</a>
        {' '}and{' '}
        <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
      </p>
    </div>
  );
};

export default StepAge;
