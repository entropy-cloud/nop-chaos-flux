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

interface EditorBox {
  current: Editor | null;
}

function captureEditor(): { options: TiptapSenderOptions; box: EditorBox } {
  const box: EditorBox = { current: null };
  return { box, options: { onReady: (e: Editor) => { box.current = e; } } };
}

async function waitForEditor(box: EditorBox): Promise<Editor> {
  for (let i = 0; i < 50; i++) {
    if (box.current) return box.current;
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  }
  throw new Error('Editor did not become ready in time');
}

/** Toggle ProseMirror's composition flag (jsdom fires no real composition
 * events, and `view.composing` is a getter-only property — shadow it with an
 * own data property on the instance). */
function setComposing(editor: Editor, value: boolean): void {
  Object.defineProperty(editor.view, 'composing', { value, configurable: true, writable: true });
}

/**
 * IME composition guard regression (O-3) — Tiptap send path.
 *
 * While a CJK/JA/KO input method is composing, ProseMirror sets
 * `view.composing = true` and the keydown carries `isComposing`. Both send
 * entry points (the Enter keymap and the popup-confirm `handleKeyDown`) must
 * refuse to submit / confirm so the IME can finish the candidate.
 */
describe('tiptap-sender — IME composition guard (O-3)', () => {
  it('Enter keymap does NOT submit while view.composing is true', async () => {
    const { options: captureOpts, box } = captureEditor();
    const Sender = createTiptapSender(captureOpts);
    const onSubmit = vi.fn();
    const { container } = render(<Sender {...makeProps({ onSubmit, submitType: 'enter' })} />);
    await waitForEditor(box);
    const editable = container.querySelector('.ProseMirror') as HTMLElement;

    setComposing(box.current!, true);
    await act(async () => {
      fireEvent.keyDown(editable, { key: 'Enter' });
    });
    expect(onSubmit).not.toHaveBeenCalled();

    // Restore + verify the non-composing path still submits (no regression).
    setComposing(box.current!, false);
    await act(async () => {
      fireEvent.keyDown(editable, { key: 'Enter' });
    });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('popup-confirm does NOT fire on a composing Enter (candidate confirmation)', async () => {
    const { options: captureOpts, box } = captureEditor();
    const Sender = createTiptapSender({
      extensions: ['mention'],
      mentions: [
        { id: 'u1', label: 'alice' },
        { id: 'u2', label: 'bob' },
      ],
      ...captureOpts,
    });
    const onSubmit = vi.fn();
    const { container } = render(<Sender {...makeProps({ onSubmit, submitType: 'enter' })} />);
    const editor = await waitForEditor(box);

    await act(async () => {
      editor.commands.focus();
      editor.commands.insertContent('@al');
    });
    const popup = container.querySelector('[data-slot="ai-sender-tiptap-popup"]');
    expect(popup).not.toBeNull();

    const editable = container.querySelector('.ProseMirror') as HTMLElement;
    setComposing(editor, true);
    await act(async () => {
      // Enter with isComposing = confirm candidate → must NOT confirm popup.
      fireEvent.keyDown(editable, { key: 'Enter', isComposing: true });
    });
    // No submit, and the active mention ('alice') was NOT inserted.
    expect(onSubmit).not.toHaveBeenCalled();
    expect(editor.getText()).not.toContain('alice');
  });
});
