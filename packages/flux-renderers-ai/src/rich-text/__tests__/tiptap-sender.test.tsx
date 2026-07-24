import { afterEach, describe, it, expect, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { createTiptapSender } from '../index.js';
import type { TiptapSenderOptions } from '../types.js';
import type { AiSenderExtensionProps } from '../../schemas.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

function makeProps(overrides?: Partial<AiSenderExtensionProps>): AiSenderExtensionProps {
  return {
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
    placeholder: 'Type a message…',
    maxLength: undefined,
    showWordLimit: false,
    submitType: 'enter',
    disabled: false,
    ...overrides,
  };
}

function makeOptions(overrides?: Partial<TiptapSenderOptions>): TiptapSenderOptions {
  return { ...overrides };
}

/** Box object that captures the editor instance when Tiptap calls `onReady`. */
interface EditorBox {
  current: Editor | null;
}

function captureEditor(): { options: TiptapSenderOptions; box: EditorBox } {
  const box: EditorBox = { current: null };
  return {
    box,
    options: {
      onReady: (e: Editor) => {
        box.current = e;
      },
    },
  };
}

/** Wait for the captured editor to be populated. */
async function waitForEditor(box: EditorBox): Promise<Editor> {
  for (let i = 0; i < 50; i++) {
    if (box.current) return box.current;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
  }
  throw new Error('Editor did not become ready in time');
}

describe('createTiptapSender — Phase 2 StarterKit editor', () => {
  it('renders a Tiptap editor surface with the ai-sender-tiptap marker', () => {
    const Sender = createTiptapSender();
    const props = makeProps();
    const { container } = render(<Sender {...props} />);
    const surface = container.querySelector('[data-slot="ai-sender-tiptap"]');
    expect(surface).not.toBeNull();
    const editable = container.querySelector('.ProseMirror');
    expect(editable).not.toBeNull();
  });

  it('initial value is rendered as the editor content (plain text round-trip)', async () => {
    const Sender = createTiptapSender();
    const props = makeProps({ value: 'hello world' });
    const { container } = render(<Sender {...props} />);
    const editable = container.querySelector('.ProseMirror') as HTMLElement;
    await act(async () => Promise.resolve());
    expect(editable.textContent).toContain('hello world');
  });

  it('emits onChange with plain text when the editor content changes', async () => {
    const { options: captureOpts, box } = captureEditor();
    const Sender = createTiptapSender(makeOptions(captureOpts));
    const onChange = vi.fn();
    const props = makeProps({ onChange });
    render(<Sender {...props} />);
    const editor = await waitForEditor(box);

    await act(async () => {
      editor.commands.focus();
      editor.commands.insertContent('hello world');
    });
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(String(lastCall)).toContain('hello world');
  });

  it('Enter key triggers onSubmit (submitType=enter)', async () => {
    const Sender = createTiptapSender();
    const onSubmit = vi.fn();
    const props = makeProps({ onSubmit, submitType: 'enter' });
    const { container } = render(<Sender {...props} />);
    const editable = container.querySelector('.ProseMirror') as HTMLElement;
    await act(async () => {
      fireEvent.keyDown(editable, { key: 'Enter', shiftKey: false });
    });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('Shift+Enter does not submit when submitType=enter', async () => {
    const Sender = createTiptapSender();
    const onSubmit = vi.fn();
    const props = makeProps({ onSubmit, submitType: 'enter' });
    const { container } = render(<Sender {...props} />);
    const editable = container.querySelector('.ProseMirror') as HTMLElement;
    await act(async () => {
      fireEvent.keyDown(editable, { key: 'Enter', shiftKey: true });
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables the editable surface when loading is true', () => {
    const Sender = createTiptapSender();
    const props = makeProps({ loading: true });
    const { container } = render(<Sender {...props} />);
    const editable = container.querySelector('.ProseMirror') as HTMLElement;
    expect(editable.getAttribute('contenteditable')).toBe('false');
  });

  it('clears the editor when the parent resets value to empty (clearOnSubmit mirror)', async () => {
    const Sender = createTiptapSender();
    const onChange = vi.fn();
    const props = makeProps({ value: 'initial text', onChange });
    const { container, rerender } = render(<Sender {...props} />);
    const editable = container.querySelector('.ProseMirror') as HTMLElement;
    expect(editable.textContent).toContain('initial text');
    rerender(<Sender {...makeProps({ value: '', onChange })} />);
    await act(async () => Promise.resolve());
    expect(editable.textContent).toBe('');
  });

  it('Ctrl/Cmd+Enter submits when submitType=ctrlEnter', async () => {
    const Sender = createTiptapSender();
    const onSubmit = vi.fn();
    const props = makeProps({ onSubmit, submitType: 'ctrlEnter' });
    const { container } = render(<Sender {...props} />);
    const editable = container.querySelector('.ProseMirror') as HTMLElement;
    await act(async () => {
      // Mod-Enter covers both Ctrl (win/linux) and Cmd (mac).
      fireEvent.keyDown(editable, { key: 'Enter', ctrlKey: true });
    });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('N-2: focused Enter submit clears the editor surface (FP-2)', async () => {
    const { options: captureOpts, box } = captureEditor();
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    const Sender = createTiptapSender(makeOptions(captureOpts));
    const props = makeProps({ onSubmit, onChange, submitType: 'enter' });
    const { container } = render(<Sender {...props} />);
    const editor = await waitForEditor(box);
    const editable = container.querySelector('.ProseMirror') as HTMLElement;

    // Type real content while focused.
    await act(async () => {
      editor.commands.focus();
      editor.commands.insertContent('hello world');
    });
    expect(editable.textContent).toContain('hello world');

    // Enter submit while the editor is focused.
    await act(async () => {
      fireEvent.keyDown(editable, { key: 'Enter', shiftKey: false });
    });

    // FP-2: the editor surface was cleared immediately by the keymap (it is
    // still focused — the parent's external-clear effect would have skipped
    // this case, so the clear must come from the keymap itself).
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(editable.textContent).toBe('');
    // The empty-clear was relayed to onChange so the parent draft syncs.
    const lastChange = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(String(lastChange)).toBe('');
  });

  it('N-2: focused Enter does NOT clear when clearOnSubmit is false', async () => {
    const { options: captureOpts, box } = captureEditor();
    const onSubmit = vi.fn();
    const Sender = createTiptapSender(makeOptions(captureOpts));
    const props = makeProps({ onSubmit, submitType: 'enter', clearOnSubmit: false });
    const { container } = render(<Sender {...props} />);
    const editor = await waitForEditor(box);
    const editable = container.querySelector('.ProseMirror') as HTMLElement;

    await act(async () => {
      editor.commands.focus();
      editor.commands.insertContent('keep me');
    });
    await act(async () => {
      fireEvent.keyDown(editable, { key: 'Enter', shiftKey: false });
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    // clearOnSubmit=false → editor keeps its content.
    expect(editable.textContent).toContain('keep me');
  });
});
