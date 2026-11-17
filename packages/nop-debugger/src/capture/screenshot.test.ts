// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CaptureError,
  MASK_COLOR,
  MASK_LABEL,
  applyRedactionMask,
  captureScreenshotFromClone,
  createIncrementalCapturer,
  getRasterizationCount,
  resetRasterizationCount,
} from './screenshot.js';

function buildFixture(): HTMLElement {
  const root = document.createElement('div');
  root.setAttribute('data-cid', 'c-root');
  root.innerHTML = `
    <p data-cid="c-text">hello world</p>
    <input type="password" value="secret" data-cid="c-pw">
    <span class="sensitive-field" data-cid="c-s">token-xyz</span>
  `;
  return root;
}

const fakeRasterizer = (bytes: Uint8Array) => async () => bytes;

describe('capture screenshot pipeline (M2)', () => {
  beforeEach(() => {
    resetRasterizationCount();
  });

  it('rejects zero-size targets with CaptureError capture-zero-size', async () => {
    await expect(
      captureScreenshotFromClone({ root: buildFixture(), width: 0, height: 100, rasterizer: fakeRasterizer(new Uint8Array([1])) }),
    ).rejects.toMatchObject({ name: 'CaptureError', code: 'capture-zero-size' });
  });

  it('produces a stable hash for identical DOM and schema-shaped wire result', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const first = await captureScreenshotFromClone({ root: buildFixture(), width: 100, height: 50, rasterizer: fakeRasterizer(bytes) });
    const second = await captureScreenshotFromClone({ root: buildFixture(), width: 100, height: 50, rasterizer: fakeRasterizer(bytes) });
    expect(first.hash).toBe(second.hash);
    expect(first.id).toBe(second.id);
    expect(first.encoding).toBe('base64');
    expect(first.backend).toBe('foreign-object');
    expect(first.mime).toBe('image/webp');
    expect(first.bytes.length).toBeGreaterThan(0);
  });

  it('masking covers password + rule-matched elements on the clone, live DOM untouched', () => {
    const live = buildFixture();
    const clone = live.cloneNode(true) as HTMLElement;
    const result = applyRedactionMask(clone, [
      { matches: (element) => element.classList.contains('sensitive-field') },
    ]);
    expect(result.maskedCount).toBe(2);
    const maskedPassword = clone.querySelector('[type="password"]') as HTMLElement;
    expect(maskedPassword.getAttribute('data-nop-masked')).toBe('');
    expect(maskedPassword.style.backgroundColor).toBe(MASK_COLOR);
    expect(maskedPassword.textContent).toBe(MASK_LABEL);
    // live DOM untouched
    const livePassword = live.querySelector('[type="password"]') as HTMLInputElement;
    expect(livePassword.getAttribute('data-nop-masked')).toBeNull();
    expect(livePassword.value).toBe('secret');
    expect(live.querySelector('.sensitive-field')?.textContent).toBe('token-xyz');
  });

  it('incremental capturer reuses the previous frame when the DOM signature is unchanged (zero extra rasterization)', async () => {
    const capturer = createIncrementalCapturer();
    const bytes = new Uint8Array([9, 8, 7]);
    const root = buildFixture();
    const first = await capturer.capture({ root, width: 100, height: 50, rasterizer: fakeRasterizer(bytes) });
    expect(first.reused).toBe(false);
    expect(getRasterizationCount()).toBe(1);

    const second = await capturer.capture({ root, width: 100, height: 50, rasterizer: fakeRasterizer(bytes) });
    expect(second.reused).toBe(true);
    expect(second.result.hash).toBe(first.result.hash);
    expect(getRasterizationCount()).toBe(1);

    root.querySelector('p')!.textContent = 'changed!';
    const third = await capturer.capture({ root, width: 100, height: 50, rasterizer: fakeRasterizer(new Uint8Array([5, 5])) });
    expect(third.reused).toBe(false);
    expect(getRasterizationCount()).toBe(2);
  });

  it('cross-origin images without CORS are replaced and the result is marked degraded', async () => {
    const root = buildFixture();
    const img = document.createElement('img');
    img.setAttribute('src', 'https://cdn.example.com/logo.png');
    root.appendChild(img);
    const result = await captureScreenshotFromClone({
      root,
      width: 100,
      height: 50,
      rasterizer: fakeRasterizer(new Uint8Array([1])),
    });
    expect(result.degraded?.reasons).toContain('cross-origin image replaced');
    expect(root.querySelector('img[src="https://cdn.example.com/logo.png"]')).not.toBeNull();
  });

  it('CaptureError carries code for non-retryable capture failures', () => {
    const error = new CaptureError('capture-zero-size', 'bad');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('capture-zero-size');
  });
});
