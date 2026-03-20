import React, { createContext, useContext, useState, ReactNode } from 'react';

interface OnboardingData {
  inviteId: string | null;
  inviteSlug: string | null;
  inviterName: string | null;
  inviterHandle: string | null;
  ipHash: string | null;
  displayName: string;
  handle: string;
  email: string;
  password: string;
  phone: string;
}

interface OnboardingContextType {
  data: OnboardingData;
  setData: (updates: Partial<OnboardingData>) => void;
  step: number;
  setStep: (step: number) => void;
}

const defaultData: OnboardingData = {
  inviteId: null,
  inviteSlug: null,
  inviterName: null,
  inviterHandle: null,
  ipHash: null,
  displayName: '',
  handle: '',
  email: '',
  password: '',
  phone: '',
};

const OnboardingContext = createContext<OnboardingContextType>({
  data: defaultData,
  setData: () => {},
  step: 1,
  setStep: () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [data, setDataState] = useState<OnboardingData>(defaultData);
  const [step, setStep] = useState(1);

  const setData = (updates: Partial<OnboardingData>) => {
    setDataState(prev => ({ ...prev, ...updates }));
  };

  return (
    <OnboardingContext.Provider value={{ data, setData, step, setStep }}>
      {children}
    </OnboardingContext.Provider>
  );
};
