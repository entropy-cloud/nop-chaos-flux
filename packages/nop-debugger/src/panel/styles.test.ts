import { describe, expect, it } from 'vitest';
import { DEBUGGER_STYLES } from './styles-css.js';

describe('nop-debugger stylesheet contract', () => {
  it('does not write debugger defaults onto the shared theme root', () => {
    expect(DEBUGGER_STYLES).not.toContain('.nop-theme-root {');
    expect(DEBUGGER_STYLES).toContain('background: var(');
    expect(DEBUGGER_STYLES).toContain('var(--nop-debugger-text, #eef4fb)');
  });

  it('anchors internal debugger selectors to the debugger root', () => {
    expect(DEBUGGER_STYLES).toContain('.nop-debugger .ndbg-header');
    expect(DEBUGGER_STYLES).toContain('.nop-debugger .ndbg-tree-item');
    expect(DEBUGGER_STYLES).toContain('.nop-debugger-launcher .ndbg-launcher-badge');
    expect(DEBUGGER_STYLES).not.toContain('\n.ndbg-header {');
    expect(DEBUGGER_STYLES).not.toContain('\n.ndbg-tree-item {');
  });
});
