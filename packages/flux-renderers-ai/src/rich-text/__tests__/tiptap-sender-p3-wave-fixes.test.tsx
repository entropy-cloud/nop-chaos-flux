import { afterEach, describe, it, expect, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { createTiptapSender } from '../index.js';
import { insertTemplate } from '../extensions/template.js';
import type { TiptapSenderOptions, TiptapTemplateItem } from '../types.js';
import type { AiSenderExtensionProps } from '../../schemas.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

/**
 * Plan 488 Phase 3 wave A — ai package items:
 * - [G5-R5-视角3-02] a locked (disabled/loading) sender must not accept
 *   template inserts — button gate + insertTemplate editable guard.
 */

const templates: TiptapTemplateItem[] = [{ label: 'greet', content: '<p>Hello</p>' }];

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
  return {
    extensions: ['template'],
    templates,
    ...overrides,
  } as TiptapSenderOptions;
}

async function waitForTemplateButton(container: HTMLElement): Promise<HTMLButtonElement> {
  for (let i = 0; i < 50; i += 1) {
    const el = container.querySelector('[data-testid="ai-sender-template-greet"]') as
      | HTMLButtonElement
      | null;
    if (el) return el;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
  }
  throw new Error('template button never rendered');
}

describe('[G5-R5-视角3-02] locked sender gates template inserts', () => {
  it('loading disables the template buttons and the insert is a no-op', async () => {
    const Sender = createTiptapSender(makeOptions());
    const onChange = vi.fn();
    const { container } = render(<Sender {...makeProps({ loading: true, onChange })} />);
    const tplButton = await waitForTemplateButton(container);
    expect(tplButton.disabled).toBe(true);

    // even a forced click cannot write: the editor is not editable and the
    // insert primitive re-checks editability.
    fireEvent.click(tplButton);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    const wroteHello = onChange.mock.calls.some((call) => String(call[0]).includes('Hello'));
    expect(wroteHello).toBe(false);
  });

  it('insertTemplate refuses to write into a non-editable editor (primitive guard)', () => {
    const insertContent = vi.fn();
    const makeFake = (isEditable: boolean) => {
      const chain: Record<string, unknown> = {};
      chain.focus = () => chain;
      chain.insertContent = (...args: unknown[]) => {
        insertContent(...(args as []));
        return chain;
      };
      chain.run = () => true;
      return { isEditable, chain: () => chain } as unknown as Editor;
    };

    insertTemplate(makeFake(false), templates[0]!);
    expect(insertContent).not.toHaveBeenCalled();

    insertTemplate(makeFake(true), templates[0]!);
    expect(insertContent).toHaveBeenCalledWith('<p>Hello</p>');
  });

  it('unlocked sender keeps the template insert working (behavior preserved)', async () => {
    const Sender = createTiptapSender(makeOptions());
    const onChange = vi.fn();
    const { container } = render(<Sender {...makeProps({ onChange })} />);
    const tplButton = await waitForTemplateButton(container);
    expect(tplButton.disabled).toBe(false);
    fireEvent.click(tplButton);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(String(lastCall)).toContain('Hello');
  });
});
