import { expect, test } from '@playwright/test';

async function openFlowDesigner(page: import('@playwright/test').Page) {
  await page.goto('/');

  const signInButton = page.getByRole('button', { name: 'Sign in' });
  if (await signInButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInButton.click();
    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('admin');
      await page.getByRole('textbox', { name: 'Password' }).fill('123456');
      await signInButton.click();
    }
    if (await signInButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByRole('textbox', { name: 'Username' }).fill('nop');
      await page.getByRole('textbox', { name: 'Password' }).fill('123');
      await signInButton.click();
    }
  }

  await expect(signInButton).toHaveCount(0, { timeout: 10000 });
  await page.getByRole('button', { name: 'Flow Designer' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 15000 });
}

test('diagnoses title-subtitle gap by inspecting actual DOM and computed styles', async ({ page }) => {
  await openFlowDesigner(page);

  const diag = await page.evaluate(() => {
    const taskNode = document.querySelector('[data-testid="rf__node-task-1"]');
    if (!taskNode) return { error: 'task node not found' };

    const allTexts = Array.from(taskNode.querySelectorAll('.nop-text'));
    const titleEl = allTexts.find(t => t.textContent?.trim() === '发送欢迎邮件');
    const subtitleEl = allTexts.find(t => t.textContent?.trim() === '邮件通知');

    if (!titleEl || !subtitleEl) {
      return {
        error: 'title or subtitle element not found',
        allTexts: allTexts.map(t => ({ text: t.textContent?.trim(), tag: t.tagName, className: t.className })),
      };
    }

    const titleCs = window.getComputedStyle(titleEl);
    const subtitleCs = window.getComputedStyle(subtitleEl);

    const titleRect = titleEl.getBoundingClientRect();
    const subtitleRect = subtitleEl.getBoundingClientRect();

    const infoContainer = titleEl.parentElement;
    const infoCs = infoContainer ? window.getComputedStyle(infoContainer) : null;
    const infoRect = infoContainer?.getBoundingClientRect();

    const gapBetweenTitleBottomAndSubtitleTop = subtitleRect.top - titleRect.bottom;

    const result: Record<string, any> = {
      title: {
        tag: titleEl.tagName.toLowerCase(),
        className: titleEl.className,
        display: titleCs.display,
        fontSize: titleCs.fontSize,
        lineHeight: titleCs.lineHeight,
        marginTop: titleCs.marginTop,
        marginBottom: titleCs.marginBottom,
        paddingTop: titleCs.paddingTop,
        paddingBottom: titleCs.paddingBottom,
        rectTop: titleRect.top,
        rectBottom: titleRect.bottom,
        rectHeight: titleRect.height,
        overflow: titleCs.overflow,
        textOverflow: titleCs.textOverflow,
        whiteSpace: titleCs.whiteSpace,
      },
      subtitle: {
        tag: subtitleEl.tagName.toLowerCase(),
        className: subtitleEl.className,
        display: subtitleCs.display,
        fontSize: subtitleCs.fontSize,
        lineHeight: subtitleCs.lineHeight,
        marginTop: subtitleCs.marginTop,
        marginBottom: subtitleCs.marginBottom,
        paddingTop: subtitleCs.paddingTop,
        paddingBottom: subtitleCs.paddingBottom,
        rectTop: subtitleRect.top,
        rectBottom: subtitleRect.bottom,
        rectHeight: subtitleRect.height,
        overflow: subtitleCs.overflow,
        webkitLineClamp: subtitleCs.webkitLineClamp,
        webkitBoxOrient: subtitleCs.webkitBoxOrient,
      },
      gap: gapBetweenTitleBottomAndSubtitleTop,
      infoContainer: infoCs ? {
        tag: infoContainer!.tagName.toLowerCase(),
        className: infoContainer!.className,
        display: infoCs.display,
        flexDirection: infoCs.flexDirection,
        gap: infoCs.gap,
        marginTop: infoCs.marginTop,
        marginBottom: infoCs.marginBottom,
        paddingTop: infoCs.paddingTop,
        paddingBottom: infoCs.paddingBottom,
        rectTop: infoRect!.top,
        rectBottom: infoRect!.bottom,
        rectHeight: infoRect!.height,
      } : null,
      parentChain: [] as string[],
    };

    let walkUp: HTMLElement | null = titleEl.parentElement;
    while (walkUp && !walkUp.classList.contains('nop-designer-node')) {
      const wcs = window.getComputedStyle(walkUp);
      result.parentChain.push(
        `<${walkUp.tagName.toLowerCase()} class="${walkUp.className.substring(0, 80)}" ` +
        `display="${wcs.display}" flex-dir="${wcs.flexDirection}" gap="${wcs.gap}" ` +
        `padding="${wcs.paddingTop} ${wcs.paddingRight} ${wcs.paddingBottom} ${wcs.paddingLeft}" ` +
        `margin="${wcs.marginTop} ${wcs.marginRight} ${wcs.marginBottom} ${wcs.marginLeft}">`
      );
      walkUp = walkUp.parentElement;
    }

    return result;
  });

  console.log('=== TITLE-SUBTITLE GAP DIAGNOSTICS ===');
  console.log(JSON.stringify(diag, null, 2));

  expect(diag).not.toHaveProperty('error');

  const d = diag as any;

  console.log(`\nTitle tag: ${d.title.tag}, display: ${d.title.display}`);
  console.log(`Subtitle tag: ${d.subtitle.tag}, display: ${d.subtitle.display}`);
  console.log(`Gap (subtitle.rectTop - title.rectBottom): ${d.gap}px`);
  console.log(`Title lineHeight: ${d.title.lineHeight}, height: ${d.title.rectHeight}px`);
  console.log(`Subtitle marginTop: ${d.subtitle.marginTop}`);
  console.log(`Info container display: ${d.infoContainer?.display}, gap: ${d.infoContainer?.gap}`);

  expect(typeof d.gap).toBe('number');
  expect(d.gap).toBeGreaterThanOrEqual(0);

  const REFERENCE_GAP = 4;
  const tolerance = 1;
  const gapOk = d.gap >= REFERENCE_GAP - tolerance && d.gap <= REFERENCE_GAP + tolerance;

  if (!gapOk) {
    console.log(`\n!!! GAP MISMATCH: expected ~${REFERENCE_GAP}px, got ${d.gap}px`);
    console.log(`!!! Title line-height contributes extra space: title.height=${d.title.rectHeight}px`);
    console.log(`!!! Subtitle marginTop computed as: ${d.subtitle.marginTop}`);

    if (d.title.display === 'inline' || d.title.display === 'inline') {
      console.log('!!! Title is inline — overflow-hidden and text-ellipsis will not work');
    }
    if (d.subtitle.display === 'inline') {
      console.log('!!! Subtitle is inline — margin-top has no effect');
    }
  }

  expect(d.gap).toBeCloseTo(REFERENCE_GAP, 0);
});
