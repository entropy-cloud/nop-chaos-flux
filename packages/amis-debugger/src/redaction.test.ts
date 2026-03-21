import { describe, expect, it } from 'vitest';
import { normalizeRedactionOptions, redactData } from './redaction';

describe('redaction helpers', () => {
  it('normalizes defaults and can disable redaction', () => {
    const defaults = normalizeRedactionOptions(undefined);
    expect(defaults.enabled).toBe(true);
    expect(defaults.mask).toBe('[REDACTED]');
    expect(defaults.redactKeys).toEqual(expect.arrayContaining(['token', 'password']));

    const disabled = normalizeRedactionOptions({ enabled: false });
    expect(redactData({ token: 'secret' }, disabled)).toEqual({ token: 'secret' });
  });

  it('redacts nested values, respects allowValue, custom masks, and max depth', () => {
    const redaction = normalizeRedactionOptions({
      redactKeys: ['token', 'password', 'secret'],
      mask: '[MASKED]',
      maxDepth: 2,
      allowValue(context) {
        return context.path.join('.') === 'nested.keepSecret';
      },
      redactValue(context) {
        return `[${context.key.toUpperCase()}]`;
      }
    });

    expect(redactData({
      token: 'secret-token',
      nested: {
        password: '123456',
        keepSecret: 'visible',
        deep: {
          value: 'trimmed'
        }
      },
      items: [{ secretKey: 'abc' }]
    }, redaction)).toEqual({
      token: '[TOKEN]',
      nested: {
        password: '[PASSWORD]',
        keepSecret: 'visible',
        deep: {
          value: '[MAX_DEPTH]'
        }
      },
      items: [{ secretKey: '[SECRETKEY]' }]
    });
  });
});
