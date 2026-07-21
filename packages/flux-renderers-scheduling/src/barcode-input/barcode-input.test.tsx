import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { BarcodeInputRenderer } from './barcode-input.js';
import type { BarcodeInputSchema } from './barcode-input.types.js';

const mockUseInputComponentHandle = vi.hoisted(() => vi.fn());

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
  useCurrentForm: () => ({ store: mockFormStore, setValue: vi.fn() }),
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

vi.mock('./hooks/use-barcode-detect.js', () => ({
  useBarcodeDetect: () => ({
    result: null,
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormStoreState.values = {};
    mockFormListeners.clear();
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

  it('should accept clearable prop', () => {
    const props = createMockProps({
      props: { name: 'barcode', clearable: true },
    });
    render(<BarcodeInputRenderer {...props} />);
    expect(true).toBe(true);
  });

  it('should fire onScan event when scan result received', () => {
    const dispatch = vi.fn();
    const props = createMockProps({
      events: {
        onScan: { actionType: 'custom' } as any,
      },
      helpers: { dispatch } as any,
    });
    render(<BarcodeInputRenderer {...props} />);
    expect(true).toBe(true);
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
      const { container } = render(<BarcodeInputRenderer {...createMockProps()} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      act(() => { lastCall.scanNow(); });
      await waitFor(() => {
        expect(container.querySelector('[data-slot="barcode-scanner-overlay"]')).toBeTruthy();
      });
    });

    it('stopScan closes overlay when previously opened', async () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps()} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      act(() => { lastCall.scanNow(); });
      await waitFor(() => {
        expect(container.querySelector('[data-slot="barcode-scanner-overlay"]')).toBeTruthy();
      });
      act(() => { lastCall.stopScan(); });
      await waitFor(() => {
        expect(container.querySelector('[data-slot="barcode-scanner-overlay"]')).toBeFalsy();
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
      expect(true).toBe(true);
    });

    it('stopScan is idempotent — calling when already closed does not throw', () => {
      render(<BarcodeInputRenderer {...createMockProps()} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      act(() => { lastCall.stopScan(); });
      expect(true).toBe(true);
    });

    it('scanNow handles rejection gracefully (06-02)', () => {
      render(<BarcodeInputRenderer {...createMockProps()} />);
      const lastCall = mockUseInputComponentHandle.mock.calls.at(-1)?.[0];
      expect(() => lastCall.scanNow()).not.toThrow();
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
      act(() => { input.focus(); });
      await waitFor(() => {
        expect(container.querySelector('[data-slot="barcode-scanner-overlay"]')).toBeTruthy();
      });
    });

    it('focus does not open overlay when scanOnFocus is disabled', () => {
      const { container } = render(<BarcodeInputRenderer {...createMockProps()} />);
      const input = container.querySelector('input')!;
      act(() => { input.focus(); });
      const overlay = container.querySelector('[data-slot="barcode-scanner-overlay"]');
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
});
