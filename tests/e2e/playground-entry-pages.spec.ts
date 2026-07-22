import { expect, test, type Page, assertTrackedPageErrors } from './fixtures.js';
import { DOMAIN_RENDERER_ROUTES } from '../../apps/playground/src/route-model';

type RouteAssertion = (page: Page) => Promise<void>;

const ROUTE_ASSERTIONS: Record<string, RouteAssertion> = {
  'flux-basic': async (page) => {
    await expect(page.getByRole('heading', { name: 'Renderer Playground', level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'flow-designer': async (page) => {
    await expect(page.getByRole('tab', { name: '工作流' })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30_000 });
  },
  'taskflow-designer': async (page) => {
    await expect(page.getByRole('tab', { name: 'TaskFlow (Graph)' })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30_000 });
  },
  'dingtalk-flow-demo': async (page) => {
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.react-flow')).toBeVisible();
  },
  'report-designer': async (page) => {
    await expect(
      page.getByRole('heading', { name: 'Report Designer Playground', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.report-designer-demo')).toBeVisible();
  },
  'debugger-lab': async (page) => {
    await expect(page.getByRole('heading', { name: 'Debugger Lab', level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Fire Render' })).toBeVisible();
  },
  'condition-builder': async (page) => {
    await expect(page.getByRole('heading', { name: '条件构建器测试', level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'condition-builder-formula': async (page) => {
    await expect(
      page.getByRole('heading', { name: '条件构建器 Formula 集成', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'code-editor': async (page) => {
    await expect(
      page.getByRole('heading', { name: 'Code Editor Playground', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('.nop-field').filter({ hasText: 'Expression Editor (with completion)' }),
    ).toBeVisible();
  },
  'word-editor': async (page) => {
    await expect(page.getByRole('heading', { name: 'Word Editor' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible();
  },
  'performance-table': async (page) => {
    await expect(
      page.getByRole('heading', { name: 'Table Performance Playground', level: 1 }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Run 20 Host Mutations' })).toBeVisible();
  },
  'component-handles': async (page) => {
    await expect(
      page.getByRole('heading', { name: 'component:* Capability Handles Playground', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Dialog (component:open)' })).toBeVisible();
  },
  'event-prevention': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: 'X2 Schema-Driven preventDefault / stopPropagation',
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.getByTestId('native-submit-button')).toBeVisible();
    await expect(page.getByTestId('native-link')).toBeVisible();
    await expect(page.getByTestId('native-keydown-input')).toBeVisible();
  },
  'boolean-control-value-contract': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: '布尔控件值契约 — trueValue / falseValue',
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.getByTestId('boolean-contract-value-enabled')).toBeVisible();
    await expect(page.getByTestId('boolean-contract-value-notify')).toBeVisible();
  },
  'text-icon-visual-fields': async (page) => {
    await expect(
      page.getByRole('heading', { name: 'text copyable/maxLine + icon size/color', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'layout-family-enhancements': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: 'flex / page / tabs 布局族能力补齐',
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'form-input-enhancements': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: '表单输入控件增强 — 长按步进 + min/max + 重排',
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'input-suggest': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: 'Input Autocomplete — Data-Source Async Suggestions',
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'tree-display-ux': async (page) => {
    await expect(
      page.getByRole('heading', { name: 'tree 搜索/图标/引导线', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'table-popover': async (page) => {
    await expect(
      page.getByRole('heading', { name: 'table popOver 单元格（详情弹层）', level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-slot="table-cell-popover-trigger"]').first()).toBeVisible({
      timeout: 15_000,
    });
  },
  'mobile-infrastructure': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: '移动端基础设施 — safe-area / hairline / haptics / z-index',
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-testid="safe-area-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="hairline-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="haptic-preview"]')).toBeVisible();
  },
  'mobile-components': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: '移动端原生组件 — pull-refresh / infinite-scroll / swipe-cell / countdown / notice-bar',
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-testid="mobile-renderer-host"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-pull-refresh"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-infinite-scroll"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-swipe-cell"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-countdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-notice-bar"]')).toBeVisible();
  },
  'm1-responsive': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /M1 高频交互控件响应式/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'm2-touch': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /M2 表单控件触摸适配/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'm3-layout': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /M3a 移动端页面骨架模式/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'm4-data': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /M4 数据展示响应式/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-testid="m4-crud-root"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-testid="m4-chart-root"]')).toBeVisible({ timeout: 15_000 });
  },
  'w1b-content': async (page) => {
    await expect(
      page.getByRole('heading', { name: /容器与反馈组/, level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-testid="w1b-renderer-host"]')).toBeVisible();
  },
  'w1a-content': async (page) => {
    await expect(
      page.getByRole('heading', { name: /内容展示组/, level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-testid="w1a-renderer-host"]')).toBeVisible();
  },
  'w2a-data-composition': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /数据组合组/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'w2b-date-family': async (page) => {
    await expect(
      page.getByRole('heading', { name: /日期族/, level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-testid="w2b-renderer-host"]')).toBeVisible();
  },
  'w3a-w3b-layout-action-family': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /布局与动作分组族/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-testid="demo-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-collapse"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-button-group"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-dropdown-button"]')).toBeVisible();
  },
  'w3c-value-mapping': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /值映射组/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-testid="mapping-hit"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-success"]')).toBeVisible();
  },
  'w3d-advanced-input-family': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /高级输入族/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-testid="w3d-renderer-host"]')).toBeVisible();
  },
  'w4a-multimedia': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /多媒体组/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-testid="demo-audio"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-video"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-carousel"]')).toBeVisible();
    await expect(page.locator('[data-testid="demo-qrcode"]')).toBeVisible();
  },
  'w4b-process-display': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /流程展示组/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('[data-testid="w4b-renderer-host"]')).toBeVisible();
  },
  'w4c-composite-form-family': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /复合表单族/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'm5-showcase': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /M1–M5 移动端组件全景/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /Back/ })).toBeVisible();
  },
  'barcode-input': async (page) => {
    await expect(page.getByRole('heading', { name: 'Barcode Input', level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'gantt': async (page) => {
    await expect(page.getByRole('heading', { name: /Gantt Chart/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'kanban': async (page) => {
    await expect(page.getByRole('heading', { name: /Kanban Board/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'scheduling-calendar': async (page) => {
    await expect(page.getByRole('heading', { name: /Calendar|Scheduling/i, level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Back to Home' })).toBeVisible();
  },
  'data-verify': async (page) => {
    await expect(
      page.getByRole('heading', {
        name: /Data-Source Mechanism Verify/,
        level: 1,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(page.locator('[data-testid="verify-root"]')).toBeVisible();
  },
};

async function openDomainRoute(page: Page, routeId: string) {
  await page.goto(`/#/${routeId}`, { waitUntil: 'commit' });
}

test('domain route coverage matches playground route inventory', () => {
  const routeIds = new Set(DOMAIN_RENDERER_ROUTES.map((route) => route.id));
  const assertionIds = new Set(Object.keys(ROUTE_ASSERTIONS));

  expect(assertionIds).toEqual(routeIds);
});

const ROUTES_WITH_KNOWN_ERRORS = new Set(['gantt', 'kanban', 'scheduling-calendar', 'barcode-input']);

for (const route of DOMAIN_RENDERER_ROUTES) {
  test(`playground entry page smoke: ${route.id}`, async ({ page, allowConsoleErrors }) => {
    if (ROUTES_WITH_KNOWN_ERRORS.has(route.id)) {
      allowConsoleErrors(9999);
    }
    await openDomainRoute(page, route.id);
    await ROUTE_ASSERTIONS[route.id]?.(page);
    await assertTrackedPageErrors(page);
  });
}
