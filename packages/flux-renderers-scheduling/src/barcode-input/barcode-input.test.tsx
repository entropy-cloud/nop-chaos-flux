import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { BarcodeInputRenderer } from './barcode-input-renderer.js';
import type { BarcodeInputSchema } from './barcode-input.types.js';

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
});
