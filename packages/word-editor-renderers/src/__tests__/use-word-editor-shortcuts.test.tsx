// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { useWordEditorShortcuts } from '../hooks/use-word-editor-shortcuts.js';

function createBridge() {
  return {
    command: {
      executeBold: vi.fn(),
      executeItalic: vi.fn(),
      executeUnderline: vi.fn(),
      executeUndo: vi.fn(),
      executeRedo: vi.fn(),
      executePrint: vi.fn(),
      executeRowFlex: vi.fn(),
      executeSizeMinus: vi.fn(),
      executeSizeAdd: vi.fn(),
    },
  };
}

function Harness({
  bridge,
  onSave,
  readOnly,
}: {
  bridge: ReturnType<typeof createBridge> | null;
  onSave?: () => void;
  readOnly?: boolean;
}) {
  const scopeRef = useRef<HTMLDivElement>(null);
  useWordEditorShortcuts({ bridge: bridge as any, onSave, scopeRef, readOnly });
  return (
    <div ref={scopeRef} data-testid="scope">
      <input data-testid="editable-input" />
    </div>
  );
}

function dispatchKey(target: EventTarget, eventInit: KeyboardEventInit) {
  target.dispatchEvent(new KeyboardEvent('keydown', eventInit));
}

afterEach(() => {
  document.querySelectorAll('[data-testid]').forEach(() => undefined);
});

describe('useWordEditorShortcuts', () => {
  it('executes bold on Cmd/Ctrl+B inside scope', () => {
    const bridge = createBridge();
    const { container } = render(<Harness bridge={bridge} />);

    dispatchKey(container.querySelector('[data-testid="scope"]')!, {
      key: 'b',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });

    expect(bridge.command.executeBold).toHaveBeenCalledTimes(1);
  });

  it('ignores keys from editable targets', () => {
    const bridge = createBridge();
    const { container } = render(<Harness bridge={bridge} />);

    const input = container.querySelector('[data-testid="editable-input"]') as HTMLInputElement;
    dispatchKey(input, { key: 'b', metaKey: true, bubbles: true });

    expect(bridge.command.executeBold).not.toHaveBeenCalled();
  });

  it('ignores keys when readOnly', () => {
    const bridge = createBridge();
    const { container } = render(<Harness bridge={bridge} readOnly />);

    dispatchKey(container.querySelector('[data-testid="scope"]')!, {
      key: 'b',
      metaKey: true,
      bubbles: true,
    });

    expect(bridge.command.executeBold).not.toHaveBeenCalled();
  });

  it('triggers onSave on Cmd/Ctrl+S', () => {
    const onSave = vi.fn();
    const { container } = render(<Harness bridge={createBridge()} onSave={onSave} />);

    dispatchKey(container.querySelector('[data-testid="scope"]')!, {
      key: 's',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('does not prevent the browser default for Ctrl+F', () => {
    const { container } = render(<Harness bridge={createBridge()} />);

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    container.querySelector('[data-testid="scope"]')!.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});
