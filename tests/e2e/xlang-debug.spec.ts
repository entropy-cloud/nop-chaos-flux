import { test, expect } from './fixtures.js';
import type { Page } from '@playwright/test';

/**
 * plan 2476（roadmap item 22）：xlang 在线调试编辑器前后端 e2e——真实 playground
 * 装配链（schema→registry→SchemaRenderer→装配组件→编辑器/面板/client）对
 * **真实 D1 mock 服务器**（tests/e2e/xlang-debug-mock-server.mjs，playwright
 * webServer 拉起，vite dev 代理 `/ws/xlang-debugger` + `/r/nop-xlang-debug`）——
 * 浏览器真实 WebSocket 端到端，无注入 mock（routeWebSocket shim 注入在部分
 * page 上间歇失效——执行期实测，弃用）。
 *
 * 全链：断点 gutter→命中→续期→单步→求值→放行→完成；路径：断连重连/租约过期/诊断桥。
 * 断言/驱动经 mock 服务器控制面（/__frames、/__emit、/__reset、/__close、/__compile）。
 *
 * 真实 nop-entropy 后端集成由 entropy item 21 全链测试承载（plans/2475）；
 * docker-compose 联调为 plans/621 已登记 follow-up。
 *
 * CI：现有 `pnpm e2e` 门槛直接承载（webServer 数组自动拉起 mock 服务器）。
 */

// 本文件内串行：5 用例共享真实 mock 服务器状态（/__reset 会互清帧计数）——
// 并发 worker 下轮询计数互相踩踏；串行为共享态下的确定性口径
test.describe.configure({ mode: 'serial' });

const MOCK = 'http://127.0.0.1:4180';
const SOURCE_PATH = 'demo.xpl';

interface Frame {
  method?: string;
  params?: Record<string, any>;
  id?: string;
}

async function frames(page: Page): Promise<Frame[]> {
  const res = await page.request.get(`${MOCK}/__frames`);
  return (await res.json()).received as Frame[];
}

async function pollFrames(page: Page, method: string, atLeast: number, timeout = 10_000) {
  await expect
    .poll(async () => {
      const all = await frames(page);
      return all.filter((f) => f.method === method).length;
    }, { timeout })
    .toBeGreaterThanOrEqual(atLeast);
}

async function emit(page: Page, method: string, params: Record<string, unknown>) {
  await page.request.post(`${MOCK}/__emit`, { data: { jsonrpc: '2.0', method, params } });
}

async function resetMock(page: Page) {
  await page.request.post(`${MOCK}/__reset`, { data: {} });
}

/** 连接前置：清 mock 态 + 导航 + token gate 连接 + 编辑器可见。 */
async function openDemo(page: Page) {
  await resetMock(page);
  await page.goto('/#/xlang-debug');
  await page.getByPlaceholder('access token').fill('demo-token');
  await page.getByRole('button', { name: '连接调试会话' }).click();
  await expect(page.locator('[data-testid="xlang-debug-editor"]')).toBeVisible();
}

test('xlang debug full chain: breakpoint gutter → suspend → renew → step → eval → resume → complete', async ({ page }) => {
  test.setTimeout(60_000);
  await openDemo(page);
  // 客户端→服务器：session.open（StrictMode 弃连容忍——按 method 过滤断言 ≥1）
  await pollFrames(page, 'session.open', 1);

  // 断点：gutter 点击第 2 行（.cm-gutters 条行 Y 坐标；行内容点击是光标放置非断点）
  const line2Box = await page.locator('.cm-content .cm-line').nth(1).boundingBox();
  const gutterBox = await page.locator('.cm-gutters').boundingBox();
  expect(line2Box).toBeTruthy();
  expect(gutterBox).toBeTruthy();
  await page.mouse.click(gutterBox!.x + gutterBox!.width - 4, line2Box!.y + line2Box!.height / 2);
  await pollFrames(page, 'debugger.addBreakpoint', 1);
  const addBp = (await frames(page)).filter((f) => f.method === 'debugger.addBreakpoint')[0];
  expect(addBp.params.bp).toMatchObject({ sourcePath: SOURCE_PATH, line: 2 });

  // 命中：服务器 evt.suspended → 面板挂起态（变量树渲染并自动发 getFrameVariables）
  await emit(page, 'evt.suspended', {
    reason: 'breakAt',
    threadId: 9001,
    location: { sourcePath: SOURCE_PATH, line: 2 },
    stackInfo: { threadId: 9001, threadName: 'mock', stackTrace: [{ funcName: 'main', sourcePath: SOURCE_PATH, line: 2 }] },
  });
  await pollFrames(page, 'debugger.getFrameVariables', 1);
  await expect(page.locator('[data-testid="xlang-debug-vars"]')).toBeVisible();

  // 续期：open lease.renewIntervalMs=250 → 心跳帧可观测
  await pollFrames(page, 'lease.renew', 1);

  // 单步：Step Into 按钮（nth=2，i18n 默认 zh-CN——按位置选择规避文本耦合）
  const stepInto = page.locator('[data-testid="xlang-debug-controls"] .xlang-debug-btn').nth(2);
  await expect(stepInto).toBeEnabled();
  await stepInto.click();
  await pollFrames(page, 'debugger.stepInto', 1);
  await emit(page, 'evt.suspended', {
    reason: 'stepInto',
    threadId: 9001,
    location: { sourcePath: SOURCE_PATH, line: 3 },
    stackInfo: { threadId: 9001, threadName: 'mock', stackTrace: [{ funcName: 'main', sourcePath: SOURCE_PATH, line: 3 }] },
  });

  // 求值：eval 输入 a → getExprValue 帧 → 结果渲染 42
  const evalInput = page.locator('[data-testid="xlang-debug-eval"] input');
  await evalInput.fill('a');
  await evalInput.press('Enter');
  await pollFrames(page, 'debugger.getExprValue', 1);
  await expect(page.locator('.xlang-debug-eval-result')).toHaveText('42', { timeout: 10_000 });

  // 放行：Continue（nth=0）→ resume 帧 → evt.resumed{threadIds}（挂起清除）→ 非挂起态
  const resumeBtn = page.locator('[data-testid="xlang-debug-controls"] .xlang-debug-btn').nth(0);
  await resumeBtn.click();
  await pollFrames(page, 'debugger.resume', 1);
  await emit(page, 'evt.resumed', { threadIds: [9001], cause: 'user' });
  await emit(page, 'evt.completed', { ok: true, result: '7' });
  await expect(page.locator('[data-testid="xlang-debug-not-suspended"]')).toBeVisible({ timeout: 10_000 });
});

test('xlang debug reconnect: server drop → client reconnect → rebind snapshot', async ({ page }) => {
  test.setTimeout(60_000);
  await openDemo(page);
  await pollFrames(page, 'session.open', 1);

  // 断连：服务器强关 → client 重连矩阵 → 新 session.open + session.rebind（新 sessionId 触发）
  await page.request.post(`${MOCK}/__close`, { data: {} });
  await pollFrames(page, 'session.open', 2, 15_000);
  await pollFrames(page, 'session.rebind', 1, 15_000);
  const rebind = (await frames(page)).filter((f) => f.method === 'session.rebind')[0];
  expect(rebind.params.sessionId).toMatch(/^u1:conn-/);
});

test('xlang debug lease expiry: evt.leaseExpired clears suspended state', async ({ page }) => {
  test.setTimeout(60_000);
  await openDemo(page);
  await pollFrames(page, 'session.open', 1);

  await emit(page, 'evt.suspended', {
    reason: 'breakAt',
    threadId: 9002,
    location: { sourcePath: SOURCE_PATH, line: 2 },
    stackInfo: { threadId: 9002, threadName: 'mock', stackTrace: [{ funcName: 'main', sourcePath: SOURCE_PATH, line: 2 }] },
  });
  await expect(page.locator('[data-testid="xlang-debug-vars"]')).toBeVisible({ timeout: 10_000 });

  await emit(page, 'evt.leaseExpired', { threadIds: [9002] });
  await expect(page.locator('[data-testid="xlang-debug-not-suspended"]')).toBeVisible({ timeout: 10_000 });
});

test('xlang debug diagnostics bridge: compile diagnostics render as editor lint', async ({ page }) => {
  test.setTimeout(60_000);
  await resetMock(page);
  await page.request.post(`${MOCK}/__compile`, {
    data: { diagnostics: [{ line: 1, severity: 'error', message: 'mock compile error' }] },
  });
  await page.goto('/#/xlang-debug');
  await page.getByPlaceholder('access token').fill('demo-token');
  await page.getByRole('button', { name: '连接调试会话' }).click();
  await expect(page.locator('[data-testid="xlang-debug-editor"]')).toBeVisible();
  // 诊断桥：linter 去抖（装配层 800ms）+ compile 往返后渲染 .cm-lintRange-error 文本装饰
  await expect(page.locator('.cm-lintRange-error').first()).toBeVisible({ timeout: 15_000 });
});

test('xlang debug compile failure: non-ok compile falls back to synthesized diagnostic', async ({ page, errorMonitor }) => {
  test.setTimeout(60_000);
  // HTTP 500 属测试意图：浏览器会记录 console.error（Failed to load resource: 500）——放行 1 条
  errorMonitor.allowConsoleErrors(1);
  await resetMock(page);
  await page.request.post(`${MOCK}/__compile`, { data: { status: 500 } });
  await page.goto('/#/xlang-debug');
  await page.getByPlaceholder('access token').fill('demo-token');
  await page.getByRole('button', { name: '连接调试会话' }).click();
  await expect(page.locator('[data-testid="xlang-debug-editor"]')).toBeVisible();
  await expect(page.locator('.cm-lintRange-error').first()).toBeVisible({ timeout: 15_000 });
});
