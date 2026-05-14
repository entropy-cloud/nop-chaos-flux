// @vitest-environment happy-dom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import * as FluxReact from '@nop-chaos/flux-react';
import { InsertControls } from '../toolbar/insert-controls.js';

describe('InsertControls', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('notifies when image read fails', () => {
    const notify = vi.fn();
    vi.spyOn(FluxReact, 'useRendererEnv').mockReturnValue({ notify } as any);

    class FailingFileReader {
      result: string | ArrayBuffer | null = null;
      error = new Error('Image read failed');
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      onabort: null | (() => void) = null;
      readAsDataURL() {
        this.onerror?.();
      }
    }

    vi.stubGlobal('FileReader', FailingFileReader as any);

    render(<InsertControls bridge={null} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'x.png', { type: 'image/png' })] } });

    expect(notify).toHaveBeenCalledWith('warning', 'Image read failed');
  });

  it('notifies when image insertion command throws', () => {
    const notify = vi.fn();
    vi.spyOn(FluxReact, 'useRendererEnv').mockReturnValue({ notify } as any);

    class SuccessFileReader {
      result: string | ArrayBuffer | null = 'data:image/png;base64,abc';
      error: Error | null = null;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      onabort: null | (() => void) = null;
      readAsDataURL() {
        this.onload?.();
      }
    }

    vi.stubGlobal('FileReader', SuccessFileReader as any);

    render(
      <InsertControls
        bridge={{
          command: {
            executeImage: () => {
              throw new Error('Insert image failed');
            },
          },
        } as any}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'x.png', { type: 'image/png' })] } });

    expect(notify).toHaveBeenCalledWith('warning', 'Insert image failed');
  });
});
