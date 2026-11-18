import type { FtGlobal } from '@nop-chaos/flux-test-driver';

/**
 * T0 visual pilot (E2): migrated from tests/e2e/ai-chat-ux-visual.spec.ts
 * (plan 529 — programmatic assertions, zero screenshots).
 *
 * Engine swap with equivalent strength. Known compat-layer gaps exercised
 * here (recorded in the design-doc gap list for E3):
 * - element-level `evaluate` → whole-page `ft.evaluate` escape hatch ×2
 *   (evaluate debt: registered);
 * - nested `locator.locator()` → flattened descendant CSS selectors;
 * - `getByRole`/`page.mouse.move` → CSS selectors / body hover.
 */

async function gotoRoute(ft: FtGlobal, hash: string, stabilityTimeoutMs = 30_000): Promise<void> {
  await ft.goto(hash);
  const stable = await ft.waitFor({ type: 'stability' }, { timeoutMs: stabilityTimeoutMs });
  if (!stable.ok) throw new Error(`route ${hash} never stabilized: ${stable.lastError ?? 'timeout'}`);
}

async function waitForText(ft: FtGlobal, selector: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let text = '';
  while (Date.now() < deadline) {
    try {
      text = await ft.locator(selector, { timeoutMs: 1_000 }).text();
      if (text && text.trim().length > 0) return text;
    } catch {
      // retry until deadline
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`element ${selector} never rendered text (last: "${text}")`);
}

async function expectNoKernelError(ft: FtGlobal, marker: string): Promise<void> {
  const latest = await ft.evaluate(
    `window.__NOP_DEBUGGER_API__ && window.__NOP_DEBUGGER_API__.getLatestError ? window.__NOP_DEBUGGER_API__.getLatestError() : null`,
  );
  if (latest) {
    throw new Error(`kernel error detected (${marker}): ${JSON.stringify(latest).slice(0, 300)}`);
  }
}

async function evalNumber(ft: FtGlobal, expression: string): Promise<number> {
  const value = await ft.evaluate(expression);
  return typeof value === 'number' ? value : Number(value);
}

async function waitForValue(ft: FtGlobal, selector: string, expected: string, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let value = '';
  while (Date.now() < deadline) {
    value = String(await ft.evaluate(`document.querySelector(${JSON.stringify(selector)})?.value ?? ''`));
    if (value === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${selector}: expected value "${expected}", got "${value}"`);
}

export default async function aiChatUxVisualSpec(ft: FtGlobal): Promise<{ cases: number }> {
  // case 1: code blocks render a language label header
  await gotoRoute(ft, '/#/ai-coverage');
  await waitForText(ft, '[data-testid="cov-bubble-markdown"][data-slot="ai-bubble"] [data-slot="ai-bubble-code"]');
  const langHeader = await ft.evaluate(
    `document.querySelector('[data-testid="cov-bubble-markdown"] [data-slot="ai-bubble-code-lang"]')?.textContent ?? ''`,
  );
  if (!/ts/i.test(String(langHeader))) {
    throw new Error(`code language header missing, got: "${String(langHeader).slice(0, 40)}"`);
  }
  await expectNoKernelError(ft, 'code-lang');

  // case 2: thinking state shows the three-dot pulse
  const chat = '[data-testid="cov-chat-slow"]';
  await ft.locator(`${chat} [data-slot="ai-sender-input"] textarea`).waitFor('visible', { timeoutMs: 15_000 });
  await ft.locator(`${chat} [data-slot="ai-sender-input"] textarea`).fill('dots please');
  await ft.locator(`${chat} [data-slot="ai-sender-submit"]`).click();
  const dotsDeadline = Date.now() + 10_000;
  let dotCount = 0;
  while (Date.now() < dotsDeadline) {
    dotCount = await evalNumber(ft, `document.querySelectorAll('${chat} [data-slot="ai-bubble-loading-dots"] i').length`);
    if (dotCount === 3) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (dotCount !== 3) throw new Error(`thinking dots: expected 3 <i>, got ${dotCount}`);
  await expectNoKernelError(ft, 'dots');

  // case 3: sender auto-grows and swaps send/stop in place
  const textareaHeightBefore = await evalNumber(
    ft,
    `document.querySelector('${chat} [data-slot="ai-sender-input"] textarea')?.getBoundingClientRect().height ?? 0`,
  );
  await ft.locator(`${chat} [data-slot="ai-sender-input"] textarea`).fill('line1\nline2\nline3\nline4');
  const textareaHeightAfter = await evalNumber(
    ft,
    `document.querySelector('${chat} [data-slot="ai-sender-input"] textarea')?.getBoundingClientRect().height ?? 0`,
  );
  if (!(textareaHeightAfter > textareaHeightBefore)) {
    throw new Error(`sender auto-grow: height ${textareaHeightBefore} → ${textareaHeightAfter}`);
  }
  if (textareaHeightAfter > 192 + 2) {
    throw new Error(`sender auto-grow: height ${textareaHeightAfter} exceeds 12rem cap`);
  }
  await ft.locator(`${chat} [data-slot="ai-sender-submit"]`).click();
  const cancelDeadline = Date.now() + 10_000;
  let cancelVisible = false;
  while (Date.now() < cancelDeadline) {
    cancelVisible = await ft.locator(`${chat} [data-slot="ai-sender-cancel"]`, { timeoutMs: 1_000 }).isVisible();
    if (cancelVisible) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!cancelVisible) throw new Error('sender swap: cancel button never appeared');
  const submitCountWhileRunning = await evalNumber(
    ft,
    `document.querySelectorAll('${chat} [data-slot="ai-sender-submit"]').length`,
  );
  if (submitCountWhileRunning !== 0) throw new Error(`sender swap: submit still present (${submitCountWhileRunning})`);
  await ft.locator(`${chat} [data-slot="ai-sender-cancel"]`).click();
  const submitBackDeadline = Date.now() + 10_000;
  let submitBack = false;
  while (Date.now() < submitBackDeadline) {
    submitBack = await ft.locator(`${chat} [data-slot="ai-sender-submit"]`, { timeoutMs: 1_000 }).isVisible();
    if (submitBack) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!submitBack) throw new Error('sender swap: submit did not come back after cancel');
  await expectNoKernelError(ft, 'sender-swap');

  // case 4: assistant action bar reveals on hover
  const bubble = '[data-testid="cov-bubble-markdown"][data-slot="ai-bubble"]';
  await waitForText(ft, `${bubble} [data-slot="ai-bubble-code"]`);
  const opacityBefore = await evalNumber(
    ft,
    `Number(getComputedStyle(document.querySelector('${bubble} [data-slot="ai-assistant-actions"]')).opacity)`,
  );
  await ft.locator('body').hover();
  await new Promise((resolve) => setTimeout(resolve, 250));
  const opacityMid = await evalNumber(
    ft,
    `Number(getComputedStyle(document.querySelector('${bubble} [data-slot="ai-assistant-actions"]')).opacity)`,
  );
  await ft.locator(bubble).hover();
  // CSS :hover transition can settle slowly under real-input relay
  const hoverDeadline = Date.now() + 3_000;
  let opacityAfter = 0;
  while (Date.now() < hoverDeadline) {
    opacityAfter = await evalNumber(
      ft,
      `Number(getComputedStyle(document.querySelector('${bubble} [data-slot="ai-assistant-actions"]')).opacity)`,
    );
    if (opacityAfter > 0.9) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!(opacityMid < 0.1) && opacityBefore >= 0.1) {
    throw new Error(`action bar: non-hover opacity should be < 0.1 (before=${opacityBefore}, mid=${opacityMid})`);
  }
  if (!(opacityAfter > 0.9)) {
    throw new Error(`action bar: hover opacity should be > 0.9, got ${opacityAfter}`);
  }
  await expectNoKernelError(ft, 'hover');

  // case 5: conversations search input is wired and error-free
  await gotoRoute(ft, '/#/ai-conversations');
  const panelDeadline = Date.now() + 30_000;
  let panelVisible = false;
  while (Date.now() < panelDeadline) {
    panelVisible = await ft.locator('.nop-ai-conversations', { timeoutMs: 1_000 }).isVisible();
    if (panelVisible) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!panelVisible) throw new Error('conversations: panel never visible');
  await ft.getByTestId('ai-conversations-search').waitFor('visible', { timeoutMs: 30_000 });
  await ft.getByTestId('ai-conversations-search').fill('任意关键词');
  await waitForValue(ft, '[data-testid="ai-conversations-search"]', '任意关键词');
  await expectNoKernelError(ft, 'conversations');

  return { cases: 5 };
}
