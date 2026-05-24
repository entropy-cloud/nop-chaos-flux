# 维度 14：测试覆盖与质量

## 第 1 轮（初审）

本轮为初审，不输出复核结论；未运行 full test。已按要求读取共享前缀文档、维度 14 正文、AGENTS testing 章节，并以 live code 复核主 agent 给出的 suspect 基线。

## 发现

### [维度14-01] Flow Designer 连线创建的可执行 E2E 只覆盖 synthetic bridge，真实拖拽路径被跳过

- **文件**: `tests/e2e/flow-designer-edge-creation.spec.ts:10-34`
- **证据片段**:

  ```ts
  test('synthetic connect event updates the live edge count', async ({ page }) => {
    await openFlowDesigner(page);

    const edgeCount = page.locator('.react-flow__edge');
    await expect(edgeCount).toHaveCount(6);

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('nop-designer:test-connect', {
  ```

- **严重程度**: P1
- **类别**: 验证可信度 / E2E proof fidelity / 覆盖缺口
- **现状**: 当前可执行测试验证的是 `nop-designer:test-connect` synthetic event，真实鼠标拖拽创建连线的 E2E 被 `test.skip` 排除。
- **风险**: React Flow handle 命中、pointer event、拖拽阈值、坐标换算、浏览器层交互退化时，CI 仍可能绿；连线创建的用户路径缺少真实端到端证明。
- **建议**: 修复并启用真实 source handle -> target handle 拖拽测试；synthetic event 可保留为低层桥接回归，但不要作为唯一 active edge-creation proof。
- **为什么值得现在做**: Flow Designer 是复杂交互核心场景，连线创建属于主要用户路径；该问题正好命中 `docs/references/audit-tooling.md` 对“端到端流程却走 test hook / synthetic event”的 proof-fidelity 红线。
- **误报排除**: 测试名已诚实标注 synthetic，因此不是“标题误导”；问题在于唯一 active 连线创建 proof 绕过真实 UI，而真实拖拽 proof 明确 skip。
- **历史模式对应**: Dimension 14 proof-fidelity：E2E 断言绕过用户操作路径。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/skills/deep-audit-prompts.md`; `AGENTS.md`
- **复核状态**: 未复核

### [维度14-02] `basic-page-layout-structure.test.tsx` 超大测试文件混合 page/layout/status/tabs/classAlias/icon marker 多类职责

- **文件**: `packages/flux-renderers-basic/src/__tests__/basic-page-layout-structure.test.tsx:646-690`
- **证据片段**:
  ```ts
  it('uses data-icon for icon identity without a modifier marker class', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{ type: 'page', body: [{ type: 'icon', icon: 'gear', testid: 'settings-icon' }] }}
  ```
- **严重程度**: P2
- **类别**: 超大测试文件职责混合 / 可维护性
- **现状**: 该文件 694 行，除 page/layout 结构外，还覆盖 flex deprecated fallback、statusPath、tabs ownership、classAliases、icon marker、tabs data-slot marker 等多类契约。
- **风险**: 后续修改 basic renderer 的单一职责时，测试定位困难；marker、tabs、classAlias、page status 的失败会集中到同一个“大杂烩”文件，增加回归诊断成本。
- **建议**: 按契约拆分为 `page-status-path.test.tsx`、`tabs-structure.test.tsx`、`class-aliases.test.tsx`、`icon-marker.test.tsx` 等小文件，保留共享 helper。
- **为什么值得现在做**: `pnpm check:oversized-code-files` 已将其列为接近硬阈值的 694 行 warning；这里不是单纯“大文件”，而是职责边界已明显混合。
- **误报排除**: 依据校准规则“大文件本身不报告”；本条保留原因是同一文件覆盖多个独立 renderer/contract 维度，而非只因行数超过 500。
- **历史模式对应**: Large File Pressure With Boundary Drift（测试版）。
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`; `docs/skills/deep-audit-prompts.md`; `AGENTS.md`
- **复核状态**: 未复核

### [维度14-03] `@nop-chaos/ui` 共享组件测试集中在少数代表项，多个导出的基础组件缺少行为级单测

- **文件**: `packages/ui/src/public-entry-contract.test.ts:13-20`
- **证据片段**:
  ```ts
  describe('@nop-chaos/ui public entry contract', () => {
    it('keeps root entry exports aligned with representative public components', () => {
      expect(ui.Button).toBeTypeOf('function');
      expect(ui.NativeSelect).toBeTypeOf('function');
      expect(ui.Sidebar).toBeTypeOf('function');
      expect(ui.toast).toBeTypeOf('function');
      expect(ui.cn).toBe(directCn);
    });
  ```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: `@nop-chaos/ui` 有 71 个 src 实现文件、21 个测试文件；当前 public-entry 测试只抽查代表性导出，`accordion.tsx`、`table.tsx`、`radio-group.tsx`、`textarea.tsx`、`sheet.tsx`、`dropdown-menu.tsx` 等基础组件缺少对应行为/可访问性测试。
- **风险**: 共享 UI primitive 的 keyboard、ARIA、data-slot、class merge、disabled/focus 行为退化时，依赖这些组件的 renderer 测试可能只能间接暴露问题，定位慢且覆盖不稳定。
- **建议**: 优先为高复用交互组件补最小行为测试：Accordion/DropdownMenu/Table/RadioGroup/Textarea/Sheet，覆盖 data-slot、ARIA role/name、键盘或 open/close 基线。
- **为什么值得现在做**: UI 包是所有 renderer 的底座；补少量 primitive 级测试比在上层 renderer 重复捕获 UI 退化更高 ROI。
- **误报排除**: 不是要求每个 shadcn 包装都机械 1:1 单测；保留本条是因为多个高复用交互 primitive 当前只有导出/间接覆盖，缺少自身契约 proof。
- **历史模式对应**: Shared primitive coverage gap / indirect renderer coverage overreliance。
- **参考文档**: `docs/skills/deep-audit-prompts.md`; `AGENTS.md`
- **复核状态**: 未复核

## 测试覆盖统计（按包摘要）

- 全仓 tracked 单元/集成测试：约 590 个 `*.test|*.spec` 文件，约 136,703 行测试代码。
- E2E：`tests/e2e` 下 43 个 spec，约 7,396 行。
- 测试文件为 0 的 package：未发现。
- 所有 packages 均有 `test` script；Vitest config 均存在。
- `pnpm check:schema-prop-coverage`：主 agent 基线为 100% 通过，未重复报告。

| 包/应用                                   | 测试文件数 | 测试行数 | src 实现文件数 |
| ----------------------------------------- | ---------: | -------: | -------------: |
| `@nop-chaos/flux-runtime`                 |         86 |   26,374 |             71 |
| `@nop-chaos/flux-renderers-form-advanced` |         70 |   18,255 |             47 |
| `@nop-chaos/flux-react`                   |         45 |   11,065 |             46 |
| `@nop-chaos/flux-renderers-data`          |         32 |    9,773 |             37 |
| `@nop-chaos/flux-compiler`                |         31 |    8,989 |             34 |
| `@nop-chaos/flow-designer-renderers`      |         24 |    6,149 |             53 |
| `@nop-chaos/flux-renderers-form`          |         28 |    5,517 |             24 |
| `@nop-chaos/nop-debugger`                 |         17 |    5,353 |             29 |
| `@nop-chaos/flux-core`                    |         31 |    3,808 |             45 |
| `@nop-chaos/flux-action-core`             |         15 |    3,622 |             13 |
| `@nop-chaos/flux-renderers-basic`         |         17 |    3,767 |             25 |
| `@nop-chaos/ui`                           |         21 |      829 |             71 |
| `@nop-chaos/word-editor-renderers`        |         17 |    3,239 |             32 |
| `@nop-chaos/word-editor-core`             |         11 |    2,593 |             14 |
| `@nop-chaos/flow-designer-core`           |          9 |    2,752 |             24 |
| `@nop-chaos/spreadsheet-renderers`        |         16 |    3,327 |             45 |
| `@nop-chaos/spreadsheet-core`             |          9 |    2,461 |             25 |
| `@nop-chaos/report-designer-renderers`    |         16 |    3,349 |             20 |
| `@nop-chaos/report-designer-core`         |          8 |    1,852 |             14 |
| `@nop-chaos/flux-code-editor`             |         10 |    1,362 |             23 |
| `@nop-chaos/flux-formula`                 |         11 |    2,319 |             20 |
| `@nop-chaos/flux-i18n`                    |          2 |      264 |              6 |
| `@nop-chaos/flux`                         |          1 |       91 |              2 |
| `@nop-chaos/tailwind-preset`              |          1 |       67 |              1 |
| `@nop-chaos/theme-tokens`                 |          1 |       58 |              1 |
| `@nop-chaos/flux-playground`              |         18 |    2,072 |            100 |

## 覆盖缺口清单

- `tests/e2e/flow-designer-edge-creation.spec.ts`: 真实拖拽创建连线 active E2E 缺口。
- `packages/ui/src/components/ui/*.tsx`: 多项共享 UI primitive 缺少自身行为/ARIA/data-slot 单测。
- “实现文件没有相邻测试”的统计很多，但大量由 higher-level integration 覆盖，初审不机械报告；高风险样本包括 `flux-runtime` async-data/controller helpers、`flux-react` field/form publication、`flux-renderers-data` crud/table/tree 内部模块、`flow-designer-renderers` command/canvas adapter 拆分模块。

## 测试质量问题清单

- `[维度14-01]` E2E proof fidelity：Flow Designer 连线创建 active 测试绕过真实拖拽。
- `[维度14-02]` 超大测试职责混合：basic page/layout 测试文件混合多个独立契约。
- `[维度14-03]` 覆盖缺口：UI primitive 级测试不足。

## 优先级排序建议

- P1：启用 Flow Designer 真实拖拽连线 E2E；synthetic bridge 降级为辅助回归。
- P2：补 `@nop-chaos/ui` 高复用交互 primitive 的最小行为测试。
- P2：拆分 `basic-page-layout-structure.test.tsx`，先拆 marker/classAlias/tabs，再拆 page status。
- P3：继续治理 >500 行测试 warning，但只处理职责混合的文件，不因行数机械拆分。

## suspect 排除清单

`pnpm check:audit-test-global-leaks` 8 suspects 逐项复核结果：

- `packages/flux-code-editor/src/use-code-mirror.test.tsx:12` `capturedListener`: `beforeEach` 与 `afterEach` 均重置，排除。
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view-owner-updates.test.tsx:8` `viewerMountCount`: 仅单个生命周期测试使用，测试开始显式置 0；不构成跨测试泄漏，排除。
- `apps/playground/src/pages/performance-table/measurement.test.ts:62/83` `requestAnimationFrame` patch/restore: `try/finally` restore，排除。
- `packages/flux-react/src/__tests__/schema-renderer-runtime-scope.test.tsx:165/203` `queueMicrotask` patch/restore: `try/finally` restore，排除。
- `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx:23/160` `window.confirm` patch: `afterEach` restores or deletes original property plus `vi.restoreAllMocks()`，排除。

## 深挖第 2 轮追加

### [维度14-04] Word Editor E2E 通过内部 probe/localStorage 证明输入与恢复，缺少用户可见内容断言

- **文件**: `tests/e2e/word-editor.spec.ts:12-21,112-125`; `tests/e2e/word-editor-persistence.spec.ts:18-29,52-68`
- **证据片段**:
  ```ts
  async function readRecoveredMainText(page: import('@playwright/test').Page) {
    return page.evaluate(() => {
      const probe = window.__NOP_WORD_EDITOR_PROBE__;
      const main = probe?.getState().document?.main ?? [];
      return main
        .map((item) =>
          item && typeof item === 'object' && 'value' in item ? String(item.value ?? '') : '',
        )
        .join(' ');
    });
  }
  ```
- **严重程度**: P2
- **现状**: `can type text in editor` 在 canvas 上真实键入后，主要通过 `window.__NOP_WORD_EDITOR_PROBE__.getState()` 读取文档模型来证明文本进入编辑器；持久化测试也主要读取 `localStorage` 和 probe 恢复文本。
- **风险**: 文档模型或 autosave 正常但 canvas 可见渲染、重载后的用户可见内容、保存成功反馈退化时，E2E 仍可能通过；这类测试更像“内部状态集成测试”，端到端用户证明不足。
- **建议**: 为 Word Editor 增加稳定的用户可见断言通道，例如保存状态/恢复提示、可访问文本镜像、预览层文本，或可由真实 UI 读取的文档内容区域；probe/localStorage 可保留为辅助诊断，不应是核心 proof。
- **误报排除**: 测试确实执行了真实键盘输入，不是 synthetic 操作问题；问题在于结果证明绕过用户 UI，命中维度 14 “用户可见结果通道优先”的 proof-fidelity 要求。
- **参考文档**: `docs/skills/deep-audit-prompts.md`; `docs/references/audit-tooling.md`; `AGENTS.md`
- **复核状态**: 未复核

### [维度14-05] Component Lab CRUD E2E 将 owner/query 关键状态断言落在 `scope-debug-json`

- **文件**: `tests/e2e/component-lab/crud-test-utils.ts:23-24`; `tests/e2e/component-lab/crud-query-and-ownership.spec.ts:26-31,47-49,80-82`
- **证据片段**:

  ```ts
  export function crudScopeDebug(stage: Locator): Locator {
    return stage.locator('[data-slot="scope-debug-json"]');
  }

  await expect(crudScopeDebug(stage)).toContainText('"keyword": "Al"');
  await stage.getByRole('button', { name: /重置|reset/i }).click();
  await expect(dataRows(stage)).toHaveCount(3);
  await expect(crudScopeDebug(stage)).not.toContainText('"keyword": "Al"');
  ```

- **严重程度**: P2
- **现状**: CRUD E2E 虽有 rows/footer 等可见断言，但 query keyword、`pagedRecords`、`refreshCount`、client-mode source owner 证据仍依赖 `[data-slot="scope-debug-json"]`。
- **风险**: 用户可见 CRUD 表格/分页/toolbar 状态与内部 scope dump 脱节时，owner/query 相关回归可能被 debug JSON 掩盖；尤其 `refreshCount`、`pagedRecords` 属于内部状态 proof，而不是用户路径 proof。
- **建议**: 将关键 owner/query 结果投射到用户可见 footer、表格内容、状态文案或 toast；`scope-debug-json` 仅保留为诊断辅助，不作为 supported E2E 的关键语义断言。
- **误报排除**: 这不是单纯禁止 debug 断言；问题是 supported component-lab CRUD 流程中部分业务语义只能从 debug dump 证明，符合审计工具对 debug-only proof 的风险定义。
- **参考文档**: `docs/skills/deep-audit-prompts.md`; `docs/references/audit-tooling.md`; `AGENTS.md`
- **复核状态**: 未复核

### [维度14-06] `data-tree-and-chart.test.tsx` 单文件混合 tree、chart、table instancePath、键盘与大树性能边界

- **文件**: `packages/flux-renderers-data/src/__tests__/data-tree-and-chart.test.tsx:11-16,185-222,251-276,607-669`
- **证据片段**:

  ```ts
  describe('dataRendererDefinitions tree and chart behavior', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders visual tree nodes through the node region with inherited bindings', async () => {
      cleanup();
      const SchemaRenderer = createDataSchemaRenderer([iconRenderer]);
  ```

- **严重程度**: P2
- **现状**: 该文件约 671 行，`describe('dataRendererDefinitions tree and chart behavior')` 下同时覆盖 tree 渲染/状态/键盘展开、chart handle/empty、table row repeated instancePath、tree node instancePath、大 child list deferred render。
- **风险**: tree、chart、table repeated scope、性能边界失败会集中到同一个测试文件，难以按 renderer owner 定位；后续修改 chart 或 table instancePath 也会触碰“tree and chart”杂糅测试面。
- **建议**: 拆为 `tree-rendering-and-status.test.tsx`、`tree-keyboard-expand.test.tsx`、`tree-large-render.test.tsx`、`chart-handles.test.tsx`、`repeated-instance-path.test.tsx` 等 focused tests，共享 `createDataSchemaRenderer` helper。
- **误报排除**: 不是因超过 500 行机械报告；保留原因是同一文件跨 renderer 类型和契约层级，职责边界已明显混合。
- **参考文档**: `docs/skills/deep-audit-prompts.md`; `docs/references/deep-audit-calibration-patterns.md`; `AGENTS.md`
- **复核状态**: 未复核

### [维度14-07] `code-editor.integration.test.tsx` 多处 `console.error` spy 只在成功路径恢复，失败时会污染后续测试

- **文件**: `packages/flux-code-editor/src/code-editor.integration.test.tsx:19-21,45-99,103-138,371-400`
- **证据片段**:

  ```ts
  afterEach(() => {
    cleanup();
  });

  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  renderCodeEditorSchema({
    type: 'page',
  ```

- **严重程度**: P2
- **现状**: 文件内多次 `vi.spyOn(console, 'error').mockImplementation(() => {})`，但 `afterEach` 只执行 `cleanup()`；`consoleError.mockRestore()` 放在每个测试末尾成功路径。
- **风险**: 任一测试在 `mockRestore()` 前失败，会让 `console.error` 保持 mocked 状态，后续测试可能无法暴露 React/runtime 错误输出，造成同文件级联误判或隐藏真实异常。
- **建议**: 在 `afterEach` 中统一 `vi.restoreAllMocks()`，或用 `try/finally` 包裹每个 console spy；优先去掉重复的成功路径 restore，改为集中清理。
- **误报排除**: 现有 `afterEach(cleanup)` 不会恢复 Vitest spies；该风险不同于已排除的 `window.confirm`/RAF 等有明确 restore 的 suspects。
- **参考文档**: `docs/skills/deep-audit-prompts.md`; `docs/references/audit-tooling.md`; `AGENTS.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度14-08] 多个 active E2E 诊断 spec 仍作为默认测试运行，混入截图/DOM dump/console dump 职责

- **文件**: `tests/e2e/flow-designer-ui.spec.ts:33-42,156-166`; `tests/e2e/component-lab/crud-table-body-diag.spec.ts:4-17,87-102`; `tests/e2e/debugger-meta-diagnostic.spec.ts:4-12`
- **证据片段**:

  ```ts
  test('captures node and hover toolbar html', async ({ page }, testInfo) => {
    await openFlowDesigner(page);

    const shotsDir = join(testInfo.outputDir, 'screenshots');
    await mkdir(shotsDir, { recursive: true });
    await page.screenshot({ path: join(shotsDir, 'flow-designer-page.png'), fullPage: true });
    await page
      .locator('[data-testid="canvas"]')
      .first()
      .screenshot({ path: join(shotsDir, 'canvas.png') });
  ```

  ```ts
  console.log('NODE_HTML_START');
  console.log(nodeHtml);
  console.log('NODE_HTML_END');
  console.log('TOOLBAR_HTML_START');
  console.log(toolbarHtml);
  console.log('TOOLBAR_HTML_END');
  ```

- **严重程度**: P2
- **现状**: 默认 `tests/e2e` 下仍存在命名为 `diagnose`/`diagnostic`、输出截图、HTML dump、console dump、React fiber 探测的 active spec；`playwright.config.ts` 的 `testDir: './tests/e2e'` 会默认收录这些文件，且没有按 `exploratory/` 或 skip/tag/manual profile 隔离。
- **风险**: 诊断脚本与 supported E2E gate 混跑，会扩大 CI 噪声、拖慢失败定位；截图/DOM dump/console dump 容易把“调试观测”误当成用户行为证明，也会让真正业务断言与临时排查逻辑混杂。
- **建议**: 将纯诊断/截图/dump 类 spec 移入 `tests/e2e/exploratory/` 并默认 skip，或用 Playwright project/tag 明确排除；保留有业务价值的断言时，拆成 focused supported E2E，移除截图写文件、console dump、React fiber/HTML dump 诊断路径。
- **误报排除**: 不是重复报告已有的 Flow Designer 连线 synthetic proof、Word Editor probe 或 CRUD scope-debug；本条关注的是 active E2E suite 中诊断脚本未隔离，且证据显示它们执行截图/HTML/console dump 而非单纯业务断言。
- **参考文档**: `docs/skills/deep-audit-prompts.md`; `docs/references/audit-tooling.md`; `AGENTS.md`
- **复核状态**: 未复核

### [维度14-09] `basic-structural.test.tsx` 缺少统一 afterEach 清理，失败路径会泄漏 DOM 和 console spy

- **文件**: `packages/flux-renderers-basic/src/__tests__/basic-structural.test.tsx:1-10,318-369`
- **证据片段**:
  ```ts
  import { cleanup, render, screen, waitFor } from '@testing-library/react';
  import { describe, expect, it, vi } from 'vitest';
  ...
  describe('basicRendererDefinitions structural rendering', () => {
    it('renders fragment body with inherited scope data', () => {
      const SchemaRenderer = createBasicSchemaRenderer([scopeProbeRenderer]);
  ```
  ```ts
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  render(
    <SchemaRenderer
      schemaUrl="test://basic/structural"
      schema={{
        type: 'page',
        body: [
  ```
  ```ts
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
  cleanup();
  ```
- **严重程度**: P2
- **现状**: 文件没有 `afterEach(cleanup)` 或 `afterEach(vi.restoreAllMocks)`，而是每个测试末尾手动 `cleanup()`；第 318 行测试中的 `console.error` spy 也只在成功路径恢复，未使用 `try/finally`。
- **风险**: 任一断言在 `mockRestore()` 或 `cleanup()` 前失败，会污染后续同文件测试：DOM 残留可能让 `screen.getBy*` 命中旧节点，`console.error` mock 可能隐藏 React/runtime 错误输出。
- **建议**: 在文件级添加 `afterEach(() => { cleanup(); vi.restoreAllMocks(); })`，移除成功路径分散 cleanup；对需要检查 console 的测试保留局部 spy，但依赖统一 afterEach 或 `try/finally` 恢复。
- **误报排除**: 不是重复报告 `code-editor.integration.test.tsx` 的同类问题；这里是另一个 active test 文件，且 grep 复核显示该文件没有 afterEach，手动 cleanup 分散在测试尾部。
- **参考文档**: `docs/skills/deep-audit-prompts.md`; `docs/references/audit-tooling.md`; `AGENTS.md`
- **复核状态**: 未复核

### [维度14-10] `schema-renderer.test.tsx` 在模块级 spy `createRendererRuntime`，失败时会跨测试污染 runtime 工厂

- **文件**: `packages/flux-react/src/__tests__/schema-renderer.test.tsx:181-212,254-294,317-358`
- **证据片段**:
  ```ts
  it('shows a root fallback when import preparation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failingLoader = {
      load: vi.fn(async () => {
        throw new Error('Import load failed');
      }),
    };
  ```
  ```ts
  const createRendererRuntimeSpy = vi
    .spyOn(fluxRuntime, 'createRendererRuntime')
    .mockImplementation((input) => {
      const runtime = originalCreateRendererRuntime(input);
      runtime.prepareSchema = prepareSchema as typeof runtime.prepareSchema;
      return runtime;
    });
  ```
  ```ts
  } finally {
    createRendererRuntimeSpy.mockRestore();
  }
  ```
- **严重程度**: P2
- **现状**: 该文件没有文件级 `afterEach(cleanup/restoreAllMocks)`。两个异步 race/abort 测试通过 `try/finally` 恢复 `createRendererRuntime` spy，但前面的 import failure 测试只在成功路径恢复 `console.warn`；文件级缺少兜底恢复。
- **风险**: 当测试在 `mockRestore()` 前失败或新增测试复用同模式时，`console.warn` 或 runtime factory spy 可能泄漏到后续测试，导致 SchemaRenderer 创建路径被替换、错误日志被吞、后续失败原因失真。
- **建议**: 增加 `afterEach(() => { cleanup(); vi.restoreAllMocks(); })`；模块函数 spy 仍可保留 `try/finally` 作为局部保护，但不要只依赖成功路径 restore。
- **误报排除**: 不是泛化要求所有 spy 都改写；本条定位的是跨包核心 factory mock，且当前文件确实没有统一 afterEach 兜底，失败路径风险高于普通局部 `vi.fn()`。
- **参考文档**: `docs/skills/deep-audit-prompts.md`; `docs/references/audit-tooling.md`; `AGENTS.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度14-01]`: 保留（P1）。live `tests/e2e/flow-designer-edge-creation.spec.ts` 仍只有 active synthetic `nop-designer:test-connect` 测试，真实 handle 拖拽测试仍为 `test.skip`。
- `[维度14-02]`: 保留（P2）。live `basic-page-layout-structure.test.tsx` 为 693 行，仍混合 page/statusPath/tabs/classAliases/icon marker 等多类契约。
- `[维度14-03]`: 保留（P2）。live `packages/ui/src/components/ui` 中 `accordion/table/radio-group/textarea/sheet/dropdown-menu` 等仍无对应 `*.test.tsx`，public-entry 仍只做代表性导出检查。
- `[维度14-04]`: 保留（P2）。live Word Editor E2E 的文本输入/恢复核心证明仍读取 `window.__NOP_WORD_EDITOR_PROBE__` 与 `localStorage`，缺少 marker 的用户可见内容断言。
- `[维度14-05]`: 保留（P2）。live CRUD E2E 虽有 rows/footer 断言，但 `keyword/pagedRecords/refreshCount` 等关键 owner/query 语义仍依赖 `[data-slot="scope-debug-json"]`。
- `[维度14-06]`: 保留（P2）。live `data-tree-and-chart.test.tsx` 为 671 行，仍在同一 describe 中覆盖 tree、chart、table repeated instancePath、键盘交互和大树 deferred render。
- `[维度14-07]`: 保留（P2）。live `code-editor.integration.test.tsx` 的 `afterEach` 仍只 `cleanup()`，多处 `console.error` spy 仍在成功路径末尾 `mockRestore()`。
- `[维度14-08]`: 保留（P2）。live `playwright.config.ts` 默认收录 `tests/e2e`，且诊断 spec 仍 active：Flow Designer 写截图/HTML dump，CRUD diagnostic 输出 DOM/console dump，debugger diagnostic 走内部 debugger API。
- `[维度14-09]`: 保留（P2）。live `basic-structural.test.tsx` 仍无统一 `afterEach`，多数测试手动尾部 `cleanup()`，且 line 320 附近 `console.error` spy 仍只在成功路径恢复。
- `[维度14-10]`: 降级（P3）。live `schema-renderer.test.tsx` 的 `createRendererRuntime` spy 已有 `try/finally` 恢复，核心 factory 跨测试污染风险低于原描述；但文件仍无统一 `afterEach`，`console.warn` spy 仍成功路径恢复。

## 子项复核建议

无。

## 子项复核结论

- `[维度14-01]`: 子项复核通过（P1）。live E2E 仍只有 active synthetic `nop-designer:test-connect` proof，真实 handle 拖拽创建连线测试仍为 `test.skip`。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                                   | 摘要                                                                                          |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 维度14-01 | P1       | `tests/e2e/flow-designer-edge-creation.spec.ts`                                                                                            | Flow Designer 连线创建 active E2E 仍只有 synthetic event proof，真实拖拽测试仍 skip。         |
| 维度14-02 | P2       | `packages/flux-renderers-basic/src/__tests__/basic-page-layout-structure.test.tsx`                                                         | basic page/layout 测试文件仍混合多类独立契约。                                                |
| 维度14-03 | P2       | `packages/ui/src/components/ui`                                                                                                            | 多个高复用 UI primitive 仍缺少自身行为/ARIA/data-slot 测试。                                  |
| 维度14-04 | P2       | `tests/e2e/word-editor.spec.ts`; `tests/e2e/word-editor-persistence.spec.ts`                                                               | Word Editor E2E 核心证明仍依赖 probe/localStorage，缺少用户可见内容断言。                     |
| 维度14-05 | P2       | `tests/e2e/component-lab/crud-test-utils.ts`; `tests/e2e/component-lab/crud-query-and-ownership.spec.ts`                                   | CRUD E2E 关键 owner/query 语义仍依赖 `scope-debug-json`。                                     |
| 维度14-06 | P2       | `packages/flux-renderers-data/src/__tests__/data-tree-and-chart.test.tsx`                                                                  | `data-tree-and-chart.test.tsx` 仍混合 tree、chart、table instancePath、键盘与大树边界。       |
| 维度14-07 | P2       | `packages/flux-code-editor/src/code-editor.integration.test.tsx`                                                                           | 多处 `console.error` spy 仍只在成功路径恢复，文件级 afterEach 未兜底 restore。                |
| 维度14-08 | P2       | `tests/e2e/flow-designer-ui.spec.ts`; `tests/e2e/component-lab/crud-table-body-diag.spec.ts`; `tests/e2e/debugger-meta-diagnostic.spec.ts` | 多个诊断型 E2E spec 仍默认 active，混入截图/DOM dump/内部 API 探测。                          |
| 维度14-09 | P2       | `packages/flux-renderers-basic/src/__tests__/basic-structural.test.tsx`                                                                    | `basic-structural.test.tsx` 仍无统一 afterEach，cleanup 与 console spy restore 依赖成功路径。 |
| 维度14-10 | P3       | `packages/flux-react/src/__tests__/schema-renderer.test.tsx`                                                                               | 核心 factory spy 风险已降低，但文件仍无统一 afterEach，`console.warn` spy 仍成功路径恢复。    |
