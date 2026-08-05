import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C8.1 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-ai-dialog (bug 73 pattern): ai-chat inside an openDialog surface —
 *    send + mock streaming render the user/assistant bubbles inside the dialog
 *    (real-browser dialog hosting; unit tests cannot prove this).
 * 2. host-ai-stream: streaming DOM contract — during an in-flight turn the
 *    message list keeps stable data-role/data-slot markers, the assistant
 *    bubble carries data-streaming, and cancel (abort) returns the sender to
 *    the enabled state with data-state=aborted.
 * 3. host-ai-hitl: HITL dead-click special — a pending approval with a WIRED
 *    handler dispatches exactly once with the toolCallId, the host-owned state
 *    flips to decided (badge replaces buttons) so a rapid second click cannot
 *    double-submit; a NO-handler card keeps its buttons disabled.
 * 4. host-ai-cc: ai-conversations sidebar item click dispatches onItemClick
 *    with the conversation payload, and ai-chat fires onConversationChange
 *    (C8.1 P1-1) when its activeConversationId prop changes.
 * 5. host-ai-sender: standalone ai-sender Enter-submits the trimmed draft and
 *    fires onSubmit { text } with the payload resolvable in action args.
 */

async function readProbe(page: import('@playwright/test').Page, key: string): Promise<string | undefined> {
  return page.evaluate((k) => (window as unknown as Record<string, string | undefined>)[k], `__c8${key}`);
}

test('ai-host: chat inside a dialog streams a reply (host-ai-dialog, bug 73 pattern)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-chat');

  const slug = scenarioSlug('Host AI chat in dialog + streaming (C8.1 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c8-dialog-open"]').click();
  const chat = page.locator('[data-testid="c8-dialog-chat"]');
  await expect(chat).toBeVisible({ timeout: 10_000 });
  await expect(chat).toHaveAttribute('data-slot', 'ai-chat-root');

  // Send inside the dialog: the mock connector streams a canned reply.
  const input = chat.locator('[data-slot="ai-sender-input"] textarea');
  await input.fill('hello from the dialog');
  await chat.locator('[data-slot="ai-sender-submit"]').click();

  const userBubble = chat.locator('[data-slot="ai-bubble"][data-role="user"]');
  await expect(userBubble).toContainText('hello from the dialog', { timeout: 10_000 });

  const assistantBubble = chat.locator('[data-slot="ai-bubble"][data-role="assistant"]');
  await expect(assistantBubble).toContainText('Hello', { timeout: 10_000 });

  // The dialog-hosted message list keeps the streaming DOM contract (settled
  // back to idle once the turn completes).
  await expect(chat.locator('[data-slot="ai-message-list"]')).not.toHaveAttribute('aria-busy', 'true');

  await assertTrackedPageErrors(page);
});

test('ai-host: streaming DOM contract + abort returns sender to enabled (host-ai-stream)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-chat');

  const slug = scenarioSlug('Host streaming DOM contract (C8.1)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const chat = stage.locator('[data-testid="c8-stream-chat"]');
  await expect(chat).toBeVisible({ timeout: 10_000 });

  const input = chat.locator('[data-slot="ai-sender-input"] textarea');
  await input.fill('stream contract');
  await chat.locator('[data-slot="ai-sender-submit"]').click();

  // In-flight: data-state=processing + the assistant bubble carries data-streaming.
  await expect(chat).toHaveAttribute('data-state', 'processing', { timeout: 5_000 });
  const assistant = chat.locator('[data-slot="ai-bubble"][data-role="assistant"]');
  await expect(assistant).toBeVisible({ timeout: 5_000 });
  await expect(chat.locator('[data-slot="ai-message-list"]')).toHaveAttribute('aria-busy', 'true');

  // Stable DOM contract across the stream: exactly one user + one assistant bubble.
  await expect(chat.locator('[data-slot="ai-bubble"][data-role="user"]')).toHaveCount(1);
  await expect(chat.locator('[data-slot="ai-bubble"][data-role="assistant"]')).toHaveCount(1);

  // Completion: data-state=completed and the streaming marker clears.
  await expect(chat).toHaveAttribute('data-state', 'completed', { timeout: 10_000 });
  await expect(assistant).not.toHaveAttribute('data-streaming', '');
  await expect(chat.locator('[data-slot="ai-message-list"]')).not.toHaveAttribute('aria-busy', 'true');

  // Abort path: start a second turn, cancel mid-stream, the sender returns to
  // a usable state (cancel button gone, textarea enabled — the submit button
  // stays disabled because clearOnSubmit already cleared the draft).
  await input.fill('abort me');
  await chat.locator('[data-slot="ai-sender-submit"]').click();
  await expect(chat).toHaveAttribute('data-state', 'processing', { timeout: 5_000 });
  await chat.locator('[data-slot="ai-sender-cancel"]').click();
  await expect(chat).toHaveAttribute('data-state', 'aborted', { timeout: 5_000 });
  await expect(chat.locator('[data-slot="ai-sender-cancel"]')).toHaveCount(0);
  await expect(chat.locator('[data-slot="ai-sender-input"] textarea')).toBeEnabled();

  await assertTrackedPageErrors(page);
});

test('ai-host: HITL pending approval cannot double-submit; no-handler card stays disabled (host-ai-hitl)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-chat');

  const slug = scenarioSlug('Host HITL dead-click (C8.1)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // Wired handler card: pending state, approve button enabled.
  const wired = stage.locator('[data-testid="c8-hitl-wired"]');
  await expect(wired).toBeVisible({ timeout: 10_000 });
  await expect(wired).toHaveAttribute('data-approval', 'pending');
  const approve = wired.locator('[data-slot="ai-tool-call-approve"]');
  await expect(approve).toBeEnabled();

  // Rapid double click: the first click flips the host-owned state to decided
  // (badge replaces the buttons), so the second click cannot dispatch again.
  await approve.click({ clickCount: 2, delay: 30 });

  await expect.poll(async () => readProbe(page, 'Hitl'), { timeout: 10_000 }).toBe('approve|call_c8_1');
  await expect.poll(async () => Number(await readProbe(page, 'HitlCount')), { timeout: 10_000 }).toBe(1);

  // Decided state: data-approval=approved + the decision badge, buttons gone.
  await expect(wired).toHaveAttribute('data-approval', 'approved');
  await expect(wired.locator('[data-slot="ai-tool-call-approve"]')).toHaveCount(0);
  await expect(wired.locator('[data-approval-decision="approved"]')).toBeVisible();

  // No-handler card: buttons are disabled (dead-click prevention, FP hitl-no-handler).
  const noHandler = stage.locator('[data-testid="c8-hitl-no-handler"]');
  await expect(noHandler).toHaveAttribute('data-approval', 'pending');
  await expect(noHandler.locator('[data-slot="ai-tool-call-approve"]')).toBeDisabled();
  await expect(noHandler.locator('[data-slot="ai-tool-call-reject"]')).toBeDisabled();

  await assertTrackedPageErrors(page);
});

test('ai-host: conversation sidebar click drives ai-chat onConversationChange (host-ai-cc)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-conversations');

  const slug = scenarioSlug('Host conversation list + onConversationChange (C8.1)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const sidebar = stage.locator('[data-testid="c8-conversations"]');
  await expect(sidebar).toBeVisible({ timeout: 10_000 });
  await expect(sidebar).toHaveAttribute('data-slot', 'ai-conversations');

  const items = sidebar.locator('[data-slot="ai-conversations-item"]');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toHaveAttribute('data-active', '');

  // Click the second conversation: onItemClick payload + setValue flips the
  // ai-chat activeConversationId → onConversationChange fires (C8.1 P1-1).
  await items.nth(1).locator('[data-slot="ai-conversations-item-button"]').click();
  await expect.poll(async () => readProbe(page, 'ConversationClick'), { timeout: 10_000 }).toBe('c2|Second chat');
  await expect.poll(async () => readProbe(page, 'ConversationChange'), { timeout: 10_000 }).toBe('c2');
  await expect(items.nth(1)).toHaveAttribute('data-active', '');

  await assertTrackedPageErrors(page);
});

test('ai-host: standalone sender submits the trimmed draft with payload args (host-ai-sender)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-sender');

  const slug = scenarioSlug('Host sender submit + word limit (C8.1)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const sender = stage.locator('[data-testid="c8-sender"]');
  await expect(sender).toHaveAttribute('data-slot', 'ai-sender');

  // Word limit counter renders (maxLength is enforced by the native attribute,
  // so the counter shows the capped length while typing).
  const textarea = sender.locator('textarea');
  await textarea.fill('x'.repeat(70));
  await expect(sender.locator('[data-slot="ai-sender-count"]')).toContainText('60/60');

  // Enter submits the TRIMMED draft and fires onSubmit { text } — the args
  // template `${text}` resolves through the dispatch ctx (C8.1 P1).
  await textarea.fill('  hello from lab  ');
  await textarea.press('Enter');
  await expect.poll(async () => readProbe(page, 'SenderSubmit'), { timeout: 10_000 }).toBe('hello from lab');
  await expect.poll(async () => readProbe(page, 'SenderChange'), { timeout: 10_000 }).toBe('  hello from lab  ');

  await assertTrackedPageErrors(page);
});
