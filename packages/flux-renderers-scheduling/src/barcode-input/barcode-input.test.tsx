import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { BarcodeInputRenderer } from './barcode-input.js';
import type { BarcodeInputSchema } from './barcode-input.types.js';

const mockUseInputComponentHandle = vi.hoisted(() => vi.fn());

const mockI18nT = vi.hoisted(() => vi.fn((key: string) => key));
vi.mock('@nop-chaos/flux-i18n', () => ({
  useFluxTranslation: () => ({ t: mockI18nT }),
  t: mockI18nT,
}));

vi.mock('./utils/camera-utils.js', () => ({
  checkCameraAvailability: vi.fn().mockResolvedValue({ isAvailable: true }),
}));

type FormStore = {
  getState: () => { values?: Record<string, unknown> };
  subscribe: (listener: () => void) => () => void;
};

const mockFormStoreState = { values: {} as Record<string, unknown> };
const mockFormListeners = new Set<() => void>();
const mockFormStore: FormStore = {
  getState: () => mockFormStoreState,
  subscribe: (l: () => void) => { mockFormListeners.add(l); return () => mockFormListeners.delete(l); },
};

function notifyFormStore() {
  mockFormListeners.forEach((l) => l());
}

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ dispatch: vi.fn() }),
  useRendererEnv: () => ({
    fetcher: vi.fn().mockResolvedValue({ status: 200, data: new ArrayBuffer(0) }),
  }),
  useRenderScope: () => ({ id: 'mock-scope', path: '/mock', readVisible: () => ({}), readOwn: () => ({}), update: vi.fn(), merge: vi.fn(), replace: vi.fn(), dispose: vi.fn() }),
  useCurrentComponentRegistry: () => undefined,
  useCurrentFormError: () => undefined,
  useCurrentForm: () => ({
    store: mockFormStore,
    setValue: (name: string, val: unknown) => {
      mockFormStoreState.values = { ...mockFormStoreState.values, [name]: val };
      notifyFormStore();
    },
  }),
  useInputComponentHandle: mockUseInputComponentHandle,
  useCurrentFormState: (selector: (state: { values?: Record<string, unknown> }) => string) => {
    const useSyncExternalStore = React.useSyncExternalStore;
    return useSyncExternalStore(
      mockFormStore.subscribe,
      () => selector(mockFormStoreState),
      () => selector(mockFormStoreState),
    );
  },
}));

vi.mock('./hooks/use-barcode-camera.js', () => ({
  useBarcodeCamera: () => ({
    videoRef: { current: null },
    isActive: false,
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

const mockDetectResult = vi.hoisted(() => ({ value: null as { barcode: string; format: string } | null }));

vi.mock('./hooks/use-barcode-detect.js', () => ({
  useBarcodeDetect: () => ({
    result: mockDetectResult.value,
    isScanning: false,
    error: null,
  }),
}));

function createMockProps(overrides?: Partial<RendererComponentProps<BarcodeInputSchema>>): RendererComponentProps<BarcodeInputSchema> {
  return {
    id: 'test-barcode-input',
    path: 'form.barcode',
    schema: { type: 'barcode-input', name: 'barcode' },
    templateNode: {} as any,
    node: {} as any,
    props: {
      name: 'barcode',
      label: 'Barcode',
      scanButton: true,
      ...overrides?.props,
    },
    meta: {
      visible: true,
      disabled: false,
      hidden: false,
      changed: false,
      cid: 1,
      className: '',
      ...overrides?.meta,
    },
    regions: {},
    events: overrides?.events ?? {},
    reactions: {},
    helpers: {
      dispatch: vi.fn(),
      render: vi.fn(),
      evaluate: vi.fn(),
      evaluateCompiled: vi.fn(),
      createScope: vi.fn() as any,
      disposeScope: vi.fn(),
      executeSource: vi.fn() as any,
    },
    ...overrides,
  } as unknown as RendererComponentProps<BarcodeInputSchema>;
}

describe('BarcodeInputRenderer', () => {
  // vitest globals 关闭时 RTL 不会自动 cleanup——不卸载则 overlay portal 节点
  // 残留 document.body，旧 hack 手动 .remove() 与 React 提交删除竞争（间歇性
  // "removeChild: node is not a child" DOMException）。显式 cleanup 让 React
  // 正常卸载树与 portal，根除该竞态。
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFormStoreState.values = {};
    mockFormListeners.clear();
    mockDetectResult.value = null;
  });

  it('should render barcode-input with scan button', () => {
    const props = createMockProps();
    render(<BarcodeInputRenderer {...props} />);
    const root = document.querySelector('[data-slot="barcode-input"]');
    expect(root).toBeTruthy();
    const scanBtn = document.querySelector('[data-slot="barcode-scan-button"]');
    expect(scanBtn).toBeTruthy();
  });

  it('should render input element', () => {
    const props = createMockProps();
    render(<BarcodeInputRenderer {...props} />);
    const root = document.querySelector('[data-slot="barcode-input"]');
    expect(root).toBeTruthy();
  });

  it('should hide scan button when scanButton is false', () => {
    const mockProps = createMockProps({ props: { name: 'barcode', scanButton: false } });
    const { container } = render(<BarcodeInputRenderer {...mockProps} />);
    const scanBtn = container.querySelector('[data-slot="barcode-scan-button"]');
    expect(scanBtn).toBeNull();
  });

  it('should return null when meta.visible is false', () => {
    const props = createMockProps({ meta: { visible: false, disabled: false, hidden: false, changed: false, cid: 1, className: '' } });
    const { container } = render(<BarcodeInputRenderer {...props} />);
    expect(container.innerHTML).toBe('');
  });

  it('should show clear button when clearable and value present', () => {
    mockFormStoreState.values = { barcode: 'test-value' };
    const props = createMockProps({
      props: { name: 'barcode', clearable: true },
    });
    const { container } = render(<BarcodeInputRenderer {...props} />);
    const clearBtn = container.querySelector('button[aria-label="flux.barcode.clearLabel"]');
    expect(clearBtn).toBeTruthy();
  });

  it('should render with onScan event without crashing', () => {
    const props = createMockProps({
      events: {
        onScan: vi.fn(),
      },
    });
    render(<BarcodeInputRenderer {...props} />);
    const root = document.querySelector('[data-slot="barcode-input"]');
    expect(root).toBeTruthy();
  });

  it('syncs inputValue from form store reactively - 04-01', () => {
    mockFormStoreState.values = { barcode: 'initial-value' };
    const props = createMockProps();
    const { container } = render(<BarcodeInputRenderer {...props} />);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input?.value).toBe('initial-value');

    mockFormStoreState.values = { barcode: 'updated-value' };
    act(() => { notifyFormStore(); });
    expect(input?.value).toBe('updated-value');
  });

  describe('Phase 1 — Imperative handles (scanNow / stopScan)', () => {
    it('registers useInputComponentHandle with scanNow and stopScan methods', () => {
      render(<BarcodeInputRenderer {...createMockProps()} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      expect(lastCall).toBeTruthy();
      expect(lastCall.methods).toContain('scanNow');
      expect(lastCall.methods).toContain('stopScan');
    });

    it('scanNow opens overlay when camera is available', async () => {
      render(<BarcodeInputRenderer {...createMockProps()} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      act(() => { lastCall.scanNow(); });
      await waitFor(() => {
        const overlay = document.querySelector('[data-slot="barcode-scanner-overlay"]');
        expect(overlay).toBeTruthy();
      });
    });

    it('stopScan closes overlay when previously opened', async () => {
      render(<BarcodeInputRenderer {...createMockProps()} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      act(() => { lastCall.scanNow(); });
      await waitFor(() => {
        const overlay = document.querySelector('[data-slot="barcode-scanner-overlay"]');
        expect(overlay).toBeTruthy();
      });
      act(() => { lastCall.stopScan(); });
      await waitFor(() => {
        expect(document.querySelector('[data-slot="barcode-scanner-overlay"]')).toBeFalsy();
      });
    });

    it('scanNow is idempotent — second call does not throw', async () => {
      render(<BarcodeInputRenderer {...createMockProps()} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      act(() => { lastCall.scanNow(); });
      await waitFor(() => {
        const overlay = document.querySelector('[data-slot="barcode-scanner-overlay"]');
        expect(overlay).toBeTruthy();
      });
      act(() => { lastCall.scanNow(); });
    });

    it('stopScan is idempotent — calling when already closed does not throw', () => {
      render(<BarcodeInputRenderer {...createMockProps()} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      expect(() => lastCall.stopScan()).not.toThrow();
    });
  });

  describe('Phase 2 — autoSubmit Mode', () => {
    it('accepts autoSubmit prop and renders without error', () => {
      const props = createMockProps({ props: { name: 'barcode', autoSubmit: true } });
      const { container } = render(<BarcodeInputRenderer {...props} />);
      expect(container.querySelector('[data-slot="barcode-input"]')).toBeTruthy();
    });
  });

  describe('Phase 3 — scanOnFocus PDA Mode', () => {
    it('accepts scanOnFocus prop and renders without error', () => {
      const props = createMockProps({ props: { name: 'barcode', scanOnFocus: true } });
      const { container } = render(<BarcodeInputRenderer {...props} />);
      expect(container.querySelector('[data-slot="barcode-input"]')).toBeTruthy();
    });

    it('focus opens overlay when scanOnFocus is enabled', async () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', scanOnFocus: true },
      })} />);

      const input = container.querySelector('input')!;
      expect(input).toBeTruthy();
      act(() => { input.focus(); });
      await waitFor(() => {
        expect(document.querySelector('[data-slot="barcode-scanner-overlay"]')).toBeTruthy();
      });
    });

    it('focus does not open overlay when scanOnFocus is disabled', () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps()} />);
      const input = container.querySelector('input')!;
      act(() => { input.focus(); });
      const overlay = document.querySelector('[data-slot="barcode-scanner-overlay"]');
      expect(overlay).toBeFalsy();
    });

    it('scan button renders when scanOnFocus is enabled', () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', scanOnFocus: true },
      })} />);
      const scanBtn = container.querySelector('[data-slot="barcode-scan-button"]');
      expect(scanBtn).toBeTruthy();
    });
  });

  describe('Phase 4 — resetWasmPromise Handle', () => {
    it('registers resetWasmPromise handle method', () => {
      render(<BarcodeInputRenderer {...createMockProps()} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      expect(lastCall.methods).toContain('resetWasmPromise');
      expect(typeof lastCall.resetWasmPromise).toBe('function');
    });

    it('resetWasmPromise handle does not throw when called', () => {
      render(<BarcodeInputRenderer {...createMockProps()} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      expect(() => lastCall.resetWasmPromise()).not.toThrow();
    });
  });

  describe('Phase 5 — handleChange Validation (B-OP-09)', () => {
    it('should allow typing below minLength via form.setValue (no onChange guard)', () => {
      mockFormStoreState.values = { barcode: '' };
      const props = createMockProps({
        props: { name: 'barcode', minLength: 4 },
      });
      const { container } = render(<BarcodeInputRenderer {...props} />);

      mockFormStoreState.values = { barcode: 'ab' };
      act(() => { notifyFormStore(); });

      const input = container.querySelector('input')!;
      expect(input.value).toBe('ab');
    });
  });

  describe('Phase 6 — i18n ARIA labels', () => {
    it('should render clear button with correct i18n aria-label key', () => {
      mockFormStoreState.values = { barcode: 'test-value' };
      const props = createMockProps({
        props: { name: 'barcode', clearable: true },
      });
      const { container } = render(<BarcodeInputRenderer {...props} />);
      const clearBtn = container.querySelector('button[aria-label="flux.barcode.clearLabel"]');
      expect(clearBtn).toBeTruthy();
    });

    it('should render scan button with correct i18n aria-label key', () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps()} />);
      const scanBtn = container.querySelector('button[aria-label="flux.barcode.scanBarcodeLabel"]');
      expect(scanBtn).toBeTruthy();
    });

    it('should use resolved translation when t returns localized string', () => {
      mockI18nT.mockImplementation((key: string) => {
        if (key === 'flux.barcode.clearLabel') return '清除';
        return key;
      });

      mockFormStoreState.values = { barcode: 'test-value' };
      const props = createMockProps({
        props: { name: 'barcode', clearable: true },
      });
      const { container } = render(<BarcodeInputRenderer {...props} />);
      const clearBtn = container.querySelector('button[aria-label="清除"]');
      expect(clearBtn).toBeTruthy();
      expect(mockI18nT).toHaveBeenCalledWith('flux.barcode.clearLabel');

      mockI18nT.mockImplementation((key: string) => key);
    });
  });

  describe('Phase 7 — Validation Props (F-61)', () => {
    async function scanViaButton(container: HTMLElement): Promise<void> {
      const scanBtn = container.querySelector('[data-slot="barcode-scan-button"]') as HTMLElement;
      expect(scanBtn).toBeTruthy();
      act(() => { scanBtn.click(); });
      // Single-scan mode closes the overlay right after consuming a result,
      // so wait for the overlay OR the consumed-result side-effect.
      await waitFor(() => {
        const overlay = document.querySelector('[data-slot="barcode-scanner-overlay"]');
        const errorEl = container.querySelector('[data-slot="barcode-validation-error"]');
        expect(overlay || errorEl).toBeTruthy();
      });
    }

    it('should show validation error when required is true and scanned value is empty', async () => {
      mockDetectResult.value = { barcode: '', format: 'qr_code' };
      const { container } = render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', required: true },
      })} />);
      await scanViaButton(container);
      await waitFor(() => {
        const errEl = container.querySelector('[data-slot="barcode-validation-error"]');
        expect(errEl).toBeTruthy();
        expect(errEl?.textContent).toContain('required');
      });
    });

    it('should show validation error when scanned value is below minLength', async () => {
      mockDetectResult.value = { barcode: 'AB', format: 'qr_code' };
      const { container } = render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', minLength: 4 },
      })} />);
      await scanViaButton(container);
      await waitFor(() => {
        const errEl = container.querySelector('[data-slot="barcode-validation-error"]');
        expect(errEl).toBeTruthy();
        expect(errEl?.textContent).toContain('minLength');
      });
    });

    it('should show validation error when scanned value exceeds maxLength', async () => {
      mockDetectResult.value = { barcode: '123456', format: 'qr_code' };
      const { container } = render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', maxLength: 5 },
      })} />);
      await scanViaButton(container);
      await waitFor(() => {
        const errEl = container.querySelector('[data-slot="barcode-validation-error"]');
        expect(errEl).toBeTruthy();
        expect(errEl?.textContent).toContain('maxLength');
      });
    });

    it('should show pattern mismatch for a non-matching scan and accept a matching one', async () => {
      mockDetectResult.value = { barcode: 'ABC', format: 'qr_code' };
      const { container } = render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', pattern: '^[0-9]+$' },
      })} />);
      await scanViaButton(container);
      await waitFor(() => {
        const errEl = container.querySelector('[data-slot="barcode-validation-error"]');
        expect(errEl).toBeTruthy();
        expect(errEl?.textContent).toContain('pattern');
      });
      // Matching scan clears the error.
      mockDetectResult.value = { barcode: '123', format: 'qr_code' };
      act(() => { document.querySelector('[data-slot="barcode-scanner-overlay"]')?.remove(); });
      const scanBtn = container.querySelector('[data-slot="barcode-scan-button"]') as HTMLElement;
      act(() => { scanBtn.click(); });
      await waitFor(() => {
        expect(container.querySelector('[data-slot="barcode-validation-error"]')).toBeFalsy();
      });
    });

    it('should show validate.message when the validate prop declares one', async () => {
      mockDetectResult.value = { barcode: 'AB12', format: 'qr_code' };
      const { container } = render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', validate: { action: { actionType: 'custom', args: {} } as any, message: 'Invalid barcode' } },
      })} />);
      await scanViaButton(container);
      await waitFor(() => {
        const errEl = container.querySelector('[data-slot="barcode-validation-error"]');
        expect(errEl).toBeTruthy();
        expect(errEl?.textContent).toContain('Invalid barcode');
      });
    });

    it('should clear validation error on input change', async () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', minLength: 4 },
      })} />);
      const input = container.querySelector('input')!;
      act(() => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        nativeInputValueSetter.call(input, 'new-value');
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      // No validation error since user is typing (handleChange clears error)
      expect(container.querySelector('[data-slot="barcode-validation-error"]')).toBeFalsy();
    });
  });

  describe('Phase 8 — readOnly Gate (F-24)', () => {
    it('should render input with readOnly attribute when readOnly is true', () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', readOnly: true },
      })} />);
      const input = container.querySelector('input') as HTMLInputElement;
      expect(input?.readOnly).toBe(true);
    });

    it('should not open overlay on focus when readOnly is true', async () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', readOnly: true, scanOnFocus: true },
      })} />);
      const input = container.querySelector('input')!;
      act(() => { input.focus(); });
      await waitFor(() => {
        expect(document.querySelector('[data-slot="barcode-scanner-overlay"]')).toBeFalsy();
      });
    });

    it('should not open overlay on scan click when readOnly is true', async () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', readOnly: true },
      })} />);
      const scanBtn = container.querySelector('[data-slot="barcode-scan-button"]');
      if (scanBtn) {
        act(() => { (scanBtn as HTMLButtonElement).click(); });
        await waitFor(() => {
          expect(document.querySelector('[data-slot="barcode-scanner-overlay"]')).toBeFalsy();
        });
      }
    });
  });

  describe('Phase 9 — scanNow in readOnly mode', () => {
    it('scanNow should not open overlay when readOnly is true', async () => {
      render(<BarcodeInputRenderer {...createMockProps({
        props: { name: 'barcode', readOnly: true },
      })} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      const result = lastCall.scanNow();
      expect(result).toEqual({ success: false, error: 'flux.barcode.readOnlyField' });
      await waitFor(() => {
        expect(document.querySelector('[data-slot="barcode-scanner-overlay"]')).toBeFalsy();
      });
    });
  });

  describe('Phase 10 — scannerError clear path (CR P2-4)', () => {
    async function triggerScannerError(container: HTMLElement) {
      const scanBtn = container.querySelector('[data-slot="barcode-scan-button"]') as HTMLButtonElement;
      act(() => { scanBtn.click(); });
      await waitFor(() => {
        expect(container.querySelector('[data-slot="barcode-scanner-error"]')).toBeTruthy();
      });
    }

    beforeEach(async () => {
      const { checkCameraAvailability } = await import('./utils/camera-utils.js');
      vi.mocked(checkCameraAvailability).mockRejectedValueOnce(new Error('camera unavailable'));
    });

    it('a scanNow retry clears a previously shown scanner error', async () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps()} />);
      await triggerScannerError(container);

      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      act(() => { lastCall.scanNow(); });
      await waitFor(() => {
        expect(container.querySelector('[data-slot="barcode-scanner-error"]')).toBeNull();
      });
    });

    it('the clear handle resets a previously shown scanner error', async () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps()} />);
      await triggerScannerError(container);

      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      act(() => { lastCall.clearValue(); });
      await waitFor(() => {
        expect(container.querySelector('[data-slot="barcode-scanner-error"]')).toBeNull();
      });
    });

    it('typing a new value clears a previously shown scanner error', async () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps()} />);
      await triggerScannerError(container);

      const input = container.querySelector('input') as HTMLInputElement;
      act(() => { fireEvent.change(input, { target: { value: '6901234567892' } }); });
      await waitFor(() => {
        expect(container.querySelector('[data-slot="barcode-scanner-error"]')).toBeNull();
      });
    });
  });
});
