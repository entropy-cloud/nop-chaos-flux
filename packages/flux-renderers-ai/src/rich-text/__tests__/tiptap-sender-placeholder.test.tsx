import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { createTiptapSender } from '../index.js';
import type { AiSenderExtensionProps } from '../../schemas.js';

/**
 * R4 red-first proof (plan 480 Phase 1): the ai sender placeholder was a dead
 * face — the only CSS consumed `:empty`, which never matches a ProseMirror
 * content root that always renders an empty `<p>` child. These assertions pin
 * the fixed contract:
 *
 * 1. DOM structure: the Placeholder extension must decorate the empty
 *    paragraph with `data-placeholder` + `is-editor-empty` (visible-state hook
 *    for CSS), not a handwritten attribute on the content root.
 * 2. CSS contract: `src/styles.css` must consume that decoration with a
 *    `::before` rule and must NOT carry the dead `:empty` rule anymore.
 */

function makeProps(overrides?: Partial<AiSenderExtensionProps>): AiSenderExtensionProps {
  return {
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
    placeholder: 'Say something…',
    maxLength: undefined,
    showWordLimit: false,
    submitType: 'enter',
    disabled: false,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('R4 — ai sender placeholder visibility (plan 480 Phase 1)', () => {
  it('empty content decorates the empty paragraph with data-placeholder + is-editor-empty', async () => {
    const Sender = createTiptapSender();
    const { container } = render(<Sender {...makeProps()} />);
    await act(async () => Promise.resolve());
    const emptyNode = container.querySelector('.ProseMirror p.is-editor-empty');
    expect(emptyNode).not.toBeNull();
    expect(emptyNode?.getAttribute('data-placeholder')).toBe('Say something…');
  });

  it('content keeps no decoration once text is typed (placeholder hides)', async () => {
    const Sender = createTiptapSender();
    const { container } = render(<Sender {...makeProps({ value: 'typed' })} />);
    await act(async () => Promise.resolve());
    expect(container.querySelector('.ProseMirror p.is-editor-empty')).toBeNull();
  });

  it('styles.css consumes the decoration and the dead :empty rule is gone', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    // The dead rule (R4): `[data-placeholder]:empty::before` never matches —
    // ProseMirror always renders a `<p>` child, so the content root is never
    // `:empty`. Its reintroduction is a regression.
    expect(css).not.toMatch(/ai-sender-tiptap-content[^\n]*:empty::before/);
    // The live rule: placeholder text hooks the extension's is-editor-empty
    // decoration (token-driven color, pointer-events none).
    expect(css).toMatch(
      /\[data-slot='ai-sender-tiptap-content'\][^\n]*is-editor-empty[^\n]*::before\s*\{/,
    );
  });
});
