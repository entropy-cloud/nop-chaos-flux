/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nopTailwindPreset } from './index.js';

// P1-MA4.4-007 regression guard: cross-package variable closure — every
// `var(--x)` the tailwind preset consumes must have a definition in the
// theme-tokens main source (packages/theme-tokens/src/styles.css, five theme
// blocks). Neither side's own tests pin this closure: deleting a token left
// every host silently transparent/shadowless with zero red lights (audit
// Round F / F-01).

const STYLES_PATH = new URL('../../theme-tokens/src/styles.css', import.meta.url);

function collectPresetVariables(): string[] {
  const theme = (nopTailwindPreset as {
    theme?: {
      extend?: {
        backgroundColor?: Record<string, string>;
        borderRadius?: Record<string, string>;
        boxShadow?: Record<string, string>;
      };
    };
  }).theme;
  const extend = theme?.extend ?? {};
  const names = new Set<string>();
  for (const mapping of [extend.backgroundColor, extend.borderRadius, extend.boxShadow]) {
    for (const value of Object.values(mapping ?? {})) {
      const match = /var\((--[a-z0-9-]+)\)/i.exec(value);
      if (match) {
        names.add(match[1]!);
      }
    }
  }
  return [...names].sort();
}

describe('theme-tokens <-> tailwind-preset variable closure (P1-MA4.4-007)', () => {
  it('every var(--x) consumed by the preset is defined in the theme-tokens main source', () => {
    const styles = readFileSync(STYLES_PATH, 'utf8');
    const variables = collectPresetVariables();

    // sanity: the collection itself must be non-empty (mapping shape drift guard)
    expect(variables.length).toBeGreaterThanOrEqual(10);

    const missing = variables.filter((name) => !styles.includes(`${name}:`));
    expect(missing, `preset consumes tokens missing from theme-tokens: ${missing.join(', ')}`).toEqual([]);
  });
});
