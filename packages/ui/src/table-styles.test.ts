import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tableCss = readFileSync('src/styles/table.css', 'utf8');

describe('table.css density tokens (C1a Phase 2)', () => {
  it('drives table font size from --table-body-font-size', () => {
    expect(tableCss).toMatch(/\.nop-table\s*\{[^}]*font-size:\s*var\(--table-body-font-size\)/);
  });

  it('drives header cell height/padding/font from tokens', () => {
    expect(tableCss).toMatch(/height:\s*var\(--table-row-height\)/);
    expect(tableCss).toMatch(/font-size:\s*var\(--table-header-font-size\)/);
    expect(tableCss).toMatch(/font-weight:\s*var\(--table-header-font-weight\)/);
    expect(tableCss).toMatch(/padding:\s*0\s+var\(--table-cell-padding-x\)/);
  });

  it('adds a tokenized separator between adjacent header cells', () => {
    expect(tableCss).toMatch(
      /\.nop-table\s+thead\s+th\s*\+\s*th\s*\{[^}]*border-left:\s*1px\s+solid\s+var\(--table-header-separator-color\)/,
    );
  });

  it('drives body cell padding from tokens', () => {
    expect(tableCss).toMatch(/padding:\s*var\(--table-cell-padding-y\)\s+var\(--table-cell-padding-x\)/);
  });

  it('applies --table-edge-padding-x on first/last body cells', () => {
    expect(tableCss).toMatch(
      /td:first-child\s*\{[^}]*padding-left:\s*var\(--table-edge-padding-x\)/,
    );
    expect(tableCss).toMatch(
      /td:last-child\s*\{[^}]*padding-right:\s*var\(--table-edge-padding-x\)/,
    );
  });
});

describe('table.css fixed-edge, striped and bordered rules (C1a Phase 3)', () => {
  it('defines fixed-edge ::after shadows driven by tokens', () => {
    expect(tableCss).toMatch(
      /\.nop-table\s+td\.nop-table-sticky-edge-left::after\s*\{[^}]*left:\s*100%;[^}]*box-shadow:\s*var\(--table-fixed-edge-shadow\)/,
    );
    expect(tableCss).toMatch(
      /\.nop-table\s+td\.nop-table-sticky-edge-right::after\s*\{[^}]*right:\s*100%;[^}]*box-shadow:\s*var\(--table-fixed-edge-shadow-right\)/,
    );
    expect(tableCss).toMatch(/width:\s*var\(--table-fixed-edge-width\)/);
  });

  it('activates striped rows from the --table-striped-bg token', () => {
    expect(tableCss).toMatch(
      /tr\[data-striped\]:not\(:hover\)\s*\{[^}]*background:\s*var\(--table-striped-bg\)/,
    );
  });

  it('activates bordered mode from --border tokens', () => {
    expect(tableCss).toMatch(/\.nop-table\[data-bordered\]\s*\{[^}]*border:\s*1px\s+solid\s+var\(--border\)/);
    expect(tableCss).toMatch(/border-left:\s*1px\s+solid\s+var\(--border\)/);
  });
});

describe('index.css loads table.css', () => {
  it("imports table.css so dist consumers inherit table tokens", () => {
    const indexCss = readFileSync('src/styles/index.css', 'utf8');
    expect(indexCss).toContain('table.css');
  });
});