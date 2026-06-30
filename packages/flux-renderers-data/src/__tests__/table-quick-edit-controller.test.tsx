import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTableQuickEditController } from '../table-renderer/table-quick-edit-controller.js';

function createRowScope(record: Record<string, unknown>) {
  const state = { record: { ...record } };
  return {
    get(path: string) {
      if (path === 'record') {
        return state.record;
      }
      return undefined;
    },
    update(path: string, value: unknown) {
      if (path === 'record' && value && typeof value === 'object') {
        state.record = { ...(value as Record<string, unknown>) };
        return;
      }
      if (path.startsWith('record.')) {
        state.record[path.slice('record.'.length)] = value;
      }
    },
  } as any;
}

function createHelpers(
  dispatch: ReturnType<typeof vi.fn<() => Promise<{ ok: boolean }>>> = vi.fn(async () => ({
    ok: true,
  })),
) {
  return {
    dispatch,
  } as any;
}

function ControllerHarness(props: {
  field?: string;
  record: Record<string, unknown>;
  rowScope: any;
  helpers: any;
  hasCustomBody?: boolean;
  saveAction?: { action: string };
}) {
  const controller = useTableQuickEditController({
    field: props.field,
    record: props.record,
    rowScope: props.rowScope,
    helpers: props.helpers,
    saveAction: props.saveAction,
    hasCustomBody: props.hasCustomBody === true,
  });

  return (
    <div>
      <span data-testid="dirty">{String(controller.dirty)}</span>
      <span data-testid="dialog-open">{String(controller.dialogOpen)}</span>
      <span data-testid="draft">{controller.draftValue}</span>
      <span data-testid="save-error">{String(controller.saveError instanceof Error ? controller.saveError.message : controller.saveError ?? '')}</span>
      <button type="button" onClick={() => controller.handleInlineValueChange('Alicia')}>
        change
      </button>
      <button type="button" onClick={() => controller.draftRowScope.update('record.name', 'Changed')}>
        change-custom
      </button>
      <button type="button" onClick={controller.markBodyDirty}>
        mark-body-dirty
      </button>
      <button type="button" onClick={controller.openDialog}>
        open
      </button>
      <button type="button" onClick={controller.closeDialog}>
        close
      </button>
      <button type="button" onClick={() => void controller.runSave()}>
        save
      </button>
      <button type="button" onClick={() => controller.handleDialogOpenChange(false)}>
        dialog-change-close
      </button>
    </div>
  );
}

describe('useTableQuickEditController', () => {
  it('tracks inline draft dirty state and saves through helpers.dispatch', async () => {
    cleanup();
    const dispatch = vi.fn<() => Promise<{ ok: boolean }>>(async () => ({ ok: true }));
    const rowScope = createRowScope({ name: 'Alice' });

    render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={rowScope}
        helpers={createHelpers(dispatch)}
        saveAction={{ action: 'save' }}
      />,
    );

    expect(screen.getByTestId('dirty').textContent).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    expect(screen.getByTestId('dirty').textContent).toBe('true');
    expect(rowScope.get('record')).toMatchObject({ name: 'Alice' });

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    expect((dispatch.mock.calls[0] as any)?.[1]?.scope.get('record')).toMatchObject({
      name: 'Alicia',
    });

    await waitFor(() => {
      expect(screen.getByTestId('dirty').textContent).toBe('false');
      expect(screen.getByTestId('draft').textContent).toBe('Alicia');
    });

    expect(rowScope.get('record')).toMatchObject({ name: 'Alicia' });
  });

  it('keeps unsaved inline draft changes out of the shared row scope', () => {
    cleanup();
    const rowScope = createRowScope({ name: 'Alice' });

    render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={rowScope}
        helpers={createHelpers()}
        saveAction={{ action: 'save' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'change' }));

    expect(screen.getByTestId('dirty').textContent).toBe('true');
    expect(screen.getByTestId('draft').textContent).toBe('Alicia');
    expect(rowScope.get('record')).toMatchObject({ name: 'Alice' });
  });

  it('marks custom-body edits dirty and restores saved value on close', () => {
    cleanup();
    const rowScope = createRowScope({ name: 'Alice' });

    render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={rowScope}
        helpers={createHelpers()}
        hasCustomBody
        saveAction={{ action: 'save' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'change-custom' }));
    fireEvent.click(screen.getByRole('button', { name: 'mark-body-dirty' }));
    expect(screen.getByTestId('dirty').textContent).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(rowScope.get('record')).toMatchObject({ name: 'Alice' });
    expect(screen.getByTestId('dirty').textContent).toBe('false');
  });

  it('preserves whole-row custom-body drafts when the configured field snapshot is unchanged', () => {
    cleanup();
    const rowScope = createRowScope({ name: 'Alice', status: 'draft' });
    const helpers = createHelpers();
    const rendered = render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice', status: 'draft' }}
        rowScope={rowScope}
        helpers={helpers}
        hasCustomBody
        saveAction={{ action: 'save' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'change-custom' }));
    fireEvent.click(screen.getByRole('button', { name: 'mark-body-dirty' }));

    expect((rowScope.get('record') as Record<string, unknown>).status).toBe('draft');
    expect((screen.getByTestId('dirty').textContent)).toBe('true');

    rendered.rerender(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice', status: 'draft' }}
        rowScope={rowScope}
        helpers={helpers}
        hasCustomBody
        saveAction={{ action: 'save' }}
      />,
    );

    expect(screen.getByTestId('dirty').textContent).toBe('true');
    expect((rowScope.get('record') as Record<string, unknown>).status).toBe('draft');
  });

  it('opens dialog with saved value and ignores close while saving', async () => {
    cleanup();
    let resolveSave: (() => void) | undefined;
    const dispatch = vi.fn<() => Promise<{ ok: boolean }>>(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolveSave = () => resolve({ ok: true });
        }),
    );
    const rowScope = createRowScope({ name: 'Alice' });

    render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={rowScope}
        helpers={createHelpers(dispatch)}
        saveAction={{ action: 'save' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('dialog-open').textContent).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'dialog-change-close' }));
    expect(screen.getByTestId('dialog-open').textContent).toBe('true');

    resolveSave?.();

    await waitFor(() => {
      expect(screen.getByTestId('dialog-open').textContent).toBe('false');
    });
  });

  it('exposes save failures through controller state', async () => {
    cleanup();
    const dispatch = vi.fn<() => Promise<{ ok: boolean }>>(async () => {
      throw new Error('save failed');
    });

    render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={createRowScope({ name: 'Alice' })}
        helpers={createHelpers(dispatch)}
        saveAction={{ action: 'save' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(screen.getByTestId('save-error').textContent).toBe('save failed');
    });
  });

  it('treats resolved ok=false results as save failures', async () => {
    cleanup();
    const dispatch = vi.fn<() => Promise<{ ok: boolean; error: Error }>>(async () => ({
      ok: false,
      error: new Error('save rejected'),
    }));

    render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={createRowScope({ name: 'Alice' })}
        helpers={createHelpers(dispatch as any)}
        saveAction={{ action: 'save' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(screen.getByTestId('save-error').textContent).toBe('save rejected');
      expect(screen.getByTestId('dirty').textContent).toBe('true');
      expect(screen.getByTestId('draft').textContent).toBe('Alicia');
    });
  });

  it('guards duplicate same-tick save calls before React state updates flush', async () => {
    cleanup();
    let resolveSave: (() => void) | undefined;
    const dispatch = vi.fn<() => Promise<{ ok: boolean }>>(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolveSave = () => resolve({ ok: true });
        }),
    );

    render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={createRowScope({ name: 'Alice' })}
        helpers={createHelpers(dispatch)}
        saveAction={{ action: 'save' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    resolveSave?.();

    await waitFor(() => {
      expect(screen.getByTestId('dirty').textContent).toBe('false');
    });
  });

  it('preserves draft state when record identity changes but field value stays the same', () => {
    cleanup();
    const rowScope = createRowScope({ name: 'Alice' });
    const helpers = createHelpers();
    const rendered = render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={rowScope}
        helpers={helpers}
        saveAction={{ action: 'save' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    expect(screen.getByTestId('dirty').textContent).toBe('true');
    expect(screen.getByTestId('draft').textContent).toBe('Alicia');

    rendered.rerender(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={rowScope}
        helpers={helpers}
        saveAction={{ action: 'save' }}
      />,
    );

    expect(screen.getByTestId('dirty').textContent).toBe('true');
    expect(screen.getByTestId('draft').textContent).toBe('Alicia');
  });

  it('resets draft state when the field value actually changes', () => {
    cleanup();
    const rowScope = createRowScope({ name: 'Alice' });
    const helpers = createHelpers();
    const rendered = render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={rowScope}
        helpers={helpers}
        saveAction={{ action: 'save' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'change' }));

    rendered.rerender(
      <ControllerHarness
        field="name"
        record={{ name: 'Server value' }}
        rowScope={rowScope}
        helpers={helpers}
        saveAction={{ action: 'save' }}
      />,
    );

    expect(screen.getByTestId('dirty').textContent).toBe('false');
    expect(screen.getByTestId('dialog-open').textContent).toBe('false');
    expect(screen.getByTestId('draft').textContent).toBe('Server value');
  });
});
