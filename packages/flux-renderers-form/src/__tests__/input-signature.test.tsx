import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formStateProbeRenderer } from './form-test-support.js';

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetFluxI18n();
});

function fake2d() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
  };
}

function stubCanvas(context: ReturnType<typeof fake2d> | null) {
  const ctxSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context as unknown as CanvasRenderingContext2D);
  const dataUrlSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
    .mockReturnValue('data:image/png;base64,FAKE');
  return { ctxSpy, dataUrlSpy };
}

/** Image stub whose onload/onerror fire asynchronously based on the src marker. */
function stubImage(mode: 'load' | 'error') {
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) {
      setTimeout(() => {
        if (mode === 'load' && !value.includes('BAD')) {
          this.onload?.();
        }
        if (mode === 'error' || value.includes('BAD')) {
          this.onerror?.();
        }
      }, 0);
    }
  }
  vi.stubGlobal('Image', FakeImage);
}

function renderSignatureForm(body: Array<Record<string, unknown>>) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer, buttonRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/input-signature"
      schema={{ type: 'form', body } as unknown as BaseSchema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function probeText(name: string): string | undefined {
  return document.querySelector(`[data-testid="form-state:${name}"]`)?.textContent;
}

describe('input-signature renderer (missing-components L2.3, plan 507)', () => {
  it('renders the canvas skeleton and toolbar with a faked 2d context', () => {
    stubCanvas(fake2d());
    renderSignatureForm([{ type: 'input-signature', name: 'sig', label: 'Signature' }]);

    expect(document.querySelector('[data-slot="signature-canvas"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="signature-undo"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="signature-clear"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="signature-unsupported"]')).toBeNull();
  });

  it('degrades without a 2d context: placeholder shown, toolbar hidden, no value', () => {
    stubCanvas(null);
    renderSignatureForm([
      { type: 'input-signature', name: 'sig2', label: 'Signature' },
      { type: 'form-state-probe', name: 'sig2' },
    ]);

    expect(document.querySelector('[data-slot="signature-unsupported"]')?.textContent).toContain(
      'Handwriting is not supported',
    );
    expect(document.querySelector('[data-slot="signature-toolbar"]')).toBeNull();
    expect(probeText('sig2')).toBe('null');
  });

  it('clear button on an empty pad commits undefined (零笔画 ⇔ undefined)', async () => {
    stubCanvas(fake2d());
    renderSignatureForm([
      { type: 'input-signature', name: 'sig3', label: 'Signature', clearable: true },
      { type: 'form-state-probe', name: 'sig3' },
    ]);
    fireEvent.click(document.querySelector('[data-slot="signature-clear"]') as HTMLElement);
    await waitFor(() => expect(probeText('sig3')).toBe('null'));
  });

  it('clears the value through the component:clear handle', async () => {
    stubCanvas(fake2d());
    renderSignatureForm([
      { type: 'input-signature', name: 'sig4', label: 'Signature', value: 'data:image/png;base64,AAA', id: 'sig4-field' },
      { type: 'form-state-probe', name: 'sig4' },
      { type: 'button', label: 'clear-sig4', onClick: { action: 'component:clear', componentId: 'sig4-field' } },
    ]);
    fireEvent.click(document.querySelector('[data-slot="signature-clear"]') ? document.body : document.body);
    fireEvent.click(Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'clear-sig4') as HTMLElement);
    await waitFor(() => expect(probeText('sig4')).toBe('null'));
  });

  it('disables the toolbar and ignores interaction in disabled state', () => {
    stubCanvas(fake2d());
    renderSignatureForm([{ type: 'input-signature', name: 'sig5', label: 'Signature', disabled: true }]);
    expect(document.querySelector('[data-slot="signature-undo"]')?.hasAttribute('disabled')).toBe(true);
    expect(document.querySelector('[data-slot="signature-clear"]')?.hasAttribute('disabled')).toBe(true);
  });

  it('echoes an initial dataURL by drawing it onto the canvas (Image.onload path)', async () => {
    const context = fake2d();
    stubCanvas(context);
    stubImage('load');
    renderSignatureForm([
      { type: 'input-signature', name: 'sig6', label: 'Signature', value: 'data:image/png;base64,AAA' },
    ]);
    await waitFor(() => expect(context.drawImage).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('keeps the canvas blank for an invalid initial dataURL (Image onerror path)', async () => {
    const context = fake2d();
    stubCanvas(context);
    stubImage('load'); // src contains 'BAD' → onerror branch
    renderSignatureForm([
      { type: 'input-signature', name: 'sig7', label: 'Signature', value: 'data:image/png;base64,BAD' },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="signature-canvas"]')).toBeTruthy();
  });
});
