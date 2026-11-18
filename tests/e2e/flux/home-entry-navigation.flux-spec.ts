import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * missing-components L0.3（plan 502 Phase 3）：五个关键缺失入口经首页卡片点击
 * 可导航到目标页。首页卡片集合由 route-entries 注册表派生（home-cards.ts），
 * 本 spec 抽查「注册表条目 → 首页卡片 → 目标页挂载」全链路；目标页断言模式
 * 与 playground-entry-pages.spec.ts 同源。
 *
 * Migrated from tests/e2e/home-entry-navigation.spec.ts (E3 batch 4, engine swap +
 * kernel white-box expectNoPageErrors run per entry (5x) instead of the old single
 * assertTrackedPageErrors, and the hash assertion is now an explicit equality
 * check on the live location). Per-case isolation: each old Playwright test ran
 * on a fresh page; here each entry re-gates the home card as the arrival marker
 * (goto '/#/' is a no-op when already home — the card visibility gate is what
 * proves arrival). ft.reload() is unusable mid-spec (destroys the CDP context).
 */

type Entry = { id: string };

const ENTRIES: Entry[] = [
  { id: 'print-designer' },
  { id: 'scada-editor-demo' },
  { id: 'report-designer-host' },
  { id: 'map-demo' },
  { id: 'pivot-table-demo' },
];

async function pollUntil(
  probe: () => Promise<unknown>,
  predicate: (v: unknown) => boolean,
  timeoutMs: number,
  label: string,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last: unknown;
  while (Date.now() < deadline) {
    last = await probe();
    if (predicate(last)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${label} not met within ${timeoutMs}ms; last actual: ${JSON.stringify(last)}`);
}

async function openHome(ft: FtGlobal, arrivalCardId: string): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator(`[data-home-card="${arrivalCardId}"]`)).toBeVisible({
    timeoutMs: 20_000,
  });
}

async function assertCanvasAttached(ft: FtGlobal, selector: string): Promise<void> {
  await pollUntil(
    () => ft.evaluate(`(() => { const c = document.querySelector('${selector}'); return !!c; })()`),
    (v) => v === true,
    30_000,
    `${selector} canvas attach`,
  );
}

export default async function homeEntryNavigation(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: home renders cards for the five key previously-hidden entries
  await openHome(ft, 'print-designer');
  for (const entry of ENTRIES) {
    await ft.expectWeb(ft.locator(`[data-home-card="${entry.id}"]`)).toBeVisible({
      timeoutMs: 15_000,
    });
  }
  await expectNoPageErrors(ft, 'home-entry:cards');

  for (const entry of ENTRIES) {
    // Case 2..6: clicking the card navigates to the target page
    await openHome(ft, entry.id);
    await ft.locator(`[data-home-card="${entry.id}"]`).click();

    switch (entry.id) {
      case 'print-designer':
        await ft.expectWeb(ft.getByTestId('print-designer-demo')).toBeVisible({ timeoutMs: 30_000 });
        break;
      case 'scada-editor-demo':
        await ft
          .expectWeb(ft.getByRole('heading', { name: 'scada-editor-demo 编辑器演示页', level: 1 }))
          .toBeVisible({ timeoutMs: 30_000 });
        break;
      case 'report-designer-host':
        await ft
          .expectWeb(ft.getByRole('heading', { name: 'Report Designer Host Playground', level: 1 }))
          .toBeVisible({ timeoutMs: 30_000 });
        await ft.expectWeb(ft.locator('[data-slot="report-designer-toolbar"]')).toBeVisible({
          timeoutMs: 15_000,
        });
        break;
      case 'map-demo':
        await ft.expectWeb(ft.locator('[data-slot="map"]').first()).toBeVisible({ timeoutMs: 30_000 });
        await assertCanvasAttached(ft, '[data-slot="map"] canvas');
        break;
      case 'pivot-table-demo':
        await assertCanvasAttached(ft, '[data-slot="pivot-canvas"] canvas');
        break;
    }

    const hash = await ft.evaluate('window.location.hash');
    if (hash !== `#/${entry.id}`) {
      throw new Error(`${entry.id}: expected hash "#/${entry.id}", got "${hash}"`);
    }
    // 五个关键路由均不在 playground-entry-pages 的 KNOWN_ERRORS 白名单内，
    // 与既有冒烟同口径追加页面错误校验。
    await expectNoPageErrors(ft, `home-entry:${entry.id}`);
  }

  return { cases: 6 };
}
