import { describe, expect, it } from 'vitest';
import { DEBUGGER_STYLES } from './styles-css.js';

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba\(/;

function stripBalancedVarCalls(css: string): string {
  let out = '';
  for (let i = 0; i < css.length; ) {
    if (css.startsWith('var(', i)) {
      let depth = 0;
      let j = i;
      for (; j < css.length; j++) {
        if (css[j] === '(') {
          depth++;
        } else if (css[j] === ')') {
          depth--;
          if (depth === 0) break;
        }
      }
      i = j + 1;
    } else {
      out += css[i];
      i++;
    }
  }
  return out;
}

interface DebuggerFallback {
  token: string;
  fallback: string;
}

function extractDebuggerFallbacks(css: string): DebuggerFallback[] {
  const results: DebuggerFallback[] = [];
  for (const match of css.matchAll(/var\(--nop-debugger-([a-z0-9-]+)/g)) {
    const start = match.index + match[0].length;
    if (css[start] !== ',') continue;
    let depth = 1;
    let j = start + 1;
    for (; j < css.length; j++) {
      if (css[j] === '(') {
        depth++;
      } else if (css[j] === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    results.push({ token: match[1], fallback: css.slice(start + 1, j).trim() });
  }
  return results;
}

describe('nop-debugger stylesheet contract', () => {
  it('does not write debugger defaults onto the shared theme root', () => {
    expect(DEBUGGER_STYLES).not.toContain('.nop-theme-root {');
    expect(DEBUGGER_STYLES).toContain('background: var(');
  });

  it('derives every light debugger token fallback from shared theme tokens', () => {
    const fallbacks = extractDebuggerFallbacks(DEBUGGER_STYLES).filter(
      ({ token }) => !token.startsWith('dark-'),
    );
    expect(fallbacks.length).toBeGreaterThanOrEqual(42);
    for (const { token, fallback } of fallbacks) {
      const isSemanticChain = fallback.includes('var(--') || fallback.includes('color-mix(');
      expect(
        isSemanticChain,
        `--nop-debugger-${token} fallback must derive from shared theme tokens, got: ${fallback}`,
      ).toBe(true);
    }
  });

  it('keeps every bare color literal inside a var() fallback channel', () => {
    const outsideVar = stripBalancedVarCalls(DEBUGGER_STYLES);
    const literal = outsideVar.match(COLOR_LITERAL);
    expect(
      literal,
      `bare color literal outside var() fallback channel: ${literal?.[0] ?? ''}`,
    ).toBeNull();
  });

  it('gives every consumption of the panel background a fallback', () => {
    const compact = DEBUGGER_STYLES.replace(/\s+/g, ' ');
    expect(compact).toContain('background: var( --nop-debugger-bg,');
  });

  it('restores brand accents under dark hosts through explicit dark variants', () => {
    expect(DEBUGGER_STYLES).toContain(":root[data-mode='dark'] .nop-debugger .ndbg-eyebrow");
    expect(DEBUGGER_STYLES).toContain(":root[data-mode='dark'] .nop-debugger .ndbg-badge");
    expect(DEBUGGER_STYLES).toContain(":root[data-mode='dark'] .nop-debugger .ndbg-json-key");
  });

  it('anchors internal debugger selectors to the debugger root', () => {
    expect(DEBUGGER_STYLES).toContain('.nop-debugger .ndbg-header');
    expect(DEBUGGER_STYLES).toContain('.nop-debugger .ndbg-tree-item');
    expect(DEBUGGER_STYLES).toContain('.nop-debugger-launcher .ndbg-launcher-badge');
    expect(DEBUGGER_STYLES).not.toContain('\n.ndbg-header {');
    expect(DEBUGGER_STYLES).not.toContain('\n.ndbg-tree-item {');
  });
});
