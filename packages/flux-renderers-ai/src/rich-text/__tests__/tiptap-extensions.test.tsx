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
    placeholder: 'Type…',
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

const MENTIONS = [
  { id: 'u1', label: 'alice' },
  { id: 'u2', label: 'bob' },
  { id: 'u3', label: 'alex' },
];

const TEMPLATES = [
  { label: 'Greeting', content: 'Hello there!' },
  { label: 'Summary', content: 'In summary:' },
];

const SLASH_COMMANDS = [
  { label: 'summarize', insertText: 'Summarize this:' },
  { label: 'translate', insertText: 'Translate:' },
  { label: 'clear', action: vi.fn() },
];

describe('createTiptapSender — Phase 3 built-in extensions', () => {
  it('template bar renders when template extension is enabled with data', () => {
    const Sender = createTiptapSender({
      extensions: ['template'],
      templates: TEMPLATES,
    });
    const { container } = render(<Sender {...makeProps()} />);
    const bar = container.querySelector('[data-slot="ai-sender-tiptap-templates"]');
    expect(bar).not.toBeNull();
    expect(bar?.querySelectorAll('button').length).toBe(2);
  });

  it('template bar does NOT render when extensions is empty', () => {
    const Sender = createTiptapSender({ extensions: [] });
    const { container } = render(<Sender {...makeProps()} />);
    expect(container.querySelector('[data-slot="ai-sender-tiptap-templates"]')).toBeNull();
  });

  it('clicking a template button inserts its content at the caret', async () => {
    const { options: captureOpts, box } = captureEditor();
    const Sender = createTiptapSender({
      extensions: ['template'],
      templates: TEMPLATES,
      ...captureOpts,
    });
    const onChange = vi.fn();
    const { container } = render(<Sender {...makeProps({ onChange })} />);
    const editor = await waitForEditor(box);

    await act(async () => {
      editor.commands.focus();
    });
    const btn = container.querySelector('[data-testid="ai-sender-template-Greeting"]') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });
    // The editor now contains the template text → onChange was called with it.
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(String(lastCall)).toContain('Hello there!');
  });

  it('typing @ opens the mention popup with filtered candidates', async () => {
    const { options: captureOpts, box } = captureEditor();
    const Sender = createTiptapSender({
      extensions: ['mention'],
      mentions: MENTIONS,
      ...captureOpts,
    });
    const { container } = render(<Sender {...makeProps()} />);
    const editor = await waitForEditor(box);

    await act(async () => {
      editor.commands.focus();
      editor.commands.insertContent('@');
    });

    // Popup is rendered with all 3 mentions (empty query).
    const popup = container.querySelector('[data-slot="ai-sender-tiptap-popup"]');
    expect(popup).not.toBeNull();
    expect(popup?.getAttribute('data-popup-kind')).toBe('mention');
    expect(popup?.querySelectorAll('button[role="option"]').length).toBe(3);
  });

  it('typing @al filters mentions to alice + alex', async () => {
    const { options: captureOpts, box } = captureEditor();
    const Sender = createTiptapSender({
      extensions: ['mention'],
      mentions: MENTIONS,
      ...captureOpts,
    });
    const { container } = render(<Sender {...makeProps()} />);
    const editor = await waitForEditor(box);

    await act(async () => {
      editor.commands.focus();
      editor.commands.insertContent('@al');
    });

    const popup = container.querySelector('[data-slot="ai-sender-tiptap-popup"]');
    const items = popup?.querySelectorAll('button[role="option"]');
    expect(items?.length).toBe(2);
    expect(items?.[0]?.textContent).toContain('alice');
    expect(items?.[1]?.textContent).toContain('alex');
  });

  it('selecting a mention inserts @label into the editor (plain text)', async () => {
    const { options: captureOpts, box } = captureEditor();
    const onChange = vi.fn();
    const Sender = createTiptapSender({
      extensions: ['mention'],
      mentions: MENTIONS,
      ...captureOpts,
    });
    const { container } = render(<Sender {...makeProps({ onChange })} />);
    const editor = await waitForEditor(box);

    await act(async () => {
      editor.commands.focus();
      editor.commands.insertContent('@bo');
    });

    const popup = container.querySelector('[data-slot="ai-sender-tiptap-popup"]');
    const bobItem = popup?.querySelectorAll('button[role="option"]')[0] as HTMLButtonElement;
    expect(bobItem?.textContent).toContain('bob');
    await act(async () => {
      fireEvent.click(bobItem);
    });

    // The editor text now contains @bob (serialized as plain text).
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(String(lastCall)).toContain('@bob');
  });

  it('N-1: hovering a suggestion only highlights (updates activeIndex) — does NOT insert / commit (FP-1)', async () => {
    const { options: captureOpts, box } = captureEditor();
    const onChange = vi.fn();
    const Sender = createTiptapSender({
      extensions: ['mention'],
      mentions: MENTIONS,
      ...captureOpts,
    });
    const { container } = render(<Sender {...makeProps({ onChange })} />);
    const editor = await waitForEditor(box);

    await act(async () => {
      editor.commands.focus();
      editor.commands.insertContent('@al');
    });

    const popup = container.querySelector('[data-slot="ai-sender-tiptap-popup"]');
    const items = popup?.querySelectorAll('button[role="option"]');
    expect(items?.length).toBe(2); // alice (0) + alex (1)
    // Baseline: index 0 (alice) is the active item.
    expect(items?.[0]?.getAttribute('data-active')).toBe('');
    expect(items?.[1]?.getAttribute('data-active')).toBe(null);

    const onChangeBeforeHover = onChange.mock.calls.length;
    await act(async () => {
      // Hover the second item (alex) — must only move the highlight, NOT insert.
      fireEvent.mouseEnter(items![1] as HTMLButtonElement);
    });

    // activeIndex moved to 1 → alex is now the highlighted item.
    const itemsAfter = container.querySelector('[data-slot="ai-sender-tiptap-popup"]')?.querySelectorAll('button[role="option"]');
    expect(itemsAfter?.[1]?.getAttribute('data-active')).toBe('');
    expect(itemsAfter?.[0]?.getAttribute('data-active')).toBe(null);
    // No new onChange fired from the hover (no insert happened). The editor
    // text still ends with the trigger query, not with an inserted mention.
    expect(onChange.mock.calls.length).toBe(onChangeBeforeHover);
    // Popup still resident for click selection (not closed by hover).
    expect(container.querySelector('[data-slot="ai-sender-tiptap-popup"]')).not.toBeNull();

    // Sanity: clicking the highlighted item still commits (regression guard
    // for the wiring split — onSelect is still bound to commit, onHover is not).
    await act(async () => {
      fireEvent.click(itemsAfter![1] as HTMLButtonElement);
    });
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(String(lastCall)).toContain('@alex');
  });

  it('typing / opens the slash command popup', async () => {
    const { options: captureOpts, box } = captureEditor();
    const Sender = createTiptapSender({
      extensions: ['slash'],
      slashCommands: SLASH_COMMANDS,
      ...captureOpts,
    });
    const { container } = render(<Sender {...makeProps()} />);
    const editor = await waitForEditor(box);

    await act(async () => {
      editor.commands.focus();
      editor.commands.insertContent(' /');
    });

    const popup = container.querySelector('[data-slot="ai-sender-tiptap-popup"]');
    expect(popup).not.toBeNull();
    expect(popup?.getAttribute('data-popup-kind')).toBe('slash');
  });

  it('selecting a slash command with insertText inserts the text', async () => {
    const { options: captureOpts, box } = captureEditor();
    const onChange = vi.fn();
    const Sender = createTiptapSender({
      extensions: ['slash'],
      slashCommands: SLASH_COMMANDS,
      ...captureOpts,
    });
    const { container } = render(<Sender {...makeProps({ onChange })} />);
    const editor = await waitForEditor(box);

    await act(async () => {
      editor.commands.focus();
      editor.commands.insertContent(' /sum');
    });

    const popup = container.querySelector('[data-slot="ai-sender-tiptap-popup"]');
    const summarizeItem = popup?.querySelectorAll('button[role="option"]')[0] as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(summarizeItem);
    });
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(String(lastCall)).toContain('Summarize this:');
  });

  it('extension-data-missing: mention enabled but empty data source → no popup', async () => {
    const { options: captureOpts, box } = captureEditor();
    const Sender = createTiptapSender({
      extensions: ['mention'],
      mentions: [],
      ...captureOpts,
    });
    const { container } = render(<Sender {...makeProps()} />);
    const editor = await waitForEditor(box);

    await act(async () => {
      editor.commands.focus();
      editor.commands.insertContent('@');
    });
    expect(container.querySelector('[data-slot="ai-sender-tiptap-popup"]')).toBeNull();
  });

  it('all extensions disabled (empty extensions[]) → StarterKit only, no popups or bars', async () => {
    const Sender = createTiptapSender({ extensions: [] });
    const { container } = render(<Sender {...makeProps()} />);
    expect(container.querySelector('[data-slot="ai-sender-tiptap-templates"]')).toBeNull();
    expect(container.querySelector('[data-slot="ai-sender-tiptap-popup"]')).toBeNull();
  });
});
