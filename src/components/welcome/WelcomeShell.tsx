import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import WarmGround from '@/components/layout/WarmGround';

export const WELCOME_STEPS = 5;

/**
 * Frame for the five welcome steps. Matches the handoff's centred card on the
 * warm ground, with its "STEP n OF 5" eyebrow and dotted progress rail.
 */
export const WelcomeShell = ({
  step,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  step: number;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <WarmGround>
    <div className="welcome-screen min-h-screen">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="onboarding-step"
      >
        <div className="step-dots" aria-hidden="true">
          {Array.from({ length: WELCOME_STEPS }, (_, i) => (
            <i key={i} className={i < step ? 'done' : undefined}>{i + 1}</i>
          ))}
        </div>

        <p className="sr-only">Step {step} of {WELCOME_STEPS}</p>
        <span className="eyebrow">Step {step} of {WELCOME_STEPS} · {eyebrow}</span>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}

        {children}
      </motion.div>
    </div>
  </WarmGround>
);

export default WelcomeShell;
