import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  isValidEmailSyntax,
  emailDomain,
  isDisposableDomain,
  scoreSignupRisk,
  normalizeContentForHash,
  severityPoints,
  DEFAULT_THRESHOLDS,
  type RiskSignal,
} from '../../supabase/functions/_shared/trust-core';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Kevin@Example.COM  ')).toBe('kevin@example.com');
  });

  it('preserves plus-aliases (spec §13)', () => {
    expect(normalizeEmail('kevin+underpines@gmail.com')).toBe('kevin+underpines@gmail.com');
  });

  it('handles null-ish input without throwing', () => {
    expect(normalizeEmail(undefined as unknown as string)).toBe('');
  });
});

describe('isValidEmailSyntax', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmailSyntax('alice@example.com')).toBe(true);
    expect(isValidEmailSyntax('a.b+tag@sub.domain.co')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmailSyntax('not-an-email')).toBe(false);
    expect(isValidEmailSyntax('a@b')).toBe(false);
    expect(isValidEmailSyntax('a b@example.com')).toBe(false);
    expect(isValidEmailSyntax('')).toBe(false);
  });
});

describe('emailDomain', () => {
  it('extracts the domain', () => {
    expect(emailDomain('Alice@Example.COM')).toBe('example.com');
  });
  it('returns empty for garbage', () => {
    expect(emailDomain('nope')).toBe('');
  });
});

describe('isDisposableDomain', () => {
  it('flags known disposable providers', () => {
    expect(isDisposableDomain('mailinator.com')).toBe(true);
    expect(isDisposableDomain('YOPMAIL.COM')).toBe(true);
  });

  it('does not flag mainstream or custom domains', () => {
    expect(isDisposableDomain('gmail.com')).toBe(false);
    expect(isDisposableDomain('my-personal-domain.dev')).toBe(false);
  });

  it('honours runtime-configured extra domains', () => {
    expect(isDisposableDomain('newburner.xyz', ['newburner.xyz'])).toBe(true);
  });
});

describe('scoreSignupRisk', () => {
  const signal = (severity: RiskSignal['severity'], type = 'X'): RiskSignal => ({
    type,
    severity,
    explanation: `${type} (${severity})`,
  });

  it('scores an empty signal list as ALLOW / NONE', () => {
    const result = scoreSignupRisk([]);
    expect(result.score).toBe(0);
    expect(result.level).toBe('NONE');
    expect(result.recommendation).toBe('ALLOW');
  });

  it('keeps a single low signal in ALLOW territory', () => {
    const result = scoreSignupRisk([signal('low')]);
    expect(result.recommendation).toBe('ALLOW');
    expect(result.level).toBe('LOW');
  });

  it('a single high signal alone does not trigger review (layered defense, not one-signal punishment)', () => {
    const result = scoreSignupRisk([signal('high')]);
    expect(result.score).toBe(severityPoints('high'));
    expect(result.recommendation).toBe('ALLOW_WITH_RESTRICTIONS');
  });

  it('two high signals reach the phone step-up band', () => {
    const result = scoreSignupRisk([signal('high', 'A'), signal('high', 'B')]);
    expect(result.score).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.phoneStepUpScore);
    expect(result.recommendation).toBe('REQUIRE_PHONE');
  });

  it('critical + high reaches review, not automatic rejection', () => {
    const result = scoreSignupRisk([signal('critical'), signal('high')]);
    expect(result.recommendation).toBe('REQUIRE_REVIEW');
    expect(result.level).toBe('CRITICAL');
  });

  it('caps the score at 100 and applies diminishing returns past two signals', () => {
    const many = Array.from({ length: 10 }, (_, i) => signal('low', `S${i}`));
    const result = scoreSignupRisk(many);
    expect(result.score).toBeLessThanOrEqual(100);
    // 10 + 7.5 + 8 half-weight low signals = 57.5, rounded
    expect(result.score).toBe(58);
  });

  it('reports every signal explanation as a reason, strongest first', () => {
    const result = scoreSignupRisk([signal('low', 'weak'), signal('critical', 'strong')]);
    expect(result.reasons[0]).toContain('strong');
    expect(result.reasons).toHaveLength(2);
  });

  it('respects custom thresholds from security_config', () => {
    const result = scoreSignupRisk([signal('high')], {
      phoneStepUpScore: 40, reviewScore: 90, rejectScore: 99,
    });
    expect(result.recommendation).toBe('REQUIRE_PHONE');
  });
});

describe('normalizeContentForHash', () => {
  it('treats trivially varied spam as identical (spec §106)', () => {
    expect(normalizeContentForHash('MAKE $10,000 TODAY!!!!'))
      .toBe(normalizeContentForHash('Make $10,000 today!!'));
  });

  it('collapses whitespace', () => {
    expect(normalizeContentForHash('hello   world\n\nnow'))
      .toBe(normalizeContentForHash('hello world now'));
  });

  it('keeps genuinely different content distinct', () => {
    expect(normalizeContentForHash('come to my party'))
      .not.toBe(normalizeContentForHash('buy my product'));
  });
});
