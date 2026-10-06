import { expect, test, assertTrackedPageErrors } from './fixtures.js';

// plan 534 D2：three-industrial-demo smoke（程序化断言）——
// IndustrialAdapter（合成 openSocket 标签源）连接/标签值渲染 + 重连尝试计数
// （判别：模拟断线后计数递增——无重连实现则合成源不复用、计数不增）。

async function openDemo(page: import('@playwright/test').Page) {
  await page.goto('/#/three-industrial-demo', { waitUntil: 'load' });
  await expect(page.getByTestId('three-industrial-demo')).toBeVisible({ timeout: 30_000 });
}

test.describe('three-industrial demo (plan 534 D2)', () => {
  test('adapter connects the synthetic tag source and renders typed tag values', async ({ page }) => {
    await openDemo(page);
    // 连接态收敛为 connected（onopen 后）；标签值经 scope dataSources.* 通道渲染。
    await expect
      .poll(async () => page.getByTestId('three-industrial-demo-status').textContent(), { timeout: 15_000 })
      .toContain('connected');
    await expect
      .poll(async () => page.getByTestId('three-industrial-demo-tag-temp').textContent(), { timeout: 15_000 })
      .not.toBe('—');
    await expect
      .poll(async () => page.getByTestId('three-industrial-demo-tag-running').textContent(), { timeout: 15_000 })
      .toMatch(/^(true|false)$/);
    const countText = await page.getByTestId('three-industrial-demo-tag-count').textContent();
    expect(Number(countText)).toBeGreaterThanOrEqual(0);
    await assertTrackedPageErrors(page);
  });

  test('simulated drop increments the reconnect-attempt counter (判别性)', async ({ page }) => {
    await openDemo(page);
    await expect
      .poll(async () => page.getByTestId('three-industrial-demo-status').textContent(), { timeout: 15_000 })
      .toContain('connected');
    const reconnects = page.getByTestId('three-industrial-demo-reconnects');
    // 基线（StrictMode 双挂载等环境因素下取绝对值增量语义，plan 534 e2e 即「触发后递增」）。
    const baseline = Number((await reconnects.textContent())?.match(/\d+/)?.[0] ?? 0);
    // 模拟异常断线 → 退避重连 → 合成 openSocket 复用（计数 ≥ +1）且连接恢复。
    await page.getByTestId('three-industrial-demo-trigger-drop').click();
    await expect
      .poll(
        async () => {
          const value = Number((await reconnects.textContent())?.match(/\d+/)?.[0] ?? 0);
          return value - baseline;
        },
        { timeout: 15_000 },
      )
      .toBeGreaterThanOrEqual(1);
    await expect
      .poll(async () => page.getByTestId('three-industrial-demo-status').textContent(), { timeout: 15_000 })
      .toContain('connected');
    await assertTrackedPageErrors(page);
  });
});
