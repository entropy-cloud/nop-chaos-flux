import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * W1b content & feedback family — flux-renderers-content.
 * separator / spinner / progress / empty / card demos.
 *
 * Migrated from tests/e2e/w1b-feedback-family.spec.ts (E3 batch 1, engine swap +
 * Playwright auto-retry expect() mapped onto ft.expectWeb retry-polling with the
 * same timeouts; raw getAttribute equality assertions kept as explicit checks —
 * same strength, no downgrade). Cases run on one page load because the demos
 * are static/orthogonal (spinner toggle and card click don't affect the others).
 */

export default async function w1bFeedbackFamily(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.goto('/#/w1b-content');
  await ft.expectWeb(
    ft.getByRole('heading', { name: '容器与反馈组 — separator / spinner / progress / empty / card', level: 1 }),
  ).toBeVisible({ timeoutMs: 15_000 });

  // Case 1: separator renders horizontal labelled divider and a vertical divider
  const horizontal = ft.locator('[data-testid="demo-separator"]');
  await ft.expectWeb(horizontal).toBeVisible();
  await ft.expectWeb(horizontal.locator('[data-slot="separator-label"]')).toHaveText('Horizontal divider');

  const vertical = ft.locator('[data-testid="demo-separator-vertical"]');
  await ft.expectWeb(vertical).toBeVisible();
  const orientation = await vertical.attr('aria-orientation');
  if (orientation !== 'vertical') {
    throw new Error(`separator vertical: expected aria-orientation="vertical", got "${orientation}"`);
  }

  // Case 2: spinner hides when its meta.visible expression flips to false
  const spinner = ft.locator('[data-testid="demo-spinner"]');
  await ft.expectWeb(spinner).toBeVisible();
  await ft.locator('[data-testid="toggle-spinner"]').click();
  await ft.expectWeb(spinner).toHaveCount(0);

  // Case 3: progress normalizes a value that exceeds max so it does not overflow
  const progress = ft.locator('[data-testid="demo-progress"]');
  await ft.expectWeb(progress).toBeVisible();
  // schema value=120, max=100 → clamped to 100 (no overflow)
  const valueNow = await progress.attr('aria-valuenow');
  if (valueNow !== '100') throw new Error(`progress: expected aria-valuenow="100", got "${valueNow}"`);
  const valueMax = await progress.attr('aria-valuemax');
  if (valueMax !== '100') throw new Error(`progress: expected aria-valuemax="100", got "${valueMax}"`);
  await ft.expectWeb(progress.locator('[data-slot="progress-value"]')).toHaveText('100');
  await ft.expectWeb(progress.locator('[data-slot="progress-label"]')).toContainText('Uploading');

  // Case 4: empty renders title/description and an actions CTA
  const empty = ft.locator('[data-testid="demo-empty"]');
  await ft.expectWeb(empty).toBeVisible();
  await ft.expectWeb(empty.locator('[data-slot="empty-title"]')).toHaveText('No results');
  await ft.expectWeb(empty.locator('[data-slot="empty-description"]')).toHaveText('Try a different query.');
  await ft.expectWeb(empty.locator('[data-testid="empty-cta"]')).toBeVisible();

  // Case 5: card renders all four regions and fires onClick on card click
  const card = ft.locator('[data-testid="demo-card"]');
  await ft.expectWeb(card).toBeVisible();
  await ft.expectWeb(card.locator('[data-testid="card-header-text"]')).toBeVisible();
  await ft.expectWeb(card.locator('[data-testid="card-body-text"]')).toBeVisible();
  await ft.expectWeb(card.locator('[data-testid="card-footer-text"]')).toBeVisible();
  await ft.expectWeb(card.locator('[data-testid="card-action"]')).toBeVisible();

  // onClick flag starts pending
  await ft.expectWeb(ft.locator('[data-testid="card-click-flag"]')).toHaveText('pending');
  await card.click();
  await ft.expectWeb(ft.locator('[data-testid="card-click-flag"]')).toHaveText('clicked');

  await expectNoPageErrors(ft, 'w1b-feedback-family');

  return { cases: 5 };
}
