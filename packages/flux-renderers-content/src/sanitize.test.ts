// DOMPurify requires a spec-compliant DOM; happy-dom's parse/serialize drops
// safe content and strips <p>, so this security-critical test uses jsdom
// (DOMPurify's reference DOM) to assert true sanitization behavior.
// @vitest-environment jsdom

import { createElement } from 'react';
import { render } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { describe, expect, it } from 'vitest';
import { isSafeNavigationUrl, rehypeStripUnsafeHtml, sanitizeHtml } from './sanitize.js';

describe('sanitizeHtml — controlled HTML sanitization gate', () => {
  it('strips <script> tags entirely', () => {
    const out = sanitizeHtml('<script>alert(1)</script><b>safe</b>');
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out.toLowerCase()).not.toContain('alert');
    expect(out).toContain('<b>safe</b>');
  });

  it('strips inline event handlers like onerror/onload', () => {
    const out = sanitizeHtml('<img src="x.png" onerror="alert(1)">');
    expect(out.toLowerCase()).not.toContain('onerror');
    expect(out.toLowerCase()).not.toContain('alert');
    expect(out.toLowerCase()).toContain('<img');
    expect(out).toContain('x.png');
  });

  it('cleans javascript: URIs from anchors', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out.toLowerCase()).not.toContain('javascript:');
    expect(out.toLowerCase()).not.toContain('alert');
    expect(out).toContain('click');
  });

  it('keeps safe presentational tags', () => {
    const out = sanitizeHtml('<p>hi <b>bold</b> <a href="https://safe.example/">link</a></p>');
    expect(out).toContain('<p>');
    expect(out).toContain('<b>bold</b>');
    expect(out).toContain('https://safe.example/');
    expect(out).toContain('link');
  });

  it('keeps <u> underline marks through the round-trip (plan 480 editor Underline contract pin)', () => {
    const out = sanitizeHtml('<p><u>underlined</u></p>');
    expect(out).toContain('<u>');
    expect(out).toContain('underlined');
  });

  it('keeps <mark> highlight marks through the round-trip (plan 480 Highlight contract pin)', () => {
    const out = sanitizeHtml('<p><mark>highlighted</mark></p>');
    expect(out).toContain('<mark>');
    expect(out).toContain('highlighted');
  });

  it('keeps <img> tags while stripping inline handlers (plan 480 Image contract pin)', () => {
    const out = sanitizeHtml('<img src="https://safe.example/x.png" onerror="alert(1)" alt="x">');
    expect(out).toContain('<img');
    expect(out).toContain('https://safe.example/x.png');
    expect(out.toLowerCase()).not.toContain('onerror');
  });

  it('passes content through unchanged when sanitize is explicitly false (trusted)', () => {
    const payload = '<script>alert(1)</script><b>raw</b>';
    expect(sanitizeHtml(payload, { sanitize: false })).toBe(payload);
  });

  it('defaults to sanitizing when no option is provided', () => {
    const out = sanitizeHtml('<script>alert(1)</script>');
    expect(out.toLowerCase()).not.toContain('<script');
  });

  it('fails closed in an SSR / no-DOM environment (all markup stripped)', () => {
    const originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = undefined;
    try {
      const out = sanitizeHtml('<script>alert(1)</script><b>safe</b><a href="x">l</a>');
      // fail-closed: no markup can leak when there is no live DOM to sanitize
      expect(out).not.toContain('<');
      // text content survives so the payload is never silently swallowed
      expect(out).toContain('alert(1)');
      expect(out).toContain('safe');
      expect(out).toContain('l');
    } finally {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });
});

describe('isSafeNavigationUrl — URL protocol allowlist for navigation hrefs', () => {
  it('allows http/https/mailto/tel schemes', () => {
    expect(isSafeNavigationUrl('https://safe.example/')).toBe(true);
    expect(isSafeNavigationUrl('http://example.com')).toBe(true);
    expect(isSafeNavigationUrl('mailto:dev@example.com')).toBe(true);
    expect(isSafeNavigationUrl('tel:+1234567890')).toBe(true);
  });

  it('allows data: download links (opaque-origin navigation, export flow)', () => {
    expect(isSafeNavigationUrl('data:text/csv;base64,YSxiLGM=')).toBe(true);
    expect(isSafeNavigationUrl('data:application/octet-stream;base64,AA==')).toBe(true);
  });

  it('allows scheme-less relative URLs', () => {
    expect(isSafeNavigationUrl('/relative/path')).toBe(true);
    expect(isSafeNavigationUrl('#anchor')).toBe(true);
    expect(isSafeNavigationUrl('./sibling')).toBe(true);
    expect(isSafeNavigationUrl('../up')).toBe(true);
    expect(isSafeNavigationUrl('plain-path')).toBe(true);
  });

  it('rejects javascript:/vbscript:/blob:/file: URIs (case-insensitive)', () => {
    expect(isSafeNavigationUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeNavigationUrl('JaVaScRiPt:alert(1)')).toBe(false);
    expect(isSafeNavigationUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeNavigationUrl('blob:https://example.com/abc')).toBe(false);
    expect(isSafeNavigationUrl('file:///etc/passwd')).toBe(false);
  });

  it('allows blob: only when the download option is set (15-02 export-link contract)', () => {
    const blob = 'blob:https://example.com/7c0f1c1f-2a1f-4c0f-8b0f-0f0f0f0f0f0f';
    expect(isSafeNavigationUrl(blob, { download: true })).toBe(true);
    // without download the conservative fail-safe holds: blob: stays rejected
    expect(isSafeNavigationUrl(blob)).toBe(false);
    expect(isSafeNavigationUrl(blob, {})).toBe(false);
    expect(isSafeNavigationUrl(blob, { download: false })).toBe(false);
    // the download channel never unlocks script-execution schemes
    expect(isSafeNavigationUrl('javascript:alert(1)', { download: true })).toBe(false);
    expect(isSafeNavigationUrl('file:///etc/passwd', { download: true })).toBe(false);
  });
});

describe('rehypeStripUnsafeHtml', () => {
  function element(tagName: string, properties: Record<string, unknown> = {}, children: unknown[] = []) {
    return { type: 'element', tagName, properties, children };
  }

  it('removes executable elements, event-handler properties and unsafe URLs from the parsed tree', () => {
    const tree = {
      type: 'root',
      children: [
        element('script', {}, [{ type: 'text', value: 'alert(1)' }]),
        element('p', { className: ['note'] }, [
          element('img', { src: 'x', onError: 'alert(1)', onerror: 'alert(2)', alt: 'pic' }),
          element('a', { href: 'javascript:alert(1)' }, [{ type: 'text', value: 'bad' }]),
          element('a', { href: 'https://example.com', title: 't' }, [{ type: 'text', value: 'ok' }]),
          element('iframe', { srcDoc: '<script>alert(1)</script>' }),
        ]),
        element('style', {}, [{ type: 'text', value: 'body{}' }]),
      ],
    };

    rehypeStripUnsafeHtml()(tree as never);

    expect(tree.children.map((child) => child.tagName)).toEqual(['p']);
    const paragraph = tree.children[0] as ReturnType<typeof element>;
    const [img, badLink, goodLink] = paragraph.children as ReturnType<typeof element>[];
    expect(paragraph.children).toHaveLength(3);
    expect(paragraph.properties).toEqual({ className: ['note'] });
    expect(img.properties).toEqual({ src: 'x', alt: 'pic' });
    expect(badLink.properties).toEqual({});
    expect(goodLink.properties).toEqual({ href: 'https://example.com', title: 't' });
  });

  it('strips unsanitized raw HTML that reaches react-markdown through rehype-raw', () => {
    const { container } = render(
      createElement(
        ReactMarkdown,
        { rehypePlugins: [rehypeRaw, rehypeStripUnsafeHtml] },
        'hello <img src="x" onerror="alert(1)"> <a href="javascript:alert(1)">x</a> <script>alert(1)</script>',
      ),
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).toBeNull();
  });
});
