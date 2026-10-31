import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isBacktrackingSafePattern } from './safe-regex.js';

const guideDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'flux-guide');

describe('isBacktrackingSafePattern', () => {
  it.each([
    '^(?:a|aa)+$',
    '(a|ab)*c',
    '((a+))+',
    '(a{1,})+',
    '(\\w+\\s?)*$',
    '^(?:(?:a|b)c)+$',
    '(?<word>x|xy){2,}',
    '^(a|aa){1,30}$',
    '(a+)+',
    '(a+)+$',
  ])('rejects exponential pattern %s', (pattern) => {
    expect(isBacktrackingSafePattern(pattern)).toBe(false);
  });

  it.each(['.*.*', '^\\d+\\d+$', '[a-z]+[a-z]*x', '^.+a.+b.+c$', '^\\s*\\s*$'])(
    'rejects polynomial pattern %s',
    (pattern) => {
      expect(isBacktrackingSafePattern(pattern)).toBe(false);
    },
  );

  it.each([
    '^\\d{6}$',
    '^[A-Z]{2}-\\d+$',
    '^1[3-9]\\d{9}$',
    '^(\\d{3})-(\\d{4})$',
    '^(ab)?c$',
    '^(\\d{3}){2}$',
    '^(?:foo|bar)$',
    '^[(|)+]{3}$',
    '^\\(a\\|b\\)+$',
    '^[^@]+@[^@]+\\.[^@]+$',
    '^[a-z]+$',
    '^[0-9]+$',
    '^[A-Za-z]+',
    '^.+@.+$',
    '^.*$',
    '^[a-zA-Z][a-zA-Z0-9_-]*$',
  ])('accepts linear pattern %s', (pattern) => {
    expect(isBacktrackingSafePattern(pattern)).toBe(true);
  });

  it('accepts every validation pattern documented in flux-guide', () => {
    const patterns = readdirSync(guideDir)
      .filter((name) => name.endsWith('.md'))
      .flatMap((name) =>
        [...readFileSync(join(guideDir, name), 'utf8').matchAll(/"pattern"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map(
          (match) => JSON.parse(`"${match[1]}"`) as string,
        ),
      );
    expect(patterns.length).toBeGreaterThan(0);
    for (const pattern of patterns) {
      expect(isBacktrackingSafePattern(pattern), pattern).toBe(true);
    }
  });
});
