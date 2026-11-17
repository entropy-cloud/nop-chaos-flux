// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { attachDomShadow, captureDomShadow } from './dom-shadow.js';

describe('captureDomShadow (M1)', () => {
  it('strips script elements and dedupes repeated stylesheets by href', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <script>window.__evil__ = true;</script>
      <link rel="stylesheet" href="/a.css">
      <link rel="stylesheet" href="/a.css">
      <link rel="stylesheet" href="/b.css">
      <p data-cid="c-1">hello</p>
    `;
    document.body.appendChild(container);

    const shadow = captureDomShadow(container);
    const html = (shadow.root as Element).innerHTML;
    expect(html.includes('script')).toBe(false);
    expect(html.includes('__evil__')).toBe(false);
    expect((shadow.root as Element).querySelectorAll('link[rel="stylesheet"]').length).toBe(2);
    expect(shadow.cssBundleId).toBe('css:/a.css|css:/b.css');
  });

  it('attaches lazily and detaches cleanly', () => {
    const container = document.createElement('div');
    container.innerHTML = '<span class="marker">live</span>';
    document.body.appendChild(container);

    const shadow = captureDomShadow(container);
    const host = document.createElement('div');
    document.body.appendChild(host);
    expect(host.children.length).toBe(0);

    const detach = attachDomShadow(shadow, host);
    expect(host.querySelectorAll('.marker').length).toBe(1);
    detach();
    expect(host.children.length).toBe(0);
  });
});
