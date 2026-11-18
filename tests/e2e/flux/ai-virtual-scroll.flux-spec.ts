import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * AI virtual scroll — A-8 windowed rendering (1000 messages): only the viewport
 * window mounts, and the plan-529-Phase-4 aborted note is reachable at the
 * bottom of the virtual list (note bottom edge within 64px of the container
 * bottom, vertically intersecting the viewport).
 *
 * Migrated from tests/e2e/ai-virtual-scroll.spec.ts (E3 batch 4, engine swap +
 * kernel expectNoPageErrors in place of assertTrackedPageErrors, and the old
 * waitForTimeout(300) after the pinned jump-to-bottom replaced by an explicit
 * reachability poll that re-evaluates until the note geometry stabilizes —
 * with the last actual snapshot in the error).
 */

type Reachability = {
  noteFound: boolean;
  visible?: boolean;
  distanceFromBottom?: number;
} | null;

const REACHABILITY_PROBE = `(() => {
  const container = document.querySelector('[data-slot="ai-message-list"]');
  if (!(container instanceof HTMLElement)) return null;
  const scroller = container.scrollHeight > container.clientHeight
    ? container
    : ((container.querySelector('[data-virtual]') || container.firstElementChild));
  if (!(scroller instanceof HTMLElement)) return null;
  const note = document.querySelector('[data-slot="ai-message-list-aborted"]');
  if (!(note instanceof HTMLElement)) return { noteFound: false };
  const noteRect = note.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    noteFound: true,
    visible: noteRect.bottom > containerRect.top && noteRect.top < containerRect.bottom,
    distanceFromBottom: Math.abs(noteRect.bottom - containerRect.bottom),
  };
})()`;

const SCROLL_BOTTOM_PROBE = `(() => {
  const container = document.querySelector('[data-slot="ai-message-list"]');
  if (!(container instanceof HTMLElement)) return false;
  const scroller = container.scrollHeight > container.clientHeight
    ? container
    : ((container.querySelector('[data-virtual]') || container.firstElementChild));
  if (!(scroller instanceof HTMLElement)) return false;
  scroller.scrollTop = scroller.scrollHeight;
  return true;
})()`;

async function openAiVirtualScrollDemo(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/ai-virtual-scroll');
  await ft.expectWeb(ft.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeoutMs: 15_000 });
}

export default async function aiVirtualScroll(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: only the viewport window is mounted in the DOM
  await openAiVirtualScrollDemo(ft);

  const list = ft.locator('[data-slot="ai-message-list"]');
  await ft.expectWeb(list).toBeVisible({ timeoutMs: 15_000 });

  // Virtualization is enabled (crosses the 200-message threshold).
  await ft.expectWeb(list).toHaveAttribute('data-virtual');

  // 1000 messages are seeded, but only the visible window (+overscan) is
  // mounted as bubble DOM nodes — far fewer than 1000.
  const bubbleCount = await ft.evaluate(
    `(() => document.querySelectorAll('[data-slot="ai-bubble"]').length)()`,
  );
  if (typeof bubbleCount !== 'number' || bubbleCount >= 100) {
    throw new Error(`expected <100 mounted bubbles, got ${JSON.stringify(bubbleCount)}`);
  }
  if (bubbleCount <= 0) throw new Error('expected >0 mounted bubbles, got 0');

  await expectNoPageErrors(ft, 'ai-virtual-scroll:window');

  // Case 2 (plan 529 Phase 4): aborted note is reachable at the bottom of the
  // virtual list. 虚拟模式下产生尾部 AbortedNote（发送后立即停止 →
  // requestState='aborted'，note 渲染于虚拟窗口后的常规流内）；跳底后 note
  // 必须落在可视区内（不被 spacer 遮挡）。
  await openAiVirtualScrollDemo(ft);
  // toHaveAttribute's options slot is the value argument — poll presence via
  // evaluate instead of a timeout-annotated presence assertion.
  const virtualDeadline = Date.now() + 15_000;
  let virtualAttr: unknown;
  let virtualReady = false;
  while (Date.now() < virtualDeadline) {
    virtualAttr = await ft.evaluate(
      `(() => document.querySelector('[data-slot="ai-message-list"]')?.getAttribute('data-virtual') ?? null)()`,
    );
    if (virtualAttr !== null && virtualAttr !== undefined) {
      virtualReady = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!virtualReady) {
    throw new Error(`data-virtual never appeared on the message list; last actual: ${JSON.stringify(virtualAttr)}`);
  }

  // 发送 → 立即停止：制造 requestState='aborted' 的尾部 note
  const textarea = ft.locator('[data-slot="ai-sender-input"] textarea');
  await textarea.fill('trigger abort note');
  await ft.locator('[data-slot="ai-sender-submit"]').click();
  const cancel = ft.locator('[data-slot="ai-sender-cancel"]');
  await ft.expectWeb(cancel).toBeVisible({ timeoutMs: 10_000 });
  await cancel.click();
  await ft.expectWeb(ft.locator('[data-slot="ai-message-list-aborted"]')).toBeVisible({
    timeoutMs: 10_000,
  });

  // 程序化跳底（pinned 滚动语义：直接置 scrollTop 到底），then poll the
  // reachability geometry until it holds (replaces waitForTimeout(300) with a
  // condition-based gate; last actual reported on failure).
  if ((await ft.evaluate(SCROLL_BOTTOM_PROBE)) !== true) {
    throw new Error('virtual scroller not found for jump-to-bottom');
  }
  const deadline = Date.now() + 10_000;
  let reachability: Reachability = null;
  let reached = false;
  while (Date.now() < deadline) {
    reachability = (await ft.evaluate(REACHABILITY_PROBE)) as Reachability;
    if (
      reachability &&
      reachability.noteFound &&
      reachability.visible &&
      typeof reachability.distanceFromBottom === 'number' &&
      reachability.distanceFromBottom <= 64
    ) {
      reached = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (!reached) {
    throw new Error(
      `aborted note never became reachable at the bottom; last actual: ${JSON.stringify(reachability)}`,
    );
  }

  await expectNoPageErrors(ft, 'ai-virtual-scroll:aborted-note-reachability');

  return { cases: 2 };
}
