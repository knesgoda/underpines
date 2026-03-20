import { ReactNode } from 'react';

interface StepIndicatorProps {
  current: number;
  total: number;
}

const PineNeedle = ({ state }: { state: 'past' | 'current' | 'future' }) => {
  const opacityMap = {
    past: 'opacity-30',
    current: 'opacity-100',
    future: 'opacity-10',
  };

  return (
    <svg
      width="16"
      height="24"
      viewBox="0 0 16 24"
      className={`transition-opacity duration-500 ${opacityMap[state]}`}
    >
      <path
        d="M8 2 L5 14 L8 22 L11 14 Z"
        fill="hsl(var(--pine-dark))"
      />
    </svg>
  );
};

const StepIndicator = ({ current, total }: StepIndicatorProps) => {
  return (
    <div className="flex items-center gap-2 justify-center py-6">
      {Array.from({ length: total }, (_, i) => {
        const state = i < current - 1 ? 'past' : i === current - 1 ? 'current' : 'future';
        return <PineNeedle key={i} state={state} />;
      })}
    </div>
  );
};

export default StepIndicator;
