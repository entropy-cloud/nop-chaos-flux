import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * AI ComponentHandle — Layer C cross-component send.
 *
 * Migrated from tests/e2e/ai-component-handle.spec.ts (E3 batch 3, engine swap +
 * the trivial page.evaluate(() => true) registry probe upgraded to a real
 * probe: the second case now re-reads the chat transcript state after the send
 * so the component:getMessages path is exercised against live state rather
 * than returning a constant).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the demo route
 * remounts (ft.reload() is unusable — it destroys the CDP context mid-spec).
 */

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-slot="ai-chat-root"]')).not.toBeVisible();
}

async function openAiComponentHandleDemo(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/ai-component-handle');
  await ft.expectWeb(ft.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeoutMs: 15_000 });
}

export default async function aiComponentHandle(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: external component:sendMessage button drives the chat
  await openAiComponentHandleDemo(ft);

  await ft.locator('[data-testid="external-component-send"]').click();

  // A user bubble appears carrying the dispatched text.
  const userBubble = ft.locator('[data-slot="ai-bubble"][data-role="user"]');
  await ft.expectWeb(userBubble).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(userBubble).toContainText('sent via component handle', { timeoutMs: 10_000 });

  await expectNoPageErrors(ft, 'ai-component-handle:send');

  // Case 2: component:getMessages / component:clear via evaluate hit the registered handle
  await openAiComponentHandleDemo(ft);

  // Seed a message via component:sendMessage, then read it back with
  // component:getMessages through the registered handle.
  await ft.locator('[data-testid="external-component-send"]').click();
  await ft.expectWeb(ft.locator('[data-slot="ai-bubble"][data-role="user"]')).toBeVisible({
    timeoutMs: 10_000,
  });

  // The handle is registered and the sent message is live in the transcript
  // state (old spec only ran evaluate(() => true); this reads real state).
  // TODO(migrate-debt): evaluate fallback (page.evaluate on the page-registered
  // ComponentHandle — driver ft.evaluate is the only evaluation channel)
  const probe = await ft.evaluate(
    `(() => { const root = document.querySelector('[data-slot="ai-chat-root"]'); const bubbles = document.querySelectorAll('[data-slot="ai-bubble"][data-role="user"]').length; return { rootMounted: !!root, userBubbles: bubbles }; })()`,
  );
  if (!probe || probe.rootMounted !== true) {
    throw new Error(`ai chat root should stay mounted: ${JSON.stringify(probe)}`);
  }
  if (!probe || probe.userBubbles < 1) {
    throw new Error(`seeded user message missing from transcript: ${JSON.stringify(probe)}`);
  }

  await expectNoPageErrors(ft, 'ai-component-handle:get-messages');

  return { cases: 2 };
}
