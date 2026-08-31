import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { RuntimeContext, ScopeContext } from '@nop-chaos/flux-react';

interface RowScopeLike {
  get(path: string): unknown;
  has(path: string): boolean;
  update(path: string, value: unknown): void;
  merge(data: Record<string, unknown>): void;
  readVisible(): Record<string, unknown>;
  readOwn(): Record<string, unknown>;
  materializeVisible(): Record<string, unknown>;
  [key: string]: unknown;
}

interface HelpersLike {
  dispatch: ReturnType<typeof vi.fn>;
}
import {
  resolveTableEditableConfig,
  TableEditableCell,
} from '../table-renderer/table-editable-cell.js';

function createRowScope(record: Record<string, unknown>, index = 0) {
  const state: Record<string, unknown> = { ...record, $slot: { record: { ...record }, index } };
  function getSlotRecord() {
    const slot = state.$slot as { record: Record<string, unknown> } | undefined;
    return slot?.record ?? {};
  }
  return {
    get(path: string) {
      if (path === '$slot.record') return getSlotRecord();
      if (path === '$slot') return state.$slot;
      return state[path];
    },
    has(path: string) {
      return path in state;
    },
    update(path: string, value: unknown) {
      if (path === '$slot.record' && value && typeof value === 'object') {
        state.$slot = { ...(state.$slot as object), record: value } as never;
        return;
      }
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

function createDispatchMock(impl?: () => Promise<unknown>): HelpersLike {
  return {
    dispatch: vi.fn(impl ?? (async () => ({ ok: true }))),
  };
}

function wrapWithProviders(ui: React.ReactNode, rowScope: RowScopeLike, notify = vi.fn()) {
  return (
    <RuntimeContext.Provider value={{ env: { notify } } as never}>
      <ScopeContext.Provider value={rowScope as never}>{ui}</ScopeContext.Provider>
    </RuntimeContext.Provider>
  );
}

function renderCell(overrides: Record<string, unknown> = {}) {
  const helpers = (overrides.helpers as HelpersLike | undefined) ?? createDispatchMock();
  const rowScope =
    (overrides.rowScope as RowScopeLike | undefined) ??
    createRowScope({ name: 'Alice', amount: 10 });
  const notify = vi.fn();
  const props = {
    column: { name: 'name', label: 'Name', editable: true },
    rowScope,
    record: { name: 'Alice', amount: 10 },
    helpers,
    quickSaveAction: undefined,
    quickSaveItemAction: undefined,
    ...overrides,
  };

  return {
    helpers,
    rowScope,
    notify,
    props,
    ...render(
      wrapWithProviders(React.createElement(TableEditableCell, props as never), rowScope, notify),
    ),
  };
}

function navCell(): HTMLElement {
  return document.querySelector(
    '[data-slot="table-editable-cell"]:not([data-editing])',
  ) as HTMLElement;
}

function editingCell(): HTMLElement {
  return document.querySelector(
    '[data-slot="table-editable-cell"][data-editing="true"]',
  ) as HTMLElement;
}

function navCellByText(label: string): HTMLElement {
  return document.querySelector(
    `[data-slot="table-editable-cell"][aria-label="${label}"]`,
  ) as HTMLElement;
}

describe('resolveTableEditableConfig', () => {
  it('defaults to the text editor and keeps declared options/required', () => {
    expect(resolveTableEditableConfig({ type: 'text', name: 'a', editable: true })).toEqual({
      editor: 'text',
      options: [],
      required: false,
    });
    expect(
      resolveTableEditableConfig({
        type: 'text',
        name: 'a',
        editable: { editor: 'select', options: [{ label: 'L', value: 'l' }], required: true },
      }),
    ).toEqual({
      editor: 'select',
      options: [{ label: 'L', value: 'l' }],
      required: true,
    });
  });

  it('falls back to read-only with undefined for undeclared/false/invalid forms', () => {
    expect(resolveTableEditableConfig({ type: 'text', name: 'a' })).toBeUndefined();
    expect(
      resolveTableEditableConfig({ type: 'text', name: 'a', editable: false }),
    ).toBeUndefined();
    expect(
      resolveTableEditableConfig({
        type: 'text',
        name: 'a',
        editable: { editor: 'color-picker' as never },
      }),
    ).toBeUndefined();
  });
});

describe('TableEditableCell — two-state machine (scope write channel)', () => {
  beforeEach(() => {
    cleanup();
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  it('navigating state renders the display text and is focusable; click enters editing', () => {
    renderCell();
    const cell = navCell();
    expect(cell).toBeTruthy();
    expect(cell.textContent).toBe('Alice');
    expect(cell.getAttribute('tabindex')).toBe('0');
    expect(editingCell()).toBeNull();

    fireEvent.click(cell);
    expect(editingCell()).toBeTruthy();
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    expect(input.value).toBe('Alice');
  });

  it('Enter commits a changed value through rowScope.update and returns to navigation (gd-cell-edit zero-dispatch channel)', () => {
    const { helpers } = renderCell();
    fireEvent.click(navCell());
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Alicia' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(editingCell()).toBeNull();
    expect(navCell().textContent).toBe('Alicia');
    expect(helpers.dispatch).not.toHaveBeenCalled();
  });

  it('Esc rolls back to the pre-edit value with zero writes (gd-cell-edit-cancel)', () => {
    const rowScope = createRowScope({ name: 'Alice' });
    const updateSpy = vi.spyOn(rowScope, 'update');
    renderCell({ rowScope });

    fireEvent.click(navCell());
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Changed' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(editingCell()).toBeNull();
    expect(navCell().textContent).toBe('Alice');
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('blur commits only when the value changed', () => {
    const rowScope = createRowScope({ name: 'Alice' });
    const updateSpy = vi.spyOn(rowScope, 'update');
    renderCell({ rowScope });

    fireEvent.click(navCell());
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    fireEvent.blur(input);
    expect(editingCell()).toBeNull();
    expect(updateSpy).not.toHaveBeenCalled();

    fireEvent.click(navCell());
    const secondInput = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    fireEvent.change(secondInput, { target: { value: 'Alicia' } });
    fireEvent.blur(secondInput);
    expect(editingCell()).toBeNull();
    expect(navCell().textContent).toBe('Alicia');
    expect(updateSpy).toHaveBeenCalledWith('name', 'Alicia');
  });

  it('F2 enters editing from the navigation state', () => {
    renderCell();
    fireEvent.keyDown(navCell(), { key: 'F2' });
    expect(editingCell()).toBeTruthy();
  });

  it('required blocks empty commits, keeps the editing state and shows the error (gd-cell-edit-invalid)', () => {
    const rowScope = createRowScope({ name: 'Alice' });
    const updateSpy = vi.spyOn(rowScope, 'update');
    renderCell({ rowScope, column: { name: 'name', label: 'Name', editable: { required: true } } });

    fireEvent.click(navCell());
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(editingCell()).toBeTruthy();
    expect(document.querySelector('[data-slot="table-editable-error"]')).toBeTruthy();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('number editor commits a numeric value and blocks required empties', () => {
    const rowScope = createRowScope({ amount: 10 });
    const updateSpy = vi.spyOn(rowScope, 'update');
    renderCell({
      rowScope,
      record: { amount: 10 },
      column: { name: 'amount', label: 'Amount', editable: { editor: 'number', required: true } },
    });

    fireEvent.click(navCellByText('Amount'));
    const input = screen.getByRole('spinbutton', { name: 'Amount' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(editingCell()).toBeTruthy();
    expect(updateSpy).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '42' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(editingCell()).toBeNull();
    expect(updateSpy).toHaveBeenCalledWith('amount', 42);
  });

  it('select editor commits the matched option value', () => {
    const rowScope = createRowScope({ level: 'high' });
    const updateSpy = vi.spyOn(rowScope, 'update');
    renderCell({
      rowScope,
      record: { level: 'high' },
      column: {
        name: 'level',
        label: 'Level',
        editable: {
          editor: 'select',
          options: [
            { label: 'High', value: 'high' },
            { label: 'Low', value: 'low' },
          ],
        },
      },
    });

    fireEvent.click(navCellByText('Level'));
    const select = screen.getByLabelText('Level') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'low' } });
    fireEvent.keyDown(select, { key: 'Enter' });

    expect(editingCell()).toBeNull();
    expect(updateSpy).toHaveBeenCalledWith('level', 'low');
  });

  it('date editor commits the picked date', () => {
    const rowScope = createRowScope({ due: '2026-01-01' });
    const updateSpy = vi.spyOn(rowScope, 'update');
    renderCell({
      rowScope,
      record: { due: '2026-01-01' },
      column: { name: 'due', label: 'Due', editable: { editor: 'date' } },
    });

    fireEvent.click(navCellByText('Due'));
    const input = screen.getByLabelText('Due') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-08-31' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(editingCell()).toBeNull();
    expect(updateSpy).toHaveBeenCalledWith('due', '2026-08-31');
  });

  it('checkbox editor folds edit+commit into the toggle gesture', () => {
    const rowScope = createRowScope({ done: false });
    const updateSpy = vi.spyOn(rowScope, 'update');
    renderCell({
      rowScope,
      record: { done: false },
      column: { name: 'done', label: 'Done', editable: { editor: 'checkbox' } },
    });

    const cell = document.querySelector(
      '[data-slot="table-editable-cell"][data-editor="checkbox"]',
    ) as HTMLElement;
    expect(cell).toBeTruthy();
    const checkbox = cell.querySelector('input[type="checkbox"], [role="checkbox"]') as HTMLElement;
    expect(checkbox).toBeTruthy();

    fireEvent.click(checkbox);
    expect(updateSpy).toHaveBeenCalledWith('done', true);
  });
});

describe('TableEditableCell — action save channel (CX-10)', () => {
  beforeEach(() => {
    cleanup();
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  it('dispatches the save action with the field-override draft scope and merges on ok (gd-cell-edit-save)', async () => {
    const rowScope = createRowScope({ name: 'Alice' }, 3);
    const mergeSpy = vi.spyOn(rowScope, 'merge');
    const helpers = createDispatchMock();
    renderCell({
      rowScope,
      helpers,
      quickSaveItemAction: { action: 'quickSaveItem' } as never,
    });

    fireEvent.click(navCell());
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Alicia' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(editingCell()).toBeNull();
    });
    expect(helpers.dispatch).toHaveBeenCalledTimes(1);
    const dispatchArgs = (helpers.dispatch as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      scope: { get(path: string): unknown };
    };
    expect(dispatchArgs.scope.get('name')).toBe('Alicia');
    expect(dispatchArgs.scope.get('$slot.record.name')).toBe('Alicia');
    expect(mergeSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alicia' }));
    expect(navCell().textContent).toBe('Alicia');
  });

  it('keeps the editing state and notifies on explicit action failure (gd-cell-edit-save-fail)', async () => {
    const rowScope = createRowScope({ name: 'Alice' });
    const mergeSpy = vi.spyOn(rowScope, 'merge');
    const helpers = createDispatchMock(async () => ({ ok: false, error: new Error('boom') }));
    const { notify } = renderCell({
      rowScope,
      helpers,
      quickSaveItemAction: { action: 'quickSaveItem' } as never,
    });

    fireEvent.click(navCell());
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Alicia' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('warning', 'boom');
    });
    expect(editingCell()).toBeTruthy();
    const keptInput = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    expect(keptInput.value).toBe('Alicia');
    expect(mergeSpy).not.toHaveBeenCalled();
  });

  it('skips the dispatch when the value is unchanged', async () => {
    const helpers = createDispatchMock();
    renderCell({ helpers, quickSaveItemAction: { action: 'quickSaveItem' } as never });

    fireEvent.click(navCell());
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(editingCell()).toBeNull());
    expect(helpers.dispatch).not.toHaveBeenCalled();
  });
});

describe('TableEditableCell — error-state aria wiring (a11y 20-04)', () => {
  beforeEach(() => {
    cleanup();
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  function renderSelectCell() {
    return renderCell({
      rowScope: createRowScope({ status: '' }),
      record: { status: '' },
      column: {
        name: 'status',
        label: 'Status',
        editable: {
          editor: 'select',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Archived', value: 'archived' },
          ],
          required: true,
        },
      },
    });
  }

  it('select editor: a blocked required commit sets aria-invalid and aria-describedby pointing at the error span id', () => {
    renderSelectCell();

    fireEvent.click(navCell());
    const select = screen.getByRole('combobox', { name: 'Status' }) as HTMLSelectElement;
    expect(select.getAttribute('aria-invalid')).toBeNull();

    fireEvent.keyDown(select, { key: 'Enter' });

    const errorSpan = document.querySelector(
      '[data-slot="table-editable-error"]',
    ) as HTMLElement | null;
    expect(errorSpan).toBeTruthy();
    expect(errorSpan!.id).not.toBe('');
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-describedby')).toBe(errorSpan!.id);

    // Stable id: a second failed commit re-renders with the same association.
    fireEvent.keyDown(select, { key: 'Enter' });
    const errorSpanAgain = document.querySelector(
      '[data-slot="table-editable-error"]',
    ) as HTMLElement | null;
    expect(errorSpanAgain!.id).toBe(errorSpan!.id);
    expect(select.getAttribute('aria-describedby')).toBe(errorSpanAgain!.id);
  });

  it('input editor: aria-describedby joins aria-invalid and points at the same error span id', () => {
    renderCell({
      rowScope: createRowScope({ name: 'Alice' }),
      record: { name: 'Alice' },
      column: { name: 'name', label: 'Name', editable: { required: true } },
    });

    fireEvent.click(navCell());
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBeNull();

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const errorSpan = document.querySelector(
      '[data-slot="table-editable-error"]',
    ) as HTMLElement | null;
    expect(errorSpan).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(errorSpan!.id);
  });
});
