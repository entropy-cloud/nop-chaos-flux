import { describe, expect, it, vi } from 'vitest';
import {
  createInputComponentHandle,
  type InputHandleBindings,
  type InputHandleBindingsHolder,
  type InputHandleMethod,
} from '../input-component-handle.js';

function makeHolder(bindings: Partial<InputHandleBindings>): InputHandleBindingsHolder {
  return {
    current: {
      getFocusTarget: () => null,
      isInteractive: () => true,
      isVisible: () => true,
      ...bindings,
    },
  };
}

async function invoke(
  handle: ReturnType<typeof createInputComponentHandle>,
  method: InputHandleMethod,
) {
  return handle.capabilities.invoke(method, undefined, {});
}

describe('createInputComponentHandle', () => {
  it('advertises only the declared methods', () => {
    const handle = createInputComponentHandle({
      id: 'inp',
      type: 'input-text',
      methods: ['clear', 'reset', 'focus'],
      bindingsHolder: makeHolder({}),
    });

    expect(handle.capabilities.hasMethod?.('clear')).toBe(true);
    expect(handle.capabilities.hasMethod?.('open')).toBe(false);
    expect(handle.capabilities.listMethods?.()).toEqual(['clear', 'reset', 'focus']);
  });

  it('clear no-ops (skipped) when not interactive (x1-clear-disabled)', async () => {
    const clearValue = vi.fn();
    const handle = createInputComponentHandle({
      id: 'inp',
      type: 'input-text',
      methods: ['clear'],
      bindingsHolder: makeHolder({ isInteractive: () => false, clearValue }),
    });

    const result = await invoke(handle, 'clear');
    expect(result).toMatchObject({ ok: true, skipped: true });
    expect(clearValue).not.toHaveBeenCalled();
  });

  it('clear invokes clearValue when interactive', async () => {
    const clearValue = vi.fn();
    const handle = createInputComponentHandle({
      id: 'inp',
      type: 'input-text',
      methods: ['clear'],
      bindingsHolder: makeHolder({ isInteractive: () => true, clearValue }),
    });

    const result = await invoke(handle, 'clear');
    expect(result).toEqual({ ok: true });
    expect(clearValue).toHaveBeenCalled();
  });

  it('reset falls back to clear semantics when no resetValue is bound (x1-reset-no-initial)', async () => {
    const handle = createInputComponentHandle({
      id: 'inp',
      type: 'input-text',
      methods: ['reset'],
      bindingsHolder: makeHolder({}),
    });

    const result = await invoke(handle, 'reset');
    expect(result).toMatchObject({ ok: true, fellBackToDefault: true });
  });

  it('reset reports fellBackToDefault=false when initial value exists', async () => {
    const handle = createInputComponentHandle({
      id: 'inp',
      type: 'input-number',
      methods: ['reset'],
      bindingsHolder: makeHolder({ resetValue: () => ({ fellBackToDefault: false }) }),
    });

    const result = await invoke(handle, 'reset');
    expect(result).toMatchObject({ ok: true, fellBackToDefault: false });
  });

  it('focus returns not-visible when field is hidden (x1-focus-hidden)', async () => {
    const focusEl = { focus: vi.fn() };
    const handle = createInputComponentHandle({
      id: 'inp',
      type: 'input-text',
      methods: ['focus'],
      bindingsHolder: makeHolder({
        isVisible: () => false,
        getFocusTarget: () => focusEl as unknown as HTMLElement,
      }),
    });

    const result = await invoke(handle, 'focus');
    expect(result).toEqual({ ok: false, code: 'not-visible' });
    expect(focusEl.focus).not.toHaveBeenCalled();
  });

  it('focus returns not-mounted when target element is missing (x1-focus-not-mounted)', async () => {
    const handle = createInputComponentHandle({
      id: 'inp',
      type: 'input-text',
      methods: ['focus'],
      bindingsHolder: makeHolder({
        isVisible: () => true,
        getFocusTarget: () => null,
      }),
    });

    const result = await invoke(handle, 'focus');
    expect(result).toEqual({ ok: false, code: 'not-mounted' });
  });

  it('focus focuses the target when visible and mounted', async () => {
    const focusEl = { focus: vi.fn() };
    const handle = createInputComponentHandle({
      id: 'inp',
      type: 'input-text',
      methods: ['focus'],
      bindingsHolder: makeHolder({
        isVisible: () => true,
        getFocusTarget: () => focusEl as unknown as HTMLElement,
      }),
    });

    const result = await invoke(handle, 'focus');
    expect(result).toEqual({ ok: true });
    expect(focusEl.focus).toHaveBeenCalled();
  });

  it('open focuses the trigger and opens the menu when visible', async () => {
    const focusEl = { focus: vi.fn() };
    const openMenu = vi.fn();
    const handle = createInputComponentHandle({
      id: 'sel',
      type: 'select',
      methods: ['open'],
      bindingsHolder: makeHolder({
        isVisible: () => true,
        getFocusTarget: () => focusEl as unknown as HTMLElement,
        openMenu,
      }),
    });

    const result = await invoke(handle, 'open');
    expect(result).toEqual({ ok: true });
    expect(focusEl.focus).toHaveBeenCalled();
    expect(openMenu).toHaveBeenCalled();
  });

  it('open returns not-mounted when target is missing', async () => {
    const handle = createInputComponentHandle({
      id: 'sel',
      type: 'select',
      methods: ['open'],
      bindingsHolder: makeHolder({ getFocusTarget: () => null }),
    });

    const result = await invoke(handle, 'open');
    expect(result).toEqual({ ok: false, code: 'not-mounted' });
  });

  it('returns a typed error for unknown methods', async () => {
    const handle = createInputComponentHandle({
      id: 'inp',
      type: 'input-text',
      methods: ['clear'],
      bindingsHolder: makeHolder({}),
    });

    const result = await handle.capabilities.invoke('bogus', undefined, {});
    expect(result.ok).toBe(false);
  });
  it('undo skips when not interactive and invokes bindings.undo when interactive (plan 667 M9b)', async () => {
    const undo = vi.fn();
    const handle = createInputComponentHandle({
      id: 'sig',
      name: 'sig',
      type: 'input-signature',
      methods: ['clear', 'reset', 'undo', 'export'],
      bindingsHolder: makeHolder({ isInteractive: () => false, undo }),
    });
    const skipped = await invoke(handle, 'undo');
    expect(skipped).toEqual({ ok: true, skipped: true });
    expect(undo).not.toHaveBeenCalled();

    const interactive = createInputComponentHandle({
      id: 'sig2',
      name: 'sig2',
      type: 'input-signature',
      methods: ['clear', 'reset', 'undo', 'export'],
      bindingsHolder: makeHolder({ isInteractive: () => true, undo }),
    });
    const result = await invoke(interactive, 'undo');
    expect(result).toEqual({ ok: true });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('export reports not-visible when hidden and returns the bound data URL when visible (plan 667 M9b)', async () => {
    const handle = createInputComponentHandle({
      id: 'sig3',
      name: 'sig3',
      type: 'input-signature',
      methods: ['clear', 'reset', 'export'],
      bindingsHolder: makeHolder({ isVisible: () => false, export: () => 'data:image/png;base64,X' }),
    });
    const hidden = await invoke(handle, 'export');
    expect(hidden).toEqual({ ok: false, code: 'not-visible' });

    const visible = createInputComponentHandle({
      id: 'sig4',
      name: 'sig4',
      type: 'input-signature',
      methods: ['clear', 'reset', 'export'],
      bindingsHolder: makeHolder({ isVisible: () => true, export: () => 'data:image/png;base64,X' }),
    });
    const result = await invoke(visible, 'export');
    expect(result).toEqual({ ok: true, value: 'data:image/png;base64,X' });
  });

  it('empty-stack undo is a no-op that still reports ok (signature zero-stroke semantics)', async () => {
    const undo = vi.fn();
    const handle = createInputComponentHandle({
      id: 'sig5',
      name: 'sig5',
      type: 'input-signature',
      methods: ['clear', 'reset', 'undo', 'export'],
      bindingsHolder: makeHolder({ isInteractive: () => true, undo }),
    });
    // the signature renderer's own undo() no-ops on an empty stack; the
    // handle channel faithfully forwards, reporting ok either way
    const result = await invoke(handle, 'undo');
    expect(result).toEqual({ ok: true });
  });

});
