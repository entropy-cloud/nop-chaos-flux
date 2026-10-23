import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// IS-8a (plan 552) Phase 2 red→green specs for the renderer-lab interaction
// state batch. Each case reproduces a review-group finding (or its withdrawn
// contract) and pins the fixed behavior with programmatic readings only.

async function gotoPage(page: import('@playwright/test').Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

test.describe('IS-8a renderer-lab interaction state (plan 552)', () => {
  // IS-lab-recurse-001: the review's "maxDepth renders 6 levels" conviction was
  // WITHDRAWN as a probe artifact — the per-stage scope-debug JSON dump contains
  // the deepTree data labels, and the review's regex counted those as rendered
  // levels. Text-node-exact accounting shows maxDepth=2 renders exactly
  // Levels 0-1 (the documented termination-guard contract). This case locks the
  // contract in with artifact-proof accounting.
  test('recurse: maxDepth 2 renders exactly Levels 0-1 (termination guard)', async ({ page }) => {
    await gotoPage(page, '/#/lab/recurse');
    const levels = await page.evaluate(() => {
      function renderedLevels(testid: string): string[] {
        const stage = document.querySelector(`[data-testid="scenario-stage-${testid}"]`);
        if (!stage) return [];
        cloneRemoveDebug(stage);
        const found = new Set<string>();
        const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          const match = /^Level (\d+)$/.exec((node.textContent ?? '').trim());
          if (match) found.add(`Level ${match[1]}`);
          node = walker.nextNode();
        }
        return [...found].sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
      }
      function cloneRemoveDebug(stage: Element) {
        // scope-debug dumps the scope JSON (which embeds the whole deepTree
        // data); its labels must not count as rendered recursion output.
        stage
          .querySelectorAll('[data-testid^="scope-debug-"]')
          .forEach((n) => n.remove());
      }
      return {
        guarded: renderedLevels('maxdepth-2-truncates-recursion-beyond-depth-2'),
        unguarded: renderedLevels('deep-tree-renders-all-6-levels-without-stack-overflow'),
      };
    });
    console.log('RL-SPEC recurse levels:', JSON.stringify(levels));
    expect(levels.guarded, 'maxDepth 2 must render Levels 0-1 only').toEqual(['Level 0', 'Level 1']);
    expect(levels.unguarded, 'the unguarded tree renders all 6 levels').toEqual([
      'Level 0',
      'Level 1',
      'Level 2',
      'Level 3',
      'Level 4',
      'Level 5',
    ]);
    await assertTrackedPageErrors(page);
  });

  // IS-lab-hidden-001: a hidden field's schema `value` must seed the form scope
  // so sibling renderers can read it back. Fixed with eager lastChange tracking
  // in the composite scope store (flux-runtime scope.ts) — the mount-time
  // default-value push previously fired before later siblings subscribed and
  // was never replayed.
  test('hidden: seeded value is readable by sibling renderers', async ({ page }) => {
    await gotoPage(page, '/#/lab/hidden');
    const reading = await page.evaluate(() => {
      const stage = document.querySelector('[data-testid="scenario-stage-hidden-field-seeded-value"]');
      const clone = stage?.cloneNode(true) as Element | undefined;
      clone?.querySelectorAll('[data-testid^="scope-debug-"]').forEach((node) => node.remove());
      return {
        echo: clone?.textContent ?? '',
        hiddenInput: stage?.querySelector<HTMLInputElement>('input[type="hidden"]')?.value,
      };
    });
    console.log('RL-SPEC hidden seed:', JSON.stringify(reading));
    expect(reading.hiddenInput).toBe('seed');
    expect(
      reading.echo,
      'sibling ${tenantId} must resolve the seeded value',
    ).toContain('Hidden field value echoed from scope: seed');
    await assertTrackedPageErrors(page);
  });

  // IS-lab-hidden-002: clearValueWhenHidden must clear the scope value on
  // mount — and the sibling template must re-evaluate to the cleared state.
  test('hidden: clearValueWhenHidden clears the scope value for sibling templates', async ({ page }) => {
    await gotoPage(page, '/#/lab/hidden');
    const reading = await page.evaluate(() => {
      const stage = document.querySelector(
        '[data-testid="scenario-stage-hiddenfieldpolicy-clearvaluewhenhidden"]',
      );
      const clone = stage?.cloneNode(true) as Element | undefined;
      clone?.querySelectorAll('[data-testid^="scope-debug-"]').forEach((node) => node.remove());
      return {
        echo: clone?.textContent ?? '',
        hiddenInput: stage?.querySelector<HTMLInputElement>('input[type="hidden"]')?.value,
      };
    });
    console.log('RL-SPEC hidden policy:', JSON.stringify(reading));
    expect(reading.hiddenInput, 'DOM input must be cleared').toBe('');
    expect(
      reading.echo,
      'sibling ${tenantId} must resolve as cleared, not the stale pre-clear value',
    ).toContain('tenantId resolves as "undefined"');
    await assertTrackedPageErrors(page);
  });

  // IS-lab-input-password-001: the confirm-password rule was a dead
  // declaration (field-level `validations` is not a supported contract). The
  // schema now uses the supported form-level `rules` equalsField, so a
  // mismatched submit surfaces the inline message and reports invalid.
  test('input-password: mismatched submit surfaces the confirm rule and reports invalid', async ({ page }) => {
    await gotoPage(page, '/#/lab/input-password');
    const stage = page.locator('[data-testid="scenario-stage-new-password-with-confirm-password-validator"]');
    await expect(stage).toBeVisible({ timeout: 15_000 });
    const inputs = stage.locator('input[type="password"]');
    await expect(inputs).toHaveCount(2);
    await inputs.nth(0).fill('abc12345');
    await inputs.nth(1).fill('zzz99999');
    await stage.getByRole('button', { name: 'Set Password' }).click();
    await page.waitForTimeout(800);
    const reading = await page.evaluate(() => {
      const stage = document.querySelector(
        '[data-testid="scenario-stage-new-password-with-confirm-password-validator"]',
      );
      const debug = stage?.querySelector('[data-testid^="scope-debug-"]')?.textContent ?? '';
      return {
        text: stage?.textContent ?? '',
        invalidCount: stage?.querySelectorAll('[aria-invalid="true"]').length ?? 0,
        valid: /"valid":\s*(true|false)/.exec(debug)?.[1],
        errorCount: /"errorCount":\s*(\d+)/.exec(debug)?.[1],
      };
    });
    console.log('RL-SPEC password mismatch:', JSON.stringify(reading));
    expect(reading.invalidCount, 'the mismatch must flag fields invalid').toBeGreaterThan(0);
    expect(reading.text).toContain('Passwords must match');
    expect(reading.valid, '$form.valid must flip to false').toBe('false');
    expect(Number(reading.errorCount), 'the rule error must be counted').toBeGreaterThan(0);
    await assertTrackedPageErrors(page);
  });

  // IS-lab-rating-001: ui Rating defaulted `max` to 5, clamping every commit on
  // count>5 groups (stars 6-10 all committed 5). The value ceiling now defaults
  // to the star count.
  test('rating: ten-star group commits the clicked star value beyond 5', async ({ page }) => {
    await gotoPage(page, '/#/lab/rating');
    const stage = page.locator('[data-testid="scenario-stage-half-stars-ten-star-scale-and-read-only"]');
    await expect(stage).toBeVisible({ timeout: 15_000 });
    const tenStarGroup = page.getByRole('radiogroup').filter({ has: page.getByRole('radio') }).filter({
      has: page.getByRole('radio', { name: '8 / 10' }),
    });
    await expect(tenStarGroup).toHaveCount(1);
    await tenStarGroup.getByRole('radio', { name: '8 / 10' }).click();
    await page.waitForTimeout(500);
    const committed = await page.evaluate(() => {
      const debug = document.querySelector(
        '[data-testid="scenario-stage-half-stars-ten-star-scale-and-read-only"] [data-testid^="scope-debug-"]',
      )?.textContent;
      return /"tenScale":\s*(\d+)/.exec(debug ?? '')?.[1] ?? null;
    });
    console.log('RL-SPEC rating tenScale commit:', committed);
    expect(committed, 'clicking star 8 must commit 8').toBe('8');
    await assertTrackedPageErrors(page);
  });

  // IS-lab-date-range-001: with react-day-picker's default resetOnSelect:false,
  // the first click on a displayed range demoted the clicked day to the end
  // (2024-06-03 click committed 2024-06-01,2024-06-03). The renderer now
  // anchors a new start at the clicked day and commits the completed pair.
  test('date-range: start click anchors the new range and the pair commits', async ({ page }) => {
    await gotoPage(page, '/#/lab/date-range');
    const stage = page.locator('[data-testid="scenario-stage-rangekind-date-shortcuts"]');
    await expect(stage).toBeVisible({ timeout: 15_000 });
    const readRange = () =>
      page.evaluate(() => {
        const debug = document.querySelector(
          '[data-testid="scenario-stage-rangekind-date-shortcuts"] [data-testid^="scope-debug-"]',
        )?.textContent;
        return /"range":\s*"([^"]*)"/.exec(debug ?? '')?.[1] ?? null;
      });
    await stage.locator('[data-testid="range-trigger"]').click();
    const popover = page.locator('[data-testid="range-popover"]');
    await expect(popover).toBeVisible({ timeout: 10_000 });

    const startCell = page.locator('[data-day]').filter({ hasText: /^3$/ }).first();
    await expect(startCell).toBeVisible({ timeout: 10_000 });
    const startBox = await startCell.boundingBox();
    if (!startBox) throw new Error('start cell not visible');
    await page.mouse.click(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
    await page.waitForTimeout(400);
    const anchorState = await page.evaluate(() => {
      const cell = document.querySelector('[data-day="2024/6/3"]');
      return {
        rangeStart: cell?.getAttribute('data-range-start'),
        selectedSingle: cell?.getAttribute('data-selected-single'),
      };
    });
    console.log('RL-SPEC date-range anchor:', JSON.stringify(anchorState));
    expect(
      anchorState.rangeStart === 'true' || anchorState.selectedSingle === 'true',
      'the clicked start must render as the selection anchor',
    ).toBe(true);

    const endCell = page.locator('[data-day]').filter({ hasText: /^12$/ }).first();
    await expect(endCell).toBeVisible({ timeout: 10_000 });
    const endBox = await endCell.boundingBox();
    if (!endBox) throw new Error('end cell not visible');
    await page.mouse.click(endBox.x + endBox.width / 2, endBox.y + endBox.height / 2);
    await page.waitForTimeout(600);
    const committed = await readRange();
    console.log('RL-SPEC date-range committed:', committed);
    expect(committed, 'clicked start must win over the stored 06-01 anchor').toBe(
      '2024-06-03,2024-06-12',
    );
    await assertTrackedPageErrors(page);
  });

  // IS-lab-input-city-001: a name click on a non-leaf level used to commit the
  // raw id and close the panel, making deeper cascade levels unreachable. The
  // click now also drills into the next column and keeps the panel open.
  test('input-city: province click keeps the panel open and expands cities', async ({ page }) => {
    await gotoPage(page, '/#/lab/input-city');
    const stage = page.locator('[data-testid="scenario-stage-lazy-cascade-three-levels"]');
    await expect(stage).toBeVisible({ timeout: 15_000 });
    await stage.locator('[data-slot="region-trigger"]').click();
    const panel = stage.locator('[data-slot="region-panel"]');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const provinceNode = panel.locator('[data-slot="region-node"][data-node-id="gd"]');
    await expect(provinceNode).toBeVisible({ timeout: 10_000 });
    await provinceNode.locator('[data-slot="region-node-name"]').click();
    await page.waitForTimeout(600);
    const reading = await page.evaluate(() => {
      const stage = document.querySelector('[data-testid="scenario-stage-lazy-cascade-three-levels"]');
      const panel = stage?.querySelector('[data-slot="region-panel"]');
      const columns = panel?.querySelectorAll('[data-slot="region-column"]').length ?? 0;
      const cityNodes = [...(panel?.querySelectorAll('[data-slot="region-node"]') ?? [])]
        .map((el) => el.getAttribute('data-node-id'))
        .filter((id) => id && id.startsWith('gd-'));
      return { panelOpen: Boolean(panel), columns, cityNodes };
    });
    console.log('RL-SPEC input-city after province click:', JSON.stringify(reading));
    expect(reading.panelOpen, 'panel must stay open after a province click').toBe(true);
    expect(reading.columns, 'the city column must expand').toBeGreaterThanOrEqual(2);
    expect(reading.cityNodes.length, 'city nodes must be reachable').toBeGreaterThan(0);

    // completing the cascade at a leaf still commits and closes
    const cityNode = panel.locator('[data-slot="region-node"][data-node-id="gd-gz"]');
    await cityNode.locator('[data-slot="region-node-expand"]').click();
    await page.waitForTimeout(400);
    const district = panel.locator('[data-slot="region-node"][data-node-id="gd-gz-tianhe"]');
    await expect(district).toBeVisible({ timeout: 10_000 });
    await district.locator('[data-slot="region-node-name"]').click();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const stage = document.querySelector('[data-testid="scenario-stage-lazy-cascade-three-levels"]');
      const debug = stage?.querySelector('[data-testid^="scope-debug-"]')?.textContent ?? '';
      return {
        region: /"region":\s*"([^"]*)"/.exec(debug)?.[1] ?? null,
        triggerText: stage?.querySelector('[data-slot="region-value"]')?.textContent ?? '',
      };
    });
    console.log('RL-SPEC input-city after leaf commit:', JSON.stringify(after));
    expect(after.region, 'leaf click commits the district id').toBe('gd-gz-tianhe');
    expect(
      after.triggerText,
      'the trigger renders the committed path chain (echo path table)',
    ).toBe('Guangdong / Guangzhou / Tianhe');
    await assertTrackedPageErrors(page);
  });

  // IS-crud-002: a dialog-mode quick-edit with a custom body wrote through its
  // own controller while the save button read dirtiness from the row draft —
  // real typing left 保存 permanently disabled. Dialog mode now resolves the
  // dirty/saving/save path from the dialog's own controller.
  test('crud: dialog quick-edit typing enables save and the save commits', async ({ page }) => {
    await gotoPage(page, '/#/lab/crud');
    const stage = page.locator('[data-testid="scenario-stage-crud-quick-edit-baseline"]');
    await expect(stage).toBeVisible({ timeout: 15_000 });
    await stage.getByRole('button', { name: 'Dialog Status' }).first().click();
    const dialog = page.locator('[data-slot="table-quick-edit-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const save = dialog.getByRole('button', { name: '保存' });
    await expect(save).toBeDisabled();
    const input = dialog.locator('input').first();
    await input.click();
    await input.pressSequentially('X-EDITED');
    await page.waitForTimeout(400);
    expect(await input.inputValue()).toBe('activeX-EDITED');
    await expect(save, 'real typing must enable the dialog save button').toBeEnabled();
    await save.click();
    await page.waitForTimeout(1000);
    const after = await page.evaluate(() => ({
      dialogCount: document.querySelectorAll('[data-slot="table-quick-edit-dialog"]').length,
      toasts: [...document.querySelectorAll('[data-sonner-toast]')].map((el) => el.textContent ?? ''),
    }));
    console.log('RL-SPEC crud dialog after save:', JSON.stringify(after));
    expect(after.dialogCount, 'a successful save closes the dialog').toBe(0);
    expect(after.toasts.join(''), 'the quick-save toast surfaces via the lab shell notify').toContain(
      'Saved item',
    );
    await assertTrackedPageErrors(page);
  });

  // IS-labenv-001 / IS-lab-command-palette-001: the lab shell wired its env
  // notify to the App's persistent <Toaster/> (notifyWithToast) — showToast
  // feedback is no longer swallowed on lab pages.
  test('labenv: showToast surfaces a real toast (palette command + crud quick-save)', async ({ page }) => {
    await gotoPage(page, '/#/lab/command-palette');
    // Sibling defaultOpen palettes hold the shared modal layer (registered
    // finding IS-lab-command-palette-002, demo wiring — out of scope here).
    for (let i = 0; i < 3; i += 1) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
    }
    const stage = page.locator('[data-testid="scenario-stage-controlled-open-with-write-back"]');
    await expect(stage).toBeVisible({ timeout: 15_000 });
    const openButton = stage.getByRole('button', { name: 'Open palette' });
    await expect(openButton).toBeVisible({ timeout: 10_000 });
    await openButton.click();
    const item = page.getByRole('option', { name: /Show toast/ }).first();
    await expect(item).toBeVisible({ timeout: 10_000 });
    await item.click();
    await page.waitForTimeout(800);
    const toasts = await page.evaluate(() =>
      [...document.querySelectorAll('[data-sonner-toast]')].map((el) => el.textContent ?? ''),
    );
    console.log('RL-SPEC palette toasts:', JSON.stringify(toasts));
    expect(toasts.join('')).toContain('Executed from palette');

    await gotoPage(page, '/#/lab/crud');
    const crudStage = page.locator('[data-testid="scenario-stage-crud-quick-edit-baseline"]');
    await expect(crudStage).toBeVisible({ timeout: 15_000 });
    const inlineInput = crudStage.locator('input').first();
    await inlineInput.fill('Commit-Check');
    await page.waitForTimeout(300);
    const rowSave = crudStage.getByRole('button', { name: '保存' }).first();
    await expect(rowSave).toBeVisible({ timeout: 10_000 });
    await rowSave.click();
    await page.waitForTimeout(1000);
    const crudToasts = await page.evaluate(() =>
      [...document.querySelectorAll('[data-sonner-toast]')].map((el) => el.textContent ?? ''),
    );
    console.log('RL-SPEC crud quick-save toasts:', JSON.stringify(crudToasts));
    expect(crudToasts.join('')).toContain('Saved item');
    await assertTrackedPageErrors(page);
  });

  // IS-lab-dialog-001 (P2): size 'full' was clamped to 100%-2rem by the
  // primitive's shared max-w; the primitive now drops the clamp for full.
  test('dialog: size full spans the full viewport width', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoPage(page, '/#/lab/dialog');
    const stage = page.locator('[data-testid="scenario-stage-c1a-dialog-size-matrix"]');
    await expect(stage).toBeVisible({ timeout: 15_000 });
    await stage.getByRole('button', { name: 'Open full' }).click();
    const surface = page.locator('[data-slot="dialog-surface"][data-size="full"]').first();
    await expect(surface).toBeVisible({ timeout: 10_000 });
    const reading = await page.evaluate(() => {
      const surface = document.querySelector('[data-slot="dialog-surface"][data-size="full"]');
      const rect = (surface as HTMLElement | null)?.getBoundingClientRect();
      return { width: rect?.width ?? 0, innerWidth: window.innerWidth };
    });
    console.log('RL-SPEC dialog full:', JSON.stringify(reading));
    expect(reading.width, 'full dialog must span the viewport width').toBe(reading.innerWidth);
    await assertTrackedPageErrors(page);
  });

  // arc-component-gap G1I (plan 712): showStrength renders a four-segment
  // meter below the input; display-only (no validation participation).
  test('input-password: strength meter tracks weak→strong programmatically', async ({ page }) => {
    await gotoPage(page, '/#/lab/input-password');
    const stage = page.locator('[data-testid="scenario-stage-strength-meter"]');
    await expect(stage).toBeVisible({ timeout: 15_000 });
    // Empty value: no strength row.
    expect(await stage.locator('[data-slot="input-password-strength"]').count()).toBe(0);
    const input = stage.locator('input[type="password"]');
    await input.fill('abc');
    const weak = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="scenario-stage-strength-meter"] [data-slot="input-password-strength"]',
      );
      return el?.getAttribute('aria-valuenow');
    });
    expect(weak).toBe('1');
    await input.fill('Abcd1234!@#$');
    const strong = await page.evaluate(() => {
      const stage = document.querySelector('[data-testid="scenario-stage-strength-meter"]');
      const meter = stage?.querySelector('[data-slot="input-password-strength"]');
      const active = stage
        ? [...stage.querySelectorAll('[data-slot="input-password-strength-segment"]')].filter(
            (s) => s.getAttribute('data-active') === 'true',
          )
        : [];
      return { now: meter?.getAttribute('aria-valuenow'), active: active.length };
    });
    expect(strong.now).toBe('4');
    expect(strong.active).toBe(4);
    await assertTrackedPageErrors(page);
  });
});
