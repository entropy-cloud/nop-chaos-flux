import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * AI conversations — P1 namespace + conversations + streaming, and the
 * delete/rename legs (plan 633 UR-4).
 *
 * Migrated from tests/e2e/ai-conversations.spec.ts (E3 batch 2, engine swap +
 * kernel expectNoPageErrors in place of assertTrackedPageErrors, and the
 * toHaveCount(before+1) auto-retry expect() kept as driver retry assertions with
 * the same timeouts).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the demo remounts
 * (ft.reload() is unusable — it destroys the CDP evaluation context mid-spec).
 */

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-slot="ai-chat-root"]')).not.toBeVisible();
}

async function openAiConversationsDemo(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/ai-conversations');
  await ft.expectWeb(ft.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeoutMs: 30_000 });
}

// The ai-chat internals (sender input, message list) mount only once an active
// conversation exists — the external-send / streaming cases create one first
// when the demo mounts with an empty list.
async function ensureActiveConversation(ft: FtGlobal): Promise<void> {
  const sender = ft.locator('[data-slot="ai-sender-input"] textarea');
  if (!(await sender.isVisible())) {
    await ft.locator('[data-slot="ai-conversations-create"]').click();
  }
  await ft.expectWeb(sender).toBeVisible({ timeoutMs: 10_000 });
}

async function createConversation(ft: FtGlobal): Promise<number> {
  const listItems = ft.locator('[data-slot="ai-conversations-item"]');
  const before = await listItems.count();
  await ft.expectWeb(ft.locator('[data-slot="ai-conversations-create"]')).toBeVisible();
  await ft.locator('[data-slot="ai-conversations-create"]').click();
  // A broken create loop leaves the list unchanged (or empty) — this
  // assertion is the discriminating check for the full dispatch round-trip
  // (controller → useConversation → scope sync → list re-render).
  await ft.expectWeb(listItems).toHaveCount(before + 1, { timeoutMs: 10_000 });
  return before;
}

export default async function aiConversations(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: the conversations sidebar is rendered with the nop-ai-conversations marker
  await openAiConversationsDemo(ft);
  await ft.expectWeb(ft.locator('.nop-ai-conversations')).toBeVisible({ timeoutMs: 15_000 });
  await expectNoPageErrors(ft, 'ai-conversations:sidebar');

  // Case 2: clicking "New conversation" dispatches ai:createConversation without errors
  await openAiConversationsDemo(ft);
  await createConversation(ft);
  await expectNoPageErrors(ft, 'ai-conversations:create');

  // Case 3: external ai:send button dispatches through the registered namespace
  await openAiConversationsDemo(ft);
  await ensureActiveConversation(ft);
  await ft.locator('[data-testid="external-ai-send"]').click();
  const userBubble = ft.locator('[data-slot="ai-bubble"][data-role="user"]');
  await ft.expectWeb(userBubble).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(userBubble).toContainText('hi from external button', { timeoutMs: 10_000 });
  await expectNoPageErrors(ft, 'ai-conversations:external-send');

  // Case 4: streaming markdown does not flicker garbled CJK halves under chunk pressure
  await openAiConversationsDemo(ft);
  await ensureActiveConversation(ft);
  const input = ft.locator('[data-slot="ai-sender-input"] textarea');
  await input.fill('streaming-test');
  await ft.locator('[data-slot="ai-sender-submit"]').click();

  // Wait for the assistant bubble to start streaming.
  const assistant = ft.locator('[data-slot="ai-bubble"][data-role="assistant"]').last();
  await ft.expectWeb(assistant).toBeVisible({ timeoutMs: 10_000 });

  // Assert the final streamed text contains expected words. The buffer
  // holds back incomplete chunks; this is the no-garble / no-flicker spot
  // check (the unit test in markdown-buffer.test.ts covers the algorithm
  // exhaustively).
  await ft.expectWeb(assistant).toContainText('Hello', { timeoutMs: 10_000 });
  await expectNoPageErrors(ft, 'ai-conversations:streaming');

  // Case 5 (plan 633 UR-4): rename and delete keep the sidebar list live
  // through the schema data channel
  await openAiConversationsDemo(ft);

  // Precondition: pin the create leg, then work on the new conversation.
  await ensureActiveConversation(ft);
  const listItems = ft.locator('[data-slot="ai-conversations-item"]');
  const before = await createConversation(ft);
  // last().locator(sub) composes 'sel sub' and loses the index — pin the new
  // (last) conversation through a :last-child selector instead.
  const item = ft.locator('[data-slot="ai-conversations-item"]:last-child');

  // Rename leg: pencil → autofocus input → type → Enter commits; the list
  // re-renders with the new title through the same live data channel.
  await item.locator('[data-slot="ai-conversations-rename"]').click();
  const renameInput = item.locator('[data-slot="ai-conversations-rename-input"]');
  await ft.expectWeb(renameInput).toBeVisible();
  await renameInput.fill('UR-4 重命名会话');
  await renameInput.press('Enter');
  await ft.expectWeb(listItems.last()).toContainText('UR-4 重命名会话', { timeoutMs: 10_000 });

  // Delete leg: X → AlertDialog confirm → count returns to the baseline.
  await item.locator('[data-slot="ai-conversations-delete"]').click();
  const confirmDialog = ft.locator('[data-slot="ai-conversations-delete-confirm"]');
  await ft.expectWeb(confirmDialog).toBeVisible();
  await ft.getByRole('button', { name: '删除会话' }).click();
  await ft.expectWeb(listItems).toHaveCount(before, { timeoutMs: 10_000 });

  await expectNoPageErrors(ft, 'ai-conversations:rename-delete');

  return { cases: 5 };
}
