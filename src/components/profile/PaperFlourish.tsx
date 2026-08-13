/**
 * Pencil-line decoration for the paper sections: a pine and a small cabin.
 *
 * Inline SVG rather than image assets so they inherit the page's ink colour and
 * cost nothing to load. Both are `aria-hidden` — a screen reader announcing
 * "decorative pine tree" on every profile is noise, not information.
 */

const stroke = 'hsl(var(--foreground) / 0.16)';

export const PineFlourish = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 60 120"
    fill="none"
    stroke={stroke}
    strokeWidth="1.1"
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M30 8v104" />
    <path d="M30 14 16 34h28L30 14Z" />
    <path d="M30 32 12 58h36L30 32Z" />
    <path d="M30 52 8 84h44L30 52Z" />
    <path d="M22 112h16" />
  </svg>
);

export const CabinFlourish = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 160 110"
    fill="none"
    stroke={stroke}
    strokeWidth="1.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M14 96h132" />
    <path d="M40 96V52l38-26 38 26v44" />
    <path d="M32 54l46-32 46 32" />
    <path d="M66 96V72h24v24" />
    <path d="M98 62h14v14H98z" />
    <path d="M104 34v-14h10v20" />
    <path d="M104 20c2-6 6-8 8-12" />
    <path d="M18 96V66l10-14 10 14v30" />
    <path d="M24 60l4-8 4 8" />
    <path d="M136 96V70l8-12 8 12v26" />
  </svg>
);
