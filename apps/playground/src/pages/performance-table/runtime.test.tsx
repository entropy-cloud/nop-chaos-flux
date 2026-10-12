import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readDiagnosticsProbe } from './runtime.js';

const PAGE_SOURCE = readFileSync(resolve(process.cwd(), 'src/pages/performance-table-page.tsx'), 'utf8');

describe('readDiagnosticsProbe single source (WA-pages-009①)', () => {
  it('runtime exports the probe reader; the page imports it and keeps no local copy', () => {
    expect(PAGE_SOURCE).toContain("readDiagnosticsProbe,\n");
    expect(PAGE_SOURCE).not.toContain('function readDiagnosticsProbe(');
  });

  it('reads diagnostics probe elements from the document', () => {
    expect(readDiagnosticsProbe('[data-testid="perf-probe-absent"]')).toBeNull();

    const element = document.createElement('span');
    element.setAttribute('data-testid', 'perf-probe-present');
    document.body.appendChild(element);
    try {
      expect(readDiagnosticsProbe('[data-testid="perf-probe-present"]')).toBe(element);
    } finally {
      element.remove();
    }
  });
});
