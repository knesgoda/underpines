import { describe, it, expect } from 'vitest';
import { isImage } from '@/hooks/usePhotos';

/**
 * This filter shipped once as `startsWith('image')`, which matched none of the
 * 25 real rows because post_media.media_type stores 'photo' and 'video' rather
 * than MIME types. The Photos surface came up empty while every signed-out
 * smoke test passed. Pinning the actual stored vocabulary here.
 */
describe('isImage', () => {
  it('accepts the value the app actually stores', () => {
    expect(isImage('photo')).toBe(true);
  });

  it('rejects video', () => {
    expect(isImage('video')).toBe(false);
  });

  it('rejects absent values rather than rendering a broken img', () => {
    expect(isImage(null)).toBe(false);
    expect(isImage(undefined)).toBe(false);
    expect(isImage('')).toBe(false);
  });

  it('accepts MIME-shaped values too, in case the convention changes', () => {
    expect(isImage('image/jpeg')).toBe(true);
    expect(isImage('image/png')).toBe(true);
  });

  it('lets an unknown type through rather than silently dropping it', () => {
    expect(isImage('gif')).toBe(true);
  });
});
