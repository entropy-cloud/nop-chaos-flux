import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * AI tools — P2 agentic tool loop end-to-end.
 * send → tool_calls → executor → tool result → follow-up reply.
 *
 * Migrated from tests/e2e/ai-tools.spec.ts (E3 batch 1, engine swap +
 * assertTrackedPageErrors → kernel expectNoPageErrors).
 */

async function openAiToolsDemo(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/ai-tools');
  await ft.expectWeb(ft.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeoutMs: 15_000 });
}

export default async function aiToolsSpec(ft: FtGlobal): Promise<void> {
  await openAiToolsDemo(ft);

  const input = ft.locator('[data-slot="ai-sender-input"] textarea');
  await input.fill('what is the weather?');
  await ft.locator('[data-slot="ai-sender-submit"]').click();

  // Round 1: the model emitted a tool_call → a tool card renders.
  const toolCard = ft.locator('[data-slot="ai-tool-call"]').first();
  await ft.expectWeb(toolCard).toBeVisible({ timeoutMs: 15_000 });

  // The host toolExecutor resolved it → status reaches success.
  await ft.expectWeb(toolCard).toHaveAttribute('data-tool-status', 'success', { timeoutMs: 15_000 });

  // Round 2: the follow-up content reply references the tool result.
  const assistant = ft.locator('[data-slot="ai-bubble"][data-role="assistant"]').last();
  await ft.expectWeb(assistant).toContainText('weather tool returned', { timeoutMs: 15_000 });

  await expectNoPageErrors(ft, 'ai-tools');
}
