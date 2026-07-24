import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { AiSenderView } from '../ai-sender.js';
import type { AiSenderExtensionProps } from '../../schemas.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(() => {
  cleanup();
});

/**
 * Trivial stub extension component for the Phase 1 integration smoke test.
 * Mimics the surface a host-injected Tiptap editor would expose: emits
 * `onChange(text)` on input, calls `onSubmit()` on Enter, surfaces the
 * `loading` disabled state. No Tiptap dependency — the goal is to verify the
 * schema → `senderExtensions` → `AiSenderView` delegation chain before the
 * real editor lands (Phase 2).
 */
function StubExtension(props: AiSenderExtensionProps): React.ReactElement | null {
  return (
    <textarea
      data-testid="stub-extension"
      data-loading={props.loading ? 'true' : undefined}
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.loading || props.disabled}
      onChange={(e) => props.onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          props.onSubmit();
        }
      }}
    />
  );
}

describe('ai-sender P6 — extension delegation + Textarea fallback (Phase 1 smoke)', () => {
  it('renders the Textarea fallback when no extensionComponent is provided', () => {
    const { container } = render(<AiSenderView placeholder="fallback" submitType="enter" />);
    expect(container.querySelector('[data-slot="ai-sender"]')?.hasAttribute('data-extension')).toBe(false);
    expect(container.querySelector('textarea')).not.toBeNull();
    expect(container.querySelector('[data-testid="stub-extension"]')).toBeNull();
  });

  it('delegates to the extension component when extensionComponent is provided', () => {
    const onChange = vi.fn();
    const { container, getByTestId } = render(
      <AiSenderView
        placeholder="rich"
        submitType="enter"
        extensionComponent={StubExtension as ComponentType<AiSenderExtensionProps>}
        onChange={onChange}
      />,
    );
    const root = container.querySelector('[data-slot="ai-sender"]');
    expect(root?.hasAttribute('data-extension')).toBe(true);
    const stub = getByTestId('stub-extension') as HTMLTextAreaElement;
    expect(stub).not.toBeNull();
    expect(stub.placeholder).toBe('rich');

    fireEvent.change(stub, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('extension onSubmit path triggers the parent onSubmit handler with trimmed text', async () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(
      <AiSenderView
        extensionComponent={StubExtension as ComponentType<AiSenderExtensionProps>}
        onSubmit={onSubmit}
      />,
    );
    const stub = getByTestId('stub-extension') as HTMLTextAreaElement;
    fireEvent.change(stub, { target: { value: '  ping  ' } });
    await act(async () => {
      fireEvent.keyDown(stub, { key: 'Enter' });
    });
    expect(onSubmit).toHaveBeenCalledWith('ping');
  });

  it('submit button is disabled when the extension emits empty / whitespace draft', () => {
    const { container } = render(
      <AiSenderView extensionComponent={StubExtension as ComponentType<AiSenderExtensionProps>} />,
    );
    const submit = container.querySelector('[data-slot="ai-sender-submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });
});
