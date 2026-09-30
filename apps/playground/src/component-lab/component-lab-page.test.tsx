import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';

vi.mock('./renderer-lab-registry', () => ({
  RENDERER_LAB_REGISTRY: {
    'button-test': () => <div data-testid="lab-stub" />,
  },
}));

import { ComponentLabPage } from './component-lab-page';

describe('ComponentLabPage sidebar usability (R3-U8 / R3-U9)', () => {
  beforeEach(() => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  afterEach(() => {
    cleanup();
    resetFluxI18n();
    vi.restoreAllMocks();
  });

  it('filters sidebar entries by title/id and collapses empty groups (R3-U8)', () => {
    render(
      <ComponentLabPage
        activeRendererId={null}
        onSelectRenderer={() => undefined}
        onBack={() => undefined}
      />,
    );

    const nav = screen.getByTestId('component-lab-nav');
    const allEntries = nav.querySelectorAll('[data-testid^="nav-renderer-"]');
    expect(allEntries.length).toBeGreaterThan(10);

    const filter = screen.getByTestId('component-lab-filter') as HTMLInputElement;
    fireEvent.change(filter, { target: { value: 'button' } });

    const filteredEntries = nav.querySelectorAll('[data-testid^="nav-renderer-"]');
    expect(filteredEntries.length).toBeGreaterThan(0);
    expect(filteredEntries.length).toBeLessThan(allEntries.length);
    for (const entry of filteredEntries) {
      const text = entry.textContent?.toLowerCase() ?? '';
      expect(text.includes('button')).toBe(true);
    }

    fireEvent.change(filter, { target: { value: 'zzz-no-such-renderer' } });
    expect(screen.getByTestId('component-lab-filter-empty')).toBeTruthy();
  });

  it('renders the desktop sidebar by default', () => {
    render(
      <ComponentLabPage
        activeRendererId={null}
        onSelectRenderer={() => undefined}
        onBack={() => undefined}
      />,
    );

    expect(screen.getByTestId('component-lab-sidebar')).toBeTruthy();
    expect(screen.queryByTestId('component-lab-menu')).toBeNull();
  });

  it('marks the active sidebar entry with aria-current (R3-U7)', () => {
    const Harness = () => {
      const [active, setActive] = React.useState<string | null>(null);
      return React.createElement(ComponentLabPage, {
        activeRendererId: active,
        onSelectRenderer: (id: string) => setActive(id),
        onBack: () => undefined,
      });
    };
    const { container } = render(<Harness />);

    const anyEntry = container.querySelector<HTMLElement>('[data-testid^="nav-renderer-"]');
    expect(anyEntry?.getAttribute('aria-current')).toBeNull();

    fireEvent.click(anyEntry!);
    expect(anyEntry?.getAttribute('aria-current')).toBe('true');
  });

  it('lists the scheduling-category lab entries in the sidebar (R3-U1)', () => {
    render(
      <ComponentLabPage
        activeRendererId={null}
        onSelectRenderer={() => undefined}
        onBack={() => undefined}
      />,
    );

    expect(screen.getByTestId('nav-renderer-kanban')).toBeTruthy();
    expect(screen.getByTestId('nav-renderer-calendar')).toBeTruthy();
    expect(screen.getByTestId('nav-renderer-barcode-input')).toBeTruthy();
  });

  it('switches the sidebar to a drawer below 768px with main content full width (R3-U9)', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
    render(
      <ComponentLabPage
        activeRendererId={null}
        onSelectRenderer={() => undefined}
        onBack={() => undefined}
      />,
    );

    expect(screen.queryByTestId('component-lab-sidebar')).toBeNull();
    expect(screen.queryByTestId('component-lab-nav')).toBeNull();

    fireEvent.click(screen.getByTestId('component-lab-menu'));

    const drawer = screen.getByTestId('component-lab-sidebar-drawer');
    expect(drawer).toBeTruthy();
    expect(drawer.querySelector('[data-testid="component-lab-nav"]')).toBeTruthy();
  });
});
