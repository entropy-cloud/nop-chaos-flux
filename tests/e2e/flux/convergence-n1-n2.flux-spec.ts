import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * ux-r11 收敛复审计 P1 修复程序化断言。
 *
 * n1-word-inview：WorkbenchShell 隐式栅格轨道被 word-editor ribbon 工具条
 * max-content 撑爆（探针实测 computed grid-template-columns 2964.5px），
 * 大纲面板被推出 1440 视口（条目 x=2652）成死灰区——修复为根容器 grid-cols-1
 * 单列钳制后，大纲回到视口内、ribbon 的 overflow-x-auto 真正生效。
 *
 * n2-linear-stable：linear-issues 首屏偶发空面板（复审计两次探针见空态，
 * review 对 HEAD 3 次 fresh load 全绿）——born-green 稳定性回归钉。
 * 注意：本钉兼作负载下的竞态探测器——若在 CI 高负载时间歇性变红，
 * 那是竞态信号（应归 follow-up 调查取证），不要当 flake 重试吞掉。
 *
 * Migrated from tests/e2e/convergence-n1-n2.spec.ts (E3 batch 4, engine swap +
 * page.waitForTimeout(2500) upgraded to a stability gate, and the 3 fresh
 * loads rebuilt as hash-route bounces through '/#/' with stability gates —
 * the old about:blank goto would destroy the runner's CDP context).
 * TODO(migrate-debt): evaluate fallback (getByText-exact outline entry +
 * ribbon clientWidth/scrollWidth reads replaced by ft.evaluate
 * querySelector/text-walk + getBoundingClientRect — the driver has no text
 * locator and no element-level evaluate).
 */

const VIEWPORT_W = 1440;

export default async function convergenceN1N2(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1 (n1-word-inview): outline inside the 1440 viewport, ribbon
  // clamped AND horizontally scrollable
  await ft.setViewportSize(VIEWPORT_W, 900);
  await ft.goto('/#/word-editor');
  await ft.expectWeb(ft.locator('.nop-word-editor-page')).toBeVisible({ timeoutMs: 30_000 });
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });

  // 大纲条目横向进入视口（修复前 x=2652，修复后应 ≤ 1440）
  await ft.expectWeb(ft.locator('.nop-word-editor-page')).toContainText('一、发布范围', { timeoutMs: 15_000 });
  const outline = await ft.evaluate(
    `(() => { const root = document.querySelector('.nop-word-editor-page'); if (!root) return null; const walk = (el) => { for (const child of el.children) { if (child.childElementCount === 0 && child.textContent === '一、发布范围') return child; const found = walk(child); if (found) return found; } return null; }; const el = walk(root); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, right: r.x + r.width }; })()`,
  );
  if (!outline) throw new Error('outline entry "一、发布范围" not found in .nop-word-editor-page');
  if (outline.right > VIEWPORT_W) {
    throw new Error(`outline right edge ${outline.right}px exceeds the ${VIEWPORT_W}px viewport (pre-fix was 2652)`);
  }

  // ribbon 工具条被钳制在视口内且横向滚动生效（clientWidth ≤ 1440 ≤ scrollWidth）
  const ribbon = ft.locator('.nop-word-editor-page [class*="overflow-x-auto"]').first();
  await ft.expectWeb(ribbon).toBeVisible();
  const ribbonBox = await ribbon.boundingBox();
  if (!ribbonBox) throw new Error('ribbon bounding box missing');
  if (ribbonBox.width > VIEWPORT_W + 1) {
    throw new Error(`ribbon client width ${ribbonBox.width}px not clamped to ${VIEWPORT_W + 1}px`);
  }
  // 滚动真实生效：内容仍可横向滚出（钳制后 clientWidth < scrollWidth；
  // closure audit 顾问——只断言钳制不断言可滚会漏掉"钳了但不可滚"的回退）
  const ribbonScroll = await ft.evaluate(
    `(() => { const el = document.querySelector('.nop-word-editor-page [class*="overflow-x-auto"]'); return el ? { clientWidth: el.clientWidth, scrollWidth: el.scrollWidth } : null; })()`,
  );
  if (!ribbonScroll || ribbonScroll.scrollWidth < ribbonScroll.clientWidth) {
    throw new Error(`ribbon content should overflow horizontally (scrollable): ${JSON.stringify(ribbonScroll)}`);
  }
  await expectNoPageErrors(ft, 'convergence:n1-word-inview');

  // Case 2 (n2-linear-stable): linear-issues renders rows across 3
  // consecutive fresh loads (hash-route bounce = fresh mount per load)
  for (let load = 0; load < 3; load += 1) {
    await ft.setViewportSize(VIEWPORT_W, 900);
    await ft.goto('/#/');
    await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
    await ft.goto('/#/complex-pages/linear-issues');
    const rowKeys = ft.locator('[data-testid="linear-issues-row-key"]');
    await ft.expectWeb(rowKeys.first()).toBeVisible({ timeoutMs: 30_000 });
    const count = await rowKeys.count();
    if (count < 1) {
      throw new Error(`fresh load #${load + 1} rendered ${count} issue rows, expected >= 1`);
    }
  }
  await expectNoPageErrors(ft, 'convergence:n2-linear-stable');

  return { cases: 2 };
}
