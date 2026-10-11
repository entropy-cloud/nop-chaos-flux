import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { builtinMessages } from './i18n.js';

// WA-ui-008 guard: every t('…') literal under src/ must resolve from the
// built-in messages table — t() falls back to the literal key name, which a
// screen reader reads aloud when the key is missing (the dialog drag
// instructions shipped keyless for months before this test existed).

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules' || entry === 'dist') continue;
      out.push(...collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !/\.test\./.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('i18n key existence (WA-ui-008)', () => {
  it('every t("…") literal in src/ resolves from builtinMessages', () => {
    const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..');
    const missing: string[] = [];
    for (const file of collectSourceFiles(srcDir)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\bt\('([A-Za-z0-9._-]+)'\)/g)) {
        const key = match[1];
        if (key && !(key in builtinMessages)) {
          missing.push(`${file}: ${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
