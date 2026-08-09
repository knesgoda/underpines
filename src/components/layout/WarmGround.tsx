import type { ReactNode } from 'react';

/**
 * The logged-out ground: the handoff's cream page with a low sun glow behind
 * the top of the fold. Replaces the full-bleed WeatherScene that the landing,
 * sign-in and invite pages used to render, which was the last thing outside
 * components/cabin holding the scene system in place.
 *
 * Both the ground and the glow come from role tokens, so this reads correctly
 * in dark as well — a faint ember above the fold instead of a pale sun.
 */
export const WarmGround = ({ children }: { children: ReactNode }) => (
  <div
    className="fixed inset-0 overflow-y-auto bg-background"
    style={{
      backgroundImage:
        'radial-gradient(circle at 50% -180px, hsl(var(--accent) / 0.38) 0, transparent 36%)',
    }}
  >
    {children}
  </div>
);

export default WarmGround;
