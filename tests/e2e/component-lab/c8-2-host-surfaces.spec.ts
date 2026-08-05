import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C8.2 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-tool-dialog (bug 73 pattern): ai-tool-call inside an openDialog
 *    surface — host-driven running → success status transition + args
 *    expand/collapse inside the dialog (unit tests cannot prove this).
 * 2. host-hitl-dead (HITL dead-click special): pending approval with a WIRED
 *    handler dispatches exactly once under rapid double click (host-owned
 *    state flips to decided, badge replaces buttons); a NO-handler card keeps
 *    its buttons disabled.
 * 3. host-attach-dialog (bug 73 pattern): ai-attachments inside an openDialog
 *    surface — real file pick renders the thumbnail in the dialog, remove
 *    works, over-limit fires onError with the reason resolvable via ctx.
 * 4. host-attach-safety: a controlled value with a `javascript:` URL renders
 *    only as an <img> (never an executable anchor).
 * 5. host-citation-clk: inline [N] markers → popover source card (title/url),
 *    onSourceClick payload `${index}|${source.title}` resolves via ctx.
 * 6. host-feedback: like/dislike local echo (data-active presence toggles,
 *    mutually exclusive) + onAction `${action}|${message.id}` via ctx.
 * 7. host-token-usage: metadata.usage renders counts, data-empty placeholder
 *    when missing, onClick `${usage.total_tokens}` resolves via ctx.
 */

async function readProbe(page: import('@playwright/test').Page, key: string): Promise<string | undefined> {
  return page.evaluate((k) => (window as unknown as Record<string, string | undefined>)[k], `__c82${key}`);
}

async function readProbeCount(page: import('@playwright/test').Page, key: string): Promise<number> {
  return page.evaluate(
    (k) => ((window as unknown as Record<string, number | undefined>)[k] ?? 0) as number,
    `__c82${key}Count`,
  );
}

test('ai-host: tool-call in a dialog transitions status and expands args (host-tool-dialog, bug 73 pattern)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-tool-call');

  const slug = scenarioSlug('Host tool-call in dialog + status transition (C8.2 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c82-tool-open"]').click();
  const tool = page.locator('[data-testid="c82-tool-in-dialog"]');
  await expect(tool).toBeVisible({ timeout: 10_000 });
  await expect(tool).toHaveAttribute('data-slot', 'ai-tool-call');
  await expect(tool).toHaveAttribute('data-tool-status', 'running');

  // Args expand/collapse inside the dialog (defaultOpen false → collapsed).
  await expect(tool.locator('[data-slot="ai-tool-call-args"]')).toHaveCount(0);
  await tool.locator('[data-slot="ai-tool-call-toggle"]').click();
  await expect(tool.locator('[data-slot="ai-tool-call-args"]')).toContainText('Hangzhou');
  await expect(tool).toHaveAttribute('data-open', '');

  // Host-driven status transition: running → success.
  await page.locator('[data-testid="c82-tool-success"]').click();
  await expect(tool).toHaveAttribute('data-tool-status', 'success', { timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('ai-host: HITL pending approval cannot double-submit; no-handler card stays disabled (host-hitl-dead)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-tool-call');

  const slug = scenarioSlug('Host HITL dead-click (C8.2)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // Wired handler card: pending state, approve button enabled.
  const wired = stage.locator('[data-testid="c82-hitl-wired"]');
  await expect(wired).toBeVisible({ timeout: 10_000 });
  await expect(wired).toHaveAttribute('data-approval', 'pending');
  const approve = wired.locator('[data-slot="ai-tool-call-approve"]');
  await expect(approve).toBeEnabled();

  // Rapid double click: the first click flips the host-owned state to decided
  // (badge replaces the buttons), so the second click cannot dispatch again.
  await approve.click({ clickCount: 2, delay: 30 });

  await expect.poll(async () => readProbe(page, 'Hitl'), { timeout: 10_000 }).toBe('approve|call_c8_2');
  await expect.poll(async () => readProbeCount(page, 'Hitl'), { timeout: 10_000 }).toBe(1);

  await expect(wired).toHaveAttribute('data-approval', 'approved');
  await expect(wired.locator('[data-slot="ai-tool-call-approve"]')).toHaveCount(0);
  await expect(wired.locator('[data-approval-decision="approved"]')).toBeVisible();

  // No-handler card: buttons are disabled (dead-click prevention, FP hitl-no-handler).
  const noHandler = stage.locator('[data-testid="c82-hitl-no-handler"]');
  await expect(noHandler).toHaveAttribute('data-approval', 'pending');
  await expect(noHandler.locator('[data-slot="ai-tool-call-approve"]')).toBeDisabled();
  await expect(noHandler.locator('[data-slot="ai-tool-call-reject"]')).toBeDisabled();

  await assertTrackedPageErrors(page);
});

test('ai-host: attachments in a dialog pick/remove/validate (host-attach-dialog, bug 73 pattern)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-attachments');

  const slug = scenarioSlug('Host attachments in dialog + validation (C8.2 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c82-attach-open"]').click();
  const attach = page.locator('[data-testid="c82-attach-in-dialog"]');
  await expect(attach).toBeVisible({ timeout: 10_000 });
  await expect(attach).toHaveAttribute('data-slot', 'ai-attachments');

  // Real file pick: image thumbnail renders inside the dialog.
  const input = attach.locator('[data-slot="ai-attachments-input"]');
  await input.setInputFiles({
    name: 'host.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
  });
  await expect(attach.locator('[data-slot="ai-attachments-thumb"]')).toHaveCount(1);
  await expect(attach.locator('[data-slot="ai-attachments-upload"]')).toBeVisible();

  // Remove works inside the dialog.
  await attach.locator('[data-slot="ai-attachments-remove"]').click();
  await expect(attach.locator('[data-slot="ai-attachments-thumb"]')).toHaveCount(0);

  // Over-limit file: onError reason resolves through the dispatch ctx.
  await input.setInputFiles({
    name: 'too-big.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(6 * 1024 * 1024, 1),
  });
  await expect.poll(async () => readProbe(page, 'AttachError'), { timeout: 10_000 }).toBe('attachment-too-large');
  await expect(attach.locator('[data-slot="ai-attachments-thumb"]')).toHaveCount(0);

  await assertTrackedPageErrors(page);
});

test('ai-host: javascript: attachment URL never becomes an anchor (host-attach-safety)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-attachments');

  const slug = scenarioSlug('Host attachment URL / file-name safety (C8.2)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // Image-mode item: the javascript: URL renders only as an <img> src —
  // never as an anchor.
  const imgWidget = stage.locator('[data-testid="c82-attach-safety-img"]');
  await expect(imgWidget).toHaveAttribute('data-slot', 'ai-attachments');
  const thumb = imgWidget.locator('[data-slot="ai-attachments-thumb"]');
  await expect(thumb).toHaveAttribute('src', 'javascript:alert(1)');
  await expect(imgWidget.locator('a')).toHaveCount(0);
  await expect(imgWidget.locator('[href]')).toHaveCount(0);

  // Card-mode item: the malicious file name renders as escaped text and the
  // javascript: URL never materializes as a link.
  const cardWidget = stage.locator('[data-testid="c82-attach-safety-card"]');
  await expect(cardWidget).toHaveAttribute('data-mode', 'card');
  await expect(cardWidget.locator('[data-slot="ai-attachments-item"]')).toContainText(
    '<img src=x onerror=alert(1)>.pdf',
  );
  await expect(cardWidget.locator('img[onerror]')).toHaveCount(0);
  await expect(cardWidget.locator('a')).toHaveCount(0);
  await expect(cardWidget.locator('[href]')).toHaveCount(0);

  await assertTrackedPageErrors(page);
});

test('ai-host: citation popover shows the source and onSourceClick resolves payload (host-citation-clk)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-citations');

  const slug = scenarioSlug('Host citation popover + onSourceClick payload (C8.2)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const citations = stage.locator('[data-testid="c82-citations"]');
  await expect(citations).toHaveAttribute('data-slot', 'ai-citations');
  await expect(citations.locator('[data-slot="ai-citation-trigger"]')).toHaveCount(2);

  // Trigger 1 → popover card shows the source title + sanitized url anchor.
  await citations.locator('[data-citation-index="1"]').click();
  const card = page.locator('[data-slot="ai-citation-card"]');
  await expect(card).toContainText('Doc A');
  await expect(card.locator('[data-slot="ai-citation-url"]')).toHaveAttribute('href', 'https://source-a.example');

  // Trigger 2 (no url) → "Open source" button dispatches with the ctx-resolved payload.
  await citations.locator('[data-citation-index="2"]').click();
  await page.locator('[data-slot="ai-citation-open"]').click();
  await expect.poll(async () => readProbe(page, 'Citation'), { timeout: 10_000 }).toBe('2|Doc B');

  await assertTrackedPageErrors(page);
});

test('ai-host: feedback local echo toggles and onAction resolves payload (host-feedback)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-feedback');

  const slug = scenarioSlug('Host feedback echo + onAction payload (C8.2)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const feedback = stage.locator('[data-testid="c82-feedback"]');
  await expect(feedback).toHaveAttribute('data-slot', 'ai-feedback');
  const like = feedback.locator('[data-slot="ai-feedback-like"]');
  const dislike = feedback.locator('[data-slot="ai-feedback-dislike"]');

  // Like: data-active presence flips on.
  await like.click();
  await expect(like).toHaveAttribute('data-active', '');
  await expect(dislike).not.toHaveAttribute('data-active', '');

  // Like again: local echo toggles off.
  await like.click();
  await expect(like).not.toHaveAttribute('data-active', '');

  // Dislike: mutually exclusive echo.
  await dislike.click();
  await expect(dislike).toHaveAttribute('data-active', '');
  await expect(like).not.toHaveAttribute('data-active', '');

  // onAction payload + ctx: `${action}|${message.id}` resolves.
  await expect.poll(async () => readProbe(page, 'Feedback'), { timeout: 10_000 }).toBe('dislike|m_fb');
  await expect.poll(async () => readProbeCount(page, 'Feedback'), { timeout: 10_000 }).toBe(3);

  await assertTrackedPageErrors(page);
});

test('ai-host: token usage renders counts, empty placeholder, onClick payload (host-token-usage)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-token-usage');

  const slug = scenarioSlug('Host token usage render + onClick payload (C8.2)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const token = stage.locator('[data-testid="c82-token"]');
  await expect(token).toHaveAttribute('data-slot', 'ai-token-usage');
  await expect(token.locator('[data-slot="ai-token-usage-total"]')).toHaveText('42');
  await expect(token.locator('[data-slot="ai-token-usage-prompt"]')).toContainText('40');
  await expect(token.locator('[data-slot="ai-token-usage-completion"]')).toContainText('2');
  await expect(token.locator('[data-slot="ai-token-usage-ring"]')).toBeVisible();

  // onClick payload + ctx: `${usage.total_tokens}` resolves.
  await token.click();
  await expect.poll(async () => readProbe(page, 'Token'), { timeout: 10_000 }).toBe('42');

  // Missing usage → data-empty placeholder (locale-neutral presence check;
  // the copy is locale-dependent — zh-CN renders 用量未上报).
  const empty = stage.locator('[data-testid="c82-token-empty"]');
  await expect(empty).toHaveAttribute('data-empty', '');

  await assertTrackedPageErrors(page);
});
