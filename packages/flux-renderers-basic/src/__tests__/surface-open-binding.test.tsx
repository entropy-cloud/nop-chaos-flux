import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// PLAN 590 (CX-12): controlled dialog/drawer `open` switches from the runtime
// raw-schema regex read to the compile-time open-binding channel (the same
// SchemaFieldRule the command palette consumes). These pins characterize the
// controlled-open semantic surface BEFORE the rewire; the undefined-value pin
// is the DECLARED semantic change (R1 M1 adjudication): a simple `${path}`
// expression that evaluates to undefined becomes controlled-closed
// (palette-style) instead of falling back to the uncontrolled defaultOpen
// latch. That pin FAILS against the pre-rewire implementation by design.
describe('surface controlled open binding (plan 590 CX-12)', () => {
  it('drawer: X close writes the controlled path back to false and idempotent setValue reopens (dialog plan-459 parity)', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/surface-open-binding#drawer-x-close-writeback"
        schema={{
          type: 'page',
          data: { drawerOpen: true },
          body: [
            {
              type: 'drawer',
              title: 'Controlled drawer',
              open: '${drawerOpen}',
              testid: 'controlled-drawer',
              body: [{ type: 'text', text: 'Drawer body' }],
            },
            { type: 'text', text: 'drawerOpen=${drawerOpen}', testid: 'drawer-open-probe' },
            {
              type: 'button',
              label: 'Open drawer',
              testid: 'open-drawer-btn',
              onClick: { action: 'setValue', args: { path: 'drawerOpen', value: true } },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() =>
      expect(document.querySelector('[data-slot="drawer-surface"]')).toBeTruthy(),
    );

    const closeButton = document.querySelector('[data-slot="drawer-close"]');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    // User close must sync the scope variable to false (writeback) and remove
    // the surface entry.
    await waitFor(() => {
      expect(screen.getByTestId('drawer-open-probe').textContent).toBe('drawerOpen=false');
      expect(document.querySelector('[data-slot="drawer-surface"]')).toBeNull();
    });

    // Idempotent setValue(drawerOpen, true) flips false → true (thanks to the
    // writeback) and reopens — same reopen parity as the dialog pins.
    fireEvent.click(screen.getByTestId('open-drawer-btn'));
    await waitFor(() =>
      expect(document.querySelector('[data-slot="drawer-surface"]')).toBeTruthy(),
    );
    cleanup();
  });

  it('dialog: boolean open stays a pure latch — X close wins and no scope writeback happens', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/surface-open-binding#boolean-open-latch"
        schema={{
          type: 'page',
          data: { unrelated: 0 },
          body: [
            {
              type: 'dialog',
              title: 'Boolean open',
              open: true,
              testid: 'boolean-open-dialog',
              body: [{ type: 'text', text: 'Boolean body' }],
            },
            {
              type: 'button',
              label: 'Bump',
              testid: 'bump-btn',
              onClick: { action: 'setValue', args: { path: 'unrelated', value: 1 } },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Boolean body')).toBeTruthy());

    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="dialog-close"]');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    await waitFor(() => expect(screen.queryByText('Boolean body')).toBeNull());

    // A boolean open has no scope path: no writeback target exists and the
    // user-closed latch must hold across unrelated re-renders.
    fireEvent.click(screen.getByTestId('bump-btn'));
    await waitFor(() => expect(screen.getByTestId('bump-btn')).toBeTruthy());
    expect(screen.queryByText('Boolean body')).toBeNull();
    cleanup();
  });

  it('dialog: non-simple open expression keeps pure-latch semantics — no scope writeback on X close', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/surface-open-binding#non-simple-expression"
        schema={{
          type: 'page',
          data: { flagA: true, flagB: false },
          body: [
            {
              type: 'dialog',
              title: 'Compound open',
              open: '${flagA || flagB}',
              testid: 'compound-open-dialog',
              body: [{ type: 'text', text: 'Compound body' }],
            },
            { type: 'text', text: 'flagA=${flagA}', testid: 'flag-probe' },
            {
              type: 'button',
              label: 'Close compound',
              testid: 'close-compound-btn',
              onClick: { action: 'setValue', args: { path: 'flagA', value: false } },
            },
            {
              type: 'button',
              label: 'Open compound',
              testid: 'open-compound-btn',
              onClick: { action: 'setValue', args: { path: 'flagA', value: true } },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Compound body')).toBeTruthy());

    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="dialog-close"]');
    fireEvent.click(closeButton!);

    // No simple `${path}` shape → no writeback: flagA stays true while the
    // user-closed latch keeps the dialog closed.
    await waitFor(() => {
      expect(screen.getByTestId('flag-probe').textContent).toBe('flagA=true');
      expect(screen.queryByText('Compound body')).toBeNull();
    });

    // Schema-side flip false → true clears the latch and reopens (with no
    // writeback the expression only moves when the schema moves it).
    fireEvent.click(screen.getByTestId('close-compound-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('flag-probe').textContent).toBe('flagA=false'),
    );
    fireEvent.click(screen.getByTestId('open-compound-btn'));
    await waitFor(() => expect(screen.getByText('Compound body')).toBeTruthy());
    cleanup();
  });

  it('dialog: undefined-valued simple open expression is controlled-closed (palette-style), not uncontrolled defaultOpen', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/surface-open-binding#undefined-value-controlled-closed"
        schema={{
          type: 'page',
          data: {},
          body: [
            {
              type: 'dialog',
              title: 'Undefined open',
              defaultOpen: true,
              open: '${dialogOpen}',
              testid: 'undefined-open-dialog',
              body: [{ type: 'text', text: 'Undefined body' }],
            },
            { type: 'text', text: 'dialogOpen=${dialogOpen}', testid: 'undefined-open-probe' },
            {
              type: 'button',
              label: 'Set open',
              testid: 'set-open-btn',
              onClick: { action: 'setValue', args: { path: 'dialogOpen', value: true } },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // DECLARED semantic change (plan 590 R1 M1): the compiled wrapper is
    // present, so the surface is controlled even though the expression
    // evaluates to undefined → controlled-closed. The pre-rewire
    // implementation treats `open === undefined` as uncontrolled and would
    // open the dialog via defaultOpen — this assertion is the discriminative
    // red leg against HEAD.
    await waitFor(() => {
      expect(screen.getByTestId('undefined-open-probe').textContent).toBe('dialogOpen=');
      expect(screen.queryByText('Undefined body')).toBeNull();
    });

    // The controlled channel stays live: setValue flips the expression and
    // opens the surface.
    fireEvent.click(screen.getByTestId('set-open-btn'));
    await waitFor(() => expect(screen.getByText('Undefined body')).toBeTruthy());

    // Full controlled lifecycle on an initially-undefined variable: X close
    // writes the path back to false and an idempotent setValue reopens.
    const closeButton = screen
      .getByRole('dialog')
      .querySelector('[data-slot="dialog-close"]');
    fireEvent.click(closeButton!);
    await waitFor(() => {
      expect(screen.getByTestId('undefined-open-probe').textContent).toBe('dialogOpen=false');
      expect(screen.queryByText('Undefined body')).toBeNull();
    });
    fireEvent.click(screen.getByTestId('set-open-btn'));
    await waitFor(() => expect(screen.getByText('Undefined body')).toBeTruthy());
    cleanup();
  });

  it('dialog: async first-frame prop resolution (empty bag) does not latch a spurious close or open', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/surface-open-binding#first-frame-empty-bag"
        schema={{
          type: 'page',
          data: { isOpen: true, unrelated: 0 },
          body: [
            {
              type: 'dialog',
              title: 'Async settle',
              open: '${isOpen}',
              testid: 'async-settle-dialog',
              body: [{ type: 'text', text: 'Async body' }],
            },
            {
              type: 'button',
              label: 'Bump',
              testid: 'bump-btn',
              onClick: { action: 'setValue', args: { path: 'unrelated', value: 1 } },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Props resolve asynchronously; the first frame sees an empty bag. The
    // shape-checked consumption must treat that frame as uncontrolled-default
    // without crashing, latching userClosed, or writing the uncontrolled store
    // in a way that survives the controlled resolution.
    await waitFor(() => expect(screen.getByText('Async body')).toBeTruthy());

    // The surface stays open across unrelated re-renders (no spurious latch).
    fireEvent.click(screen.getByTestId('bump-btn'));
    await waitFor(() => expect(screen.getByTestId('bump-btn')).toBeTruthy());
    expect(screen.getByText('Async body')).toBeTruthy();
    cleanup();
  });
});
