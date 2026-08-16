import { describe, it, expect } from 'vitest';
import { validateAvatarFile, avatarStoragePath } from '@/components/profile/AvatarEditor';

describe('avatar file validation', () => {
  it('accepts a normal jpeg', () => {
    expect(validateAvatarFile({ size: 200_000, type: 'image/jpeg', name: 'me.jpg' })).toBeNull();
  });

  it('rejects anything over 5MB', () => {
    expect(validateAvatarFile({ size: 6 * 1024 * 1024, type: 'image/png' })).toMatch(/5MB/);
  });

  it('explains HEIC rather than saying "unsupported"', () => {
    expect(validateAvatarFile({ size: 100, type: '', name: 'IMG_1.HEIC' })).toMatch(/JPEG or PNG/);
  });

  it('rejects non-images', () => {
    expect(validateAvatarFile({ size: 100, type: 'application/pdf', name: 'a.pdf' })).toMatch(/Only JPEG/);
  });
});

describe('avatar storage path', () => {
  it('stays inside the owner folder and keeps the extension', () => {
    const path = avatarStoragePath('user-1', 'Photo.PNG', 'uuid-9', 1700000000000);
    expect(path).toBe('user-1/1700000000000-uuid-9.png');
    expect(path.split('/')[0]).toBe('user-1');
  });

  it('falls back to jpg when there is no extension', () => {
    expect(avatarStoragePath('u', 'photo', 'x', 1)).toBe('u/1-x.jpg');
  });
});
