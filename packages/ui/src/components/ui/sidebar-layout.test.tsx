import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { SidebarProvider } from './sidebar-context.js';
import { SidebarRail } from './sidebar-layout.js';
import { t } from '../../lib/i18n.js';

afterEach(() => {
  cleanup();
});

describe('SidebarRail a11y labels (V12b G6-视角9-01)', () => {
  it('resolves rail aria-label and title through t()', () => {
    render(
      <SidebarProvider>
        <SidebarRail />
      </SidebarProvider>,
    );
    const rail = screen.getByRole('button', { name: t('flux.sidebar.toggle') });
    expect(rail.getAttribute('aria-label')).toBe(t('flux.sidebar.toggle'));
    expect(rail.getAttribute('title')).toBe(t('flux.sidebar.toggle'));
  });

  it('keeps no hardcoded Toggle Sidebar literal in the source', () => {
    const src = readFileSync('src/components/ui/sidebar-layout.tsx', 'utf8');
    expect(src.includes('"Toggle Sidebar"')).toBe(false);
  });
});
