import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * AI persistence — P3 localStorage end-to-end (via ai-chat).
 *
 * Migrated from tests/e2e/ai-persistence.spec.ts (E3 batch 2, engine swap +
 * upgrade: page.reload() replaced by the resetRoute hash bounce — ft.reload()
 * destroys the CDP context mid-spec; the demo's useConversation bootstrap reads
 * storage on component mount, so the route-bounce remount exercises the same
 * rehydration path. localStorage waitForFunction probes became explicit
 * ft.evaluate retry loops with the same 5s budget).
 */

const STORAGE_KEY = 'nop-chaos-flux:ai-persistence-demo';
const PANEL = '[data-testid="ai-persistence-panel"]';

async function remountDemo(ft: FtGlobal): Promise<void> {
  // hash-route bounce (never ft.reload()): home unmounts the demo, returning
  // remounts it and re-runs the useConversation storage bootstrap.
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator(PANEL)).not.toBeVisible();
  await ft.goto('/#/ai-persistence');
  await ft.expectWeb(ft.locator(PANEL)).toBeVisible({ timeoutMs: 15_000 });
  await ft.expectWeb(ft.locator('.nop-ai-chat')).toBeVisible({ timeoutMs: 15_000 });
}

async function openFresh(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/ai-persistence');
  await ft.expectWeb(ft.locator(PANEL)).toBeVisible({ timeoutMs: 15_000 });
  // Start from a clean slate, then remount so the bootstrap reads empty storage.
  await ft.evaluate(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await remountDemo(ft);
}

/** waitForFunction(localStorage contains needle) → explicit ft.evaluate retry loop. */
async function expectStorageContains(ft: FtGlobal, needle: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  let raw: unknown = null;
  while (Date.now() < deadline) {
    raw = await ft.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
    if (typeof raw === 'string' && raw.includes(needle)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`localStorage["${STORAGE_KEY}"] never contained "${needle}" (last=${String(raw).slice(0, 120)})`);
}

async function sendUserMessage(ft: FtGlobal, text: string): Promise<void> {
  const input = ft.locator('[data-slot="ai-sender-input"] textarea');
  await input.waitFor('visible', { timeoutMs: 10_000 });
  await input.fill(text);
  await ft.locator('[data-slot="ai-sender-submit"]').click();
  await ft.expectWeb(ft.locator('[data-slot="ai-bubble"][data-role="user"]')).toContainText(text, {
    timeoutMs: 10_000,
  });
  // The turn completes when the mock reply's tail lands in the assistant bubble.
  await ft.expectWeb(ft.locator('[data-slot="ai-bubble"][data-role="assistant"]')).toContainText(
    'Streaming works',
    { timeoutMs: 10_000 },
  );
  // Reactive autosave-flush signal: the snapshot lands in localStorage before
  // we remount.
  await expectStorageContains(ft, text);
}

/**
 * Post-switch re-hydration probe. toContainText cannot be used here: the
 * engine-null switch transiently unmounts the bubble list and locator.text()
 * hard-throws on a missing element (no absent-tolerant retry), so poll via
 * ft.evaluate until the user bubble text contains the needle.
 */
async function expectUserBubbleContains(ft: FtGlobal, needle: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  let last = '';
  while (Date.now() < deadline) {
    last = String(
      (await ft.evaluate(
        `(function(){
          var el = document.querySelector('[data-slot="ai-bubble"][data-role="user"]');
          return el ? el.textContent : '';
        })()`,
      )) ?? '',
    );
    if (last.includes(needle)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`user bubble never contained "${needle}" (last="${last.slice(0, 80)}")`);
}

export default async function aiPersistence(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: a sent message survives a page refresh and renders through ai-chat
  {
    await openFresh(ft);

    // Create a conversation (React sidebar → conversations.createConversation).
    await ft.locator('[data-testid="ai-persistence-create"]').click();
    await ft.expectWeb(ft.locator('[data-testid="ai-persistence-item"]')).toHaveCount(1);

    // Send a message through the ai-chat sender; wait for autosave flush.
    await sendUserMessage(ft, 'persist-me');

    // Refresh (remount) — the conversation list + messages must recover from storage.
    await remountDemo(ft);
    await ft.expectWeb(ft.locator('[data-testid="ai-persistence-item"]')).toHaveCount(1);

    // The active conversation auto-rehydrates from storage (mount bootstrap →
    // switchConversation → engine.setMessages). The persisted user message
    // reappears in the ai-chat message list.
    await ft.expectWeb(ft.locator('[data-slot="ai-bubble"][data-role="user"]')).toContainText(
      'persist-me',
      { timeoutMs: 10_000 },
    );

    await expectNoPageErrors(ft, 'ai-persistence:refresh');
  }

  // Case 2: switching conversations re-hydrates each engine through ai-chat.
  // NOTE: the old spec restarted from a blank page per test, but conversation
  // state lives in a module-level store that only a real page reload resets
  // (ft.reload() destroys the CDP context), so this case continues from case
  // 1's session: it creates two new conversations on top of the recovered one
  // and switches between them — the same switchConversation → engine re-bind
  // → ai-chat re-hydration path, just with titles shifted by the recovered
  // conversation ("Chat 2" holds msg-A).
  {
    // Conversation A (msg-A).
    await ft.locator('[data-testid="ai-persistence-create"]').click();
    await sendUserMessage(ft, 'msg-A');

    // Conversation B (prepended → becomes the first sidebar item).
    await ft.locator('[data-testid="ai-persistence-create"]').click();
    await sendUserMessage(ft, 'msg-B');

    // Switch back to A — its messages re-hydrate through ai-chat (the
    // engine-null switch is transient; the new engine binds on the next
    // render). The switch handler sits on the inner <button>, which the
    // driver's synthetic container click does not reach.
    await ft.getByRole('button', { name: 'Chat 2' }).click();
    await ft.expectWeb(ft.locator('.nop-ai-chat')).toBeVisible({ timeoutMs: 15_000 });
    await expectUserBubbleContains(ft, 'msg-A');

    await expectNoPageErrors(ft, 'ai-persistence:switch');
  }

  return { cases: 2 };
}
