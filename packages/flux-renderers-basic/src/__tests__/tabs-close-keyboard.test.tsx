import { afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// plan 2026-09-29-5 Phase 2 Proof: the per-tab close control was an
// aria-hidden, click-only span — keyboard users could never close a closable
// tab and screen readers never saw it. Now role="button" + tabIndex +
// Enter/Space (with stopPropagation so the trigger does not co-activate the
// tab being closed) + a localized aria-label.
afterEach(cleanup);

function renderClosableTabs() {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://tabs/close-keyboard"
      schema={{
        type: 'page',
        body: [
          {
            type: 'tabs',
            id: 'view-tabs',
            statusPath: 'ui.tabsStatus',
            closable: true,
            items: [
              { key: 'a', title: 'A' },
              { key: 'b', title: 'B' },
            ],
          },
          { type: 'text', testid: 'active-probe', text: 'active=${ui.tabsStatus?.activeValue}' },
        ],
      }}
      data={{ ui: {} }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

async function renderAndAwait() {
  const view = renderClosableTabs();
  await waitFor(() => expect(screen.getByText('A')).toBeTruthy());
  return view;
}

describe('tabs close control keyboard operability (plan 2026-09-29-5 Phase 2)', () => {
  it('close control is focusable, AT-visible, and keyboard-activating it removes only the tab', async () => {
    const { container } = await renderAndAwait();

    const close = container.querySelector('[data-slot="tabs-trigger-close"]') as HTMLElement;
    expect(close.getAttribute('role')).toBe('button');
    expect(close.getAttribute('tabindex')).toBe('0');
    expect(close.getAttribute('aria-label')).toBeTruthy();
    expect(close.getAttribute('aria-label')).not.toBe('B');
    expect(close.getAttribute('title')).toBe(close.getAttribute('aria-label'));
    // must NOT be aria-hidden anymore
    expect(close.getAttribute('aria-hidden')).toBeNull();

    close.focus();
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(close, { key: 'Enter' });
    await waitFor(() => {
      expect(container.querySelectorAll('[data-slot="tabs-trigger-close"]').length).toBe(0);
    });
    // closing the ACTIVE tab shifts activation to the neighbor (removal
    // semantics, not keydown co-activation — co-activation suppression via
    // preventDefault/stopPropagation is asserted by the second case where the
    // closed tab is inactive and activation must stay put)
    expect(screen.getByTestId('active-probe').textContent).toBe('active=b');
  });

  it('Space also closes and the closed tab is the one owned by the trigger', async () => {
    const { container } = await renderAndAwait();
    const close = container.querySelectorAll('[data-slot="tabs-trigger-close"]')[0] as HTMLElement;
    const ownerValue = close.closest('[data-slot="tabs-trigger"]')?.getAttribute('data-tab-value');
    expect(ownerValue).toBe('a');

    // activate B first so the closed tab is INACTIVE — a keydown co-activation
    // of the closed tab would flip active to a (then shift on removal);
    // correct behavior keeps active on B throughout
    fireEvent.click(screen.getByText('B'));
    await waitFor(() => expect(screen.getByTestId('active-probe').textContent).toBe('active=b'));

    fireEvent.keyDown(close, { key: ' ' });
    await waitFor(() => {
      expect(container.querySelectorAll('[data-slot="tabs-trigger-close"]').length).toBe(0);
    });
    expect(screen.getByTestId('active-probe').textContent).toBe('active=b');
    expect(screen.queryByText('A')).toBeNull();
  });
});
