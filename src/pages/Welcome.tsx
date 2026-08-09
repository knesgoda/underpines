import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PineTreeLoading from '@/components/PineTreeLoading';
import WarmGround from '@/components/layout/WarmGround';
import StepParentalConsent from '@/components/onboarding/StepParentalConsent';
import WelcomeName from '@/components/welcome/WelcomeName';
import WelcomeAvatar from '@/components/welcome/WelcomeAvatar';
import WelcomeCorner from '@/components/welcome/WelcomeCorner';
import WelcomePeople from '@/components/welcome/WelcomePeople';
import WelcomeDone from '@/components/welcome/WelcomeDone';
import '@/styles/onboarding.css';

/**
 * The five-step welcome flow, run once after an account exists.
 *
 * Every step writes straight to the signed-in user's profile, so progress
 * survives a closed tab — the guard in AppLayout returns people here until
 * step 5 stamps onboarding_completed_at.
 *
 * 13-17 accounts pass through step 1 and are then held for parental consent
 * rather than continuing. Doing the name first is deliberate: it is what lets
 * the note to the parent say which child is asking. Because
 * onboarding_completed_at stays null throughout, a held account cannot reach
 * the app.
 */
const Welcome = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<{ display_name: string; account_status: string | null } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) { setLoadingProfile(false); return; }
    let cancelled = false;

    supabase
      .from('profiles')
      .select('display_name, account_status')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data);
        setLoadingProfile(false);
      });

    return () => { cancelled = true; };
  }, [user, step]);

  if (loading || loadingProfile) return <PineTreeLoading />;
  if (!user) return <Navigate to="/login" replace />;

  const awaitingConsent = profile?.account_status === 'pending_parental_consent';

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => Math.max(1, s - 1));

  if (step === 1) return <WelcomeName onNext={next} />;

  if (awaitingConsent) {
    return (
      <WarmGround>
        <div className="welcome-screen min-h-screen">
          <StepParentalConsent
            childDisplayName={profile?.display_name || 'Your child'}
            childEmail={user.email || ''}
          />
        </div>
      </WarmGround>
    );
  }

  switch (step) {
    case 2:
      return <WelcomeAvatar onNext={next} onBack={back} />;
    case 3:
      return <WelcomeCorner onNext={next} onBack={back} />;
    case 4:
      return <WelcomePeople onNext={next} onBack={back} />;
    default:
      return <WelcomeDone onFinish={() => navigate('/', { replace: true })} />;
  }
};

export default Welcome;
