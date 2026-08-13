import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The whole point of this module is that diagnostics never leak a capability.
 * These tests are the contract: whatever goes in, nothing that comes out can
 * be replayed as a URL or read as a member's raw object path.
 */

const invoke = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke } },
}));

const SIGNED_URL =
  'https://example.supabase.co/storage/v1/object/sign/post-media/8f1c-user/posts/abc.jpg?token=eyJhbGciOi.secret.sig';
const PUBLIC_URL =
  'https://example.supabase.co/storage/v1/object/public/post-media/8f1c-user/posts/abc.jpg';
const OBJECT_PATH = '8f1c-user/posts/abc.jpg';

const load = async () => {
  vi.resetModules();
  return import('@/lib/mediaTelemetry');
};

beforeEach(() => {
  invoke.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('redactMediaRef', () => {
  it('reduces every input shape to the same safe reference', async () => {
    const { redactMediaRef } = await load();
    const fromPath = redactMediaRef(OBJECT_PATH);

    expect(redactMediaRef(SIGNED_URL)).toBe(fromPath);
    expect(redactMediaRef(PUBLIC_URL)).toBe(fromPath);
    expect(fromPath).toMatch(/^post-media\/u:[0-9a-f]{4}\/posts\/[0-9a-f]{8}\.jpg$/);
  });

  it('never emits a token, a URL or the raw path', async () => {
    const { redactMediaRef, isSafeToLog } = await load();
    for (const input of [SIGNED_URL, PUBLIC_URL, OBJECT_PATH, null, undefined, '']) {
      const ref = redactMediaRef(input);
      expect(isSafeToLog(ref)).toBe(true);
      expect(ref).not.toContain('token');
      expect(ref).not.toContain('secret');
      expect(ref).not.toContain('8f1c-user');
      expect(ref).not.toContain('abc.jpg');
      expect(ref).not.toContain('https');
    }
  });

  it('is stable per object and distinct across objects', async () => {
    const { redactMediaRef } = await load();
    expect(redactMediaRef(OBJECT_PATH)).toBe(redactMediaRef(OBJECT_PATH));
    expect(redactMediaRef(OBJECT_PATH)).not.toBe(redactMediaRef('8f1c-user/posts/def.jpg'));
    // Different owners get different owner buckets.
    expect(redactMediaRef('other-user/posts/abc.jpg')).not.toBe(redactMediaRef(OBJECT_PATH));
  });
});

describe('logMediaFailure', () => {
  it('warns locally and reports a redacted payload to the server', async () => {
    const { logMediaFailure, isSafeToLog } = await load();

    const event = logMediaFailure(SIGNED_URL, 'fetch_forbidden', { attempt: 2 });

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls[0])).not.toContain('token=');

    expect(invoke).toHaveBeenCalledWith('log-media-access-failure', { body: event });
    expect(event).toEqual({ reason: 'fetch_forbidden', ref: event.ref, attempt: 2, kind: 'photo' });
    expect(isSafeToLog(event.ref)).toBe(true);
    expect(JSON.stringify(invoke.mock.calls[0])).not.toContain('secret');
  });

  it('reports a given reference+reason once per session', async () => {
    const { logMediaFailure } = await load();

    logMediaFailure(OBJECT_PATH, 'gave_up');
    logMediaFailure(SIGNED_URL, 'gave_up');
    expect(invoke).toHaveBeenCalledTimes(1);

    // A different reason for the same object is still worth one report.
    logMediaFailure(OBJECT_PATH, 'sign_failed');
    expect(invoke).toHaveBeenCalledTimes(2);

    // Console keeps every occurrence for local debugging.
    expect(console.warn).toHaveBeenCalledTimes(3);
  });

  it('never throws when the telemetry call fails', async () => {
    invoke.mockRejectedValueOnce(new Error('offline'));
    const { logMediaFailure } = await load();
    expect(() => logMediaFailure(OBJECT_PATH, 'sign_failed')).not.toThrow();
  });
});
