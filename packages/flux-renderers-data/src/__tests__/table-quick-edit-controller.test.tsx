import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTableQuickEditController } from '../table-renderer/table-quick-edit-controller';

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
      if (path.startsWith('record.')) {
        state.record[path.slice('record.'.length)] = value;
      }
    },
  } as any;
}

function createHelpers(dispatch = vi.fn(async () => ({ ok: true }))) {
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
      <button type="button" onClick={() => controller.handleInlineValueChange('Alicia')}>change</button>
      <button type="button" onClick={controller.markBodyDirty}>mark-body-dirty</button>
      <button type="button" onClick={controller.openDialog}>open</button>
      <button type="button" onClick={controller.closeDialog}>close</button>
      <button type="button" onClick={() => void controller.runSave()}>save</button>
      <button type="button" onClick={() => controller.handleDialogOpenChange(false)}>dialog-change-close</button>
    </div>
  );
}

describe('useTableQuickEditController', () => {
  it('tracks inline draft dirty state and saves through helpers.dispatch', async () => {
    cleanup();
    const dispatch = vi.fn(async () => ({ ok: true }));
    const rowScope = createRowScope({ name: 'Alice' });

    render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={rowScope}
        helpers={createHelpers(dispatch)}
        saveAction={{ action: 'save' }}
      />
    );

    expect(screen.getByTestId('dirty').textContent).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    expect(screen.getByTestId('dirty').textContent).toBe('true');
    expect(rowScope.get('record')).toMatchObject({ name: 'Alicia' });

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByTestId('dirty').textContent).toBe('false');
      expect(screen.getByTestId('draft').textContent).toBe('Alicia');
    });
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
      />
    );

    rowScope.update('record.name', 'Changed');
    fireEvent.click(screen.getByRole('button', { name: 'mark-body-dirty' }));
    expect(screen.getByTestId('dirty').textContent).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(rowScope.get('record')).toMatchObject({ name: 'Alice' });
    expect(screen.getByTestId('dirty').textContent).toBe('false');
  });

  it('opens dialog with saved value and ignores close while saving', async () => {
    cleanup();
    let resolveSave: (() => void) | undefined;
    const dispatch = vi.fn(() => new Promise<{ ok: boolean }>((resolve) => {
      resolveSave = () => resolve({ ok: true });
    }));
    const rowScope = createRowScope({ name: 'Alice' });

    render(
      <ControllerHarness
        field="name"
        record={{ name: 'Alice' }}
        rowScope={rowScope}
        helpers={createHelpers(dispatch)}
        saveAction={{ action: 'save' }}
      />
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
});
