import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { sanitizeEditorHtml } from '../editor-renderer.js';
import {
  DEFAULT_EDITOR_TOOLBAR,
  resolveToolbarButtons,
} from '../editor-schemas.js';

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('editor — sanitize boundary (reuse DOMPurify gate)', () => {
  it('strips <script> tags and their payload from stored HTML', () => {
    const sanitized = sanitizeEditorHtml('<p>ok</p><script>alert(1)</script>');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert(1)');
  });

  it('strips inline event handlers', () => {
    const sanitized = sanitizeEditorHtml('<img src="x" onerror="alert(1)" alt="a" />');
    expect(sanitized).not.toContain('onerror');
  });

  it('strips javascript: URIs', () => {
    const sanitized = sanitizeEditorHtml('<a href="javascript:alert(1)">link</a>');
    expect(sanitized).not.toContain('javascript:');
  });

  it('preserves safe presentational tags', () => {
    const sanitized = sanitizeEditorHtml('<p><strong>bold</strong> and <code>code</code></p>');
    expect(sanitized).toContain('<strong>bold</strong>');
    expect(sanitized).toContain('<code>code</code>');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeEditorHtml('')).toBe('');
  });
});

describe('editor — toolbar config filtering', () => {
  it('returns null when toolbar is false', () => {
    expect(resolveToolbarButtons(false)).toBeNull();
  });

  it('returns the full default set when toolbar is omitted/true', () => {
    expect(resolveToolbarButtons(undefined)).toEqual(DEFAULT_EDITOR_TOOLBAR);
    expect(resolveToolbarButtons(true)).toEqual(DEFAULT_EDITOR_TOOLBAR);
  });

  it('whitelists only the declared buttons', () => {
    const filtered = resolveToolbarButtons(['bold', 'italic', 'undo']);
    expect(filtered).toEqual(['bold', 'italic', 'undo']);
  });

  it('drops unknown button ids', () => {
    const filtered = resolveToolbarButtons(['bold', 'nope']);
    expect(filtered).toEqual(['bold']);
  });
});
