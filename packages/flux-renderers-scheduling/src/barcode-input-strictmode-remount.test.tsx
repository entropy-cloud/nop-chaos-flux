import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

const { checkCameraAvailability } = vi.hoisted(() => ({
  checkCameraAvailability: vi.fn(),
}));

vi.mock('./barcode-input/utils/camera-utils.js', () => ({ checkCameraAvailability }));
vi.mock('./barcode-input/barcode-scanner-overlay.js', () => ({
  BarcodeScannerOverlay: ({ open }: { open: boolean }) => (
    <div data-slot="barcode-scanner-overlay" data-open={open ? 'true' : 'false'} />
  ),
}));

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentForm: vi.fn(() => undefined),
  useCurrentFormState: vi.fn(() => ''),
  useCurrentFormError: vi.fn(() => undefined),
  useInputComponentHandle: vi.fn(),
  useRenderScope: vi.fn(() => ({ id: 's1' })),
  useRendererEnv: vi.fn(() => ({ fetcher: vi.fn() })),
}));

vi.mock('@nop-chaos/flux-i18n', () => ({
  useFluxTranslation: vi.fn(() => ({ t: (key: string) => key })),
}));

import { BarcodeInputRenderer } from './barcode-input/barcode-input.js';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// Plan 862 L3: barcode scanOnFocus must survive a StrictMode simulated
// unmount/remount — the mount marker is re-armed in the effect body.
describe('BarcodeInputRenderer scanOnFocus under StrictMode (plan 862 L3)', () => {
  it('focus opens the scanner overlay after StrictMode remount', async () => {
    checkCameraAvailability.mockResolvedValue({ isAvailable: true });

    const props = {
      id: 'bc1',
      props: { name: 'code', scanOnFocus: true },
      meta: { visible: true, hidden: false, disabled: false, changed: false },
      regions: {},
      events: {},
      helpers: {},
      node: { scope: { id: 's', path: '/p', value: {} } },
    } as unknown as Parameters<typeof BarcodeInputRenderer>[0];

    const view = render(
      <React.StrictMode>
        <BarcodeInputRenderer {...props} />
      </React.StrictMode>,
    );

    const input = view.container.querySelector('input') as HTMLInputElement;
    fireEvent.focus(input);

    await waitFor(() => {
      const overlay = view.container.querySelector('[data-slot="barcode-scanner-overlay"]');
      expect(overlay?.getAttribute('data-open')).toBe('true');
    });
  });
});
