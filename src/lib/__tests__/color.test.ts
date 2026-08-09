import { describe, it, expect } from 'vitest';
import { contrastRatio, hexToHslTriplet, hslTripletToHex } from '@/lib/color';

/**
 * The customizer's colour inputs give hex; the design tokens are bare HSL
 * triplets. A page saved with the wrong conversion looks fine in the preview
 * and wrong to everyone else, so the round trip is worth pinning down.
 */
describe('hexToHslTriplet', () => {
  it('converts the handoff palette', () => {
    expect(hexToHslTriplet('#e65f3c')).toBe('12 77% 57%');
    expect(hexToHslTriplet('#fff8e9')).toBe('41 100% 96%');
    expect(hexToHslTriplet('#172033')).toBe('221 38% 15%');
  });

  it('handles greys, where hue is undefined', () => {
    expect(hexToHslTriplet('#000000')).toBe('0 0% 0%');
    expect(hexToHslTriplet('#ffffff')).toBe('0 0% 100%');
    expect(hexToHslTriplet('#808080')).toBe('0 0% 50%');
  });

  it('accepts shorthand and a missing hash', () => {
    expect(hexToHslTriplet('#fff')).toBe('0 0% 100%');
    expect(hexToHslTriplet('e65f3c')).toBe('12 77% 57%');
  });

  it('rejects anything that is not a hex colour', () => {
    expect(hexToHslTriplet('rebeccapurple')).toBeNull();
    expect(hexToHslTriplet('')).toBeNull();
    expect(hexToHslTriplet('#12345')).toBeNull();
  });
});

describe('hslTripletToHex', () => {
  /**
   * Triplets are rounded to whole degrees and percents so they match the token
   * format in index.css, so the round trip is visually exact rather than bit
   * exact. The bound is derived, not picked: half a degree of hue at full
   * saturation moves a channel by 255 × 0.5/60 ≈ 2.1, and half a percent of
   * lightness adds ~1.3, so 3 is the worst case. Anything larger is a real
   * conversion bug and this still catches it.
   */
  const TOLERANCE = 3;

  it('round-trips the palette to within a step or two per channel', () => {
    const channels = (hex: string) =>
      [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

    for (const hex of ['#e65f3c', '#fff8e9', '#172033', '#355e58', '#f4a23f']) {
      const triplet = hexToHslTriplet(hex);
      expect(triplet).not.toBeNull();

      const back = hslTripletToHex(triplet!);
      expect(back).not.toBeNull();
      channels(back!).forEach((v, i) => {
        expect(Math.abs(v - channels(hex)[i])).toBeLessThanOrEqual(TOLERANCE);
      });
    }
  });

  it('round-trips greys and the extremes exactly', () => {
    for (const hex of ['#000000', '#ffffff', '#808080']) {
      expect(hslTripletToHex(hexToHslTriplet(hex)!)).toBe(hex);
    }
  });

  it('rejects a malformed triplet, so a bad stored value seeds the default', () => {
    expect(hslTripletToHex('')).toBeNull();
    expect(hslTripletToHex('#e65f3c')).toBeNull();
    expect(hslTripletToHex('12 77 57')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('reports the extremes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('passes the default page and fails an unreadable one', () => {
    // ink on paper — what a page ships with
    expect(contrastRatio('#172033', '#fffdf7')!).toBeGreaterThan(4.5);
    // the classic 2006 mistake
    expect(contrastRatio('#f4a23f', '#fff8e9')!).toBeLessThan(4.5);
  });

  it('is order independent', () => {
    expect(contrastRatio('#172033', '#fff8e9')).toBe(contrastRatio('#fff8e9', '#172033'));
  });
});
