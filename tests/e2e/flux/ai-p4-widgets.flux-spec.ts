import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * AI P4 widgets — voice / token / suggestions.
 *
 * Migrated from tests/e2e/ai-p4-widgets.spec.ts (E3 batch 1, engine swap +
 * toHaveCount/containText assertions upgraded to retry-polling expectWeb and
 * kernel white-box error check in place of assertTrackedPageErrors).
 */

async function openP4(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/ai-p4');
  await ft.expectWeb(ft.locator('[data-testid="p4-voice"]')).toBeVisible({ timeoutMs: 15_000 });
}

export default async function aiP4Widgets(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: ai-token-usage renders the token counts from metadata.usage
  await openP4(ft);
  const token = ft.locator('[data-testid="p4-token"]');
  await ft.expectWeb(token).toBeVisible();
  // The mock message carries total_tokens=500.
  await ft.expectWeb(token.locator('[data-slot="ai-token-usage-total"]')).toContainText('500');
  // Driver gap: the ring is an <svg> (not HTMLElement) so expectWeb toBeVisible
  // always reports false — assert attachment instead (SVG has no display:none branch here).
  await token.locator('[data-slot="ai-token-usage-ring"]').waitFor('attached');
  await expectNoPageErrors(ft, 'ai-p4-token');

  // Case 2: ai-suggestions renders items in expand mode and a popover overflow trigger
  await openP4(ft);
  const expand = ft.locator('[data-testid="p4-suggestions"]');
  await ft.expectWeb(expand).toBeVisible();
  await ft.expectWeb(expand.locator('[data-slot="ai-suggestions-item"]')).toHaveCount(5);

  const popover = ft.locator('[data-testid="p4-suggestions-popover"]');
  // maxVisible=2 → 2 inline pills + a +3 overflow trigger.
  await ft.expectWeb(popover.locator('[data-slot="ai-suggestions-item"]')).toHaveCount(2);
  await ft.expectWeb(popover.locator('[data-slot="ai-suggestions-overflow"]')).toContainText('+3');
  await expectNoPageErrors(ft, 'ai-p4-suggestions');

  // Case 3: ai-voice-input renders the marker button (unsupported browsers degrade gracefully)
  await openP4(ft);
  const voice = ft.locator('[data-testid="p4-voice"]');
  await ft.expectWeb(voice).toBeVisible();
  // Headless chromium has no SpeechRecognition → the button degrades to disabled.
  // Assert the marker exists either way (state is browser-dependent).
  await ft.expectWeb(voice).toHaveAttribute('data-slot', 'ai-voice-input');
  await expectNoPageErrors(ft, 'ai-p4-voice');

  return { cases: 3 };
}
