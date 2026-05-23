# 维度 14：测试覆盖与质量

## 第 1 轮（初审）

### [维度14-01] Exploratory 交互 E2E 大量依赖“可见才执行”，回归时会真空通过

- **文件**: `tests/e2e/exploratory/interaction-tests.spec.ts`
- **证据片段**:

  ```ts
  const trigger = stage.locator('[data-slot="select-trigger"], button[role="combobox"]').first();
  if (await trigger.isVisible()) {
    await trigger.click();
    await page
      .getByRole('option')
      .first()
      .click()
      .catch(() => {});
  }

  assertZeroErrors(errors);
  await assertDebuggerZeroErrors(page);
  ```

- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 多个用例标题声称 “verify bound value updates / verify writeback”，但主体逻辑是“元素可见才操作”，失败时不会硬断言，只要页面无 error 就会通过。
- **建议**: 把“前置元素存在”改成显式断言；操作后断言最终状态/写回结果；仅保留 smoke 语义的用例应重命名并移到独立 smoke 文件。
- **为什么值得现在做**: 这类测试最容易制造假绿，回归发生时 CI 仍会显示通过，误导性高。
- **误报排除**: 不是因为文件名叫 exploratory 就挑刺；问题是它们处于主 `tests/e2e` 路径里，且测试名承诺了行为校验，但代码没有兑现。
- **历史模式对应**: live test gate 中的直接覆盖失真。
- **参考文档**: `AGENTS.md`, `playwright.config.ts`
- **复核状态**: 未复核

### [维度14-02] 调试/诊断型 Playwright 脚本仍在主套件内执行，且存在无断言用例

- **文件**: `playwright.config.ts`; `tests/e2e/debug-collapsible.spec.ts`; `tests/e2e/debug-collapsible3.spec.ts`
- **证据片段**:

  ```ts
  export default defineConfig({
    testDir: './tests/e2e',
    ...
  });

  test('debug snapshot via React fiber tree', async ({ page }) => {
    ...
    console.log('PROPS BEFORE:', ...);
  });
  ```

- **严重程度**: P2
- **类别**: 一致性
- **现状**: 主 E2E 目录直接包含 `debug-*` 诊断脚本；其中至少两个用例只有日志输出，没有有效行为断言。
- **建议**: 将诊断脚本移出 `tests/e2e` 主路径，或统一 `skip` / 单独 project；只保留稳定、可重复、面向契约的断言型 E2E。
- **为什么值得现在做**: 它们会污染 CI 信号、增加运行时间，并把“调试采样”伪装成“回归保护”。
- **误报排除**: 不是反对保留诊断脚本；问题是这些脚本当前就是受支持主套件的一部分。
- **历史模式对应**: 无。
- **参考文档**: `AGENTS.md`, `playwright.config.ts`
- **复核状态**: 未复核

### [维度14-03] 多个渲染器包默认用 node 环境跑测试，再靠文件头 pragma 和重复 shim 补救，测试入口不统一

- **文件**: `packages/flow-designer-renderers/vitest.config.ts`; `packages/flow-designer-renderers/src/designer-page.tree.test.tsx`; `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`
- **证据片段**:

  ```ts
  export default createSharedVitestConfig({
    environment: 'node',
  });

  // @vitest-environment happy-dom
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ```

- **严重程度**: P2
- **类别**: setup膨胀
- **现状**: `flow-designer-renderers` 包级默认是 `node`，但该包内大量 `.test.tsx` 通过 `@vitest-environment happy-dom` 覆盖；同类 `ResizeObserver` shim 也在多个文件重复出现。
- **建议**: 以包职责为单位统一环境；把 `ResizeObserver`/cleanup 放入共享 `setupFiles`。
- **为什么值得现在做**: 现在新增测试时很容易忘记 pragma 或 shim，造成偶发失败和重复样板；这已经是当前维护成本。
- **误报排除**: 不是机械要求“全仓统一一个环境”；只有在同一包内已出现大量 per-file 覆盖和重复全局补丁时，这才构成现实问题。
- **历史模式对应**: 一致性想法已越过门槛，因为它已经直接造成入口分裂与 setup 重复。
- **参考文档**: `AGENTS.md`, `vitest.shared.ts`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度14-04] `async-data-contracts.test.ts` 已变成跨模块 omnibus test，且与专门单测重复

- **文件**: `packages/flux-runtime/src/__tests__/async-data-contracts.test.ts`; `packages/flux-runtime/src/async-data/api-cache.test.ts`
- **证据片段**:
  ```ts
  import {
    generateCacheKey,
    createApiCacheStore,
    stableStringify,
    resolveCacheKey,
  } from '../async-data/api-cache.js';
  import {
    createApiRequestExecutor,
    executeApiSchema,
    buildUrlWithParams,
    finalizeApiRequest,
  } from '../async-data/request-runtime.js';
  ```
- **严重程度**: P2
- **类别**: 可读性
- **现状**: 一个 755 行测试文件同时覆盖 cache、stringify、URL 组装、request executor、polling、runtime registration；其中 cache 语义又已有独立 `api-cache.test.ts`。
- **建议**: 按模块/层次拆分：`api-cache`、`request-runtime`、`source-observer/runtime integration`；保留 1 个薄的跨模块集成回归文件。
- **为什么值得现在做**: 当前文件排查失败成本高，fake timers 与异步状态也更容易相互污染；重复覆盖还会稀释真正的契约边界。
- **误报排除**: 不是只因“文件大”；这里同时满足“大文件 + 混合职责 + 与专门测试重复”的保留条件。
- **历史模式对应**: 对应 Pattern 1，且满足保留条件。
- **参考文档**: `AGENTS.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度14-05] `@nop-chaos/ui` 公共导出面明显大于测试与覆盖门槛，公共组件回归保护不足

- **文件**: `packages/ui/src/index.ts`; `packages/ui/src/public-entry-contract.test.ts`; `packages/ui/vitest.config.ts`
- **证据片段**:
  ```ts
  export * from './components/ui/accordion.js';
  export * from './components/ui/alert-dialog.js';
  export * from './components/ui/collapsible.js';
  export * from './components/ui/drawer.js';
  export * from './components/ui/radio-group.js';
  export * from './components/ui/table.js';
  ```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: `@nop-chaos/ui` 导出大量公共组件，但契约测试只抽查极少数代表项，且该包没有 coverage threshold。
- **建议**: 先给 `ui` 包补 coverage gate；随后优先补足共享交互原语的契约测试。
- **为什么值得现在做**: 这是上游共享包，任何漏测回归都会向多个 renderer/app 放大传播。
- **误报排除**: 不是要求每个原子组件都做重型测试；问题在于“公共导出很多 + 抽样契约很薄 + 包级无 coverage gate”三者同时成立。
- **历史模式对应**: 已影响当前 shared tooling gate，不再只是“跨包想法”。
- **参考文档**: `AGENTS.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度14-06] `subagent-a-independent-review.spec.ts` 是主路径里的 exploratory omnibus test，并大量靠条件分支与吞错制造假绿

- **文件**: `tests/e2e/exploratory/subagent-a-independent-review.spec.ts`
- **证据片段**:
  ```ts
  if (await addTaskButton.isVisible().catch(() => false)) {
    await addTaskButton.click();
    ...
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
    }
  }
  ```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 542 行文件把 debugger API、跨页导航、Flow Designer、表单、Report Designer、Word Editor 等多域检查塞进一个 exploratory 套件里，且关键操作大量依赖 `if visible`、`.catch(() => {})`。
- **建议**: 按域拆成稳定契约型 E2E；把 exploratory/诊断压力脚本移出主 `tests/e2e` gate；把“元素存在/动作成功”改成硬断言。
- **为什么值得现在做**: 多域 omnibus exploratory 文件最容易把真实回归稀释成假绿，且失败定位成本极高。
- **误报排除**: 不是因为文件大就报；这里同时满足大文件、多域混装、主路径执行、条件跳过关键动作。
- **历史模式对应**: 大文件 + 主路径假绿问题
- **参考文档**: `AGENTS.md`, `docs/references/deep-audit-calibration-patterns.md`, `playwright.config.ts`
- **复核状态**: 未复核

### [维度14-07] `report-designer-renderers` / `spreadsheet-renderers` 也在重复“包级 node，文件级 happy-dom 覆盖”的环境分裂模式

- **文件**: `packages/report-designer-renderers/vitest.config.ts`; `packages/report-designer-renderers/src/page-renderer-selector.test.tsx`; `packages/spreadsheet-renderers/vitest.config.ts`; `packages/spreadsheet-renderers/src/page-renderer-selector.test.tsx`
- **证据片段**:
  ```ts
  export default createSharedVitestConfig({
    environment: 'node',
    coverage: {
      ...
    },
  });
  ```
- **严重程度**: P2
- **类别**: setup膨胀
- **现状**: 两个活跃 UI renderer 包都默认跑 `node`，但 `.tsx` 渲染/交互测试持续用 `@vitest-environment happy-dom` 覆盖。
- **建议**: 以包职责统一默认环境，或显式拆成 node/ui 两个测试 project。
- **为什么值得现在做**: 新增测试时很容易忘记 pragma，导致“测试文件能写、默认却跑不通”的隐性门槛。
- **误报排除**: 不是机械要求全仓单一环境；问题在于这些包本身就是 UI renderer 包，且活跃测试已反复证明默认环境与主测试形态不匹配。
- **历史模式对应**: 相同环境裂缝已在多个活跃包复制
- **参考文档**: `AGENTS.md`, `vitest.shared.ts`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度14-08] 主 E2E 套件里仍有“手工产物生成 helper”型测试在执行

- **文件**: `tests/e2e/code-editor.spec.ts`; `tests/e2e/flow-designer-ui.spec.ts`; `tests/e2e/readme-flux-basic-screenshot.spec.ts`
- **证据片段**:
  ```ts
  test('captures code editor page screenshot', async ({ page }, testInfo) => {
    await openCodeEditor(page);
    ...
    await page.screenshot({ path: join(shotsDir, 'code-editor-page.png'), fullPage: true });
  });
  ```
- **严重程度**: P2
- **类别**: 一致性
- **现状**: 仓库已明确存在“手工截图 helper 应 skip”的做法，但 `code-editor.spec.ts` 里仍有纯截图测试在主套件执行，`flow-designer-ui.spec.ts` 也夹带截图/HTML 导出型步骤。
- **建议**: 将这类资产采集 helper 统一移入 `skip`/手工 project；主 E2E 仅保留契约断言型测试。
- **为什么值得现在做**: 这类测试会污染输出、消耗时间，但对回归保护贡献很薄。
- **误报排除**: 不是反对失败时自动留痕；问题是专门以截图/导出为目的的 helper 测试当前就在主路径执行。
- **历史模式对应**: 主路径测试信号被诊断/辅助脚本污染
- **参考文档**: `AGENTS.md`, `playwright.config.ts`
- **复核状态**: 未复核

### [维度14-09] 多个活跃公共包仍完全没有 coverage gate，覆盖门槛存在系统性缺口

- **文件**: `packages/flow-designer-renderers/vitest.config.ts`; `packages/word-editor-core/vitest.config.ts`; `packages/report-designer-core/vitest.config.ts`; `packages/spreadsheet-core/vitest.config.ts`; `packages/flux-i18n/vitest.config.ts`
- **证据片段**:
  ```ts
  export default createSharedVitestConfig({
    environment: 'node',
  });
  ```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 不少包已有 80% coverage threshold，但 `flow-designer-renderers`、`word-editor-core`、`report-designer-core`、`spreadsheet-core`、`flux-i18n` 这类活跃公共包仍完全没有 coverage gate。
- **建议**: 先为这些公共包补最基础的 package-level coverage threshold，再逐步抬升；优先从共享基础能力和主路径 designer/renderers 包开始。
- **为什么值得现在做**: 这些包是跨页面/跨渲染器复用面，回归影响会向上游扩散。
- **误报排除**: 不是要求全仓立刻统一到高阈值；问题在于若干活跃公共包完全豁免，而相邻包已进入 coverage gate。
- **历史模式对应**: 覆盖治理门槛存在明显盲区
- **参考文档**: `AGENTS.md`, `vitest.shared.ts`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度14-01]: 保留 (P2)。exploratory 交互 E2E 仍大量依赖“可见才执行”，回归时会真空通过。
- [维度14-02]: 保留 (P2)。调试型 Playwright 脚本仍在主套件内执行，且存在无断言用例。
- [维度14-03]: 保留 (P2)。多个渲染器包默认 node、文件级 happy-dom 覆盖的环境分裂仍存在。
- [维度14-04]: 保留 (P2)。`async-data-contracts.test.ts` 仍是跨模块 omnibus test，且与专门单测重复。
- [维度14-05]: 降级为 P3。`@nop-chaos/ui` 缺少 coverage gate 属真实治理缺口，但“整体回归保护不足”的原表述偏强。
- [维度14-06]: 保留 (P2)。`subagent-a-independent-review.spec.ts` 仍是主路径 exploratory omnibus test，且大量依赖条件分支与吞错。
- [维度14-07]: 保留 (P2)。`report-designer-renderers` / `spreadsheet-renderers` 仍在复制包级 node、文件级 happy-dom 覆盖的环境分裂模式。
- [维度14-08]: 降级为 P3。主 E2E 中仍混入资产采集 helper，但原始证据里有文件已 `skip`，应收窄为低优先级信号污染项。
- [维度14-09]: 降级为 P3。多个活跃公共包仍无 coverage gate，但更像系统性 coverage-policy 缺口，而非单包当前测试失效。

## 子项复核结论

- [维度14-05]: 降级为 P3。`ui` 包已有多项直接组件测试，当前更准确的结论是缺 coverage gate，而非整体测试显著不足。

## 最终保留项

| 编号  | 严重程度 | 文件                                                               | 一句话摘要                                          |
| ----- | -------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| 14-01 | P2       | `tests/e2e/exploratory/interaction-tests.spec.ts`                  | exploratory 交互用例仍大量依赖“可见才执行”          |
| 14-02 | P2       | `tests/e2e/debug-collapsible.spec.ts`                              | 调试型 Playwright 脚本仍在主套件内执行              |
| 14-03 | P2       | `packages/flow-designer-renderers/vitest.config.ts`                | UI 渲染器包仍默认 node 再靠 per-file happy-dom 覆盖 |
| 14-04 | P2       | `packages/flux-runtime/src/__tests__/async-data-contracts.test.ts` | async-data omnibus test 仍混合多模块职责            |
| 14-05 | P3       | `packages/ui/vitest.config.ts`                                     | `@nop-chaos/ui` 仍缺 package-level coverage gate    |
| 14-06 | P2       | `tests/e2e/exploratory/subagent-a-independent-review.spec.ts`      | exploratory omnibus E2E 仍大量依赖条件分支与吞错    |
| 14-07 | P2       | `packages/report-designer-renderers/vitest.config.ts`              | UI renderer 包环境分裂模式仍在跨包复制              |
| 14-08 | P3       | `tests/e2e/code-editor.spec.ts`                                    | 主 E2E 仍混入资产采集 helper 型测试                 |
| 14-09 | P3       | `packages/flow-designer-renderers/vitest.config.ts`                | 多个活跃公共包仍无 coverage gate                    |
