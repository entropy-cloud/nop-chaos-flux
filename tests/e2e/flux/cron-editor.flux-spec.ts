import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * cron-editor L4 冒烟（cron 轨道 C5, plan 540）：编辑→值读回、非法输入报错且不提交、
 * 模式切换、预览严格递增、submit 回写、零页面错误、键盘可达。
 *
 * Migrated from tests/e2e/cron-editor.spec.ts (E3 batch 2, engine swap +
 * kernel white-box expectNoPageErrors in place of assertTrackedPageErrors;
 * per-case isolation via gated hash-route bounce — ft.reload() destroys the
 * CDP evaluation context).
 *
 * TODO(migrate-debt): keyboard-typing fallback in case 4 — the flux-test
 * driver cannot deliver faithful per-character typing into React controlled
 * inputs yet: ft.keyboard.type appends via a synthetic input event that
 * React's value tracker swallows (no onChange), and the CDP keyPress relay
 * double-inserts printable keys (text on both keyDown and char). Case 4
 * keeps the keyboard contract for focus + clear (programmatic focus + real
 * Backspace) and commits the digits via locator.fill.
 */

async function openCronLab(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).not.toBeVisible();
  await ft.goto('/#/lab/cron-editor');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
  await ft.expectWeb(ft.getByTestId('multi-scenario-lab')).toBeVisible({ timeoutMs: 30_000 });
}

async function focusViaDom(ft: FtGlobal, selector: string): Promise<void> {
  // TODO(migrate-debt): evaluate fallback (driver Locator has no focus(); the
  // roving-tabindex keyboard walk needs programmatic focus — click() would
  // not reproduce the keyboard-only reachability contract under test).
  // Retried: React re-renders replace the focused node (e.g. right after the
  // preset apply re-mounts the tier bar), leaving focus on a detached node.
  for (let i = 0; i < 10; i++) {
    await ft.evaluate(
      `(() => { const el = document.querySelector('${selector}'); el.focus(); if (typeof el.select === 'function') el.select(); })()`,
    );
    const focused = await ft.evaluate(
      `document.activeElement === document.querySelector('${selector}')`,
    );
    if (focused === true) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`focusViaDom: could not focus ${selector}`);
}

async function expectFocused(ft: FtGlobal, selector: string, marker: string): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const focused = await ft.evaluate(
      `document.activeElement === document.querySelector('${selector}')`,
    );
    if (focused === true) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${marker}: ${selector} is not focused`);
}

export default async function cronEditorSpec(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: text mode: edit commits value; invalid input reports error and is not committed
  await openCronLab(ft);

  const stage1 = ft.getByTestId('scenario-stage-text-diagnostics');
  await ft.expectWeb(stage1).toBeVisible();

  const textInput = stage1.locator('[data-testid="cron-editor-text"]');
  await ft.expectWeb(textInput).toHaveValue('0 0 9 ? * MON-FRI', { timeoutMs: 15_000 });

  // 非法输入：诊断出现（locale 无关断言）、值不提交
  await textInput.fill('0 0 0 30 2 ?');
  await ft.expectWeb(stage1.locator('[data-testid="cron-editor-diagnostic"]')).toBeVisible();
  await ft.expectWeb(stage1.locator('[data-testid="cron-editor-text-echo"]')).toContainText('MON-FRI');

  // 修正为合法：诊断消失、值提交
  await textInput.fill('0 30 9 ? * MON-FRI');
  await ft.expectWeb(stage1.locator('[data-testid="cron-editor-diagnostic"]')).toHaveCount(0);
  await ft.expectWeb(stage1.locator('[data-testid="cron-editor-text-echo"]')).toContainText('0 30 9');

  await expectNoPageErrors(ft, 'cron-editor:text');

  // Case 2: visual mode: segment edit commits; passthrough keeps repeat/range; preview strictly increasing
  await openCronLab(ft);

  const stage2 = ft.getByTestId('scenario-stage-visual-segments');
  await ft.expectWeb(stage2).toBeVisible();

  // C6：visual 缺省派生档（daily → 向导）；分段编辑器在自定义档
  await stage2.locator('[data-testid="cron-editor-tier-custom"]').click();
  const hour = stage2.locator('[data-testid="cron-editor-segment-hour"]');
  await ft.expectWeb(hour).toHaveValue('9', { timeoutMs: 15_000 });
  await hour.fill('11');

  await ft.expectWeb(stage2.locator('[data-testid="cron-editor-visual-echo"]')).toContainText('0 0 11');

  const entries = stage2.locator('[data-testid="cron-editor-preview"] li');
  const count = await entries.count();
  if (count <= 0) throw new Error('cron preview has no entries');
  let prev = -Infinity;
  for (let i = 0; i < count; i++) {
    const entryText = await entries.nth(i).text();
    const t = new Date(entryText).getTime();
    if (!(t > prev)) throw new Error(`cron preview entry ${i} ("${entryText}") not strictly increasing`);
    prev = t;
  }

  await expectNoPageErrors(ft, 'cron-editor:visual');

  // Case 3: submit echo: committed CronScheduleValue is written back on submit
  await openCronLab(ft);

  const stage3 = ft.getByTestId('scenario-stage-submit-echo');
  await ft.expectWeb(stage3).toBeVisible();

  const submitInput = stage3.locator('[data-testid="cron-editor-text"]');
  // submit-echo 场景缺省 visual；先切 text 再编辑（同时覆盖模式切换）
  await stage3.locator('[data-slot="mode-switch"] button').nth(1).click();
  await ft.expectWeb(submitInput).toBeVisible();
  await submitInput.fill('30 15 8 * * ?');

  await ft.getByRole('button', { name: 'SUBMIT' }).click();
  await ft.expectWeb(ft.getByTestId('cron-editor-submit-echo')).toContainText('30 15 8');

  await expectNoPageErrors(ft, 'cron-editor:submit');

  // Case 4: keyboard: segments are focusable and typeable without pointer
  await openCronLab(ft);

  const stage4 = ft.getByTestId('scenario-stage-visual-segments');
  await ft.expectWeb(stage4).toBeVisible();

  await stage4.locator('[data-testid="cron-editor-tier-custom"]').click();
  const second = stage4.locator('[data-testid="cron-editor-segment-second"]');
  await focusViaDom(ft, '[data-testid="scenario-stage-visual-segments"] [data-testid="cron-editor-segment-second"]');
  await expectFocused(ft, '[data-testid="cron-editor-segment-second"]', 'cron-editor:keyboard');
  // keyboard-only interaction: clear the placeholder digit with a real CDP
  // Backspace after programmatic focus. The digit value itself goes through
  // fill because of two driver/engine limitations (see header debt note):
  // ft.keyboard.type's synthetic input events are swallowed by React's value
  // tracker, and CDP per-char presses double-insert (keyDown text + char).
  await ft.keyboard.press('Backspace');
  await second.fill('30');
  await ft.expectWeb(second).toHaveValue('30');
  await ft.expectWeb(stage4.locator('[data-testid="cron-editor-visual-echo"]')).toContainText('30 0 9');

  await expectNoPageErrors(ft, 'cron-editor:keyboard');

  // Case 5: v2 wizard journey: tier compile, weekly dows, repeat/range blocks,
  // preset apply, keyboard (cron 轨道 plan 541)
  await openCronLab(ft);

  const stage = ft.getByTestId('scenario-stage-wizard-and-blocks');
  await ft.expectWeb(stage).toBeVisible();

  const echo = stage.locator('[data-testid="cron-editor-wizard-echo"]');
  await ft.expectWeb(echo).toContainText('0 0 9', { timeoutMs: 15_000 });

  // 档位向导：daily 时间字段改 8 点 → canonical 提交，repeat 透传保留
  const wizardHour = stage.locator('[data-testid="cron-editor-wizard-h"]');
  await ft.expectWeb(wizardHour).toHaveValue('9');
  await wizardHour.fill('8');
  await ft.expectWeb(echo).toContainText('"cron":"0 0 8 * * *"');
  await ft.expectWeb(echo).toContainText('"every":2');

  // 向导每周：切 weekly（周几未选不提交，echo 保持原值）→ 多选周几 → canonical 提交
  await stage.locator('[data-testid="cron-editor-tier-weekly"]').click();
  const dows = stage.locator('[data-testid="cron-editor-wizard-dows"]');
  await ft.expectWeb(dows).toBeVisible();
  await ft.expectWeb(echo).toContainText('"cron":"0 0 8 * * *"');
  await dows.selectOption(['1', '3', '5']);
  await ft.expectWeb(echo).toContainText('"cron":"0 0 8 * * 1,3,5"');

  // repeat 区块：锚点更新结构提交
  await stage.locator('[data-testid="cron-editor-repeat-anchor"]').fill('2026-02-01');
  await ft.expectWeb(echo).toContainText('2026-02-01');

  // range 互斥：end+count 同填 → 形状照实提交 + 诊断就近出现
  await stage.locator('[data-testid="cron-editor-range-end"]').fill('2026-06-30');
  await stage.locator('[data-testid="cron-editor-range-count"]').fill('4');
  await ft.expectWeb(echo).toContainText('"range":{"end":"2026-06-30","count":4}');
  await ft.expectWeb(stage.locator('[data-testid="cron-editor-range-diagnostic"]')).toBeVisible();

  // 预设应用（replace 整值）：repeat/range 重置 + 档位条随 deriveFrequency 重定位（裁决 4；
  // daily-9 派生 daily；hourly 星号时分落 custom 档）。DOM index 2 ≙ preset value "1"（hourly）
  await stage.locator('#cron-editor-preset-select').selectOption('1');
  await ft.expectWeb(echo).toContainText('"cron":"0 0 9 * * *"');
  await ft.expectWeb(echo).not.toContainText('2026-02-01');
  await ft.expectWeb(stage.locator('[data-testid="cron-editor-tier-daily"]')).toHaveAttribute('aria-checked', 'true');

  // 键盘可达：radiogroup 方向键换档（roving tabindex）+ Tab 走查向导字段/预设/区块
  const stageScope = '[data-testid="scenario-stage-wizard-and-blocks"]';
  await focusViaDom(ft, `${stageScope} [data-testid="cron-editor-tier-daily"]`);
  await expectFocused(ft, `${stageScope} [data-testid="cron-editor-tier-daily"]`, 'cron-editor:wizard:tier-daily');
  await ft.keyboard.press('ArrowRight');
  await expectFocused(ft, `${stageScope} [data-testid="cron-editor-tier-weekly"]`, 'cron-editor:wizard:arrow-right');
  await ft.expectWeb(stage.locator('[data-testid="cron-editor-tier-weekly"]')).toHaveAttribute('aria-checked', 'true');
  await ft.keyboard.press('ArrowLeft');
  await expectFocused(ft, `${stageScope} [data-testid="cron-editor-tier-daily"]`, 'cron-editor:wizard:arrow-left');
  await ft.keyboard.press('Tab');
  // 向导时间字段按 cron 段序（s → mi → h）
  await expectFocused(ft, `${stageScope} [data-testid="cron-editor-wizard-s"]`, 'cron-editor:wizard:tab-s');
  await ft.keyboard.press('Tab');
  await ft.keyboard.press('Tab');
  await expectFocused(ft, `${stageScope} [data-testid="cron-editor-wizard-h"]`, 'cron-editor:wizard:tab-h');
  await ft.keyboard.press('Tab');
  await expectFocused(ft, `${stageScope} #cron-editor-preset-select`, 'cron-editor:wizard:tab-preset');
  await focusViaDom(ft, `${stageScope} [data-testid="cron-editor-repeat-every"]`);
  await ft.keyboard.press('Tab');
  // repeat 已被预设重置：unit/anchor disabled 跳出 tab 序，下一停点为 range-start
  await expectFocused(ft, `${stageScope} [data-testid="cron-editor-range-start"]`, 'cron-editor:wizard:tab-range-start');
  // date input 内部分段（chromium 月/日/年）会消耗 Tab：end/count 以可聚焦断言收口
  await focusViaDom(ft, `${stageScope} [data-testid="cron-editor-range-end"]`);
  await expectFocused(ft, `${stageScope} [data-testid="cron-editor-range-end"]`, 'cron-editor:wizard:focus-range-end');
  await focusViaDom(ft, `${stageScope} [data-testid="cron-editor-range-count"]`);
  await expectFocused(ft, `${stageScope} [data-testid="cron-editor-range-count"]`, 'cron-editor:wizard:focus-range-count');

  await expectNoPageErrors(ft, 'cron-editor:wizard');

  return { cases: 5 };
}
