import { useOnboarding } from '@/contexts/OnboardingContext';
import { useNavigate } from 'react-router-dom';
import StepIndicator from '@/components/onboarding/StepIndicator';
import StepTransition from '@/components/onboarding/StepTransition';
import StepAge from '@/components/onboarding/StepAge';
import StepDisplayName from '@/components/onboarding/StepDisplayName';
import StepHandle from '@/components/onboarding/StepHandle';
import StepEmail from '@/components/onboarding/StepEmail';
import StepPassword from '@/components/onboarding/StepPassword';
import StepVerify from '@/components/onboarding/StepVerify';
import StepParentalConsent from '@/components/onboarding/StepParentalConsent';
import WalkThroughWoods from '@/components/onboarding/WalkThroughWoods';
import HumanMoment from '@/components/onboarding/HumanMoment';

const Onboarding = () => {
  const { step, setStep, data } = useOnboarding();
  const navigate = useNavigate();

  // Steps 7-9 are full-screen experiences
  if (step === 7) {
    return <WalkThroughWoods onComplete={() => setStep(8)} />;
  }

  if (step === 9) {
    return (
      <HumanMoment
        inviterName={data.inviterName}
        inviteeCount={3}
        onEnter={() => navigate('/cabin')}
      />
    );
  }

  // Step 8 redirects to cabin with setup mode
  if (step === 8) {
    navigate('/cabin?setup=true');
    return null;
  }

  // Step 50 is parental consent waiting screen (13-17)
  if (step === 50) {
    return (
      <div className="fixed inset-0 overflow-auto" style={{ background: 'linear-gradient(180deg, #052e16 0%, #14532d 40%, #052e16 100%)', height: '100dvh' }}>
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
          <StepParentalConsent />
        </div>
      </div>
    );
  }

  // Total form steps: 1=Age, 2=Name, 3=Handle, 4=Email, 5=Password, 6=Verify
  const totalSteps = 6;

  return (
    <div className="fixed inset-0 overflow-auto" style={{ background: 'linear-gradient(180deg, #052e16 0%, #14532d 40%, #052e16 100%)', height: '100dvh' }}>
      {/* Subtle forest background */}
      <div className="absolute inset-0 opacity-10">
        {[15, 35, 55, 75, 90].map((x, i) => (
          <svg
            key={i}
            className="absolute bottom-0"
            style={{ left: `${x}%` }}
            width="50"
            height="120"
            viewBox="0 0 50 120"
          >
            <path d="M25 10 L8 70 L42 70 Z" fill="#dcfce7" opacity="0.3" />
            <path d="M25 30 L4 95 L46 95 Z" fill="#dcfce7" opacity="0.2" />
            <rect x="22" y="95" width="6" height="25" fill="#fef3c7" opacity="0.15" />
          </svg>
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {step <= totalSteps && <StepIndicator current={step} total={totalSteps} />}

        <div className="flex-1 flex items-center justify-center w-full">
          <StepTransition stepKey={step}>
            {step === 1 && <StepAge />}
            {step === 2 && <StepDisplayName />}
            {step === 3 && <StepHandle />}
            {step === 4 && <StepEmail />}
            {step === 5 && <StepPassword />}
            {step === 6 && <StepVerify />}
          </StepTransition>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
