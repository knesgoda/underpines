// LEGAL-REVIEW-NEEDED: Existing user age verification interstitial

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface AgeGateInterstitialProps {
  onComplete: () => void;
}

const AgeGateInterstitial = ({ onComplete }: AgeGateInterstitialProps) => {
  const { user } = useAuth();
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);

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

  const calculateBracket = (): 'under_13' | '13_to_17' | '18_plus' => {
    const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 13 ? 'under_13' : age < 18 ? '13_to_17' : '18_plus';
  };

  const handleSubmit = async () => {
    if (!month || !day || !year || !user) return;
    setSaving(true);

    const bracket = calculateBracket();

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          age_bracket: bracket,
          birth_year: parseInt(year),
          is_age_verified: true,
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      // LEGAL-REVIEW-NEEDED: If minor, trigger parental consent & restrictions
      if (bracket === '13_to_17') {
        toast('Minor account detected. Parental consent may be required.');
      }

      onComplete();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isComplete = month && day && year;

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 max-w-md mx-auto text-center">
        <div className="text-4xl">🌲</div>
        <h2 className="text-2xl font-display text-foreground">
          We're adding a quick age check to keep the Pines safe.
        </h2>
        <p className="text-muted-foreground font-body text-sm">
          How old are you?
        </p>

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
          onClick={handleSubmit}
          disabled={!isComplete || saving}
          className="rounded-pill px-8 h-12 text-base font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
        >
          {saving ? 'Saving…' : 'Continue →'}
        </Button>
      </div>
    </div>
  );
};

export default AgeGateInterstitial;
