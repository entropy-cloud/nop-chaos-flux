import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NumberKeyboardSchema } from './schemas.js';
import { NumberKeyboardRenderer } from './number-keyboard.js';
import { createMockRendererProps } from './test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderKeyboard(
  options: {
    open?: boolean;
    decimal?: boolean;
    randomOrder?: boolean;
    confirmDisabled?: boolean;
    disabled?: boolean;
    strictMode?: boolean;
  } = {},
) {
  const onKey = vi.fn();
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const props = createMockRendererProps<NumberKeyboardSchema>({
    schema: { type: 'number-keyboard' },
    props: {
      open: options.open ?? true,
      decimal: options.decimal,
      randomOrder: options.randomOrder,
      confirmDisabled: options.confirmDisabled,
      disabled: options.disabled,
      testid: 'nk',
    },
    events: {
      onKey: onKey as never,
      onConfirm: onConfirm as never,
      onCancel: onCancel as never,
    },
  });
  const tree = options.strictMode ? (
    <React.StrictMode>
      <NumberKeyboardRenderer {...props} />
    </React.StrictMode>
  ) : (
    <NumberKeyboardRenderer {...props} />
  );
  const view = render(tree);
  const keyboard = () => view.container.querySelector('[data-slot="number-keyboard"]') as HTMLElement;
  const keyButton = (key: string) =>
    view.container.querySelector(`[data-key="${key}"]`) as HTMLElement;
  return { view, onKey, onConfirm, onCancel, keyboard, keyButton };
}

function keySet(view: ReturnType<typeof render>): string[] {
  return [...view.container.querySelectorAll('[data-key]')].map((el) =>
    el.getAttribute('data-key') as string,
  );
}

describe('NumberKeyboardRenderer (plan 669 Phase 1)', () => {
  it('renders the default layout: digits, decimal, delete in 4 rows + confirm column', () => {
    const { view, keyButton } = renderKeyboard();
    expect(keyButton('1')).toBeTruthy();
    expect(keyButton('9')).toBeTruthy();
    expect(keyButton('.')).toBeTruthy();
    expect(keyButton('0')).toBeTruthy();
    expect(keyButton('delete')).toBeTruthy();
    expect(view.container.querySelector('[data-slot="number-keyboard-confirm"]')).toBeTruthy();
  });

  it('randomOrder keeps the digit key set invariant across remounts', () => {
    const first = renderKeyboard({ randomOrder: true });
    const set1 = [...new Set(keySet(first.view))].filter((k) => /^[0-9]$/.test(k)).sort();
    cleanup();
    const second = renderKeyboard({ randomOrder: true });
    const set2 = [...new Set(keySet(second.view))].filter((k) => /^[0-9]$/.test(k)).sort();
    expect(set1).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(set1).toEqual(set2);
  });

  it('dispatches onKey with key and value for digits', () => {
    const { keyButton, onKey } = renderKeyboard();
    fireEvent.click(keyButton('5'));
    expect(onKey).toHaveBeenCalledTimes(1);
    const payload = onKey.mock.calls[0][0] as { key: string; value: string };
    expect(payload.key).toBe('5');
    expect(payload.value).toBe('5');
  });

  it('decimal key dispatches onKey with key "." and value "."', () => {
    const { keyButton, onKey } = renderKeyboard();
    fireEvent.click(keyButton('.'));
    expect(onKey).toHaveBeenCalledTimes(1);
    const payload = onKey.mock.calls[0][0] as { key: string; value: string };
    expect(payload.key).toBe('.');
    expect(payload.value).toBe('.');
  });

  it('delete key dispatches onKey with key "delete" and omits value', () => {
    const { keyButton, onKey } = renderKeyboard();
    fireEvent.click(keyButton('delete'));
    expect(onKey).toHaveBeenCalledTimes(1);
    const payload = onKey.mock.calls[0][0] as { key: string; value?: string };
    expect(payload.key).toBe('delete');
    expect('value' in payload).toBe(false);
  });

  it('confirm dispatches onConfirm only (onKey not re-dispatched)', () => {
    const { view, onKey, onConfirm } = renderKeyboard();
    fireEvent.click(view.container.querySelector('[data-slot="number-keyboard-confirm"]') as HTMLElement);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const payload = onConfirm.mock.calls[0][0] as { type: string };
    expect(payload.type).toBe('confirm');
    expect(onKey).not.toHaveBeenCalled();
  });

  it('mask click dispatches onCancel and hides the keyboard', async () => {
    const { view, onCancel } = renderKeyboard();
    fireEvent.click(view.container.querySelector('[data-slot="number-keyboard-mask"]') as HTMLElement);
    await waitFor(() =>
      expect(view.container.querySelector('[data-slot="number-keyboard"]')).toBeNull(),
    );
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('decimal: false omits the decimal key', () => {
    const { keyButton } = renderKeyboard({ decimal: false });
    expect(keyButton('.')).toBeNull();
    expect(keyButton('0')).toBeTruthy();
  });

  it('does not respond when disabled', () => {
    const { keyButton, onKey } = renderKeyboard({ disabled: true });
    fireEvent.click(keyButton('5'));
    expect(onKey).not.toHaveBeenCalled();
  });

  it('dispatches exactly once under React StrictMode', () => {
    const { keyButton, onKey } = renderKeyboard({ strictMode: true });
    fireEvent.click(keyButton('5'));
    expect(onKey).toHaveBeenCalledTimes(1);
  });
});
