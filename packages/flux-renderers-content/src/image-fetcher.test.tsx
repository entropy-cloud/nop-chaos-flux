import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createMockRendererProps } from './test-support.js';
import { ImageRenderer } from './image.js';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { ImageSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

describe('ImageRenderer — AbortController cleanup', () => {
  it('aborts in-flight dispatch on unmount', () => {
    let capturedSignal: AbortSignal | undefined;
    const helpers = {
      dispatch: vi.fn((_action: unknown, ctx?: { signal?: AbortSignal }) => {
        capturedSignal = ctx?.signal;
        return new Promise(() => {}); // never resolves
      }),
    };
    const props = createMockRendererProps<ImageSchema>({
      schema: { type: 'image' },
      props: { fetcher: { action: 'ajax', args: { url: '/api/image' } } },
      helpers: helpers as unknown as RendererComponentProps<ImageSchema>['helpers'],
    });
    const { unmount } = render(<ImageRenderer {...props} />);
    expect(helpers.dispatch).toHaveBeenCalledTimes(1);
    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe('ImageRenderer — DD7 fetcher-backed mode', () => {
  it('shows loading state while fetcher is in progress', () => {
    const props = createMockRendererProps<ImageSchema>({
      schema: { type: 'image' },
      props: { fetcher: { action: 'ajax', args: { url: '/api/image' } } },
    });
    const { container } = render(<ImageRenderer {...props} />);
    const el = container.querySelector('[data-slot="image"][data-state="loading"]');
    expect(el).toBeTruthy();
  });

  it('renders fetcher-backed src when fetcher resolves', async () => {
    const helpers = {
      dispatch: vi.fn().mockResolvedValue({
        ok: true,
        data: { url: 'https://cdn.example.com/protected.jpg' },
      }),
    };
    const props = createMockRendererProps<ImageSchema>({
      schema: { type: 'image' },
      props: { fetcher: { action: 'ajax', args: { url: '/api/image' } } },
      helpers: helpers as unknown as RendererComponentProps<ImageSchema>['helpers'],
    });
    const { container } = render(<ImageRenderer {...props} />);

    await waitFor(() => {
      const img = container.querySelector('[data-slot="image"]') as HTMLImageElement;
      expect(img?.getAttribute('src')).toBe('https://cdn.example.com/protected.jpg');
    });
  });

  it('shows error fallback when fetcher fails', async () => {
    const helpers = {
      dispatch: vi.fn().mockRejectedValue(new Error('Network error')),
    };
    const props = createMockRendererProps<ImageSchema>({
      schema: { type: 'image' },
      props: { fetcher: { action: 'ajax', args: { url: '/api/image' } } },
      helpers: helpers as unknown as RendererComponentProps<ImageSchema>['helpers'],
    });
    const { container } = render(<ImageRenderer {...props} />);

    await waitFor(() => {
      const el = container.querySelector('[data-slot="image"][data-state="error"]');
      expect(el).toBeTruthy();
    });
  });
});
