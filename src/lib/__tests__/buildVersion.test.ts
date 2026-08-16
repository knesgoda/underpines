import { describe, it, expect } from 'vitest';
import { isNewBuild } from '../buildVersion';

describe('isNewBuild', () => {
  const a = '/assets/index-aaa111.js';
  const b = '/assets/index-bbb222.js';

  it('flags a different hashed entry as a new build', () => {
    expect(isNewBuild(a, b)).toBe(true);
  });

  it('ignores the same entry, including a cache-busting query', () => {
    expect(isNewBuild(a, a)).toBe(false);
    expect(isNewBuild(a, `${a}?ping=1`)).toBe(false);
  });

  it('never fires without two real hashed entries', () => {
    // Dev server, error page or captive portal — no banner.
    expect(isNewBuild(null, b)).toBe(false);
    expect(isNewBuild(a, null)).toBe(false);
    expect(isNewBuild(a, '/src/main.tsx')).toBe(false);
  });
});
