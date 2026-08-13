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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ createSignedUrl }) } },
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
    expect(url).not.toContain('/object/public/');
    expect(url).toBeNull();
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
    expect(hook.result.current).toEqual({ url: null, loading: false, failed: false });
    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});
