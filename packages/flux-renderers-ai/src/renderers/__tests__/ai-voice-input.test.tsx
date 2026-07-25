import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, fireEvent, act } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { createMockRendererProps } from '../../test-support.js';
import { AiVoiceInputRenderer } from '../ai-voice-input.js';
import type { AiVoiceInputSchema } from '../../schemas.js';

initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

const Voice = AiVoiceInputRenderer as unknown as ComponentType<Record<string, unknown>>;

interface MockRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
}

function installMockSpeechRecognition(): {
  instances: MockRecognition[];
  setCtor: (ctor: unknown) => void;
  remove: () => void;
} {
  const instances: MockRecognition[] = [];
  function MockCtor(this: MockRecognition) {
    this.lang = '';
    this.continuous = false;
    this.interimResults = false;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.start = vi.fn();
    this.stop = vi.fn();
    this.abort = vi.fn();
    instances.push(this);
  }
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  w.SpeechRecognition = MockCtor;
  return {
    instances,
    setCtor: (ctor: unknown) => {
      w.SpeechRecognition = ctor;
    },
    remove: () => {
      delete w.SpeechRecognition;
      delete w.webkitSpeechRecognition;
    },
  };
}

beforeEach(() => {
  // Default: unsupported (no ctor) unless a test installs one.
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  delete w.SpeechRecognition;
  delete w.webkitSpeechRecognition;
});

afterEach(() => {
  cleanup();
});

function makeProps(overrides?: Partial<ReturnType<typeof createMockRendererProps<AiVoiceInputSchema>>>) {
  return createMockRendererProps<AiVoiceInputSchema>({
    schema: { type: 'ai-voice-input' },
    ...overrides,
  });
}

describe('ai-voice-input (Widget, A-15) — supported path', () => {
  it('renders the nop-ai-voice-input marker button and enters listening state on click', () => {
    const mock = installMockSpeechRecognition();
    const props = makeProps();
    const { container } = render(<Voice {...props} />);
    expect(container.querySelector('.nop-ai-voice-input')).not.toBeNull();
    const btn = container.querySelector('[data-slot="ai-voice-input"]') as HTMLElement;
    expect(btn.getAttribute('data-state')).toBe('idle');

    act(() => {
      fireEvent.click(btn);
    });
    expect(mock.instances.length).toBe(1);
    expect(mock.instances[0].start).toHaveBeenCalled();
    expect(btn.getAttribute('data-state')).toBe('listening');
    mock.remove();
  });

  it('emits onResult with the transcript from a final result', () => {
    const mock = installMockSpeechRecognition();
    const onResult = vi.fn();
    const props = makeProps({ events: { onResult } });
    const { container } = render(<Voice {...props} />);
    const btn = container.querySelector('[data-slot="ai-voice-input"]') as HTMLElement;
    act(() => {
      fireEvent.click(btn);
    });
    const recognition = mock.instances[0];
    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { 0: { transcript: 'hello world' }, isFinal: true },
        } as never,
      });
    });
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ transcript: 'hello world' }));
    mock.remove();
  });

  it('passes lang/continuous/interimResults through to the recognition instance', () => {
    const mock = installMockSpeechRecognition();
    const props = makeProps({
      props: { type: 'ai-voice-input', lang: 'zh-CN', continuous: true, interimResults: true } as never,
    });
    const { container } = render(<Voice {...props} />);
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="ai-voice-input"]') as HTMLElement);
    });
    expect(mock.instances[0].lang).toBe('zh-CN');
    expect(mock.instances[0].continuous).toBe(true);
    expect(mock.instances[0].interimResults).toBe(true);
    mock.remove();
  });
});

describe('ai-voice-input — Failure Path: voice-unsupported', () => {
  it('renders a disabled button + fires onError(unsupported) on mount when no SpeechRecognition', () => {
    const onError = vi.fn();
    const props = makeProps({ events: { onError } });
    const { container } = render(<Voice {...props} />);
    const btn = container.querySelector('[data-slot="ai-voice-input"]') as HTMLElement;
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(btn.getAttribute('data-unsupported')).toBe('');
    // The mount-time detection notifies the host once.
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ reason: 'unsupported' }));
  });
});

describe('ai-voice-input — Failure Path: voice-permission-denied', () => {
  it('fires onError(permission-denied) on a not-allowed error event', () => {
    const mock = installMockSpeechRecognition();
    const onError = vi.fn();
    const props = makeProps({ events: { onError } });
    const { container } = render(<Voice {...props} />);
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="ai-voice-input"]') as HTMLElement);
    });
    const recognition = mock.instances[0];
    act(() => {
      recognition.onerror?.({ error: 'not-allowed' });
    });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ reason: 'permission-denied' }));
    mock.remove();
  });
});

describe('ai-voice-input — Failure Path: voice-no-result', () => {
  it('fires onError(no-result) when recognition ends with no final transcript', () => {
    const mock = installMockSpeechRecognition();
    const onError = vi.fn();
    const props = makeProps({ events: { onError } });
    const { container } = render(<Voice {...props} />);
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="ai-voice-input"]') as HTMLElement);
    });
    const recognition = mock.instances[0];
    act(() => {
      recognition.onend?.();
    });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ reason: 'no-result' }));
    mock.remove();
  });

  // open-audit P2-2: a single failed session (e.g. `no-speech`) triggers both
  // `onerror` then `onend`. Without the `errorAlreadyFired` gate, `no-result`
  // is emitted twice. The gate must keep it to exactly one.
  it('emits no-result exactly once when onerror(no-speech) is followed by onend', () => {
    const mock = installMockSpeechRecognition();
    const onError = vi.fn();
    const props = makeProps({ events: { onError } });
    const { container } = render(<Voice {...props} />);
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="ai-voice-input"]') as HTMLElement);
    });
    const recognition = mock.instances[0];
    act(() => {
      recognition.onerror?.({ error: 'no-speech' });
      recognition.onend?.();
    });
    const noResultCalls = onError.mock.calls.filter((c) => c[0]?.reason === 'no-result');
    expect(noResultCalls.length).toBe(1);
    mock.remove();
  });

  it('emits no-result exactly once when a generic onerror is followed by onend', () => {
    const mock = installMockSpeechRecognition();
    const onError = vi.fn();
    const props = makeProps({ events: { onError } });
    const { container } = render(<Voice {...props} />);
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="ai-voice-input"]') as HTMLElement);
    });
    const recognition = mock.instances[0];
    act(() => {
      recognition.onerror?.({ error: 'audio-capture' });
      recognition.onend?.();
    });
    const noResultCalls = onError.mock.calls.filter((c) => c[0]?.reason === 'no-result');
    expect(noResultCalls.length).toBe(1);
    mock.remove();
  });
});

// INV-1 honesty for voice is enforced by `src/__tests__/contract-honesty.test.ts`,
// whose FORBIDDEN_GLOBAL_IO scanner does NOT include SpeechRecognition (adjudicated
// non-IO per improvement §5.3). The renderer calls the browser API directly.

// ============================================================================
// AI-04 (resource lifecycle): the microphone must be released on stop and on
// unmount, and no stale callbacks may fire after unmount.
// ============================================================================

describe('ai-voice-input — AI-04 resource lifecycle (microphone release)', () => {
  it('clicking stop while listening calls recognition.stop() (releases the mic)', () => {
    const mock = installMockSpeechRecognition();
    const props = makeProps();
    const { container } = render(<Voice {...props} />);
    const btn = container.querySelector('[data-slot="ai-voice-input"]') as HTMLElement;
    act(() => {
      fireEvent.click(btn);
    });
    expect(mock.instances[0].start).toHaveBeenCalled();
    // Click again to stop.
    act(() => {
      fireEvent.click(btn);
    });
    expect(mock.instances[0].stop).toHaveBeenCalledTimes(1);
    mock.remove();
  });

  it('unmounting while listening calls recognition.abort() (releases the mic)', () => {
    const mock = installMockSpeechRecognition();
    const props = makeProps();
    const { container, unmount } = render(<Voice {...props} />);
    const btn = container.querySelector('[data-slot="ai-voice-input"]') as HTMLElement;
    act(() => {
      fireEvent.click(btn);
    });
    unmount();
    expect(mock.instances[0].abort).toHaveBeenCalledTimes(1);
    mock.remove();
  });

  it('after unmount, recognition onresult/onerror no longer fire host callbacks', () => {
    const mock = installMockSpeechRecognition();
    const onResult = vi.fn();
    const onError = vi.fn();
    const props = makeProps({ events: { onResult, onError } });
    const { container, unmount } = render(<Voice {...props} />);
    const btn = container.querySelector('[data-slot="ai-voice-input"]') as HTMLElement;
    act(() => {
      fireEvent.click(btn);
    });
    const recognition = mock.instances[0];
    unmount();
    // Handlers were detached on unmount — invoking them is a no-op.
    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: { length: 1, 0: { 0: { transcript: 'ghost' }, isFinal: true } } as never,
      });
      recognition.onerror?.({ error: 'no-speech' });
      recognition.onend?.();
    });
    expect(onResult).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    mock.remove();
  });
});
