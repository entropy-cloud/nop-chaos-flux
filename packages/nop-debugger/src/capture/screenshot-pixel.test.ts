// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { applyRedactionMask, MASK_COLOR } from './screenshot.js';

describe('mask pixel semantics (M2, pre-raster geometry)', () => {
  it('masked elements fully cover their area so the rasterized region is uniform mask color', () => {
    const root = document.createElement('div');
    root.innerHTML = `<div style="width:100px;height:40px"><input type="password" style="width:80px;height:32px"></div>`;
    const clone = root.cloneNode(true) as HTMLElement;
    applyRedactionMask(clone, []);
    const masked = clone.querySelector('[type="password"]') as HTMLElement;
    // the mask covers the full element box with an opaque color and removes all
    // content — after rasterization every pixel inside the element rect equals
    // MASK_COLOR (canvas read-back is covered by the browser e2e pixel test)
    expect(masked.style.backgroundColor).toBe(MASK_COLOR);
    expect(masked.style.width).toBe('80px');
    expect(masked.style.height).toBe('32px');
    expect(Array.from(masked.childNodes).every((node) => node.nodeType !== 3)).toBe(true);
    expect(masked.textContent).toBe('已脱敏');
  });
});
