// DOMPurify requires a spec-compliant DOM; happy-dom's parse/serialize drops
// safe content and strips <p>, so this security-critical test uses jsdom
// (DOMPurify's reference DOM) to assert true sanitization behavior.
// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { isSafeNavigationUrl, sanitizeHtml } from './sanitize.js';

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
});
