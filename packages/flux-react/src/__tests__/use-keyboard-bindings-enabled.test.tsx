import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseKeyCombo } from '../keyboard.js';
import { useKeyboardBindings } from '../use-keyboard-bindings.js';

// 06-02: `enabled` must be wired into the attach effect — a binding mounted
// with enabled:false must attach once enabled flips true (and detach again on
// false), not freeze the attach-time snapshot forever.

afterEach(() => {
  cleanup();
});

function Harness({
  enabled,
  onMatch,
}: {
  enabled: boolean;
  onMatch: (id: number, event: KeyboardEvent | null) => void;
}) {
  useKeyboardBindings({
    scope: undefined,
    bindings: [
      { id: 1, tokens: [parseKeyCombo('g')!], allowInInput: false, preventDefault: false },
    ],
    enabled,
    onMatch,
  });
  return null;
}

function keyG() {
  fireEvent.keyDown(window, {
    key: 'g',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
  });
}

describe('useKeyboardBindings enabled wiring (06-02)', () => {
  it('attaches the listener when enabled flips false → true after mount', () => {
    const onMatch = vi.fn();
    const { rerender } = render(<Harness enabled={false} onMatch={onMatch} />);

    keyG();
    expect(onMatch).not.toHaveBeenCalled();

    rerender(<Harness enabled={true} onMatch={onMatch} />);
    keyG();
    expect(onMatch).toHaveBeenCalledTimes(1);
    expect(onMatch).toHaveBeenCalledWith(1, expect.anything());
  });

  it('keeps the true → false detach path symmetric', () => {
    const onMatch = vi.fn();
    const { rerender } = render(<Harness enabled={true} onMatch={onMatch} />);

    keyG();
    expect(onMatch).toHaveBeenCalledTimes(1);

    rerender(<Harness enabled={false} onMatch={onMatch} />);
    keyG();
    expect(onMatch).toHaveBeenCalledTimes(1);
  });
});
