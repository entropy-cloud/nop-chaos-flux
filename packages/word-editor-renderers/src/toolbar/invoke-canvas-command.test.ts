// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { invokeCanvasCommand } from './invoke-canvas-command.js';

function makeEnv(notify: RendererEnv['notify']): RendererEnv {
  return { notify } as unknown as RendererEnv;
}

describe('invokeCanvasCommand', () => {
  it('notifies with warning carrying the error message when the command throws', () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    const notify = vi.fn();

    invokeCanvasCommand(makeEnv(notify), () => {
      throw new Error('no editable range');
    });

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('warning', 'no editable range');
  });

  it('falls back to the generic canvas failure message for non-Error throws', () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    const notify = vi.fn();

    invokeCanvasCommand(makeEnv(notify), () => {
      throw 'boom';
    });

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('warning', 'Canvas command failed');
  });

  it('does not notify when the command succeeds', () => {
    const notify = vi.fn();

    invokeCanvasCommand(makeEnv(notify), () => undefined);

    expect(notify).not.toHaveBeenCalled();
  });

  it('tolerates a missing env without throwing', () => {
    expect(() =>
      invokeCanvasCommand(undefined, () => {
        throw new Error('rejected');
      }),
    ).not.toThrow();
  });
});
