import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Button } from './button.js';
import { render } from '@testing-library/react';
import React from 'react';

// plan 2026-09-29-5 Phase 1: solid status variants must use the theme
// foreground tokens instead of hard-coded text-white — white on the dark-mode
// success/warning/info accents fails WCAG 4.5:1.
describe('button solid status variants (plan 2026-09-29-5)', () => {
  it('renders the four status variants with foreground-token text classes', () => {
    const { container, unmount } = render(
      <div>
        <Button variant="info">i</Button>
        <Button variant="success">s</Button>
        <Button variant="warning">w</Button>
        <Button variant="danger">d</Button>
      </div>,
    );
    const buttons = container.querySelectorAll('button');
    const classes = Array.from(buttons).map((b) => b.className);
    expect(classes[0]).toContain('bg-info');
    expect(classes[0]).toContain('text-info-foreground');
    expect(classes[1]).toContain('bg-success');
    expect(classes[1]).toContain('text-success-foreground');
    expect(classes[2]).toContain('bg-warning');
    expect(classes[2]).toContain('text-warning-foreground');
    expect(classes[3]).toContain('bg-danger');
    expect(classes[3]).toContain('text-danger-foreground');
    for (const cls of classes) {
      expect(cls).not.toMatch(/text-white/);
    }
    unmount();
  });

  it('theme-tokens declare the foreground tokens in light and dark sections with WCAG-passing pairing', () => {
    const tokensCss = readFileSync(
      join(import.meta.dirname, '../../../../theme-tokens/src/styles.css'),
      'utf8',
    );

    // every accent declaration is paired with a foreground token
    for (const accent of ['success', 'warning', 'info', 'danger']) {
      const accentCount = tokensCss.split(`--${accent}:`).length - 1;
      const fgCount = tokensCss.split(`--${accent}-foreground:`).length - 1;
      expect(fgCount).toBe(accentCount);
    }

    // dark sections pair mid-lightness accents with near-black text
    const darkSection = tokensCss.slice(tokensCss.indexOf("data-theme='classic'][data-mode='dark']"));
    expect(darkSection).toContain('--success: 160 70% 50%');
    expect(darkSection).toContain('--success-foreground: 0 0% 9%');
    expect(darkSection).toContain('--warning-foreground: 0 0% 9%');
    expect(darkSection).toContain('--info-foreground: 0 0% 9%');
    // danger dark (50% lightness red) keeps white — 4.95:1 measured
    expect(darkSection).toContain('--danger-foreground: 0 0% 100%');

    // light sections pair the 48-60% lightness accents with near-black text;
    // danger needs the darker 9% step (13% measures 4.25:1 — below the bar)
    const lightIdx = tokensCss.indexOf("data-theme='classic'][data-mode='light']");
    const lightSection = tokensCss.slice(lightIdx, tokensCss.indexOf('gray-50', lightIdx));
    expect(lightSection).toContain('--info-foreground: 0 0% 13%');
    expect(lightSection).toContain('--danger-foreground: 0 0% 9%');
    expect(lightSection).toContain('--warning-foreground: 0 0% 13%');
  });
});
