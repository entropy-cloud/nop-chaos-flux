// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWebExpect } from './expect-web.js';
import { createLocator } from './locator.js';
import type { DebuggerApiView } from './types.js';

let doc: Document;

function makeApi(): DebuggerApiView {
  return { controllerId: 'c-1', sessionId: 's-1', getSnapshot: () => ({}) } as DebuggerApiView;
}

const locator = (selector: string) => createLocator(() => doc, selector, { timeoutMs: 300, intervalMs: 20 }, () => makeApi());
const expectWeb = createWebExpect(vi.fn());

beforeEach(() => {
  doc = document;
  doc.body.innerHTML = '';
});

describe('expectWeb (Playwright-style web assertions)', () => {
  it('toBeVisible passes immediately for visible elements', async () => {
    doc.body.innerHTML = '<div id="a">hello</div>';
    await expectWeb(locator('#a')).toBeVisible({ timeoutMs: 200 });
  });

  it('retries until a delayed element mounts, then passes', async () => {
    setTimeout(() => {
      doc.body.innerHTML = '<div id="late">late</div>';
    }, 100);
    await expectWeb(locator('#late')).toBeVisible({ timeoutMs: 1_000 });
  });

  it('throws with selector-kind-actual message on timeout', async () => {
    doc.body.innerHTML = '<div id="b">wrong text</div>';
    await expect(
      expectWeb(locator('#b')).toContainText('expected text', { timeoutMs: 200 }),
    ).rejects.toThrow(/toContainText[\s\S]*expected "expected text"[\s\S]*last actual/);
  });

  it('not.toBeVisible passes for absent elements', async () => {
    await expectWeb(locator('#missing')).not.toBeVisible({ timeoutMs: 200 });
  });

  it('not.toHaveCount inverts a passing assertion into failure', async () => {
    doc.body.innerHTML = '<span></span><span></span>';
    await expectWeb(locator('span')).toHaveCount(2, { timeoutMs: 200 });
    await expect(expectWeb(locator('span')).not.toHaveCount(2, { timeoutMs: 200 })).rejects.toThrow(/not toHaveCount/);
  });

  it('toHaveAttribute supports presence-only and exact-value forms', async () => {
    doc.body.innerHTML = '<input id="c" data-density="compact">';
    await expectWeb(locator('#c')).toHaveAttribute('data-density', 'compact', { timeoutMs: 200 });
    await expectWeb(locator('#c')).toHaveAttribute('data-density', undefined, { timeoutMs: 200 });
    doc.body.innerHTML = '<input id="d">';
    await expectWeb(locator('#d')).not.toHaveAttribute('data-density', undefined, { timeoutMs: 200 });
  });

  it('toHaveValue retries on input value', async () => {
    doc.body.innerHTML = '<input id="e" value="v0">';
    setTimeout(() => {
      (doc.querySelector('#e') as HTMLInputElement).value = 'final';
    }, 60);
    await expectWeb(locator('#e')).toHaveValue('final', { timeoutMs: 1_000 });
  });

  it('toBeDisabled / toBeEnabled respect disabled state', async () => {
    doc.body.innerHTML = '<button id="f" disabled>x</button><button id="g">y</button>';
    await expectWeb(locator('#f')).toBeDisabled({ timeoutMs: 200 });
    await expectWeb(locator('#g')).toBeEnabled({ timeoutMs: 200 });
  });

  it('toHaveText trims before comparing', async () => {
    doc.body.innerHTML = '<p id="h">  padded  </p>';
    await expectWeb(locator('#h')).toHaveText('padded', { timeoutMs: 200 });
  });
});
