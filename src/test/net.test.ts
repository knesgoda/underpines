import { describe, it, expect } from 'vitest';
import { isPrivateIp, classifyHttpUrl } from '../../supabase/functions/_shared/net';

describe('isPrivateIp', () => {
  it('flags loopback and unspecified', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('0.0.0.0')).toBe(true);
    expect(isPrivateIp('::1')).toBe(true);
  });

  it('flags RFC1918 ranges', () => {
    expect(isPrivateIp('10.1.2.3')).toBe(true);
    expect(isPrivateIp('192.168.0.5')).toBe(true);
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('172.31.255.255')).toBe(true);
    expect(isPrivateIp('172.15.0.1')).toBe(false); // just outside the /12
    expect(isPrivateIp('172.32.0.1')).toBe(false);
  });

  it('flags cloud-metadata link-local', () => {
    expect(isPrivateIp('169.254.169.254')).toBe(true);
  });

  it('flags CGNAT and multicast', () => {
    expect(isPrivateIp('100.64.0.1')).toBe(true);
    expect(isPrivateIp('224.0.0.1')).toBe(true);
  });

  it('flags IPv6 private forms incl. v4-mapped', () => {
    expect(isPrivateIp('fe80::1')).toBe(true);
    expect(isPrivateIp('fd00::1')).toBe(true);
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
  });

  it('allows public addresses', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
    expect(isPrivateIp('93.184.216.34')).toBe(false);
  });
});

describe('classifyHttpUrl', () => {
  it('rejects non-http protocols', () => {
    expect(classifyHttpUrl('file:///etc/passwd').ok).toBe(false);
    expect(classifyHttpUrl('gopher://x').ok).toBe(false);
    expect(classifyHttpUrl('ftp://example.com').ok).toBe(false);
  });

  it('rejects garbage', () => {
    expect(classifyHttpUrl('not a url').ok).toBe(false);
  });

  it('rejects localhost and internal suffixes', () => {
    expect(classifyHttpUrl('http://localhost/x').ok).toBe(false);
    expect(classifyHttpUrl('http://db.internal/x').ok).toBe(false);
    expect(classifyHttpUrl('http://foo.local/x').ok).toBe(false);
  });

  it('rejects private IP literals directly', () => {
    expect(classifyHttpUrl('http://169.254.169.254/latest/meta-data').ok).toBe(false);
    expect(classifyHttpUrl('http://127.0.0.1:8080/').ok).toBe(false);
    expect(classifyHttpUrl('http://10.0.0.1/').ok).toBe(false);
  });

  it('accepts a public IP literal without needing DNS', () => {
    const r = classifyHttpUrl('https://8.8.8.8/');
    expect(r.ok).toBe(true);
    expect(r.hostToResolve).toBeNull();
  });

  it('defers named hosts to DNS resolution', () => {
    const r = classifyHttpUrl('https://example.com/page');
    expect(r.ok).toBe(true);
    expect(r.hostToResolve).toBe('example.com');
  });
});
