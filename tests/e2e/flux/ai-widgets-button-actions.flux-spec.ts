import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * D4 (plan 2026-08-24-2317-1): real button side effects on the widgets demo.
 * ① prompt click writes the sender draft; ② repeat click dedupes;
 * ③ suggestion click writes the empty draft; ④ refresh regenerates the
 * latest assistant message (truncate-rerun: streaming re-enters, count
 * unchanged); ⑤ like toggle aria/data mirrors; ⑥ suggestion pill renders a
 * lucide svg (G9); ⑦ sources opens a Popover with the source entries.
 *
 * Migrated from tests/e2e/ai-widgets-button-actions.spec.ts (E3 batch 4,
 * engine swap + case ② 's waitForTimeout(400) replaced with a conditional
 * dedupe poll that fails with the landed duplicate value instead of a fixed
 * sleep; case ④ submits via fill+Enter because the playground's fixed
 * bottom-right overlay covers the submit button for real CDP clicks).
 */

async function openWidgetsPage(ft: FtGlobal): Promise<void> {
  // bounce through '/#/' so the lab remounts (goto to the SAME url is a no-op)
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('[data-slot="ai-chat-root"]')).not.toBeVisible();
  await ft.goto('/#/ai-widgets');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
  // 30s first-paint budget: a cold dev server must compile the whole demo
  // module graph before ai-chat-root mounts
  await ft.expectWeb(ft.locator('[data-slot="ai-chat-root"]')).toBeVisible({ timeoutMs: 30_000 });
}

async function senderInput(ft: FtGlobal) {
  const input = ft.locator('[data-slot="ai-sender-input"] textarea');
  await input.waitFor('attached');
  return input;
}

export default async function aiWidgetsButtonActions(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case ①: prompt click writes its label into the empty sender draft (single value)
  await openWidgetsPage(ft);
  const input1 = await senderInput(ft);
  await ft.expectWeb(input1).toHaveValue('');

  await ft.locator('[data-slot="ai-prompts-item"]').first().click();
  await ft.expectWeb(input1).toHaveValue('What is the weather?');

  await expectNoPageErrors(ft, 'ai-widgets-buttons:prompt-write');

  // Case ②: clicking the same prompt again does not duplicate the draft (dedupe)
  await openWidgetsPage(ft);
  const input2 = await senderInput(ft);
  const prompt2 = ft.locator('[data-slot="ai-prompts-item"]').first();

  await prompt2.click();
  await ft.expectWeb(input2).toHaveValue('What is the weather?');
  await prompt2.click();
  await ft.expectWeb(input2).toHaveValue('What is the weather?');

  // no async duplicate lands later either (conditional poll, fails with the
  // actual duplicate value instead of a fixed waitForTimeout)
  let deduped = 'What is the weather?';
  for (let i = 0; i < 8; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    deduped = await input2.inputValue();
    if (deduped !== 'What is the weather?') break;
  }
  if (deduped !== 'What is the weather?') {
    throw new Error(`prompt dedupe broken: input value became "${deduped}"`);
  }

  await expectNoPageErrors(ft, 'ai-widgets-buttons:prompt-dedupe');

  // Case ③: suggestion click writes its text into the empty draft
  await openWidgetsPage(ft);
  const input3 = await senderInput(ft);
  await ft.expectWeb(input3).toHaveValue('');

  await ft.locator('[data-slot="ai-suggestions-item"]').first().click();
  await ft.expectWeb(input3).toHaveValue('Summarize');

  await expectNoPageErrors(ft, 'ai-widgets-buttons:suggestion-write');

  // Case ④: refresh regenerates the latest assistant message (streaming re-enters, count unchanged)
  await openWidgetsPage(ft);
  const input4 = await senderInput(ft);
  const root4 = ft.locator('[data-slot="ai-chat-root"]');
  const assistant = ft.locator('[data-slot="ai-bubble"][data-role="assistant"]');

  // submit via Enter on the focused textarea: the page's fixed bottom-right
  // playground overlay covers the submit button center, so a real CDP click
  // on it would land on the overlay instead
  await input4.fill('plain greeting');
  await ft.keyboard.press('Enter');
  await ft.expectWeb(assistant).toHaveCount(1, { timeoutMs: 20_000 });
  await ft.expectWeb(assistant.first()).toContainText('Hello', { timeoutMs: 20_000 });
  await ft.expectWeb(root4).toHaveAttribute('data-state', 'completed', { timeoutMs: 20_000 });

  // refresh → the engine truncates and re-runs the latest assistant turn
  await ft.locator('[data-slot="ai-feedback-refresh"]').click();
  await ft.expectWeb(assistant.first()).toHaveAttribute('data-streaming', '', { timeoutMs: 10_000 });
  await ft.expectWeb(assistant).toHaveCount(1);

  // truncate-rerun semantics: the assistant count stays unchanged and the
  // content is restored once the re-run completes
  await ft.expectWeb(root4).toHaveAttribute('data-state', 'completed', { timeoutMs: 30_000 });
  await ft.expectWeb(assistant).toHaveCount(1);
  await ft.expectWeb(assistant.first()).toContainText('Hello');

  await expectNoPageErrors(ft, 'ai-widgets-buttons:refresh-rerun');

  // Case ⑤: like toggle flips aria-pressed and data-active
  await openWidgetsPage(ft);
  const like = ft.locator('[data-slot="ai-feedback-like"]');

  await ft.expectWeb(like).toHaveAttribute('aria-pressed', 'false');
  await like.click();
  await ft.expectWeb(like).toHaveAttribute('aria-pressed', 'true');
  await ft.expectWeb(like).toHaveAttribute('data-active', '');
  await like.click();
  await ft.expectWeb(like).toHaveAttribute('aria-pressed', 'false');
  await ft.expectWeb(like).not.toHaveAttribute('data-active');

  await expectNoPageErrors(ft, 'ai-widgets-buttons:like-toggle');

  // Case ⑥: suggestion pill renders a lucide svg icon, not an emoji literal (G9)
  await openWidgetsPage(ft);
  const pill = ft.locator('[data-slot="ai-suggestions-item"]').first();
  await ft.expectWeb(pill).toBeVisible();

  // Wave 1–3 lesson: sub-locator composition loses ancestor scoping in the
  // driver (a composed svg count came back document-wide 5) — use the
  // globally unique data-index attribute path instead
  const pill0IconSvg = ft.locator(
    '[data-slot="ai-suggestions-item"][data-index="0"] [data-slot="ai-suggestions-item-icon"] svg',
  );
  await ft.expectWeb(pill0IconSvg).toHaveCount(1);
  const text = await ft.evaluate(
    `document.querySelector('[data-slot="ai-suggestions-item"][data-index="0"] [data-slot="ai-suggestions-item-text"]')?.textContent`,
  );
  if (typeof text !== 'string' || !text.includes('Summarize')) {
    throw new Error(`suggestion pill text should contain "Summarize", got "${JSON.stringify(text)}"`);
  }
  if (/✏️|🌐|💡|✨|➕/.test(text)) {
    throw new Error(`suggestion pill renders an emoji literal instead of an svg icon: "${text}"`);
  }

  await expectNoPageErrors(ft, 'ai-widgets-buttons:svg-icon');

  // Case ⑦: sources opens a Popover listing the message sources
  await openWidgetsPage(ft);

  await ft.locator('[data-slot="ai-feedback-sources"]').click();
  const list = ft.locator('[data-slot="ai-feedback-sources-list"]');
  await ft.expectWeb(list).toBeVisible();
  await ft.expectWeb(list.locator('[data-slot="ai-feedback-source-item"]')).toHaveCount(2);
  await ft.expectWeb(list.first()).toContainText('design.md');

  await expectNoPageErrors(ft, 'ai-widgets-buttons:sources-popover');

  return { cases: 7 };
}
