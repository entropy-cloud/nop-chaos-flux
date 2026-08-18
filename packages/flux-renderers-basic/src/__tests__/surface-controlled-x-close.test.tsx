import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// PLAN 459 (B1): controlled-mode dialog's X close primitive must clear the
// surface entry from the runtime stack. base-ui `<Dialog.Root open={true}>` keeps
// the popup rendered when X clicks, so flux-runtime has to surfaceRuntime.close(id)
// in addition to dispatching the schema onClose event hook.
describe('controlled declarative dialog close — X primitive (plan 459 B1)', () => {
  it('removes surface entry from stack when X is clicked on a controlled dialog with no onClose schema handler', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#x-close-controlled"
        schema={{
          type: 'page',
          data: { isOpen: true },
          body: [
            {
              type: 'dialog',
              title: 'Controlled dialog',
              className: 'sd-dialog',
              open: '${isOpen}', // controlled mode
              testid: 'x-close-controlled-dialog',
              body: [{ type: 'text', text: 'Controlled body' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="dialog-close"]');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    // After X click, base-ui still renders the popup because flux forces
    // `<Dialog.Root open={true}>` — but the runtime must clear the stack entry.
    // Without plan 459 fix, the dialog re-opens on the next React render (controlled
    // expression stays true). With the fix the user's "close" intent wins until
    // schema explicitly reopens via setValue(isOpen, true).
    await waitFor(
      () => {
        expect(screen.queryByText('Controlled body')).toBeNull();
      },
      { timeout: 1500 },
    );
    cleanup();
  });

  it('uncontrolled dialog X click sets store.uncontrolledOpen to false (parity)', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#x-close-uncontrolled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Uncontrolled',
              className: 'sd-dialog',
              defaultOpen: true,
              testid: 'uncontrolled-dialog',
              body: [{ type: 'text', text: 'Uncontrolled body' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Uncontrolled')).toBeTruthy());

    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="dialog-close"]');
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(screen.queryByText('Uncontrolled body')).toBeNull();
    });
    cleanup();
  });

  it('calls schema onClose handler when X is clicked on a controlled dialog (event still fires)', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#x-close-with-onclose"
        schema={{
          type: 'page',
          data: { isOpen: true, closeCount: 0 },
          body: [
            {
              type: 'dialog',
              title: 'Hooked',
              className: 'sd-dialog',
              open: '${isOpen}',
              testid: 'hooked-dialog',
              onClose: [
                {
                  action: 'setValue',
                  args: { path: 'closeCount', value: '${closeCount + 1}' },
                },
              ],
              body: [{ type: 'text', text: 'Body' }],
            },
            {
              type: 'text',
              text: 'closeCount=${closeCount}',
              testid: 'close-counter',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('hooked-dialog')).toBeTruthy());

    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="dialog-close"]');
    fireEvent.click(closeButton!);

    // The schema onClose hook was dispatched (counter = 1) and dialog is closed.
    await waitFor(() => {
      expect(screen.getByTestId('close-counter').textContent).toBe('closeCount=1');
      expect(screen.queryByTestId('hooked-dialog')).toBeNull();
    });
    cleanup();
  });

  it('reopens a controlled dialog after X close when the schema flips the open expression false→true (plan 459 B1 reopen)', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#x-close-controlled-reopen"
        schema={{
          type: 'page',
          data: { isOpen: false },
          body: [
            {
              type: 'dialog',
              title: 'Reopenable',
              className: 'sd-dialog',
              open: '${isOpen}',
              testid: 'reopenable-dialog',
              body: [{ type: 'text', text: 'Reopenable body' }],
            },
            {
              type: 'button',
              label: 'Open',
              testid: 'open-btn',
              onClick: { action: 'setValue', args: { path: 'isOpen', value: true } },
            },
            {
              type: 'button',
              label: 'Close schema-side',
              testid: 'close-schema-btn',
              onClick: { action: 'setValue', args: { path: 'isOpen', value: false } },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Open (false → true)
    fireEvent.click(screen.getByTestId('open-btn'));
    await waitFor(() => expect(screen.getByText('Reopenable')).toBeTruthy());

    // X close (user-initiated close; expression stays true but latch set)
    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="dialog-close"]');
    fireEvent.click(closeButton!);
    await waitFor(() => expect(screen.queryByText('Reopenable body')).toBeNull());

    // Schema reconciles expression to false, then a new open intent flips it
    // false → true again → dialog must reopen (latch cleared by the effect).
    fireEvent.click(screen.getByTestId('close-schema-btn'));
    await waitFor(() => expect(screen.getByTestId('open-btn')).toBeTruthy());
    fireEvent.click(screen.getByTestId('open-btn'));
    await waitFor(() => expect(screen.getByText('Reopenable body')).toBeTruthy());
    cleanup();
  });

  it('reopens after idempotent setValue(openPath, true) because X close syncs the scope variable to false (sundial scenario)', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#x-close-idempotent-reopen"
        schema={{
          type: 'page',
          data: { isOpen: true },
          body: [
            {
              type: 'dialog',
              title: 'Sundial-style',
              className: 'sd-dialog',
              open: '${isOpen}',
              testid: 'sundial-style-dialog',
              body: [{ type: 'text', text: 'Sundial body' }],
            },
            {
              type: 'button',
              label: 'Open again',
              testid: 'open-again-btn',
              // idempotent: same value as before the X close
              onClick: { action: 'setValue', args: { path: 'isOpen', value: true } },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Starts open (data.isOpen = true)
    await waitFor(() => expect(screen.getByText('Sundial-style')).toBeTruthy());

    // X close: must sync scope isOpen → false
    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="dialog-close"]');
    fireEvent.click(closeButton!);
    await waitFor(() => expect(screen.queryByText('Sundial body')).toBeNull());

    // Idempotent open button: setValue(isOpen, true) flips false → true because
    // the X close wrote isOpen=false back into scope → dialog reopens.
    fireEvent.click(screen.getByTestId('open-again-btn'));
    await waitFor(() => expect(screen.getByText('Sundial body')).toBeTruthy());
    cleanup();
  });

  it('reopens a controlled dialog after closeSurface (schema cancel button) removed the entry (plan 460 B1)', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#close-surface-reopen"
        schema={{
          type: 'page',
          data: { isOpen: true },
          body: [
            {
              type: 'dialog',
              title: 'Cancel-reopen',
              className: 'sd-dialog',
              open: '${isOpen}',
              testid: 'cancel-reopen-dialog',
              closeOnOutsideClick: false,
              body: [{ type: 'text', text: 'Cancel body' }],
              actions: [
                {
                  type: 'button',
                  label: '取消',
                  variant: 'ghost',
                  testid: 'cancel-btn',
                  onClick: { action: 'closeSurface' },
                },
              ],
            },
            {
              type: 'button',
              label: 'Open',
              testid: 'open-btn',
              onClick: { action: 'setValue', args: { path: 'isOpen', value: true } },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Cancel-reopen')).toBeTruthy());

    // Cancel via closeSurface: entry removed externally, scope must sync to false
    fireEvent.click(screen.getByTestId('cancel-btn'));
    await waitFor(() => expect(screen.queryByText('Cancel body')).toBeNull());

    // Reopen via the idempotent open button (same value true) must work now.
    fireEvent.click(screen.getByTestId('open-btn'));
    await waitFor(() => expect(screen.getByText('Cancel body')).toBeTruthy());
    cleanup();
  });
});
