/**
 * SeasonalLayer.jsx — Seasonal overlay components for Under Pines.
 *
 * SeasonalCabinHeader: replaces the cabin header scene during active events.
 * SeasonalFeedGlyph: subtle seasonal glyph in the feed during active events.
 *
 * Usage:
 *   import { SeasonalCabinHeader, SeasonalFeedGlyph } from '@/components/seasonal/SeasonalLayer';
 *
 *   <SeasonalCabinHeader memberName="River" atmosphere="cozy">
 *     {children}
 *   </SeasonalCabinHeader>
 *
 *   <SeasonalFeedGlyph />
 */

import { useWheelOfTheYear } from '@/lib/wheelOfTheYear';
import { getMoonSVGProps } from '@/lib/astronomyUtils';
import SceneForEvent from './SeasonalScenes';
import '@/styles/SeasonalLayer.css';

// --- EXPORT 1 ---

export function SeasonalCabinHeader({ memberName, atmosphere, children }) {
  const { event, progress, moonPhase } = useWheelOfTheYear();
  const moonProps = getMoonSVGProps(new Date());

  if (!event || progress.phase === 'none') {
    return <>{children}</>;
  }

  const textColor = event.sceneConfig?.textColor === 'light' ? '#f0ece4' : '#2c4a1e';

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ minHeight: 180 }}>
      {/* Scene illustration */}
      <div
        className="seasonal-overlay absolute inset-0"
        style={{ opacity: progress.opacity }}
      >
        <SceneForEvent
          eventKey={event.key}
          width="100%"
          height="100%"
          moonProps={moonProps}
        />
      </div>

      {/* Member name overlay */}
      <div
        className="relative z-10 flex flex-col justify-end p-5"
        style={{ minHeight: 180 }}
      >
        {memberName && (
          <h2
            className="font-display text-2xl drop-shadow-sm"
            style={{ color: textColor }}
          >
            {memberName}
          </h2>
        )}
        {event.sceneConfig?.description && (
          <p
            className="font-body text-xs mt-1 opacity-80"
            style={{ color: textColor }}
          >
            {event.sceneConfig.description}
          </p>
        )}
      </div>

      {/* Pass through children (avatar, edit button, etc.) */}
      {children}
    </div>
  );
}

// --- EXPORT 2 ---

export function SeasonalFeedGlyph() {
  const { event, progress } = useWheelOfTheYear();

  if (!event || progress.phase === 'none') return null;

  return (
    <span
      className="seasonal-glyph inline-block text-lg"
      style={{ opacity: progress.opacity * 0.7 }}
      aria-hidden="true"
    >
      {event.glyph}
    </span>
  );
}
