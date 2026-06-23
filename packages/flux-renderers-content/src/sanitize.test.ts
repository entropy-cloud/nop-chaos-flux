// DOMPurify requires a spec-compliant DOM; happy-dom's parse/serialize drops
// safe content and strips <p>, so this security-critical test uses jsdom
// (DOMPurify's reference DOM) to assert true sanitization behavior.
// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize.js';

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
});
