import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

/**
 * The 403 path for private post-media.
 *
 * Covers:
 *  - signing itself fails (no capability at all) -> fallback card immediately
 *  - a signature was minted but Storage answered 403 on the <img> -> re-sign,
 *    spaced by exponential backoff, capped at MAX_RESIGN_ATTEMPTS so a
 *    permanently forbidden object can never loop
 *  - the manual "Try again" button, which clears the budget and mints a
 *    genuinely new signed URL
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
  const [{ MediaImage }, signedMedia] = await Promise.all([
    import('@/components/MediaImage'),
    import('@/lib/signedMedia'),
  ]);
  return { MediaImage, signedMedia };
};

beforeEach(() => {
  createSignedUrl.mockReset();
  createSignedUrls.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

const fallback = () => document.querySelector('[data-media-state="unavailable"]');
const img = () => document.querySelector('img') as HTMLImageElement | null;

/** Let the pending backoff timer fire and the re-sign promise settle. */
const flushBackoff = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('MediaImage 403 fallback', () => {
  it('shows the fallback card when a signature cannot be minted', async () => {
    createSignedUrl.mockResolvedValue(denied());
    const { MediaImage } = await load();

    render(<MediaImage src={OBJECT_PATH} alt="Trail photo" />);

    await waitFor(() => expect(fallback()).not.toBeNull());
    expect(screen.getByText("This photo isn't loading right now.")).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Trail photo' })).toBeInTheDocument();
    // Never leak the raw object path or a public URL to an <img>.
    expect(img()).toBeNull();
  });

  it('re-signs after a 403, and never re-signs before its backoff elapses', async () => {
    createSignedUrl.mockResolvedValueOnce(signed('one')).mockResolvedValueOnce(signed('two'));
    const { MediaImage } = await load();

    render(<MediaImage src={OBJECT_PATH} alt="Trail photo" />);
    await waitFor(() => expect(img()?.src).toContain('token=one'));

    vi.useFakeTimers();
    await act(async () => { fireEvent.error(img()!); });

    // Nothing yet — the first backoff step is 500ms.
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
    await flushBackoff(499);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);

    await flushBackoff(1);
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
    expect(img()?.src).toContain('token=two');
    expect(fallback()).toBeNull();
  });

  it('stops after MAX_RESIGN_ATTEMPTS and shows the card instead of looping', async () => {
    createSignedUrl.mockImplementation(() =>
      Promise.resolve(signed(`t${createSignedUrl.mock.calls.length}`)),
    );
    const { MediaImage, signedMedia } = await load();

    render(<MediaImage src={OBJECT_PATH} alt="Trail photo" />);
    await waitFor(() => expect(img()).not.toBeNull());

    vi.useFakeTimers();

    // Every re-signed URL is refused again. Backoff doubles: 500, 1000, 2000.
    for (const delay of [500, 1000, 2000]) {
      await act(async () => { fireEvent.error(img()!); });
      await flushBackoff(delay);
      expect(img()).not.toBeNull();
    }

    // Budget spent: the next 403 gives up rather than scheduling another re-sign.
    const callsBeforeGiveUp = createSignedUrl.mock.calls.length;
    await act(async () => { fireEvent.error(img()!); });
    expect(fallback()).not.toBeNull();


    await flushBackoff(60_000);
    expect(createSignedUrl.mock.calls.length).toBe(callsBeforeGiveUp);
    // 1 initial signature + exactly MAX_RESIGN_ATTEMPTS automatic re-signs.
    expect(callsBeforeGiveUp).toBe(1 + signedMedia.MAX_RESIGN_ATTEMPTS);
    expect(img()).toBeNull();
  });

  it('caps the backoff delay and grows it exponentially', async () => {
    const { signedMedia } = await load();
    const { resignBackoffDelay } = signedMedia;
    expect(resignBackoffDelay(1)).toBe(500);
    expect(resignBackoffDelay(2)).toBe(1000);
    expect(resignBackoffDelay(3)).toBe(2000);
    expect(resignBackoffDelay(20)).toBe(8000);
  });

  it('does not hand a remounted component a fresh re-sign budget', async () => {
    createSignedUrl.mockResolvedValue(signed('same'));
    const { MediaImage, signedMedia } = await load();

    for (let i = 0; i < signedMedia.MAX_RESIGN_ATTEMPTS; i += 1) {
      expect(signedMedia.claimSignedMediaResign(OBJECT_PATH)).not.toBeNull();
    }
    expect(signedMedia.claimSignedMediaResign(OBJECT_PATH)).toBeNull();

    render(<MediaImage src={OBJECT_PATH} alt="Trail photo" />);
    await waitFor(() => expect(img()).not.toBeNull());

    await act(async () => { fireEvent.error(img()!); });
    // Ledger is per object path and module-scoped, so this mount inherits the
    // exhausted budget and goes straight to the card.
    await waitFor(() => expect(fallback()).not.toBeNull());
  });

  it('"Try again" mints a new signed URL and restores the image', async () => {
    createSignedUrl.mockResolvedValueOnce(denied()).mockResolvedValueOnce(signed('fresh'));
    const { MediaImage } = await load();

    render(<MediaImage src={OBJECT_PATH} alt="Trail photo" />);
    await waitFor(() => expect(fallback()).not.toBeNull());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });

    await waitFor(() => expect(img()?.src).toContain('token=fresh'));
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
    expect(fallback()).toBeNull();
  });

  it('"Try again" restores the re-sign budget after it was exhausted', async () => {
    createSignedUrl.mockResolvedValue(signed('any'));
    const { MediaImage, signedMedia } = await load();

    for (let i = 0; i < signedMedia.MAX_RESIGN_ATTEMPTS; i += 1) {
      signedMedia.claimSignedMediaResign(OBJECT_PATH);
    }

    render(<MediaImage src={OBJECT_PATH} alt="Trail photo" />);
    await waitFor(() => expect(img()).not.toBeNull());
    await act(async () => { fireEvent.error(img()!); });
    await waitFor(() => expect(fallback()).not.toBeNull());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });
    await waitFor(() => expect(img()).not.toBeNull());

    // A budget is available again for this reference.
    expect(signedMedia.claimSignedMediaResign(OBJECT_PATH)).not.toBeNull();
  });
});
