/**
 * CabinScene — Fully illustrated header for every Cabin page.
 * 10 compositing layers stacked by z-index, filled in subsequent prompts.
 * Phase 1: sky-gradient (Layer 1) + atmosphere-wash (Layer 9) + member name.
 */

import { useMemo } from 'react';

type TimeOfDay = 'night' | 'dawn' | 'morning' | 'afternoon' | 'golden-hour' | 'dusk';

interface CabinSceneProps {
  memberName: string;
  atmosphere?: string;
  timeOfDay?: TimeOfDay;
}

const SKY_GRADIENTS: Record<TimeOfDay, string> = {
  night:        'linear-gradient(to bottom, #0c1445, #1a1a3e)',
  dawn:         'linear-gradient(to bottom, #1a1a3e, #f4a460, #87ceeb)',
  morning:      'linear-gradient(to bottom, #87ceeb, #b0d4f1)',
  afternoon:    'linear-gradient(to bottom, #87ceeb, #6bb3e0)',
  'golden-hour':'linear-gradient(to bottom, #f4a460, #e8734a, #8b4789)',
  dusk:         'linear-gradient(to bottom, #8b4789, #2d1b4e, #0c1445)',
};

const LAYER_NAMES = [
  'sky-gradient',
  'background-landscape',
  'celestial-bodies',
  'cloud-layer',
  'midground-trees',
  'precipitation',
  'creature-layer',
  'foreground-elements',
  'atmosphere-wash',
  'ambient-particles',
] as const;

const layerBase = 'absolute inset-0 w-full h-full';

const CabinScene = ({ memberName, atmosphere = 'morning-mist', timeOfDay = 'morning' }: CabinSceneProps) => {
  const skyGradient = SKY_GRADIENTS[timeOfDay] ?? SKY_GRADIENTS.morning;

  const atmosphereTint = useMemo(() => {
    // Default: Morning Mist
    return { tint: '#dcfce7', opacity: 0.08 };
  }, [atmosphere]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{ aspectRatio: 'var(--cabin-scene-ratio, 3/1)' }}
    >
      <style>{`
        @media (max-width: 767px) {
          :root { --cabin-scene-ratio: 2/1; }
        }
        @media (min-width: 768px) {
          :root { --cabin-scene-ratio: 3/1; }
        }
      `}</style>

      {/* Layer 1: sky-gradient */}
      <div
        className={layerBase}
        style={{ zIndex: 1, background: skyGradient, pointerEvents: 'none' }}
        data-layer="sky-gradient"
      />

      {/* Layer 2: background-landscape */}
      <div className={layerBase} style={{ zIndex: 2, pointerEvents: 'none' }} data-layer="background-landscape" />

      {/* Layer 3: celestial-bodies */}
      <div className={layerBase} style={{ zIndex: 3, pointerEvents: 'none' }} data-layer="celestial-bodies" />

      {/* Layer 4: cloud-layer */}
      <div className={layerBase} style={{ zIndex: 4, pointerEvents: 'none' }} data-layer="cloud-layer" />

      {/* Layer 5: midground-trees */}
      <div className={layerBase} style={{ zIndex: 5, pointerEvents: 'none' }} data-layer="midground-trees" />

      {/* Layer 6: precipitation */}
      <div className={layerBase} style={{ zIndex: 6, pointerEvents: 'none' }} data-layer="precipitation" />

      {/* Layer 7: creature-layer (may need interaction) */}
      <div className={layerBase} style={{ zIndex: 7 }} data-layer="creature-layer" />

      {/* Layer 8: foreground-elements */}
      <div className={layerBase} style={{ zIndex: 8, pointerEvents: 'none' }} data-layer="foreground-elements" />

      {/* Layer 9: atmosphere-wash */}
      <div
        className={layerBase}
        style={{
          zIndex: 9,
          pointerEvents: 'none',
          backgroundColor: atmosphereTint.tint,
          opacity: atmosphereTint.opacity,
        }}
        data-layer="atmosphere-wash"
      />

      {/* Layer 10: ambient-particles */}
      <div className={layerBase} style={{ zIndex: 10, pointerEvents: 'none' }} data-layer="ambient-particles" />

      {/* Member name overlay */}
      <div
        className="absolute bottom-0 left-0 px-5 pb-4"
        style={{ zIndex: 11 }}
      >
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 22,
            fontWeight: 300,
            color: '#ffffff',
            textShadow: '0 1px 4px rgba(0,0,0,0.45)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {memberName}
        </h2>
      </div>
    </div>
  );
};

export default CabinScene;
