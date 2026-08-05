import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C8.3 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-prompts-dlg (bug 73 pattern): ai-prompts inside an openDialog
 *    surface — clicking a prompt item dispatches onSelect and the action args
 *    `${item.label}|${index}` resolve through the dispatch ctx.
 * 2. host-suggest-pop: ai-suggestions popover overflow collapse — the +N
 *    trigger expands, clicking an overflow item dispatches onSelect with the
 *    global index and `${item.text}|${index}` resolves via ctx (focus stays in
 *    the lab surface).
 * 3. host-voice-degrd: without SpeechRecognition the button degrades to a
 *    disabled marker button (data-unsupported) and onError dispatches
 *    `${reason}` = unsupported via ctx.
 * 4. host-welcome-reg: the ai-welcome footer region renders nested schema
 *    components and the embedded button dispatches its action (region
 *    evaluation + events).
 */

async function readProbe(page: import('@playwright/test').Page, key: string): Promise<string | undefined> {
  return page.evaluate((k) => (window as unknown as Record<string, string | undefined>)[k], `__c83${key}`);
}

async function readProbeCount(page: import('@playwright/test').Page, key: string): Promise<number> {
  return page.evaluate(
    (k) => ((window as unknown as Record<string, number | undefined>)[k] ?? 0) as number,
    `__c83${key}Count`,
  );
}

test('ai-host: prompts in a dialog dispatch onSelect with ctx-resolved args (host-prompts-dlg, bug 73 pattern)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-prompts');

  const slug = scenarioSlug('Host prompts in dialog + onSelect payload (C8.3 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c83-prompts-open"]').click();
  const prompts = page.locator('[data-testid="c83-prompts-in-dialog"]');
  await expect(prompts).toBeVisible({ timeout: 10_000 });
  await expect(prompts).toHaveAttribute('data-slot', 'ai-prompts');

  const items = prompts.locator('[data-slot="ai-prompts-item"]');
  await expect(items).toHaveCount(3);

  // Click the second prompt inside the dialog: `${item.label}|${index}`
  // resolves through the dispatch ctx (the payload keys are evaluationBindings).
  await items.nth(1).click();
  await expect.poll(async () => readProbe(page, 'Prompt'), { timeout: 10_000 }).toBe('Translate|1');
  await expect.poll(async () => readProbeCount(page, 'Prompt'), { timeout: 10_000 }).toBe(1);

  await assertTrackedPageErrors(page);
});

test('ai-host: suggestions popover overflow collapses and onSelect resolves payload (host-suggest-pop)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-suggestions');

  const slug = scenarioSlug('Host suggestions popover overflow + onSelect payload (C8.3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const suggestions = stage.locator('[data-testid="c83-suggestions"]');
  await expect(suggestions).toHaveAttribute('data-slot', 'ai-suggestions');
  await expect(suggestions).toHaveAttribute('data-overflow', 'popover');

  // maxVisible=3 → 3 inline pills + a +2 overflow trigger.
  await expect(suggestions.locator('[data-slot="ai-suggestions-item"]')).toHaveCount(3);
  const overflow = suggestions.locator('[data-slot="ai-suggestions-overflow"]');
  await expect(overflow).toContainText('+2');

  // Expand the overflow and click the first overflow item (global index 3).
  await overflow.click();
  const overflowList = page.locator('[data-slot="ai-suggestions-overflow-list"]');
  await expect(overflowList).toBeVisible({ timeout: 10_000 });
  const overflowItems = overflowList.locator('[data-slot="ai-suggestions-item"]');
  await expect(overflowItems).toHaveCount(2);
  await overflowItems.first().click();
  await expect.poll(async () => readProbe(page, 'Suggest'), { timeout: 10_000 }).toBe('Refine|3');
  await expect.poll(async () => readProbeCount(page, 'Suggest'), { timeout: 10_000 }).toBe(1);

  await assertTrackedPageErrors(page);
});

test('ai-host: voice input degrades without SpeechRecognition and onError resolves payload (host-voice-degrd)', async ({ page }) => {
  // Deterministic degradation: force the API away even if the browser exposes it.
  await page.addInitScript(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
  });

  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-voice-input');

  const slug = scenarioSlug('Host voice input degradation path (C8.3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const voice = stage.locator('[data-testid="c83-voice"]');
  await expect(voice).toBeVisible({ timeout: 10_000 });
  await expect(voice).toHaveAttribute('data-slot', 'ai-voice-input');
  await expect(voice).toHaveAttribute('data-unsupported', '');
  await expect(voice).toBeDisabled();

  // Clicking the disabled button must not crash; the mount effect already
  // dispatched onError('unsupported') with `${reason}` resolving via ctx.
  await voice.click({ force: true });
  await expect.poll(async () => readProbe(page, 'VoiceError'), { timeout: 10_000 }).toBe('unsupported');
  await expect.poll(async () => readProbeCount(page, 'VoiceError'), { timeout: 10_000 }).toBe(1);

  await assertTrackedPageErrors(page);
});

test('ai-host: welcome footer region renders nested components and dispatches actions (host-welcome-reg)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('ai-welcome');

  const slug = scenarioSlug('Host welcome footer region + nested component (C8.3)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const welcome = stage.locator('[data-testid="c83-welcome"]');
  await expect(welcome).toBeVisible({ timeout: 10_000 });
  await expect(welcome).toHaveAttribute('data-slot', 'ai-welcome');
  await expect(welcome).toHaveAttribute('data-align', 'center');
  await expect(welcome.locator('[data-slot="ai-welcome-title"]')).toHaveText('Welcome');
  await expect(welcome.locator('[data-slot="ai-welcome-description"]')).toContainText('Ask me anything.');

  // Footer region: nested schema components render and the embedded button
  // dispatches its action (region evaluation + events in a real browser).
  const footer = welcome.locator('[data-slot="ai-welcome-footer"]');
  await expect(footer).toBeVisible();
  await expect(footer.locator('[data-testid="c83-welcome-cta"]')).toBeVisible();
  await expect(footer).toContainText('nested footer text');

  // First click: `${ctaCount}` evaluates to 0, then the host flips ctaCount to 1.
  await footer.locator('[data-testid="c83-welcome-cta"]').click();
  await expect.poll(async () => readProbe(page, 'Welcome'), { timeout: 10_000 }).toBe('0');
  // Second click reads the incremented value → proves the region shares the
  // host scope and the action chain works inside the footer.
  await footer.locator('[data-testid="c83-welcome-cta"]').click();
  await expect.poll(async () => readProbe(page, 'Welcome'), { timeout: 10_000 }).toBe('1');
  await expect.poll(async () => readProbeCount(page, 'Welcome'), { timeout: 10_000 }).toBe(2);

  await assertTrackedPageErrors(page);
});
