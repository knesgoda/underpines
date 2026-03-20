import { useOnboarding } from '@/contexts/OnboardingContext';
import { useNavigate } from 'react-router-dom';
import StepIndicator from '@/components/onboarding/StepIndicator';
import StepTransition from '@/components/onboarding/StepTransition';
import StepDisplayName from '@/components/onboarding/StepDisplayName';
import StepHandle from '@/components/onboarding/StepHandle';
import StepEmail from '@/components/onboarding/StepEmail';
import StepPassword from '@/components/onboarding/StepPassword';
import StepVerify from '@/components/onboarding/StepVerify';
import WalkThroughWoods from '@/components/onboarding/WalkThroughWoods';
import HumanMoment from '@/components/onboarding/HumanMoment';

const Onboarding = () => {
  const { step, setStep, data } = useOnboarding();
  const navigate = useNavigate();

  // Steps 6-8 are full-screen experiences
  if (step === 6) {
    return <WalkThroughWoods onComplete={() => setStep(7)} />;
  }

  if (step === 8) {
    return (
      <HumanMoment
        inviterName={data.inviterName}
        inviteeCount={3}
        onEnter={() => navigate('/cabin')}
      />
    );
  }

  // Step 7 redirects to cabin with setup mode
  if (step === 7) {
    // Show a brief transition then go to cabin
    navigate('/cabin?setup=true');
    return null;
  }

  return (
    <div className="fixed inset-0 overflow-auto" style={{ background: 'linear-gradient(180deg, #052e16 0%, #14532d 40%, #052e16 100%)' }}>
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
        {/* Step indicator — only for steps 1-5 */}
        {step <= 5 && <StepIndicator current={step} total={5} />}

        <div className="flex-1 flex items-center justify-center w-full">
          <StepTransition stepKey={step}>
            {step === 1 && <StepDisplayName />}
            {step === 2 && <StepHandle />}
            {step === 3 && <StepEmail />}
            {step === 4 && <StepPassword />}
            {step === 5 && <StepVerify />}
          </StepTransition>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
