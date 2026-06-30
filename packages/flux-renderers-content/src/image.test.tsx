import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageRenderer } from './image.js';
import { createMockRendererProps } from './test-support.js';
import type { ImageSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function imgOf(container: HTMLElement) {
  return container.querySelector('[data-slot="image"]') as HTMLImageElement;
}

describe('ImageRenderer', () => {
  it('passes loading="lazy" through when lazy is true', () => {
    const props = createMockRendererProps<ImageSchema>({
      schema: { type: 'image' },
      props: { src: '/a.png', alt: 'cover', lazy: true },
    });
    const { container } = render(<ImageRenderer {...props} />);
    expect(imgOf(container).getAttribute('loading')).toBe('lazy');
  });

  it('does not set loading when lazy is omitted', () => {
    const props = createMockRendererProps<ImageSchema>({
      schema: { type: 'image' },
      props: { src: '/a.png', alt: 'cover' },
    });
    const { container } = render(<ImageRenderer {...props} />);
    expect(imgOf(container).getAttribute('loading')).toBeNull();
  });

  it('passes src/alt/title and object-fit class through', () => {
    const props = createMockRendererProps<ImageSchema>({
      schema: { type: 'image' },
      props: { src: '/a.png', alt: 'cover', title: 'T', fit: 'contain' },
    });
    const { container } = render(<ImageRenderer {...props} />);
    const img = imgOf(container);
    expect(img.getAttribute('src')).toBe('/a.png');
    expect(img.getAttribute('alt')).toBe('cover');
    expect(img.getAttribute('title')).toBe('T');
    expect(img.className).toContain('object-contain');
    expect(img.className).toContain('nop-image');
  });

  it('passes width/height as inline styles', () => {
    const props = createMockRendererProps<ImageSchema>({
      schema: { type: 'image' },
      props: { src: '/a.png', alt: 'cover', width: 320, height: 180 },
    });
    const { container } = render(<ImageRenderer {...props} />);
    const img = imgOf(container);
    expect((img.style.width as unknown as string)).toBe('320px');
    expect((img.style.height as unknown as string)).toBe('180px');
  });

  it('renders the error fallback and fires onLoadError when the image fails', () => {
    const onLoadError = vi.fn(async () => ({ ok: true }));
    const props = createMockRendererProps<ImageSchema>({
      schema: { type: 'image' },
      props: { src: '/missing.png', alt: 'broken cover' },
      events: { onLoadError: onLoadError as never },
    });
    const { container } = render(<ImageRenderer {...props} />);
    const img = imgOf(container);
    fireEvent.error(img);
    expect(onLoadError).toHaveBeenCalledTimes(1);
    // img is replaced by the fallback container
    const fallback = container.querySelector('[data-slot="image"][data-state="error"]');
    expect(fallback).toBeTruthy();
    expect(fallback?.querySelector('[data-slot="image-fallback"]')?.textContent).toBe(
      'broken cover',
    );
  });

  it('marks preview and opens a preview overlay on click', () => {
    const props = createMockRendererProps<ImageSchema>({
      schema: { type: 'image' },
      props: { src: '/a.png', alt: 'cover', preview: true },
    });
    const { container } = render(<ImageRenderer {...props} />);
    const img = imgOf(container);
    expect(img.getAttribute('data-preview')).toBe('true');
    fireEvent.click(img);
    // Dialog renders into a portal under document.body
    expect(document.body.querySelector('[data-slot="image-preview"]')).toBeTruthy();
  });

  it('renders the empty fallback when no src is provided', () => {
    const props = createMockRendererProps<ImageSchema>({
      schema: { type: 'image' },
      props: { alt: 'nothing' },
    });
    const { container } = render(<ImageRenderer {...props} />);
    const empty = container.querySelector('[data-slot="image"][data-state="empty"]');
    expect(empty).toBeTruthy();
  });
});
