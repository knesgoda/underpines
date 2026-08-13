import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Automated checks for post-media signed URLs.
 *
 * The server side of the rule lives in the `can_read_post_media(name)` storage
 * policy (asserted by supabase/tests/post_media_signed_url_access.sql). These
 * tests cover the client contract that pairs with it:
 *   - an allowed viewer gets a signed URL and it is reused while fresh
 *   - a denied viewer fails cleanly: no URL, `failed: true`, no raw object path
 *     or public URL ever handed to an <img> as a fallback
 *   - non-bucket sources (external, blob, data) are never signed
 */

const createSignedUrl = vi.fn();
const createSignedUrls = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ createSignedUrl, createSignedUrls }) } },
}));

const PUBLIC_URL =
  'https://example.supabase.co/storage/v1/object/public/post-media/user-1/posts/abc.jpg';
const OBJECT_PATH = 'user-1/posts/abc.jpg';

const allow = (path: string) => ({
  data: { signedUrl: `https://example.supabase.co/storage/v1/object/sign/post-media/${path}?token=t` },
  error: null,
});
const deny = () => ({ data: null, error: { message: 'Object not found', status: 400 } });

const load = async () => {
  vi.resetModules();
  return import('@/lib/signedMedia');
};

beforeEach(() => {
  createSignedUrl.mockReset();
  createSignedUrls.mockReset();
  // Signatures persist across module reloads via sessionStorage; each test
  // starts from a cold cache.
  sessionStorage.clear();
});

describe('extractPostMediaPath', () => {
  it('recovers the object path from a legacy public URL', async () => {
    const { extractPostMediaPath } = await load();
    expect(extractPostMediaPath(PUBLIC_URL)).toBe(OBJECT_PATH);
    expect(extractPostMediaPath(`${PUBLIC_URL}?width=400`)).toBe(OBJECT_PATH);
    expect(extractPostMediaPath('user%201/a b.jpg')).toBe('user%201/a b.jpg');
  });

  it('passes bare paths through and refuses foreign sources', async () => {
    const { extractPostMediaPath } = await load();
    expect(extractPostMediaPath(OBJECT_PATH)).toBe(OBJECT_PATH);
    expect(extractPostMediaPath('/user-1/posts/abc.jpg')).toBe(OBJECT_PATH);
    expect(extractPostMediaPath('https://images.example.com/x.jpg')).toBeNull();
    expect(extractPostMediaPath('blob:http://localhost/123')).toBeNull();
    expect(extractPostMediaPath('data:image/png;base64,AAAA')).toBeNull();
    expect(extractPostMediaPath(null)).toBeNull();
    expect(extractPostMediaPath(undefined)).toBeNull();
    expect(extractPostMediaPath('')).toBeNull();
  });
});

describe('getSignedMediaUrl — allowed viewer', () => {
  it('returns a signed URL for a viewer the policy permits', async () => {
    createSignedUrl.mockResolvedValue(allow(OBJECT_PATH));
    const { getSignedMediaUrl } = await load();
    const url = await getSignedMediaUrl(OBJECT_PATH);
    expect(url).toContain('/object/sign/post-media/');
    expect(url).toContain('token=');
    expect(createSignedUrl).toHaveBeenCalledWith(OBJECT_PATH, 3600);
  });

  it('reuses a fresh signature instead of re-signing', async () => {
    createSignedUrl.mockResolvedValue(allow(OBJECT_PATH));
    const { getSignedMediaUrl } = await load();
    await getSignedMediaUrl(OBJECT_PATH);
    await getSignedMediaUrl(OBJECT_PATH);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('de-duplicates concurrent requests for the same object', async () => {
    createSignedUrl.mockResolvedValue(allow(OBJECT_PATH));
    const { getSignedMediaUrl } = await load();
    const [a, b] = await Promise.all([
      getSignedMediaUrl(OBJECT_PATH),
      getSignedMediaUrl(OBJECT_PATH),
    ]);
    expect(a).toBe(b);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });
});

describe('getSignedMediaUrl — denied viewer', () => {
  it('fails cleanly when the storage policy rejects the read', async () => {
    createSignedUrl.mockResolvedValue(deny());
    const { getSignedMediaUrl } = await load();
    await expect(getSignedMediaUrl(OBJECT_PATH)).resolves.toBeNull();
  });

  it('fails cleanly when the signing request throws', async () => {
    createSignedUrl.mockRejectedValue(new Error('network down'));
    const { getSignedMediaUrl } = await load();
    await expect(getSignedMediaUrl(OBJECT_PATH)).resolves.toBeNull();
  });

  it('never caches a denial, so a later grant is picked up', async () => {
    createSignedUrl.mockResolvedValueOnce(deny()).mockResolvedValueOnce(allow(OBJECT_PATH));
    const { getSignedMediaUrl } = await load();
    expect(await getSignedMediaUrl(OBJECT_PATH)).toBeNull();
    expect(await getSignedMediaUrl(OBJECT_PATH)).toContain('/object/sign/');
  });

  it('does not fall back to the public URL for a denied object', async () => {
    createSignedUrl.mockResolvedValue(deny());
    const { getSignedMediaUrl } = await load();
    const url = await getSignedMediaUrl(OBJECT_PATH);
    expect(url).toBeNull();
    expect(String(url)).not.toContain('/object/public/');

  });
});

describe('primeSignedMediaUrls', () => {
  const PATH_A = 'user-1/posts/a.jpg';
  const PATH_B = 'user-1/posts/b.jpg';
  const batchAllow = (paths: string[]) => ({
    data: paths.map(path => ({
      path,
      error: null,
      signedUrl: `https://example.supabase.co/storage/v1/object/sign/post-media/${path}?token=t`,
    })),
    error: null,
  });

  it('signs a whole screenful in one request and later reads hit the cache', async () => {
    createSignedUrls.mockResolvedValue(batchAllow([PATH_A, PATH_B]));
    const { primeSignedMediaUrls, getSignedMediaUrl } = await load();

    primeSignedMediaUrls([PATH_A, PATH_B, PATH_A, null, 'https://images.example.com/x.jpg']);
    const [a, b] = await Promise.all([getSignedMediaUrl(PATH_A), getSignedMediaUrl(PATH_B)]);

    expect(a).toContain(`/object/sign/post-media/${PATH_A}`);
    expect(b).toContain(`/object/sign/post-media/${PATH_B}`);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls).toHaveBeenCalledWith([PATH_A, PATH_B], 3600);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('skips paths that are already cached and is a no-op when everything is', async () => {
    createSignedUrl.mockResolvedValue(allow(PATH_A));
    createSignedUrls.mockResolvedValue(batchAllow([PATH_B]));
    const { primeSignedMediaUrls, getSignedMediaUrl } = await load();

    await getSignedMediaUrl(PATH_A);
    primeSignedMediaUrls([PATH_A, PATH_B]);
    await getSignedMediaUrl(PATH_B);
    expect(createSignedUrls).toHaveBeenCalledWith([PATH_B], 3600);

    primeSignedMediaUrls([PATH_A, PATH_B]);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
  });

  it('a denied row in the batch resolves null without poisoning the others', async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        { path: PATH_A, error: 'Object not found', signedUrl: '' },
        { path: PATH_B, error: null, signedUrl: `https://example.supabase.co/storage/v1/object/sign/post-media/${PATH_B}?token=t` },
      ],
      error: null,
    });
    // The denied path falls back to the per-image request the next time around.
    createSignedUrl.mockResolvedValue(deny());
    const { primeSignedMediaUrls, getSignedMediaUrl } = await load();

    primeSignedMediaUrls([PATH_A, PATH_B]);
    expect(await getSignedMediaUrl(PATH_A)).toBeNull();
    expect(await getSignedMediaUrl(PATH_B)).toContain('/object/sign/');
  });

  it('degrades silently when the batch request itself fails', async () => {
    createSignedUrls.mockRejectedValue(new Error('network down'));
    const { primeSignedMediaUrls, getSignedMediaUrl } = await load();

    primeSignedMediaUrls([PATH_A]);
    expect(await getSignedMediaUrl(PATH_A)).toBeNull();
  });
});

describe('sessionStorage persistence', () => {
  it('a fresh signature survives a reload without re-signing', async () => {
    createSignedUrl.mockResolvedValue(allow(OBJECT_PATH));
    const first = await load();
    await first.getSignedMediaUrl(OBJECT_PATH);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);

    // Simulate a page reload: new module instance, same sessionStorage.
    const second = await load();
    const url = await second.getSignedMediaUrl(OBJECT_PATH);
    expect(url).toContain('/object/sign/');
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('invalidation clears the persisted copy too', async () => {
    createSignedUrl.mockResolvedValue(allow(OBJECT_PATH));
    const first = await load();
    await first.getSignedMediaUrl(OBJECT_PATH);
    first.invalidateSignedMediaUrl(OBJECT_PATH);

    const second = await load();
    await second.getSignedMediaUrl(OBJECT_PATH);
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });
});

describe('useSignedMediaUrl', () => {
  const render = async (input: string | null) => {
    const { renderHook, waitFor } = await import('@testing-library/react');
    const { useSignedMediaUrl } = await load();
    const hook = renderHook(() => useSignedMediaUrl(input));
    return { hook, waitFor };
  };

  it('resolves to a signed URL for an allowed viewer', async () => {
    createSignedUrl.mockResolvedValue(allow(OBJECT_PATH));
    const { hook, waitFor } = await render(PUBLIC_URL);
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.url).toContain('/object/sign/post-media/');
    expect(hook.result.current.failed).toBe(false);
  });

  it('reports failure without a URL for a denied viewer', async () => {
    createSignedUrl.mockResolvedValue(deny());
    const { hook, waitFor } = await render(PUBLIC_URL);
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.url).toBeNull();
    expect(hook.result.current.failed).toBe(true);
  });

  it('passes external sources through untouched and unsigned', async () => {
    const { hook } = await render('https://images.example.com/x.jpg');
    expect(hook.result.current.url).toBe('https://images.example.com/x.jpg');
    expect(hook.result.current.loading).toBe(false);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('treats an already-signed URL as ready', async () => {
    const signed =
      'https://example.supabase.co/storage/v1/object/sign/post-media/user-1/posts/abc.jpg?token=t';
    const { hook } = await render(signed);
    expect(hook.result.current.url).toBe(signed);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('is inert for an empty source', async () => {
    const { hook } = await render(null);
    expect(hook.result.current).toMatchObject({ url: null, loading: false, failed: false });
    expect(typeof hook.result.current.retry).toBe('function');
    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});
