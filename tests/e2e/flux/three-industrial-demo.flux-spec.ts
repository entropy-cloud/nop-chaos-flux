import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * plan 534 D2：three-industrial-demo smoke（程序化断言）——
 * IndustrialAdapter（合成 openSocket 标签源）连接/标签值渲染 + 重连尝试计数
 * （判别：模拟断线后计数递增——无重连实现则合成源不复用、计数不增）。
 *
 * Migrated from tests/e2e/three-industrial-demo.spec.ts (E3 batch 1, engine swap +
 * expect.poll replaced by expectWeb retry-polling / polling helper;
 * assertTrackedPageErrors replaced by kernel expectNoPageErrors).
 */

async function openDemo(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/three-industrial-demo');
  await ft.expectWeb(ft.getByTestId('three-industrial-demo')).toBeVisible({ timeoutMs: 30_000 });
}

async function expectTextPoll(
  ft: FtGlobal,
  testId: string,
  predicate: (text: string) => boolean,
  description: string,
  timeoutMs = 15_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let text = '';
  for (;;) {
    text = await ft.getByTestId(testId).text().catch(() => '');
    if (predicate(text)) return text;
    if (Date.now() > deadline) {
      throw new Error(`poll failed for [${testId}] (${description}): last text "${text.slice(0, 80)}"`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function caseAdapterConnectsAndRendersTags(ft: FtGlobal): Promise<void> {
  await openDemo(ft);
  // 连接态收敛为 connected（onopen 后）；标签值经 scope dataSources.* 通道渲染。
  await ft.expectWeb(ft.getByTestId('three-industrial-demo-status')).toContainText('connected', { timeoutMs: 15_000 });
  await expectTextPoll(ft, 'three-industrial-demo-tag-temp', (t) => t.trim() !== '—', 'tag-temp resolved');
  await expectTextPoll(ft, 'three-industrial-demo-tag-running', (t) => /^(true|false)$/.test(t.trim()), 'tag-running boolean');
  const countText = await ft.getByTestId('three-industrial-demo-tag-count').text();
  if (!(Number(countText) >= 0)) throw new Error(`tag-count should be >= 0, got "${countText}"`);
  await expectNoPageErrors(ft, 'three-industrial-demo: connect + render');
}

async function caseDropIncrementsReconnects(ft: FtGlobal): Promise<void> {
  await openDemo(ft);
  await ft.expectWeb(ft.getByTestId('three-industrial-demo-status')).toContainText('connected', { timeoutMs: 15_000 });
  const reconnects = ft.getByTestId('three-industrial-demo-reconnects');
  await reconnects.waitFor('attached');
  // 基线（StrictMode 双挂载等环境因素下取绝对值增量语义，plan 534 e2e 即「触发后递增」）。
  const baselineText = await reconnects.text();
  const baseline = Number(baselineText.match(/\d+/)?.[0] ?? 0);
  // 模拟异常断线 → 退避重连 → 合成 openSocket 复用（计数 ≥ +1）且连接恢复。
  await ft.getByTestId('three-industrial-demo-trigger-drop').click();
  await expectTextPoll(
    ft,
    'three-industrial-demo-reconnects',
    (t) => Number(t.match(/\d+/)?.[0] ?? 0) - baseline >= 1,
    'reconnect count >= baseline + 1',
  );
  await ft.expectWeb(ft.getByTestId('three-industrial-demo-status')).toContainText('connected', { timeoutMs: 15_000 });
  await expectNoPageErrors(ft, 'three-industrial-demo: reconnect counter');
}

export default async function threeIndustrialDemoSpec(ft: FtGlobal): Promise<{ cases: number }> {
  await caseAdapterConnectsAndRendersTags(ft);
  await caseDropIncrementsReconnects(ft);
  return { cases: 2 };
}
