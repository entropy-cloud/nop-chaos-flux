import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { REPLICATION_MOBILE_CONTEXT } from './helpers/replication.js';

// 控件贴合/间距门禁（2026-11-13 专项审计的固化，见
// docs/discussions/2026-11-13-control-adjacency-spacing-audit.md）。截图目测
// 测不出像素级贴合（ai-sender 发送钮零间隔即漏网案例），改用 DOM 几何实测：
//
// - overlap：两可交互元素矩形双向重叠 >6px —— 一律计缺陷（半透明浮层 chrome
//   等有意形态走基线白名单并注明理由）。
// - touch：贴合 <2px，仅在最近公共祖先为 flex/grid 时计缺陷（gap<4px）——
//   直接命中「相邻控件零间隔」类；表格行内按钮的纵向贴合（行密度形态）因
//   公共祖先非 flex/grid 天然排除。
//
// 棘轮语义与 a11y-axe-baseline.spec.ts 一致：per-(route × signature) 计数，
// 新增/超出基线失败；回落打印收紧提示。基线 __fixtures__/adjacency-baseline.json。

const here = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.join(here, '__fixtures__', 'adjacency-baseline.json');

// 路由集合与 a11y-axe-baseline.spec.ts 对齐（branch A 桌面 + branch B 移动画布）。
const ROUTES = [
  'flux-basic',
  'component-handles',
  'ai-widgets',
  'w4a-multimedia',
  'gantt',
  'complex-pages/standard-crud',
  'complex-pages/wms-wave-picking',
  'complex-pages/wms-stock-ledger',
  'complex-pages/crm-opportunity-kanban',
  'complex-pages/crm-customer-360',
  'complex-pages/crm-sales-dashboard',
  'complex-pages/itam-asset-inventory',
  'complex-pages/itam-depreciation-dashboard',
  'complex-pages/ai-knowledge-chat',
  'complex-pages/ai-ticket-console',
  'complex-pages/ai-approval-trail',
  'complex-pages/mes-shopfloor-board',
  'complex-pages/mes-work-reporting',
  'complex-pages/mall-distribution',
  'complex-pages/doc-ocr-workbench',
  'complex-pages/doc-hitl-inbox',
  'complex-pages/iot-telemetry-device',
  'complex-pages/iot-ota-rollout',
  'complex-pages/iot-geofence-videowall',
  'dashboard-demo',
];

const MOBILE_ROUTES = [
  'complex-pages/wms-pda-receiving',
  'complex-pages/mes-andon-material',
  'complex-pages/mall-sku-picker',
];

type Baseline = Record<string, Record<string, number>>;

interface AdjacencyIssue {
  signature: string;
  kind: 'overlap' | 'touch';
  a: string;
  b: string;
}

function loadBaseline(): Baseline {
  return JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline;
}

// 与 measure 脚本保持同一段 evaluate 体（见本文件底部 measure 注释）。
function scanInPage(): AdjacencyIssue[] {
  const GAP_TOLERANCE = 2;
  const OVERLAP_MIN = 6;
  const FLEX_GAP_FLOOR = 4;
  const elementKey = (el: Element): string => {
    const slot = el.getAttribute('data-slot');
    const testid = el.getAttribute('data-testid');
    if (testid) return `testid=${testid}`;
    if (slot) return `slot=${slot}`;
    return el.tagName.toLowerCase();
  };
  const sel =
    'button, a[href], input, textarea, select, [role="button"], [role="switch"], [role="checkbox"], [role="tab"]';
  // playground chrome 不属产品面（调试器 FAB / 主题切换器 / 侧栏导航 / 调试面板），
  // 其与页面内容的几何关系由 shell 自身负责，不进本门禁。
  const chromeSelector = [
    '[data-testid="theme-switcher"]',
    '[data-testid="complex-pages-sidebar"]',
    '.nop-debugger-launcher',
    '.nop-debugger',
  ].join(',');
  const els = [
    ...document.querySelectorAll<HTMLElement>(sel),
  ].filter((e) => {
    if (e.closest(chromeSelector)) return false;
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return (
      r.width > 4 &&
      r.height > 4 &&
      cs.visibility !== 'hidden' &&
      cs.display !== 'none' &&
      r.bottom > 0 &&
      r.top < innerHeight &&
      r.right > 0 &&
      r.left < innerWidth
    );
  });

  const issues: AdjacencyIssue[] = [];
  for (let i = 0; i < els.length; i++) {
    for (let j = i + 1; j < els.length; j++) {
      const a = els[i];
      const b = els[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const xOverlap = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const yOverlap = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      const gapX = Math.max(ra.left, rb.left) - Math.min(ra.right, rb.right);
      const gapY = Math.max(ra.top, rb.top) - Math.min(ra.bottom, rb.bottom);

      if (xOverlap > OVERLAP_MIN && yOverlap > OVERLAP_MIN) {
        issues.push({
          kind: 'overlap',
          signature: `overlap:${elementKey(a)}:${elementKey(b)}`,
          a: elementKey(a),
          b: elementKey(b),
        });
        continue;
      }
      const touchingX = xOverlap > 4 && gapY >= -GAP_TOLERANCE && gapY <= GAP_TOLERANCE;
      const touchingY = yOverlap > 4 && gapX >= -GAP_TOLERANCE && gapX <= GAP_TOLERANCE;
      if (!touchingX && !touchingY) continue;
      // 最近公共祖先为 flex/grid 才检查 gap；行密度（table/list）天然排除。
      let ancestor: HTMLElement | null = a.parentElement;
      let common: HTMLElement | null = null;
      while (ancestor) {
        if (ancestor.contains(b)) {
          common = ancestor;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (!common) continue;
      const cs = getComputedStyle(common);
      const isFlexGrid = cs.display.includes('flex') || cs.display.includes('grid');
      if (!isFlexGrid) continue;
      const gapPx = parseFloat(cs.gap) || 0;
      const rowGapPx = parseFloat(cs.rowGap) || gapPx;
      const relevantGap = touchingX ? rowGapPx : gapPx;
      if (relevantGap < FLEX_GAP_FLOOR) {
        issues.push({
          kind: 'touch',
          signature: `touch:${elementKey(a)}:${elementKey(b)}`,
          a: elementKey(a),
          b: elementKey(b),
        });
      }
    }
  }
  return issues.slice(0, 60);
}

async function scanRoute(page: Page, route: string): Promise<void> {
  await page.goto(`#/${route}`);
  await page
    .locator('[data-slot="page-root"], main, [data-slot="gantt-layout"], [data-testid="complex-page-title"]')
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(800);
  const liveIssues = (await page.evaluate(scanInPage)) as AdjacencyIssue[];

  const live: Record<string, number> = {};
  for (const issue of liveIssues) {
    live[issue.signature] = (live[issue.signature] ?? 0) + 1;
  }

  const baseline = loadBaseline();
  const registered = baseline[route] ?? {};
  expect(
    registered,
    `route ${route} must be registered in adjacency-baseline.json`,
  ).toBeTruthy();

  const newIssues = Object.entries(live)
    .filter(([signature, count]) => count > (registered[signature] ?? 0))
    .map(([signature, count]) => `${signature}: ${count} (baseline ${registered[signature] ?? 0})`);
  expect(
    newIssues,
    `new control-adjacency issues on #/${route}:\n${newIssues.join('\n')}`,
  ).toEqual([]);

  const shrinks = Object.entries(registered)
    .filter(([signature, count]) => (live[signature] ?? 0) < count)
    .map(([signature]) => `${signature} (${registered[signature]} -> ${live[signature] ?? 0})`);
  if (shrinks.length > 0) {
    console.log(`[adjacency-baseline] ${route}: baseline can be tightened — ${shrinks.join(', ')}`);
  }
}

for (const route of ROUTES) {
  test(`adjacency scan (${route}): no new control overlap/zero-gap beyond the baseline`, async ({
    page,
  }) => {
    await scanRoute(page, route);
  });
}

test.describe('adjacency branch B (mobile canvas, 375×667 hasTouch)', () => {
  test.use(REPLICATION_MOBILE_CONTEXT);

  for (const route of MOBILE_ROUTES) {
    test(`adjacency scan mobile (${route}): no new control overlap/zero-gap beyond the baseline`, async ({
      page,
    }) => {
      await scanRoute(page, route);
    });
  }
});

// 基线重建：ADJACENCY_REGENERATE=1 npx playwright test control-adjacency-baseline
// 会以当前实测重写 __fixtures__/adjacency-baseline.json（注册新命中须附理由，
// 见基线文件头部 `_comments`）。日常运行不写文件。
const regenerate = process.env.ADJACENCY_REGENERATE === '1';
if (regenerate) {
  test('regenerate adjacency baseline (ADJACENCY_REGENERATE=1)', async ({ page }) => {
    const collected: Baseline = {};
    for (const route of [...ROUTES, ...MOBILE_ROUTES]) {
      await page.goto(`#/${route}`);
      await page
        .locator('[data-slot="page-root"], main, [data-slot="gantt-layout"], [data-testid="complex-page-title"]')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(800);
      const issues = (await page.evaluate(scanInPage)) as AdjacencyIssue[];
      const counts: Record<string, number> = {};
      for (const issue of issues) {
        counts[issue.signature] = (counts[issue.signature] ?? 0) + 1;
      }
      collected[route] = counts;
    }
    const payload = {
      _comments: [
        'per-(route × signature) ratchet for control-adjacency-baseline.spec.ts.',
        'overlap = interactive elements whose rects overlap both axes >6px;',
        'touch = <2px gap between interactive elements whose nearest common ancestor is flex/grid with gap <4px.',
        '注册新签名须在 _reasons 给出「有意形态」证据（浮层 chrome / 半屏面板 / 内嵌 stepper 等），见 2026-11-13 间距专项报告。',
      ],
      _reasons: {
        'overlap:slot=carousel-indicator:slot=button-group-select-item':
          'mall-sku-picker SKU 半屏面板（nop-floating-panel，不透明白底）按设计浮于轮播区之上',
      } as Record<string, string>,
      ...collected,
    };
    writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`);
    expect(collected).toBeTruthy();
  });
}
