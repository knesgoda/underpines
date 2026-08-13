import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

/**
 * The 403 path for private post-media.
 *
 * Covers the two failure shapes the component distinguishes:
 *  - signing itself fails (no capability at all) -> fallback card immediately
 *  - a signature was minted but Storage answered 403 on the <img> -> one silent
 *    re-sign, then the fallback card
 * plus the manual "Try again" button, which must drop the cached signature and
 * mint a genuinely new signed URL.
 */

const createSignedUrl = vi.fn();
const createSignedUrls = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ createSignedUrl, createSignedUrls }) } },
}));

const OBJECT_PATH = 'user-1/posts/abc.jpg';

const signed = (token: string) => ({
  data: {
    signedUrl: `https://example.supabase.co/storage/v1/object/sign/post-media/${OBJECT_PATH}?token=${token}`,
  },
  error: null,
});
const denied = () => ({ data: null, error: { message: 'Object not found', status: 400 } });

const load = async () => {
  vi.resetModules();
  const mod = await import('@/components/MediaImage');
  return mod.MediaImage;
};

beforeEach(() => {
  createSignedUrl.mockReset();
  createSignedUrls.mockReset();
  sessionStorage.clear();
});

const fallback = () => document.querySelector('[data-media-state="unavailable"]');

describe('MediaImage 403 fallback', () => {
  it('shows the fallback card when a signature cannot be minted', async () => {
    createSignedUrl.mockResolvedValue(denied());
    const MediaImage = await load();

    render(<MediaImage src={OBJECT_PATH} alt="Trail photo" />);

    await waitFor(() => expect(fallback()).not.toBeNull());
    expect(screen.getByText("This photo isn't loading right now.")).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Trail photo' })).toBeInTheDocument();
    // Never leak the raw object path or a public URL to an <img>.
    expect(document.querySelector('img')).toBeNull();
  });

  it('re-signs once silently on a 403, then shows the card on the second failure', async () => {
    createSignedUrl.mockResolvedValueOnce(signed('one')).mockResolvedValueOnce(signed('two'));
    const MediaImage = await load();

    render(<MediaImage src={OBJECT_PATH} alt="Trail photo" />);

    const img = await waitFor(() => {
      const el = document.querySelector('img');
      expect(el).not.toBeNull();
      return el as HTMLImageElement;
    });
    expect(img.src).toContain('token=one');

    // Storage refuses the minted signature: first error is absorbed and re-signed.
    await act(async () => { fireEvent.error(img); });
    await waitFor(() => {
      expect((document.querySelector('img') as HTMLImageElement).src).toContain('token=two');
    });
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
    expect(fallback()).toBeNull();

    // The fresh signature is refused too -> quiet placard, no broken image.
    await act(async () => {
      fireEvent.error(document.querySelector('img') as HTMLImageElement);
    });
    await waitFor(() => expect(fallback()).not.toBeNull());
    expect(document.querySelector('img')).toBeNull();
  });

  it('"Try again" mints a new signed URL and restores the image', async () => {
    createSignedUrl
      .mockResolvedValueOnce(denied())
      .mockResolvedValueOnce(signed('fresh'));
    const MediaImage = await load();

    render(<MediaImage src={OBJECT_PATH} alt="Trail photo" />);

    await waitFor(() => expect(fallback()).not.toBeNull());

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await act(async () => { fireEvent.click(retryButton); });

    await waitFor(() => {
      const img = document.querySelector('img') as HTMLImageElement | null;
      expect(img).not.toBeNull();
      expect(img!.src).toContain('token=fresh');
    });
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
    expect(fallback()).toBeNull();
  });

  it('"Try again" drops the cached signature so a stale one is not replayed', async () => {
    createSignedUrl
      .mockResolvedValueOnce(signed('stale'))
      .mockResolvedValueOnce(signed('rotated'));
    const MediaImage = await load();

    render(<MediaImage src={OBJECT_PATH} alt="Trail photo" />);

    const img = await waitFor(() => {
      const el = document.querySelector('img') as HTMLImageElement | null;
      expect(el).not.toBeNull();
      return el!;
    });
    expect(img.src).toContain('token=stale');

    // Two errors in a row => card with a retry control.
    await act(async () => { fireEvent.error(img); });
    await waitFor(() => {
      expect((document.querySelector('img') as HTMLImageElement).src).toContain('token=rotated');
    });
    await act(async () => {
      fireEvent.error(document.querySelector('img') as HTMLImageElement);
    });
    await waitFor(() => expect(fallback()).not.toBeNull());

    createSignedUrl.mockResolvedValueOnce(signed('after-retry'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });

    await waitFor(() => {
      const el = document.querySelector('img') as HTMLImageElement | null;
      expect(el).not.toBeNull();
      expect(el!.src).toContain('token=after-retry');
    });
  });
});
