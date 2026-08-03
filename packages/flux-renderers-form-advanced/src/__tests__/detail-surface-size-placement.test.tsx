import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { baseEnv, createFormSchemaRenderer, formulaCompiler } from '../test-support.js';

/**
 * C3.2 P1-2: `surface.size` (dialog) and `surface.placement` (drawer) are
 * documented in flux-guide composite-fields.md §3/§4 but were declared with
 * zero behavior. This test freezes the implemented contract:
 * - dialog mode: surface.size → DialogContent data-size attr
 * - drawer mode: surface.placement → DrawerContent data-direction attr
 */
describe('detail surface size and placement (C3.2 P1-2)', () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  it('dialog mode renders surface.size on the dialog content', async () => {
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-surface-size-placement.test.tsx#dialog-size"
        schema={{
          type: 'form',
          data: { address: { street: '1 Main' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Size',
              surface: { mode: 'dialog', size: 'lg' },
              content: [{ type: 'input-text', name: 'street', label: 'Street' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Size')).toBeTruthy());
    fireEvent.click(screen.getByText('Edit Size'));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="dialog-content"]')).toBeTruthy();
    });

    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content?.getAttribute('data-size')).toBe('lg');
  });

  it('drawer mode renders surface.placement as the drawer direction', async () => {
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-surface-size-placement.test.tsx#drawer-placement"
        schema={{
          type: 'form',
          data: { address: { street: '1 Main' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Drawer',
              surface: { mode: 'drawer', placement: 'right' },
              content: [{ type: 'input-text', name: 'street', label: 'Street' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Drawer')).toBeTruthy());
    fireEvent.click(screen.getByText('Edit Drawer'));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="drawer-content"]')).toBeTruthy();
    });

    const content = document.querySelector('[data-slot="drawer-content"]');
    expect(content?.getAttribute('data-direction')).toBe('right');
  });

  it('unknown size falls back to default without crashing', async () => {
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-surface-size-placement.test.tsx#dialog-size-fallback"
        schema={{
          type: 'form',
          data: { address: { street: '1 Main' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Fallback',
              surface: { mode: 'dialog', size: 'huge' },
              content: [{ type: 'input-text', name: 'street', label: 'Street' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Fallback')).toBeTruthy());
    fireEvent.click(screen.getByText('Edit Fallback'));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="dialog-content"]')).toBeTruthy();
    });

    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content?.getAttribute('data-size')).toBe('default');
  });
});
