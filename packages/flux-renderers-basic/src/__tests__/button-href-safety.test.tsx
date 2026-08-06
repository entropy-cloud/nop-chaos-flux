import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function renderButtonWithHref(href: string) {
  const SchemaRenderer = createBasicSchemaRenderer();
  render(
    <SchemaRenderer
      schemaUrl="test://basic/button-href-safety"
      schema={{
        type: 'button',
        label: 'Go',
        href,
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
  return screen.getByText('Go').closest('a');
}

describe('button href URL protocol safety (CR P2-3 shared, flux-core isSafeNavigationUrl)', () => {
  afterEach(() => {
    cleanup();
  });

  it('strips javascript: href so the anchor is non-navigable', () => {
    const anchor = renderButtonWithHref('javascript:alert(1)');
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute('href')).toBeNull();
  });

  it('strips mixed-case javascript: href', () => {
    const anchor = renderButtonWithHref('JaVaScRiPt:alert(1)');
    expect(anchor!.getAttribute('href')).toBeNull();
  });

  it('strips vbscript: href', () => {
    const anchor = renderButtonWithHref('vbscript:msgbox(1)');
    expect(anchor!.getAttribute('href')).toBeNull();
  });

  it('strips blob: and file: hrefs', () => {
    for (const unsafe of [
      'blob:https://example.com/7c0f1c1f-2a1f-4c0f-8b0f-0f0f0f0f0f0f',
      'file:///etc/passwd',
    ]) {
      cleanup();
      const anchor = renderButtonWithHref(unsafe);
      expect(anchor!.getAttribute('href')).toBeNull();
    }
  });

  it('keeps http/https/mailto/tel allowlisted hrefs', () => {
    for (const safe of [
      'https://example.com/path',
      'http://example.com',
      'mailto:dev@example.com',
      'tel:+1234567890',
    ]) {
      cleanup();
      const anchor = renderButtonWithHref(safe);
      expect(anchor!.getAttribute('href')).toBe(safe);
    }
  });

  it('keeps scheme-less relative hrefs (#anchor / path / plain)', () => {
    for (const safe of ['#section', '/reports/1', 'downloads/report.pdf', 'plain']) {
      cleanup();
      const anchor = renderButtonWithHref(safe);
      expect(anchor!.getAttribute('href')).toBe(safe);
    }
  });

  it('keeps data: href (download-link parity with the link renderer contract)', () => {
    const dataHref = 'data:text/csv;base64,YSxiLGM=';
    const anchor = renderButtonWithHref(dataHref);
    expect(anchor!.getAttribute('href')).toBe(dataHref);
  });
});
