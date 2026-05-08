import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n, t } from '@nop-chaos/flux-i18n';
import { RuntimeContext, ScopeContext } from '@nop-chaos/flux-react/unstable';
import {
  resolveTableQuickEditConfig,
  TableQuickEditCell,
} from '../table-renderer/table-quick-edit-cell.js';

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

function createHelpers() {
  return {
    dispatch: vi.fn(async () => ({ ok: true })),
    render: vi.fn((body, _options) =>
      React.createElement('input', { 'aria-label': body.label ?? 'Custom body' }),
    ),
  } as any;
}

function wrapWithProviders(ui: React.ReactNode, rowScope: any) {
  return (
    <RuntimeContext.Provider value={{ env: { notify: vi.fn() } } as any}>
      <ScopeContext.Provider value={rowScope}>{ui}</ScopeContext.Provider>
    </RuntimeContext.Provider>
  );
}

function renderCell(overrides: Record<string, unknown> = {}) {
  const helpers = (overrides.helpers as any) ?? createHelpers();
  const regions = (overrides.regions as any) ?? helpers.regions ?? {};
  const rowScope = createRowScope({ name: 'Alice' });
  const props = {
    column: { name: 'name', label: 'Name', quickEdit: true },
    rowScope,
    record: { name: 'Alice' },
    helpers,
    regions,
    quickSaveAction: { action: 'save' },
    ...overrides,
  } as any;

  return {
    helpers,
    rowScope,
    props,
    ...render(wrapWithProviders(<TableQuickEditCell {...props} />, rowScope)),
  };
}

describe('resolveTableQuickEditConfig', () => {
  it('returns expected inline/dialog configs and rejects nameless inline edits without body', () => {
    expect(resolveTableQuickEditConfig({ type: 'text', name: 'title', quickEdit: true })).toEqual({
      mode: 'inline',
      saveImmediately: false,
    });
    expect(resolveTableQuickEditConfig({ type: 'text', quickEdit: true })).toBeUndefined();
    expect(
      resolveTableQuickEditConfig({ type: 'text', quickEdit: { saveImmediately: true } }),
    ).toBeUndefined();
    expect(
      resolveTableQuickEditConfig({
        type: 'text',
        name: 'title',
        quickEdit: { mode: 'dialog', saveImmediately: true },
      }),
    ).toEqual({
      mode: 'dialog',
      saveImmediately: true,
      body: undefined,
    });
    expect(
      resolveTableQuickEditConfig({ type: 'text', quickEdit: { body: { type: 'input-text' } } }),
    ).toEqual({
      mode: 'inline',
      saveImmediately: false,
      body: { type: 'input-text' },
    });
    expect(resolveTableQuickEditConfig({ type: 'text', quickEdit: undefined })).toBeUndefined();
  });
});

describe('TableQuickEditCell', () => {
  beforeEach(() => {
    cleanup();
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  it('renders inline input, saves changed values, and skips save when not dirty or action missing', async () => {
    const { helpers, rowScope, rerender } = renderCell();
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    const saveButton = screen.getByRole('button', { name: t('flux.common.save') });

    expect(input.value).toBe('Alice');
    expect(saveButton.hasAttribute('disabled')).toBe(true);

    fireEvent.change(input, { target: { value: 'Alicia' } });
    expect(saveButton.hasAttribute('disabled')).toBe(false);
    expect(rowScope.get('record')).toMatchObject({ name: 'Alicia' });

    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(helpers.dispatch).toHaveBeenCalledTimes(1);
    });

    rerender(
      wrapWithProviders(
        <TableQuickEditCell
          column={{ type: 'text', name: 'name', label: 'Name', quickEdit: true }}
          rowScope={rowScope}
          record={{ name: 'Bob' }}
          helpers={helpers}
          regions={{}}
          quickSaveAction={undefined}
        />,
        rowScope,
      ),
    );
    expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Bob');
  });

  it('auto-saves on blur, but ignores focus transitions inside the editor container', async () => {
    const { helpers } = renderCell({
      column: { name: 'name', label: 'Name', quickEdit: { saveImmediately: true } },
    });
    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    const wrapper = document.querySelector('[data-slot="table-quick-edit"]') as HTMLElement;
    const insideButton = document.createElement('button');
    wrapper.appendChild(insideButton);

    fireEvent.change(input, { target: { value: 'Alicia' } });
    fireEvent.blur(input, { relatedTarget: insideButton });
    expect(helpers.dispatch).toHaveBeenCalledTimes(0);

    fireEvent.blur(input);
    await waitFor(() => {
      expect(helpers.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  it('renders custom inline body and tracks dirty state through change capture', async () => {
    const customBody = { type: 'input-text', label: 'Custom body' };
    const customHelpers = createHelpers();
    customHelpers.render.mockImplementation((_body: any, options: any) => (
      <input
        aria-label="Custom body"
        defaultValue={String((options?.scope.get('record') as Record<string, unknown>)?.name ?? '')}
        onChange={(event) => options?.scope.update('record.name', event.target.value)}
      />
    ));
    const { rowScope } = renderCell({
      column: {
        name: 'name',
        label: 'Name',
        quickEdit: { body: customBody },
      },
      helpers: customHelpers,
    });

    const customInput = screen.getByRole('textbox', { name: 'Custom body' }) as HTMLInputElement;
    const saveButton = screen.getByRole('button', { name: t('flux.common.save') });
    expect(saveButton.hasAttribute('disabled')).toBe(true);

    fireEvent.change(customInput, { target: { value: 'changed' } });
    expect(saveButton.hasAttribute('disabled')).toBe(false);
    expect(rowScope.get('record')).toMatchObject({ name: 'changed' });

    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(customHelpers.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  it('renders compiled quickEdit body regions when quickEditBodyRegionKey is provided', async () => {
    const regionRender = vi.fn(() => <input aria-label="Region body" defaultValue="Alice" />);
    const helpers = {
      ...createHelpers(),
      regions: {
        quickBody: { render: regionRender },
      },
    } as any;

    renderCell({
      column: {
        label: 'Name',
        quickEdit: { saveImmediately: false },
        quickEditBodyRegionKey: 'quickBody',
      },
      helpers,
    });

    expect(screen.getByRole('textbox', { name: 'Region body' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Region body' }), {
      target: { value: 'Changed' },
    });

    await waitFor(() => {
      expect(regionRender).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: expect.anything(),
          pathSuffix: 'quickEdit.custom',
        }),
      );
    });
  });

  it('handles dialog open, close, cancel restore, and save branches', async () => {
    const { helpers, rowScope } = renderCell({
      column: {
        name: 'name',
        label: 'Edit Name',
        quickEdit: { mode: 'dialog', body: { type: 'input-text', label: 'Dialog body' } },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit Name' }));
    expect(screen.getAllByText('Edit Name').length).toBeGreaterThan(0);
    expect(rowScope.get('record')).toMatchObject({ name: 'Alice' });

    const body = screen.getByLabelText('Dialog body');
    fireEvent.change(body, { target: { value: 'changed' } });
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.close') }));
    expect(rowScope.get('record')).toMatchObject({ name: 'Alice' });

    fireEvent.click(screen.getByRole('button', { name: 'Edit Name' }));
    fireEvent.change(screen.getByLabelText('Dialog body'), { target: { value: 'changed-again' } });
    const saveButton = screen.getByRole('button', { name: t('flux.common.save') });
    expect(saveButton.hasAttribute('disabled')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.save') }));
    await waitFor(() => {
      expect(helpers.dispatch).toHaveBeenCalledTimes(1);
    });
  });
});
