import { useOnboarding } from '@/contexts/OnboardingContext';
import StepIndicator from '@/components/onboarding/StepIndicator';
import StepTransition from '@/components/onboarding/StepTransition';
import StepAge from '@/components/onboarding/StepAge';
import StepCredentials from '@/components/onboarding/StepCredentials';
import StepVerify from '@/components/onboarding/StepVerify';
import WarmGround from '@/components/layout/WarmGround';
import '@/styles/onboarding.css';

/**
 * Account creation only: age gate, credentials, verification.
 *
 * Everything about who someone *is* — name, handle, face, look, first
 * connections — now happens in the five-step welcome flow after the account
 * exists, which is what the Lovable handoff designs. Step 50 remains the
 * parental-consent hold for 13–17 accounts.
 */
const Onboarding = () => {
  const { step } = useOnboarding();

  // 1 = Age, 2 = Email + password, 3 = Verify
  const totalSteps = 3;

  return (
    <WarmGround>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {step <= totalSteps && <StepIndicator current={step} total={totalSteps} />}

        <div className="flex w-full flex-1 items-center justify-center">
          <StepTransition stepKey={step}>
            {step === 1 && <StepAge />}
            {step === 2 && <StepCredentials />}
            {step === 3 && <StepVerify />}
          </StepTransition>
        </div>
      </div>
    </WarmGround>
  );
};

export default Onboarding;
