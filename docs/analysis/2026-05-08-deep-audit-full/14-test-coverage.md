# 14 Test Coverage

- 深挖轮次: 1
- 深挖发现数: 6

## 第 1 轮初审

### [维度14-01] `use-table-controls.test.tsx` 同时覆盖 5 个控制器，已超过 >700 测试硬阈值

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\__tests__\use-table-controls.test.tsx:1-778`
- **行号范围**: `1-778`
- **证据片段**:
  ```tsx
  import {
    useTableExpand,
    useTableFilter,
    useTablePagination,
    useTableSelection,
    useTableSort,
  } from '../table-renderer/use-table-controls.js';
  ```
- **严重程度**: P0
- **类别**: 跨域 / setup膨胀 / 测试结构
- **现状**: 当前命令基线显示该文件 779 行，超过 `>700 MUST split` 硬阈值；文件一次性覆盖 pagination、selection、sort、filter、expand 五类 table controller。
- **风险**: `pnpm check:oversized-code-files` 当前失败，测试门禁被阻断；单文件聚合多个控制器会让新增 table 行为时继续向同一热点堆积，回归定位和局部运行成本上升。
- **建议**: 按 hook owner 拆成 `use-table-pagination.test.tsx`、`use-table-selection.test.tsx`、`use-table-sort.test.tsx`、`use-table-filter.test.tsx`、`use-table-expand.test.tsx`，公共 probe/helper 提取到同目录 test support。
- **为什么值得现在做**: 这是当前 check 失败项，不是单纯“超过 500 行需评估”的观察项；拆分后可恢复硬门禁，并降低 table 行为后续改动冲突面。
- **误报排除**: calibration pattern “Large File Pressure Without Boundary Drift” 对文件大小噪声要求降级，但本项跨过 `>700` 硬规则且当前命令基线失败，已满足保留条件。
- **历史模式对应**: 超大测试聚合文件二次膨胀；类似此前 `data-crud-state-interactions.test.tsx` 按 CRUD 子领域拆分的模式。
- **参考文档**: `AGENTS.md:151-158`, `docs/skills/deep-audit-prompts.md:1449-1458`, `docs/references/deep-audit-calibration-patterns.md:38-44`
- **复核状态**: 未复核

### [维度14-02] `form-submit-actions.test.tsx` 把表单 submit、init、surface scope 行为压在一个 >700 文件中

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\__tests__\form-submit-actions.test.tsx:1-750`
- **行号范围**: `19-24`, `650-681`
- **证据片段**:

  ```tsx
  describe('formRendererDefinitions - submit and init actions', () => {
    afterEach(() => {
      formTestHarness.reset();
    });

    it('runs form-owned submitAction and follow-up branches through component:submit', async () => {
  ```

- **严重程度**: P0
- **类别**: 跨域 / setup膨胀 / 测试结构
- **现状**: 当前命令基线显示该文件 751 行，超过 `>700 MUST split`；同一 describe 同时承载 submitAction、init action、validation-blocked submit、surface/built-in submit scope 行为。
- **风险**: 表单 submit owner、surface parent write scope、validation 分支属于不同回归轴，继续聚合会让失败定位困难，并持续阻断 oversized check。
- **建议**: 按行为轴拆分为 submit success/error、validation blocked submit、init actions、surface/built-in submit scope 边界等文件；保留 `form-test-support.tsx` 作为共享 harness。
- **为什么值得现在做**: 当前 check 已失败，且 form submit 是核心低代码数据写入路径；拆分能同时恢复门禁和降低关键路径回归修复成本。
- **误报排除**: 不是仅凭 500 行观察项；它超过 700 行硬阈值，并混合多个 owner 行为轴。
- **历史模式对应**: 表单/验证测试跨域聚合导致难以定位，属于既有“按 owner 行为拆 test slice”的收敛模式。
- **参考文档**: `AGENTS.md:172-175`, `docs/skills/deep-audit-prompts.md:1453-1458`, `docs/references/deep-audit-calibration-patterns.md:38-44`
- **复核状态**: 未复核

### [维度14-03] `schema-compiler-diagnostics.test.ts` 将 diagnostics、namespace、host action 校验聚合为 >700 编译器测试热点

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\schema-compiler-diagnostics.test.ts:1-725`
- **行号范围**: `4-13`
- **证据片段**:
  ```ts
  import {
    createBaseCompileSymbolTable,
    createHostActionValidationContext,
    createSchemaCompiler,
    createSchemaCompilerDiagnosticsContext,
    isInsideCapableRegion,
    parseNamespacedAction,
    validateHostAction,
    validateSchema,
  } from './index.js';
  ```
- **严重程度**: P0
- **类别**: 跨域 / 测试结构
- **现状**: 当前命令基线显示该文件 726 行，超过 `>700 MUST split`；同一文件覆盖 schema diagnostics、symbol table、host action validation、namespace validation 等多个 compiler 子域。
- **风险**: 编译器诊断和 host capability 校验是 schema 导入前的关键防线，聚合文件会让新增诊断规则继续堆叠，且当前已阻断 oversized check。
- **建议**: 按 diagnostics 基础策略、namespace/xui:actions、host action validation、continueOnError unknown renderer 等维度拆分，保留 renderer fixtures/helper。
- **为什么值得现在做**: 编译器校验是核心安全/契约入口，且当前硬门禁失败；拆分能恢复 CI 基线并降低规则新增时的冲突率。
- **误报排除**: 不是“编译器测试本来就复杂”的合理例外；超过 700 行硬阈值，且 import 面显示多个不同校验 owner 聚合。
- **历史模式对应**: compiler package 规则测试聚合膨胀，适合按 validation/diagnostics owner 拆分。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1449-1458`, `AGENTS.md:151-158`, `docs/references/deep-audit-calibration-patterns.md:38-44`
- **复核状态**: 未复核

### [维度14-04] `runtime-dialogs-scope.test.ts` 把 dialog/drawer/surface teardown scope 行为聚合为 >700 runtime 测试

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\__tests__\runtime-dialogs-scope.test.ts:1-717`
- **行号范围**: `641-674`
- **证据片段**:
  ```ts
  it('applies drawer data as the child-scope init patch', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
  ```
- **严重程度**: P0
- **类别**: 跨域 / 测试结构
- **现状**: 当前命令基线显示该文件 718 行，超过 `>700 MUST split`；文件名以 dialogs 为中心，但内容已覆盖 drawer data、surface disposal、scope inheritance/status publication 等 runtime surface 行为。
- **风险**: runtime surface/scope 是高频回归区域，聚合测试会让 dialog、drawer、teardown、statusPath 行为互相干扰，并且当前阻断 oversized check。
- **建议**: 拆分为 dialog open/close、drawer scope/data、surface statusPath/teardown、scope inheritance/publication 等文件，共享 runtime fixture。
- **为什么值得现在做**: 当前 check 已失败；拆分后可恢复硬门禁，并避免 surface owner 后续修复继续塞入同一文件。
- **误报排除**: 虽然 runtime surface 行为有关联，但该文件已超过硬阈值，且 drawer/teardown 行为说明不再是单一 dialog owner 测试。
- **历史模式对应**: surface/runtime 测试跨 owner 聚合膨胀；应按 surface kind 与 lifecycle 阶段拆分。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1453-1458`, `AGENTS.md:151-158`, `docs/references/deep-audit-calibration-patterns.md:38-44`
- **复核状态**: 未复核

### [维度14-05] `debug-collapsible*.spec.ts` 调试型 E2E 被纳入默认 e2e gate，部分测试没有产品断言

- **文件**: `C:\can\nop\nop-chaos-flux\tests\e2e\debug-collapsible.spec.ts:10-49`
- **行号范围**: `10-28`, `30-49`
- **证据片段**:

  ```ts
  test('debug collapsible state', async ({ page }) => {
    await openFlowDesigner(page);

    // Check what the collapse button click does
    const collapseButton = page.locator('[data-testid="collapse-palette"]');
    await expect(collapseButton).toBeVisible();

    // Check React state before click
  ```

- **严重程度**: P2
- **类别**: E2E真实行为覆盖 / 可读性 / 隔离性
- **现状**: `debug-collapsible.spec.ts` 的测试主体只采集状态并 `console.log`，点击后没有断言 collapse 结果；同目录还存在 `debug-collapsible2.spec.ts`、`debug-collapsible3.spec.ts` 这类调试命名 spec，会被 `playwright.config.ts` 的 `testDir: './tests/e2e'` 默认纳入 e2e。
- **风险**: CI e2e 会花时间运行诊断脚本，但它们对真实产品行为的保护弱；失败输出也更像调试日志而不是用户行为契约，容易制造噪声或虚假信心。
- **建议**: 将仍有价值的调试逻辑改造成一个明确的行为测试（例如 collapse 后断言 collapsed panel 可见、expanded panel 消失），其余调试探针移出默认 spec 命名或合并到 focused diagnostic helper。
- **为什么值得现在做**: plan 225 已把 `pnpm test:e2e` 纳入 CI，默认 e2e 集合的信噪比现在直接影响门禁质量。
- **误报排除**: 这不是“不要用截图诊断”的问题，也不是已由 plan 225 收口的 trace/CI gate；live residual 是默认运行集中仍存在无产品断言的 debug spec。
- **历史模式对应**: 调试探针沉淀为默认测试导致 e2e gate 噪声上升。
- **参考文档**: `AGENTS.md:27-33`, `docs/skills/deep-audit-prompts.md:1466-1471`, `playwright.config.ts:46-58`
- **复核状态**: 未复核

### [维度14-06] Table Component Lab 的 E2E 仍停留在 read 检查，未覆盖排序/过滤等真实交互

- **文件**: `C:\can\nop\nop-chaos-flux\tests\e2e\component-lab\data-renderers.spec.ts:13-28`; `C:\can\nop\nop-chaos-flux\apps\playground\src\component-lab\renderers\table-lab-page.tsx:95-118`
- **行号范围**: `tests/e2e/component-lab/data-renderers.spec.ts:13-28`
- **证据片段**:

  ```ts
  test('read: table column headers render', async ({ page }) => {
    const lab = new ComponentLabHelper(page);
    await lab.openRenderer('table');

    const slug = scenarioSlug('Table with sortable text columns');
    const stage = lab.scenarioStage(slug);
    await expect(stage).toBeVisible();
    // Use getByRole to avoid strict-mode violation (text also appears in scope debug JSON)
  ```

- **严重程度**: P2
- **类别**: 覆盖缺口 / E2E真实行为覆盖
- **现状**: Table lab 页面描述包含 “sorting, pagination, selection, and empty-state handling”，且有 “Header search and filter controls” 场景；但现有 E2E 对 table 只验证列头、单元格和 empty 文案可见，没有点击 sortable header、打开 filter/search 菜单或验证行顺序/过滤结果。
- **风险**: table 的真实浏览器交互可能在 DOM、popover、事件绑定或可访问名称层面回归，而 unit/hook 测试无法覆盖完整用户路径。
- **建议**: 在 `data-renderers.spec.ts` 增加至少两个行为用例：点击 Username/ID 排序并断言行顺序变化；打开 Role filter 或 search 控件并断言 visible rows 收缩/恢复。
- **为什么值得现在做**: table 是数据渲染核心组件，且当前已有 Component Lab 场景和 helper；补行为断言成本低、收益高。
- **误报排除**: 不重复报告 plan 225 已关闭的 `flux-renderers-data` discovery-based test script；这里是 live E2E 行为覆盖缺口，不是测试发现机制问题。
- **历史模式对应**: Component Lab smoke/read 覆盖替代真实用户交互覆盖的缺口。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1466-1469`, `AGENTS.md:27-33`
- **复核状态**: 未复核

## 测试覆盖统计摘要

- 包总数: 24。
- 零测试包: 0。
- 当前统计到的测试文件数: 460。
- 当前统计到的测试代码行数: 102185。
- 超过 400 行的测试文件: 75。
- 超过 700 行且当前 `pnpm check:oversized-code-files` 失败的测试文件: 4。
- E2E spec 文件数: 32。
- 已应用 2026-05-08 live changes 排除项: 未重报 basic-page-layout aggregator split、`flux-renderers-data` discovery-based test script、CI `test:e2e`、Playwright trace、word-editor dataset reload proof 等 plan 225 已收口项。

## 覆盖缺口清单

- Table Component Lab 缺排序、filter/search 等真实浏览器行为断言。
- 默认 e2e 集合仍包含调试型 collapsible specs，部分仅记录状态而不验证产品结果。
- 4 个 >700 测试文件需要拆分，否则 workspace oversized check 保持失败。
- 75 个 >400 测试文件中，除 4 个硬失败外，后续可优先巡检大型 state-machine 测试。

## 优先级建议

1. 先拆 4 个 >700 测试文件，恢复 `pnpm check:oversized-code-files`。
2. 清理或改造 `debug-collapsible*.spec.ts`，保证默认 e2e gate 只包含有产品断言的测试。
3. 为 table Component Lab 增加排序、搜索/过滤行为 E2E。
4. 后续按 >400 清单做低优先级渐进拆分，避免再次越过 700 硬阈值。

## 深挖第 2 轮追加

### [维度14-07] `flow-designer-css-diag.spec.ts` 仍有默认运行的诊断型 E2E 用例没有产品断言

- **文件**: `C:\can\nop\nop-chaos-flux\tests\e2e\flow-designer-css-diag.spec.ts`
- **行号范围**: `93-149`, `289-324`
- **证据片段**:
  ```ts
  const missing = Object.entries(cssChecks).filter(([, v]) => !v.found);
  if (missing.length > 0) {
    console.log(`\n!! ${missing.length} classes not generated by Tailwind:`);
    for (const [cls] of missing) {
      console.log(`  - .${cls}`);
    }
  }
  });
  ```
- **严重程度**: P2
- **类别**: E2E真实行为覆盖 / 可读性 / 默认集合质量
- **现状**: 除已覆盖的 `debug-collapsible*.spec.ts` 外，默认 `tests/e2e` 集合中仍存在诊断型 spec。`checks Tailwind CSS generation for layout classes` 只收集并打印 missing classes，没有断言；同文件 `dumps full DOM hierarchy from body to ReactFlow for debugging` 也只 dump DOM hierarchy。
- **风险**: 默认 E2E gate 会运行没有产品断言的诊断探针，增加运行时间与日志噪声，却不能对 Tailwind 生成或 Flow Designer 布局形成有效回归保护；失败时也更像排障脚本而非可维护的行为契约。
- **建议**: 将有价值的诊断转为明确断言，例如 `expect(missing).toHaveLength(0)`；纯 dump 用例移出默认 `.spec.ts` 命名或改为手动 diagnostic helper。
- **为什么值得现在做**: 维度 14 第 1 轮已发现默认 E2E 中存在调试 spec；继续清理同类残留能提升 `pnpm test:e2e` 作为 CI gate 的信噪比，避免只修 collapsible 后留下同类盲区。
- **误报排除**: 这不是重复报告 `debug-collapsible*.spec.ts`；本项位于不同文件，并且有独立的 assertionless 测试路径。文件中其他测试有断言不抵消这两个诊断用例缺少产品断言的问题。
- **历史模式对应**: 调试探针沉淀进默认 E2E gate，导致默认测试集合噪声高于行为保护价值。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1466-1471`, `AGENTS.md` Test Execution Strategy, `playwright.config.ts:46-58`
- **复核状态**: 未复核

### [维度14-08] `flux-action-core` fake timer 测试依赖末尾手动恢复，失败路径会污染同文件后续测试

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-action-core\src\__tests__\operation-control.test.ts`
- **行号范围**: `23-39`, `53-70`, `80-100`
- **证据片段**:
  ```ts
  it('resolves with onTimeout result when function takes too long', async () => {
    vi.useFakeTimers();
    const promise = withTimeout(
      async (_signal) => {
        await new Promise(() => {});
        return 'never';
      },
      50,
      () => 'timed-out',
  ```
- **严重程度**: P2
- **类别**: 隔离性 / mock清理
- **现状**: 该文件多个测试调用 `vi.useFakeTimers()`，但没有文件级 `afterEach(() => vi.useRealTimers())`，也没有像部分 runtime 测试那样使用 `try/finally` 包裹恢复；恢复依赖测试末尾的 `vi.useRealTimers()`。
- **风险**: 一旦 fake timer 测试在中途断言、promise 或 timer advancement 失败，后续同文件测试会继续运行在 fake timers 下，形成级联失败或假阳性/假阴性，尤其 `withTimeout` / retry 行为本身就是时间敏感核心逻辑。
- **建议**: 在该文件添加统一 `afterEach(() => vi.useRealTimers())`，或将每个 fake timer 用例包进 `try/finally`；同时可配合 `vi.clearAllTimers()` 保证挂起 timer 不泄漏。
- **为什么值得现在做**: 这是测试隔离性问题，不是覆盖数量问题；修复成本很低，但能提升异步/超时核心测试失败时的定位可靠性。
- **误报排除**: 仓库中已有更稳妥模式，例如部分 runtime 测试使用 `afterEach` 或 `try/finally` 恢复 fake timers；本文件缺少这类兜底，因此不是 Vitest 默认隔离可完全覆盖的情况。
- **历史模式对应**: 时间控制类测试缺少统一清理，导致后续测试受前序失败污染。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1458-1461`, `AGENTS.md` State Management and Testing
- **复核状态**: 未复核

### [维度14-09] SQL editor 执行路径只有 loading/error smoke，缺少成功结果与参数映射断言

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer\use-sql-editor-state.ts`; `C:\can\nop\nop-chaos-flux\tests\e2e\code-editor.spec.ts`
- **行号范围**: `use-sql-editor-state.ts:161-188`; `code-editor.spec.ts:240-255`
- **证据片段**:

  ```ts
  const loadingOrError =
    (await resultContainer.locator('text=执行中...').isVisible({ timeout: 3000 })) ||
    (await resultContainer.locator('text=错误').isVisible({ timeout: 10000 }));

  expect(loadingOrError).toBe(true);
  ```

- **严重程度**: P2
- **类别**: 覆盖缺口 / E2E真实行为覆盖
- **现状**: `useSQLEditorState` 承担 SQL 执行、`executeAction` 合成、scope 参数读取、`resultPath` 映射和 success/error 状态转换；现有 E2E 只接受 loading 或 error 任一状态为通过，没有断言成功结果表格、dispatch action payload、`resultPath` 映射或参数注入。包内 `sql-result-panel.test.tsx` 只覆盖已给定 `SQLResultState` 的渲染，不覆盖执行状态机。
- **风险**: SQL 执行按钮可能仍可见且出现错误面板，但真实执行 payload、参数映射或成功结果转换已经回归，当前测试仍可能通过；这会削弱 code-editor 作为低代码 SQL 工作流入口的回归保护。
- **建议**: 增加 unit/hook-level 测试覆盖 `executeAction` 合成、默认 ajax payload、`params` scope 映射、`resultPath` 数组结果和标量结果；E2E 中至少 mock/使用可成功返回的执行路径并断言结果表头与行数据。
- **为什么值得现在做**: Code Editor 已有 E2E 页面和 panel 单测，补齐执行状态机断言成本低；当前测试“error 也算通过”会给关键交互制造虚假信心。
- **误报排除**: 这不是要求所有内部 helper 都必须单测；这里的未覆盖路径是用户可点击的 SQL 执行主流程，且现有 E2E 明确只做 loading/error smoke，未验证成功契约。
- **历史模式对应**: Component/E2E smoke/read 检查替代真实用户行为断言的覆盖缺口。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1450-1452`, `docs/skills/deep-audit-prompts.md:1466-1469`, `AGENTS.md` Bug Fix Test Coverage Rule
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度14-10] `operation-control-timeout-retry.test.ts` fake timer 仍依赖用例末尾恢复，失败路径会污染后续 retry/abort 测试

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-action-core\src\__tests__\operation-control-timeout-retry.test.ts:1-7`, `25-31`, `129-153`
- **行号范围**: `1-7`, `25-31`, `129-153`
- **证据片段**:

  ```ts
  import { describe, expect, it, vi } from 'vitest';
  import { withTimeout, withRetry, createAbortScope } from '../operation-control.js';

  describe('withTimeout edge cases', () => {
    it('ignores second resolve after timeout', async () => {
      vi.useFakeTimers();
  ```

- **严重程度**: P2
- **类别**: 隔离性 / mock清理
- **现状**: 该文件多个用例调用 `vi.useFakeTimers()`，但文件级只从 `vitest` 导入 `describe/expect/it/vi`，没有 `afterEach(() => vi.useRealTimers())` 兜底；恢复依赖用例尾部的 `vi.useRealTimers()`。
- **风险**: 如果 `withTimeout` 或 `withRetry` 的断言、Promise reject、`advanceTimersByTimeAsync` 中途失败，后续 retry metadata、abort scope 用例会继续运行在 fake timers 下，导致级联失败或错误定位。
- **建议**: 与 `debounce.test.ts` 一样加文件级 `afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); })`，或为每个 fake timer 用例使用 `try/finally`。
- **为什么值得现在做**: `withTimeout` / `withRetry` 是 action 控制流核心，timer 污染会让同一文件后续 async 控制测试产生连锁假失败。
- **误报排除**: 这不是重复报告已覆盖的 `operation-control.test.ts`；本项位于另一个同包测试文件，且同样缺少统一 timer cleanup。
- **历史模式对应**: 时间控制类测试缺少统一清理，导致后续测试受前序失败污染。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1458-1461`, `AGENTS.md` State Management and Testing
- **复核状态**: 未复核

### [维度14-11] Code Editor E2E 默认集合包含纯截图用例，没有任何产品断言

- **文件**: `C:\can\nop\nop-chaos-flux\tests\e2e\code-editor.spec.ts:325-331`
- **行号范围**: `325-331`
- **证据片段**:

  ```ts
  test('captures code editor page screenshot', async ({ page }, testInfo) => {
    await openCodeEditor(page);

    const shotsDir = join(testInfo.outputDir, 'screenshots');
    await mkdir(shotsDir, { recursive: true });
    await page.screenshot({ path: join(shotsDir, 'code-editor-page.png'), fullPage: true });
  });
  ```

- **严重程度**: P2
- **类别**: E2E assertion quality / 默认集合质量
- **现状**: `code-editor.spec.ts` 属于默认 `tests/e2e` spec 集合，但末尾测试只打开页面并截图，没有 `expect` 断言，也没有对 screenshot 做 snapshot/visual comparison。
- **风险**: 默认 e2e gate 会运行一个无行为保护的 artifact 生成脚本；页面只要能打开就通过，实际 Code Editor UI 回归不会被该用例捕获，还会增加 CI 输出噪声。
- **建议**: 若需要截图资产，改为 skipped/manual helper；若保留在默认 e2e，应增加明确产品断言或视觉 snapshot 断言。
- **为什么值得现在做**: 默认 E2E 集合已经是 CI gate；清理无断言截图用例能提升测试信噪比并减少无保护耗时。
- **误报排除**: 已有 `readme-flux-basic-screenshot.spec.ts` 使用 `test.describe.skip` 明确排除手工截图；本项未 skip，属于 live 默认 gate residual，不重复已有 debug-collapsible / flow-designer-css-diag 发现。
- **历史模式对应**: 调试/资产生成脚本沉淀进默认 E2E gate。
- **参考文档**: `AGENTS.md` Test Execution Strategy, `docs/skills/deep-audit-prompts.md:1466-1471`
- **复核状态**: 未复核

### [维度14-12] `flow-designer-label-text.spec.ts` 保留诊断 dump 用例，只断言存在节点文本而不验证文本契约

- **文件**: `C:\can\nop\nop-chaos-flux\tests\e2e\flow-designer-label-text.spec.ts:29-48`
- **行号范围**: `29-48`
- **证据片段**:

  ```ts
  test.describe('Flow designer node and edge text rendering', () => {
    test('diagnoses node and edge rendering by dumping actual DOM', async ({
      page,
    }) => {
      await openFlowDesigner(page);

      const startNodeTexts = await page.evaluate(() => {
  ```

- **严重程度**: P3
- **类别**: E2E assertion quality / 可读性
- **现状**: 该用例命名为 `diagnoses...dumping actual DOM`，主体 `console.log` dump `.nop-text` 列表，最终只断言 `startNodeTexts.length > 0`，没有验证具体 title/subtitle/edge label 契约。
- **风险**: Flow Designer 文本解析可能退化为错误文本、空白附近的无意义节点、或 class 结构变化，该诊断用例仍可能通过；默认 e2e 输出也会混入调试日志。
- **建议**: 删除该诊断用例，或改造成明确行为断言，例如直接断言 start/task/condition 节点 title 与 subtitle 的预期文本。
- **为什么值得现在做**: 同文件已有更具体断言，清理这个诊断用例可以降低噪声而不牺牲有效覆盖。
- **误报排除**: 同文件后续已有更明确的 task/condition/edge 文本断言；本项不是说整个文件无覆盖，而是指出第一个诊断用例在默认 gate 中信噪比低。
- **历史模式对应**: 诊断 dump 用例保留在默认 E2E 中，形成弱断言噪声。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1466-1471`, `AGENTS.md` Test Execution Strategy
- **复核状态**: 未复核

### [维度14-13] Flow Designer minimap E2E 使用固定 `waitForTimeout(300)` 等待 viewport 更新，存在异步 flake 风险

- **文件**: `C:\can\nop\nop-chaos-flux\tests\e2e\flow-designer-minimap-pan.spec.ts:54-68`, `86-99`, `117-125`
- **行号范围**: `54-68`, `86-99`, `117-125`
- **证据片段**:

  ```ts
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const dragTransform = await getViewport();
  ```

- **严重程度**: P2
- **类别**: 隔离性 / E2E assertion quality
- **现状**: minimap drag/click/wheel 三个用例都在交互后固定等待 300ms，再读取 `.react-flow__viewport` transform。
- **风险**: 在慢 CI、ReactFlow animation、浏览器调度抖动下，300ms 可能不足或过长；不足会导致间歇性失败，过长会累积拖慢默认 e2e。
- **建议**: 用 `expect.poll(getViewport)` 或 locator/state 条件等待 transform 发生预期变化，避免固定 sleep。
- **为什么值得现在做**: 这是真实产品交互测试，稳定等待能减少 flake 并提升 CI gate 可信度。
- **误报排除**: 这不是调试 spec；该文件是产品交互测试，问题在于等待策略会削弱测试稳定性。
- **历史模式对应**: E2E 中固定 sleep 替代状态条件等待，导致异步交互 flake。
- **参考文档**: `AGENTS.md` Test Execution Strategy, `docs/skills/deep-audit-prompts.md:1458-1471`
- **复核状态**: 未复核

### [维度14-14] Code Editor scope source resolver hooks 缺少测试，现有测试只覆盖静态类型解析而未覆盖 runtime scope 读取

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\source-resolvers.ts:59-93`; `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\types.test.ts:93-108`
- **行号范围**: `source-resolvers.ts:59-93`, `types.test.ts:93-108`
- **证据片段**:

  ```ts
  export function useResolvedTables(
    config: SQLEditorConfig | undefined,
    scope: ScopeRef,
  ): TableSchema[] {
    const raw = config?.tables;

    return useMemo<TableSchema[]>(() => {
      if (!raw) return [];
      if (!isSQLSchemaSourceRef(raw)) return raw;
  ```

- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: `source-resolvers.ts` 中 `useResolvedVariables`、`useResolvedTables`、`useResolvedSQLVariables` 负责从 `ScopeRef` 的 `get/readVisible` 读取变量、表结构和 SQL variable panel 数据；现有 `types.test.ts` 对 source ref 的断言是“静态 resolver 返回空”，没有覆盖这些 hook 的 runtime scope 读取、`scopePath + path/dataPath` 组合、非数组 fallback。
- **风险**: Code Editor 的变量面板、SQL schema completion、SQL variable panel 可能在 scope 数据路径变更时失效，但现有测试只会证明 authoring source ref 在静态 resolver 中返回空，无法捕获真实 runtime 解析回归。
- **建议**: 为 `source-resolvers.ts` 增加 hook/unit 测试：mock `ScopeRef.get/readVisible`，覆盖 inline config、`source: 'scope'`、`scopePath`、`path/dataPath`、非数组返回值与 config 更新。
- **为什么值得现在做**: Code Editor 的 completion/variable 面板依赖这些 resolver，补测试能覆盖用户可见但当前未保护的 runtime 配置路径。
- **误报排除**: 这不是重复报告 SQL execute 路径缺少成功断言；本项聚焦 Code Editor 的 scope-driven variable/table source resolver，属于不同 runtime 配置入口。
- **历史模式对应**: 静态类型测试覆盖了 authoring shape，但 runtime scope resolver 真实路径缺少 focused regression。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1450-1452`, `AGENTS.md` Bug Fix Test Coverage Rule
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度14-15] `request-runtime-polling.test.ts` fake timer 依赖用例尾部恢复，失败路径会污染后续 polling/cache 测试

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\__tests__\request-runtime-polling.test.ts:1-91`
- **行号范围**: `1-8`, `42-49`, `88-91`
- **证据片段**:

  ```ts
  import { describe, expect, it, vi } from 'vitest';

  describe('createDataSourceController', () => {
    it('stops polling once stopWhen becomes true', async () => {
      vi.useFakeTimers();
  ```

  ```ts
      await vi.advanceTimersByTimeAsync(50);
      expect(callCount).toBe(2);
      controller.stop();
      vi.useRealTimers();
    });

    it('stops polling and surfaces an error when stopWhen evaluation throws', async () => {
      vi.useFakeTimers();
  ```

- **严重程度**: P2
- **类别**: 隔离性 / mock清理
- **现状**: 该 runtime polling 测试文件使用 `vi.useFakeTimers()`，但文件级没有 `afterEach(() => vi.useRealTimers())` 或 `try/finally`；恢复依赖测试末尾手动调用。
- **风险**: 一旦 polling/stopWhen 断言、timer advancement 或 controller cleanup 中途失败，后续 `aborts the active request`、restart/cache 相关用例会在 fake timers 环境中运行，导致级联失败或错误定位。
- **建议**: 引入文件级 `afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); })`，或将每个 fake timer 用例包裹在 `try/finally` 中。
- **为什么值得现在做**: polling/cache 是 runtime async substrate 测试，timer 污染会直接削弱异步回归定位可靠性。
- **误报排除**: 不是重复报告已覆盖的 `flux-action-core` timer 测试；这是 `flux-runtime` 的独立 polling/cache 测试文件，且当前导入中没有 `afterEach`，恢复确实只在成功路径尾部执行。
- **历史模式对应**: fake timer setup 缺少统一 cleanup，失败后污染同文件后续测试。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1458-1461`, `AGENTS.md` State Management and Testing
- **复核状态**: 未复核

### [维度14-16] `crud-table-body-diag.spec.ts` 诊断型 CRUD E2E 仍在默认集合中运行并使用固定 sleep

- **文件**: `C:\can\nop\nop-chaos-flux\tests\e2e\component-lab\crud-table-body-diag.spec.ts:4-111`
- **行号范围**: `4-23`, `44-49`, `95-110`
- **证据片段**:

  ```ts
  test.describe('crud table body diagnostic', () => {
    test('diagnoses basic CRUD shell table body rendering', async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];
  ```

  ```ts
  await expect(stage).toBeVisible({ timeout: 30_000 });

  await page.waitForTimeout(2000);
  ```

  ```ts
      console.log('=== CRUD TABLE BODY DIAGNOSIS ===');
      console.log(JSON.stringify(diagnosis, null, 2));

      if (consoleErrors.length > 0) {
        console.log('=== CONSOLE MESSAGES ===');
  ```

- **严重程度**: P2
- **类别**: E2E assertion quality / 默认集合质量 / 隔离性
- **现状**: 默认 `tests/e2e` 集合中存在命名为 diagnostic/diagnoses 的 CRUD spec，主体包含两段固定 `waitForTimeout(2000/3000)`、大量 DOM/console dump。虽然末尾有基本断言，但测试主要形态仍是排障探针。
- **风险**: CI E2E 会为诊断 sleep 和日志付出稳定性/耗时成本；若 CRUD table 渲染异步变慢或变快，固定等待既可能 flake，也会拖慢默认 gate。
- **建议**: 将其改名/改写为明确的 CRUD 行为测试，使用 locator 条件等待 `bodyRowCount` 或 `dataRows(stage)` 达到预期；纯诊断 dump 移出默认 `.spec.ts`。
- **为什么值得现在做**: 默认 e2e gate 已纳入 CI，清理诊断 sleep 能提高信噪比和稳定性。
- **误报排除**: 不是重复报告 `debug-collapsible*`、`flow-designer-css-diag` 或 Table lab 排序缺口；这是 Component Lab CRUD 路径下独立的默认诊断 spec。
- **历史模式对应**: diagnostic E2E 沉淀为默认测试，并用固定 sleep 替代条件等待。
- **参考文档**: `AGENTS.md` Test Execution Strategy, `docs/skills/deep-audit-prompts.md:1466-1471`
- **复核状态**: 未复核

### [维度14-17] `node-title-subtitle-gap.spec.ts` 以诊断 dump 和宽泛样式阈值替代稳定文本/布局契约

- **文件**: `C:\can\nop\nop-chaos-flux\tests\e2e\node-title-subtitle-gap.spec.ts:28-156`
- **行号范围**: `28-36`, `138-156`
- **证据片段**:

  ```ts
  test('diagnoses title-subtitle gap by inspecting actual DOM and computed styles', async ({
    page,
  }) => {
    await openFlowDesigner(page);
    await page.locator('[data-testid="rf__node-task-1"]').first().click();

    const diag = await page.evaluate(() => {
  ```

  ```ts
  console.log('=== TITLE-SUBTITLE GAP DIAGNOSTICS ===');
  console.log(JSON.stringify(diag, null, 2));

  expect(diag).not.toHaveProperty('error');

  const d = diag as any;
  ```

  ```ts
  expect(typeof d.gap).toBe('number');
  expect(d.gap).toBeGreaterThanOrEqual(0);

  expect(d.gap).toBeLessThan(48);
  ```

- **严重程度**: P3
- **类别**: E2E assertion quality / 可读性
- **现状**: 该默认 E2E 以 “diagnoses” 命名，输出完整 DOM/computed-style 诊断信息，最终只验证 gap 是非负且小于 48px，没有绑定到明确的产品布局契约或稳定 selector contract。
- **风险**: Flow Designer inspector 的标题/副标题布局可能发生视觉退化但仍小于宽泛阈值；同时默认 E2E 日志会混入诊断 dump，降低失败信噪比。
- **建议**: 改为明确断言标题、副标题元素和语义布局 contract，例如固定 data-slot/role、具体文本、可接受的 spacing token 或 class contract；诊断 dump 仅在失败时输出或移到手动诊断脚本。
- **为什么值得现在做**: 该 spec 位于默认 E2E 集合，弱阈值和诊断输出会持续影响 gate 信噪比。
- **误报排除**: 不重复报告 `flow-designer-label-text.spec.ts` 的 DOM dump 用例；本项是另一个独立 spec，问题聚焦标题-副标题间距测试的弱契约和默认诊断输出。
- **历史模式对应**: 诊断型 E2E 以宽泛阈值代替稳定产品契约。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1466-1471`, `AGENTS.md` Test Execution Strategy
- **复核状态**: 未复核
