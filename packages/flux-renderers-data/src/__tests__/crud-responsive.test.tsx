import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@nop-chaos/flux-i18n';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

function renderCrud(schemaOverrides: Record<string, unknown> = {}) {
  return render(
    <SchemaRenderer
      schemaUrl="test://data/crud-responsive"
      schema={{
        type: 'page',
        body: [
          {
            type: 'crud',
            id: 'crud-responsive',
            source: [
              { id: '1', name: 'Alice' },
              { id: '2', name: 'Bob' },
            ],
            rowKey: 'id',
            filterTogglable: { defaultCollapsed: false },
            queryForm: {
              body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
            },
            toolbarLayout: {
              header: ['listActions', 'statistics', 'switch-per-page', 'pagination'],
              footer: ['statistics', 'switch-per-page'],
            },
            listActions: [{ type: 'button', label: 'Bulk Delete' }],
            columns: [{ name: 'name', label: 'Name' }],
            ...schemaOverrides,
          },
        ],
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('CRUD responsive — toolbar simplification (M4a)', () => {
  it('renders switch-per-page block on desktop (no regression)', async () => {
    renderCrud();
    await waitFor(() => {
      expect(document.querySelector('[data-slot="header-toolbar-page-size"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-slot="footer-toolbar-page-size"]')).toBeTruthy();
    expect(document.querySelector('.nop-crud')?.getAttribute('data-responsive')).toBeNull();
  });

  it('hides switch-per-page block on mobile while keeping pagination and list actions', async () => {
    mobileState.isMobile = true;
    renderCrud();
    await waitFor(() => {
      expect(document.querySelector('.nop-crud')?.getAttribute('data-responsive')).toBe('narrow');
    });

    expect(document.querySelector('[data-slot="header-toolbar-page-size"]')).toBeNull();
    expect(document.querySelector('[data-slot="footer-toolbar-page-size"]')).toBeNull();

    expect(document.querySelector('[data-slot="header-toolbar-pagination"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="crud-list-actions"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="header-toolbar-statistics"]')).toBeTruthy();
  });

  it('stacks toolbar layout vertically on mobile', async () => {
    mobileState.isMobile = true;
    renderCrud();
    await waitFor(() => {
      expect(document.querySelector('[data-slot="header-toolbar-layout"]')).toBeTruthy();
    });

    const layout = document.querySelector(
      '[data-slot="header-toolbar-layout"]',
    ) as HTMLElement;
    expect(layout.className).toContain('flex-col');
    expect(layout.getAttribute('data-responsive')).toBe('narrow');
  });

  it('keeps toolbar horizontal on desktop', async () => {
    renderCrud();
    await waitFor(() => {
      expect(document.querySelector('[data-slot="header-toolbar-layout"]')).toBeTruthy();
    });

    const layout = document.querySelector(
      '[data-slot="header-toolbar-layout"]',
    ) as HTMLElement;
    expect(layout.className).toContain('justify-between');
    expect(layout.className).not.toContain('flex-col');
  });
});

describe('CRUD responsive — query region default collapsed on mobile (M4a)', () => {
  it('renders query region expanded on desktop when defaultCollapsed is false', async () => {
    renderCrud();
    await waitFor(() => {
      expect(document.querySelector('[data-slot="crud-query"]')).toBeTruthy();
    });

    expect(screen.queryByLabelText('Keyword')).toBeTruthy();
    const collapse = document.querySelector('[data-slot="crud-query-collapse"]') as HTMLElement;
    expect(collapse?.getAttribute('data-collapsed')).toBeNull();
  });

  it('forces query region collapsed on mobile even when defaultCollapsed is false', async () => {
    mobileState.isMobile = true;
    renderCrud();
    await waitFor(() => {
      expect(document.querySelector('[data-slot="crud-query-collapse"]')).toBeTruthy();
    });

    const collapse = document.querySelector('[data-slot="crud-query-collapse"]') as HTMLElement;
    expect(collapse.getAttribute('data-collapsed')).not.toBeNull();

    const expandButton = screen.queryByRole('button', { name: t('flux.crud.expandQuery') });
    expect(expandButton).toBeTruthy();
    expect(screen.queryByLabelText('Keyword')).toBeNull();
  });

  it('can expand the mobile-collapsed query region by clicking the toggle', async () => {
    mobileState.isMobile = true;
    renderCrud();
    await waitFor(() => {
      expect(document.querySelector('[data-slot="crud-query-collapse"]')).toBeTruthy();
    });

    expect(screen.queryByLabelText('Keyword')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t('flux.crud.expandQuery') }));

    await waitFor(() => {
      expect(screen.queryByLabelText('Keyword')).toBeTruthy();
    });
  });
});

describe('CRUD responsive — pagination simplification does not regress infinite mode', () => {
  it('keeps infinite-mode pagination/switch-per-page suppression on mobile', async () => {
    mobileState.isMobile = true;
    renderCrud({ pagination: { mode: 'infinite' } });
    await waitFor(() => {
      expect(document.querySelector('.nop-crud')).toBeTruthy();
    });

    expect(document.querySelector('[data-slot="header-toolbar-pagination"]')).toBeNull();
    expect(document.querySelector('[data-slot="header-toolbar-page-size"]')).toBeNull();
    expect(document.querySelector('[data-slot="crud-infinite"]')).toBeTruthy();
  });
});
