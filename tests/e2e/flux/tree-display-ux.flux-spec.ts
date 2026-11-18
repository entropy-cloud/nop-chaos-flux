import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * E3 tree display UX enhancements (search/icon/guide-line).
 *
 * Migrated from tests/e2e/tree-display-ux.spec.ts (E3 batch 2, engine swap +
 * per-case isolation via the resetRoute hash bounce — Playwright ran each test
 * on a fresh page and ft.reload() destroys the CDP context mid-spec).
 * locator.getByText(count) has no driver equivalent → tree-level
 * (not-)toContainText probes with the same semantics; the highlight text probe
 * now asserts case-insensitively on the first highlight marker via locator text.
 */

const HEADING_NAME = 'tree 搜索/图标/引导线';

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING_NAME, level: 1 })).not.toBeVisible();
}

async function openTreeDisplayUxPage(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/tree-display-ux');
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING_NAME, level: 1 })).toBeVisible({
    timeoutMs: 15_000,
  });
}

export default async function treeDisplayUx(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: search filters to matching nodes and auto-expands the ancestor chain
  {
    await openTreeDisplayUxPage(ft);

    const tree = ft.getByTestId('tdx-search-tree');
    await ft.expectWeb(tree).toBeVisible({ timeoutMs: 10_000 });

    const searchInput = tree.locator('[data-slot="tree-search-input"]');
    await ft.expectWeb(searchInput).toBeVisible();

    // Initially collapsed: deep node Button.tsx not present in DOM.
    await ft.expectWeb(tree).not.toContainText('Button.tsx');

    await searchInput.fill('Button');

    // Match + ancestor chain (src > components) auto-expanded, deep leaf visible.
    await ft.expectWeb(tree).toContainText('Button.tsx', { timeoutMs: 10_000 });
    await ft.expectWeb(tree).toContainText('components');

    // Non-matching branches hidden by filter.
    await ft.expectWeb(tree).not.toContainText('docs');
    await ft.expectWeb(tree).not.toContainText('package.json');

    const highlight = tree.locator('[data-slot="tree-search-highlight"]').first();
    await ft.expectWeb(highlight).toBeVisible();
    const highlightText = ((await highlight.text()) ?? '').toLowerCase();
    if (!highlightText.includes('button')) {
      throw new Error(`search highlight does not mention "button": "${highlightText}"`);
    }

    await expectNoPageErrors(ft, 'tree-display-ux:search');
  }

  // Case 2: clearing the search restores the pre-search collapsed snapshot
  {
    await openTreeDisplayUxPage(ft);

    const tree = ft.getByTestId('tdx-search-tree');
    const searchInput = tree.locator('[data-slot="tree-search-input"]');

    await searchInput.fill('Button');
    await ft.expectWeb(tree).toContainText('Button.tsx', { timeoutMs: 10_000 });

    // Clear the query → snapshot restored (initiallyExpanded:false → deep leaf hidden again).
    await searchInput.fill('');

    await ft.expectWeb(tree).toContainText('src');
    await ft.expectWeb(tree).not.toContainText('Button.tsx');

    await expectNoPageErrors(ft, 'tree-display-ux:clear');
  }

  // Case 3: search with no match shows the empty hint while keeping the search box
  {
    await openTreeDisplayUxPage(ft);

    const tree = ft.getByTestId('tdx-search-tree');
    const searchInput = tree.locator('[data-slot="tree-search-input"]');

    await searchInput.fill('zzz-no-such-node');

    await ft.expectWeb(tree.locator('[data-slot="tree-empty"]')).toBeVisible({ timeoutMs: 10_000 });
    await ft.expectWeb(tree).not.toContainText('src');

    // Search box remains interactive.
    await ft.expectWeb(searchInput).toBeVisible();

    await expectNoPageErrors(ft, 'tree-display-ux:empty');
  }

  // Case 4: showIcon renders per-node Lucide icons from iconField
  {
    await openTreeDisplayUxPage(ft);

    const tree = ft.getByTestId('tdx-icon-tree');
    await ft.expectWeb(tree).toBeVisible({ timeoutMs: 10_000 });

    const iconCount = await tree.locator('[data-slot="tree-node-icon"]').count();
    if (iconCount < 1) throw new Error(`icon tree rendered ${iconCount} node icons, expected >= 1`);

    await expectNoPageErrors(ft, 'tree-display-ux:icon');
  }

  // Case 5: showGuideLine renders depth-scaled guide-line markers
  {
    await openTreeDisplayUxPage(ft);

    const tree = ft.getByTestId('tdx-guide-tree');
    await ft.expectWeb(tree).toBeVisible({ timeoutMs: 10_000 });

    const guideCount = await tree.locator('[data-slot="tree-guide-line"]').count();
    if (guideCount < 1) throw new Error(`guide tree rendered ${guideCount} guide-lines, expected >= 1`);

    await expectNoPageErrors(ft, 'tree-display-ux:guide');
  }

  // Case 6: combined tree (search + icon + guide-line) renders all three markers together
  {
    await openTreeDisplayUxPage(ft);

    const tree = ft.getByTestId('tdx-combined-tree');
    await ft.expectWeb(tree).toBeVisible({ timeoutMs: 10_000 });

    await ft.expectWeb(tree.locator('[data-slot="tree-search-input"]')).toBeVisible();
    const iconCountBefore = await tree.locator('[data-slot="tree-node-icon"]').count();
    if (iconCountBefore < 1) {
      throw new Error(`combined tree rendered ${iconCountBefore} node icons before search`);
    }

    // Drive expansion via search so depth>0 nodes (and their guide-lines) become visible.
    await tree.locator('[data-slot="tree-search-input"]').fill('Button');
    await ft.expectWeb(tree).toContainText('Button.tsx', { timeoutMs: 10_000 });

    const guideCount = await tree.locator('[data-slot="tree-guide-line"]').count();
    if (guideCount < 1) throw new Error(`combined tree rendered ${guideCount} guide-lines after search`);
    const iconCount = await tree.locator('[data-slot="tree-node-icon"]').count();
    if (iconCount < 1) throw new Error(`combined tree rendered ${iconCount} node icons after search`);

    await expectNoPageErrors(ft, 'tree-display-ux:combined');
  }

  return { cases: 6 };
}
