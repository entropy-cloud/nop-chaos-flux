import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
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

function createMockProps(overrides?: {
  props?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  events?: Record<string, unknown>;
}): RendererComponentProps<BarcodeInputSchema> {
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
      clearable: true,
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
    events: (overrides?.events ?? {}) as any,
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
  } as unknown as RendererComponentProps<BarcodeInputSchema>;
}

// [G4-R4-视角3-01] (R2 consistency audit, P1): barcode-input consumed
// meta.disabled only on the input element — the scan button, clear button,
// scan-on-focus, scan completion and programmatic scanNow channels all kept
// rewriting a locked field (disabled-channel-block).
describe('[G4-R4-视角3-01] barcode-input secondary channels honor meta.disabled', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFormStoreState.values = { barcode: '6901234567892' };
    mockFormListeners.clear();
  });

  it('does not render the clear/scan channel buttons on a disabled field', () => {
    render(<BarcodeInputRenderer {...createMockProps({ meta: { disabled: true } })} />);

    expect(document.querySelector('[data-slot="barcode-clear-button"]')).toBeNull();
    expect(document.querySelector('[data-slot="barcode-scan-button"]')).toBeNull();
  });

  it('does not open the scanner when a disabled field is focused (scan-on-focus channel)', () => {
    render(<BarcodeInputRenderer {...createMockProps({ props: { scanOnFocus: true }, meta: { disabled: true } })} />);

    fireEvent.focus(document.querySelector('input')!);

    expect(document.querySelector('[data-slot="barcode-scanner-overlay"]')).toBeNull();
  });

  it('scanNow (programmatic channel) reports failure on a disabled field', () => {
    render(<BarcodeInputRenderer {...createMockProps({ meta: { disabled: true } })} />);

    const handleConfig = mockUseInputComponentHandle.mock.calls.at(-1)?.[0] as {
      scanNow: () => { success: boolean };
    };
    expect(handleConfig.scanNow().success).toBe(false);
  });

  it('clear/scan channels stay available on a live field (no regression)', () => {
    render(<BarcodeInputRenderer {...createMockProps()} />);

    expect(document.querySelector('[data-slot="barcode-clear-button"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="barcode-scan-button"]')).toBeTruthy();

    const handleConfig = mockUseInputComponentHandle.mock.calls.at(-1)?.[0] as {
      scanNow: () => { success: boolean; error?: string; pending?: boolean };
    };
    // camera availability is unresolved in the mock env → pending, but crucially
    // no disabled/readOnly error.
    expect(handleConfig.scanNow().error).toBeUndefined();
  });
});
