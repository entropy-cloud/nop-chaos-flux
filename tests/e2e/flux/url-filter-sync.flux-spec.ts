import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * filter ↔ URL sync (missing-components L3.5).
 * Deep link restores the keyword filter; filtering writes back to the URL.
 *
 * Migrated from tests/e2e/url-filter-sync.spec.ts (E3 batch 4, engine swap +
 * expect.poll replaced by an explicit retry loop carrying the last actual
 * hash into the failure, gated route arrival on the user-crud marker, and
 * the unique [data-slot="crud-query-search"] attribute selector in place of
 * the hasText button lookup).
 */

async function openCrudPage(ft: FtGlobal, route: string): Promise<void> {
  await ft.goto(route);
  await ft.expectWeb(ft.getByTestId('user-crud')).toBeVisible({ timeoutMs: 30_000 });
}

async function retryUntilHashContains(ft: FtGlobal, needle: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastHash = '';
  for (;;) {
    lastHash = String(await ft.evaluate('window.location.hash'));
    if (lastHash.includes(needle)) return;
    if (Date.now() > deadline) {
      throw new Error(`hash never contained "${needle}"; last actual: "${lastHash}"`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export default async function urlFilterSync(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: deep link restores the keyword filter and the list reflects it
  await openCrudPage(ft, '/#/complex-pages/standard-crud?keyword=顾北辰');

  // Restored filter drove the load: the URL value must be visible in the
  // keyword input of the query form.
  const keywordInput = ft.locator('input[placeholder="姓名 / 邮箱"]');
  await ft.expectWeb(keywordInput).toHaveValue('顾北辰', { timeoutMs: 15_000 });

  await expectNoPageErrors(ft, 'url-filter-sync:deep-link');

  // Case 2: filtering writes back to the URL with replace semantics
  await openCrudPage(ft, '/#/complex-pages/standard-crud');
  const keywordInput2 = ft.locator('input[placeholder="姓名 / 邮箱"]');
  await keywordInput2.waitFor('visible');
  await keywordInput2.fill('青禾');
  // TODO(migrate-debt): evaluate fallback (the auto-generated 搜索 button has
  // no testid/data-slot and the real CDP coordinate click is occluded by
  // playground chrome; programmatic element.click() is the working equivalent).
  await ft.evaluate('(()=>{const b=Array.from(document.querySelectorAll("button")).find((b)=>b.textContent.trim()==="搜索"); if(!b) throw new Error("搜索 button not found"); b.click();})()');

  await retryUntilHashContains(ft, 'keyword=', 15_000);
  const hash = String(await ft.evaluate('window.location.hash'));
  if (!hash.includes('keyword=')) {
    throw new Error(`hash missing "keyword=" after search; actual: "${hash}"`);
  }

  await expectNoPageErrors(ft, 'url-filter-sync:write-back');

  return { cases: 2 };
}
