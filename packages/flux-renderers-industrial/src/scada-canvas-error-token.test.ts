import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// G5-视角7-01 (plan 489 Phase 1): the runtime canvas error text must use the
// same --nop-danger token chain as the editor-side error rule
// (editor/styles.css), with the same literal fallback — no standalone hex.
const HERE = import.meta.dirname;

function readRule(file: string, selector: string): string {
  const css = readFileSync(join(HERE, file), 'utf8');
  const pattern = new RegExp(`${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`);
  return css.match(pattern)?.[0] ?? '';
}

describe('scada-canvas runtime error token (G5-视角7-01)', () => {
  it('styles.css error rule converges on var(--nop-danger, #dc2626)', () => {
    const rule = readRule('styles.css', '.nop-scada-canvas .nop-scada-canvas-error');
    expect(rule).toContain('color: var(--nop-danger, #dc2626)');
    expect(rule).not.toMatch(/color:\s*#dc2626\s*;/);
  });

  it('uses the same token chain as the editor error rule', () => {
    const runtime = readRule('styles.css', '.nop-scada-canvas .nop-scada-canvas-error');
    const editor = readRule(join('editor', 'styles.css'), '.nop-scada-editor-error');
    const colorOf = (rule: string): string | undefined =>
      rule.match(/color:\s*([^;]+);/)?.[1]?.trim();
    expect(colorOf(runtime)).toBeTruthy();
    expect(colorOf(runtime)).toBe(colorOf(editor));
  });
});
