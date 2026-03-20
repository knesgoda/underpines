import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StepTransitionProps {
  children: ReactNode;
  stepKey: number;
}

const StepTransition = ({ children, stepKey }: StepTransitionProps) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default StepTransition;
