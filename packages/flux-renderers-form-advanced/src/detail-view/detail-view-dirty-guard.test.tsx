import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { baseEnv, createFormSchemaRenderer, createPageSchemaRenderer, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

// [G2-R6-视角6-01] (R2 consistency audit, P0): detail-view / detail-field draft
// surfaces used to dispose the draft form silently through all three implicit
// close channels (X button, ESC, outside click). The dirty guard must block the
// close and ask for an explicit discard confirmation (dirty-guard-confirm).

async function openDetailViewDialog() {
  cleanup();
  const SchemaRenderer = createPageSchemaRenderer();

  render(
    <SchemaRenderer
      schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-dirty-guard.test.tsx"
      schema={{
        type: 'page',
        body: [
          {
            type: 'detail-view',
            data: { theme: 'dark' },
            triggerLabel: 'Edit Config',
            surface: { mode: 'dialog', title: 'Edit Config' },
            content: [
              { type: 'input-text', name: 'theme', label: 'Theme' },
              { type: 'input-text', name: 'locale', label: 'Locale' },
            ],
          },
        ],
      }}
      env={baseEnv}
      formulaCompiler={formulaCompiler}
    />,
  );

  await waitFor(() => expect(screen.getByText('Edit Config')).toBeTruthy());
  fireEvent.click(screen.getByText('Edit Config'));
  await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());
}

describe('[G2-R6-视角6-01] detail draft dirty guard (dirty-guard-confirm)', () => {
  it('blocks the X close channel on a dirty draft and shows the discard confirmation', async () => {
    await openDetailViewDialog();

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(await screen.findByText('Discard changes?')).toBeTruthy();
    expect(screen.getByLabelText('Theme')).toBeTruthy();
  });

  it('blocks the ESC close channel on a dirty draft', async () => {
    await openDetailViewDialog();

    fireEvent.change(screen.getByLabelText('Locale'), { target: { value: 'zh-CN' } });
    fireEvent.keyDown(screen.getByLabelText('Locale'), { key: 'Escape' });

    expect(await screen.findByText('Discard changes?')).toBeTruthy();
    expect(screen.getByLabelText('Theme')).toBeTruthy();
  });

  it('keeps the surface open with unsaved edits when the user keeps editing', async () => {
    await openDetailViewDialog();

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Keep editing' }));

    await waitFor(() => expect(screen.queryByText('Discard changes?')).toBeNull());
    expect((screen.getByLabelText('Theme') as HTMLInputElement).value).toBe('light');
  });

  it('discards the edits and closes only after explicit confirmation', async () => {
    await openDetailViewDialog();

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }));

    await waitFor(() => expect(screen.queryByLabelText('Theme')).toBeNull());

    fireEvent.click(screen.getByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());
    expect((screen.getByLabelText('Theme') as HTMLInputElement).value).toBe('dark');
  });

  it('closes directly without confirmation when the draft is clean', async () => {
    await openDetailViewDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByLabelText('Theme')).toBeNull());
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });

  it('footer Cancel keeps closing directly without confirmation', async () => {
    await openDetailViewDialog();

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(screen.queryByLabelText('Theme')).toBeNull());
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });

  it('applies the same guard to the detail-field draft surface', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-dirty-guard.test.tsx#detail-field"
        schema={{
          type: 'form',
          data: { address: { street: '123 Main St', city: 'Springfield' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              content: [
                { type: 'input-text', name: 'street', label: 'Street' },
                { type: 'input-text', name: 'city', label: 'City' },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());
    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Street'), { target: { value: '456 Oak St' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(await screen.findByText('Discard changes?')).toBeTruthy();
    expect(screen.getByLabelText('Street')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(screen.queryByLabelText('Street')).toBeNull());
  });
});
