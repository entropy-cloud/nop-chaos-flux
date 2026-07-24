import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiSenderView } from '../ai-sender.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

/**
 * IME composition guard regression (O-3). CJK/Japanese/Korean input methods
 * dispatch `keydown(Enter, isComposing=true)` (or `keyCode===229`) when the
 * user confirms a candidate. The Textarea send path must NOT treat that as a
 * submit — otherwise every candidate confirmation misfires `onSubmit`.
 *
 * These tests dispatch synthetic KeyboardEvents with the composition markers
 * and assert `onSubmit` is suppressed, plus a non-composing Enter still
 * submits (no regression on the default `submitType:'enter'` path).
 */
describe('ai-sender — IME composition guard (O-3)', () => {
  it('does NOT submit on Enter while composing (isComposing=true)', async () => {
    const onSubmit = vi.fn();
    const { container } = render(<AiSenderView submitType="enter" onSubmit={onSubmit} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '你好' } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does NOT submit on Enter carrying keyCode 229 (legacy composition marker)', async () => {
    const onSubmit = vi.fn();
    const { container } = render(<AiSenderView submitType="enter" onSubmit={onSubmit} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '你好' } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 229 });
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits on Enter when NOT composing (no regression, explicit submitType)', async () => {
    const onSubmit = vi.fn();
    const { container } = render(<AiSenderView submitType="enter" onSubmit={onSubmit} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'hello' } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', isComposing: false });
    });
    expect(onSubmit).toHaveBeenCalledWith('hello');
  });

  it('submits on Enter by default when isComposing is absent (default submitType=enter)', async () => {
    const onSubmit = vi.fn();
    const { container } = render(<AiSenderView onSubmit={onSubmit} />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'hello' } });
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });
    expect(onSubmit).toHaveBeenCalledWith('hello');
  });
});
