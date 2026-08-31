import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { RuntimeContext, ScopeContext } from '@nop-chaos/flux-react';
import { TableEditableCell } from '../table-renderer/table-editable-cell.js';

function createRowScope(record: Record<string, unknown>, index = 0) {
  const state: Record<string, unknown> = { ...record, $slot: { record: { ...record }, index } };
  return {
    get(path: string) {
      if (path === '$slot.record') return (state.$slot as { record: unknown }).record;
      if (path === '$slot') return state.$slot;
      return state[path];
    },
    has(path: string) {
      return path in state;
    },
    update(path: string, value: unknown) {
      state[path] = value;
    },
    merge(data: Record<string, unknown>) {
      const { $slot, ...fields } = data;
      Object.assign(state, fields);
      if ($slot) {
        state.$slot = $slot;
      }
    },
    readVisible() {
      return { ...state };
    },
    readOwn() {
      return { ...state };
    },
    materializeVisible() {
      return { ...state };
    },
  };
}

function renderCheckboxCell(helpers: { dispatch: ReturnType<typeof vi.fn> }) {
  const rowScope = createRowScope({ done: false });
  const notify = vi.fn();
  render(
    <RuntimeContext.Provider value={{ env: { notify } } as never}>
      <ScopeContext.Provider value={rowScope as never}>
        <TableEditableCell
          column={{ name: 'done', label: 'Done', editable: { editor: 'checkbox' } } as never}
          rowScope={rowScope as never}
          record={{ done: false }}
          helpers={helpers as never}
          quickSaveItemAction={{ action: 'quickSaveItem' } as never}
        />
      </ScopeContext.Provider>
    </RuntimeContext.Provider>,
  );
  const cell = document.querySelector(
    '[data-slot="table-editable-cell"][data-editor="checkbox"]',
  ) as HTMLElement;
  const checkbox = cell.querySelector(
    'input[type="checkbox"], [role="checkbox"]',
  ) as HTMLElement;
  return { cell, checkbox };
}

describe('TableEditableCell — checkbox saving gate (22-01)', () => {
  beforeEach(() => {
    cleanup();
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  it('swallows toggle attempts while a save is in flight: click, keydown Enter/Space/F2 — exactly one dispatch', async () => {
    let resolveSave: (value: unknown) => void = () => undefined;
    const helpers = {
      dispatch: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveSave = resolve;
          }),
      ),
    };
    const { cell, checkbox } = renderCheckboxCell(helpers);

    fireEvent.click(checkbox);
    await waitFor(() => expect(helpers.dispatch).toHaveBeenCalledTimes(1));
    expect(cell.getAttribute('data-saving')).toBe('true');

    fireEvent.click(checkbox);
    fireEvent.keyDown(cell, { key: ' ' });
    fireEvent.keyDown(cell, { key: 'Enter' });
    fireEvent.keyDown(cell, { key: 'F2' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(helpers.dispatch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave({ ok: true });
      await Promise.resolve();
    });
    await waitFor(() => expect(cell.getAttribute('data-saving')).toBeNull());
    expect(helpers.dispatch).toHaveBeenCalledTimes(1);
  });

  it('accepts a new toggle after the in-flight save settles', async () => {
    let resolveSave: (value: unknown) => void = () => undefined;
    const helpers = {
      dispatch: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveSave = resolve;
          }),
      ),
    };
    const { cell, checkbox } = renderCheckboxCell(helpers);

    fireEvent.click(checkbox);
    await waitFor(() => expect(helpers.dispatch).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveSave({ ok: true });
      await Promise.resolve();
    });
    await waitFor(() => expect(cell.getAttribute('data-saving')).toBeNull());

    fireEvent.click(checkbox);
    await waitFor(() => expect(helpers.dispatch).toHaveBeenCalledTimes(2));
  });
});
