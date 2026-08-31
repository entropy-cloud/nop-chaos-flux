import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LinkRenderer } from './link.js';
import { createMockRendererProps } from './test-support.js';
import type { LinkSchema } from './schemas.js';

// [G7-R2-视角11-01] (R2 consistency audit, P0): the export link pointed at a
// data: URL without a `download` attribute, so modern browsers blocked the top
// frame navigation and the final "click to download" step was a silent no-op
// (export-no-response). The renderer must pass `download` through.

function renderLink(props: Partial<LinkSchema>) {
  const mockProps = createMockRendererProps<LinkSchema>({
    schema: { type: 'link', ...props } as LinkSchema,
    props: { type: 'link', ...props } as never,
  });
  return render(<LinkRenderer {...mockProps} />);
}

afterEach(() => cleanup());

describe('[G7-R2-视角11-01] link download passthrough (export-no-response)', () => {
  it('renders download="" when download: true', () => {
    const { container } = renderLink({ href: 'data:text/csv;charset=utf-8,a%2Cb', download: true });
    const anchor = container.querySelector('a')!;
    expect(anchor.getAttribute('download')).toBe('');
  });

  it('passes a download filename string through', () => {
    const { container } = renderLink({ href: '/files/report.csv', download: 'report.csv' });
    const anchor = container.querySelector('a')!;
    expect(anchor.getAttribute('download')).toBe('report.csv');
  });

  it('omits the attribute when download is not set (no regression)', () => {
    const { container } = renderLink({ href: 'https://example.com', target: '_blank' });
    const anchor = container.querySelector('a')!;
    expect(anchor.hasAttribute('download')).toBe(false);
  });

  it('onClick action still fires alongside download', () => {
    const onClick = vi.fn();
    const mockProps = createMockRendererProps<LinkSchema>({
      schema: { type: 'link', href: 'data:text/csv,a', download: true } as LinkSchema,
      props: { type: 'link', href: 'data:text/csv,a', download: true } as never,
      events: { onClick },
    });
    const { container } = render(<LinkRenderer {...mockProps} />);
    const anchor = container.querySelector('a')!;
    anchor.click();
    expect(onClick).toHaveBeenCalled();
  });
});

// 15-02 (ui-review audit group B): the author docs promise blob:+download export
// links work, but the scheme allowlist silently cleared blob: hrefs — the
// documented path reproduced the exact "click does nothing" symptom.
describe('15-02 blob: download contract (safe only with the download attribute)', () => {
  it('keeps a blob: href when download is set (download semantics reachable)', () => {
    const blobHref = 'blob:https://example.com/7c0f1c1f-2a1f-4c0f-8b0f-0f0f0f0f0f0f';
    const { container } = renderLink({ href: blobHref, download: 'export.csv' });
    const anchor = container.querySelector('a')!;
    expect(anchor.getAttribute('href')).toBe(blobHref);
    expect(anchor.getAttribute('download')).toBe('export.csv');
  });

  it('keeps a blob: href with download: true (download="" passthrough)', () => {
    const blobHref = 'blob:https://example.com/abc';
    const { container } = renderLink({ href: blobHref, download: true });
    const anchor = container.querySelector('a')!;
    expect(anchor.getAttribute('href')).toBe(blobHref);
    expect(anchor.getAttribute('download')).toBe('');
  });

  it('still clears a blob: href without download (conservative fail-safe)', () => {
    const { container } = renderLink({ href: 'blob:https://example.com/abc' });
    const anchor = container.querySelector('a')!;
    expect(anchor.getAttribute('href')).toBeNull();
    // href was the only text fallback — cleared href renders an empty anchor
    expect(anchor.textContent).toBe('');
  });

  it("tops up noopener for a whitespace-only rel (' ') with target=_blank (trim before judging)", () => {
    const { container } = renderLink({ href: 'https://example.com', target: '_blank', rel: ' ' });
    const anchor = container.querySelector('a')!;
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
