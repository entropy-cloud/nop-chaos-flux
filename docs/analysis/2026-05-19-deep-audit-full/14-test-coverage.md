# 维度 14: 测试覆盖与质量

## 第 1 轮（初审）

### [维度14-01] 四个测试文件超过 >700 行 hard gate

- **文件**: `packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx`; `packages/flux-react/src/__tests__/schema-renderer.test.tsx`; `packages/flux-runtime/src/__tests__/import-stack.test.ts`; `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts`
- **证据片段**:
  ```text
  packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx: 787
  packages/flux-react/src/__tests__/schema-renderer.test.tsx: 741
  packages/flux-runtime/src/__tests__/import-stack.test.ts: 733
  packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts: 720
  ```
- **严重程度**: P0
- **类别**: 超大测试文件 / hard gate
- **现状**: `pnpm check:oversized-code-files` 当前失败，4 个测试文件超过 hard gate。
- **风险**: CI/健康门禁无法通过，后续新增测试会继续堆叠。
- **建议**: 按行为/contract owner 拆分测试，并提取 shared test support。
- **为什么值得现在做**: hard gate 失败，修复可恢复 `pnpm check` 可信度。
- **误报排除**: 不是单纯审美，工具 hard gate 失败。
- **参考文档**: `docs/references/audit-tooling.md`
- **复核状态**: 子项复核通过

### [维度14-02] SpreadsheetGridHarness 在 spreadsheet tests 重复内联

- **文件**: `packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx:8-52`; `packages/spreadsheet-renderers/src/__tests__/grid-selection.test.tsx:13-59`
- **证据片段**:
  ```tsx
  function SpreadsheetGridHarness(props: {
    sheetId: string;
    bridge: ReturnType<typeof createSpreadsheetBridge>;
  }) {
    const interactions = useSpreadsheetInteractions({
      bridge: props.bridge,
      sheetId: props.sheetId,
      rows: 5,
  ```
- **严重程度**: P2
- **类别**: setup 膨胀 / 一致性
- **现状**: 两个测试文件重复定义 almost same grid harness。
- **风险**: `SpreadsheetGrid`/interaction props 变化时多处同步，容易测试假设漂移。
- **建议**: 提取 shared spreadsheet grid test harness。
- **为什么值得现在做**: 可降低 hard gate 文件拆分成本。
- **误报排除**: 重复 harness 跨文件存在且涉及核心 grid wiring。
- **参考文档**: `docs/references/audit-tooling.md`
- **复核状态**: 维度复核通过

### [维度14-03] `schema-renderer.test.tsx` 混合多个 SchemaRenderer contract

- **文件**: `packages/flux-react/src/__tests__/schema-renderer.test.tsx:41-476`
- **证据片段**:
  ```tsx
  describe('SchemaRenderer callbacks', () => {
  describe('SchemaRenderer import preparation', () => {
  describe('SchemaRenderer surface runtime seam', () => {
  describe('SchemaRenderer debug data gating', () => {
  ```
- **严重程度**: P1
- **类别**: 跨域测试 / hard gate 附加职责证据
- **现状**: 测试同时覆盖 callbacks、imports、surface seam、debug registry、StrictMode inspectability 等。
- **风险**: 失败难以归因，修改不同 owner 时触碰同一巨型测试文件。
- **建议**: 按 owner contract 拆分。
- **为什么值得现在做**: 子项复核确认超出 hard gate 且不是单纯行数问题。
- **误报排除**: 多个独立 describe 对应不同 owner。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 子项复核通过

### [维度14-04] import-stack 测试 helper 与 rollback 测试重复

- **文件**: `packages/flux-runtime/src/__tests__/import-stack.test.ts:48-84`; `packages/flux-runtime/src/__tests__/import-stack-rollback.test.ts:48-84`
- **证据片段**:

  ```ts
  function createMockActionScope(namespaces: string[] = []): ActionScope {
    const ns = new Set(namespaces);
    const releaseMap = new Map<string, () => void>();
  }

  function createMockRuntime(): RendererRuntime {
    const releaseActionScope = vi.fn();
  ```

- **严重程度**: P2
- **类别**: setup 膨胀 / 一致性
- **现状**: main/rollback import-stack tests 重复 mock action scope/runtime/cache setup。
- **风险**: import stack owner 行为演进时两处 test helper 容易漂移。
- **建议**: 提取 `import-stack-test-support.ts`。
- **为什么值得现在做**: 与 hard gate file 拆分同向。
- **误报排除**: 重复服务同一 runtime owner，不是普通局部 helper。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 维度复核通过

### [维度14-05] action edge-case 测试手写 compiled program 样板

- **文件**: `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts:21-40`
- **证据片段**:
  ```ts
  const result = await dispatcher.dispatch(
    makeCompiledProgram([
      {
        action: 'setValue',
        payload: { args: staticCompiled({ path: 'a', value: 1 }) },
        targeting: {},
        control: {},
        source: { action: 'setValue', args: { path: 'a', value: 1 } },
  ```
- **严重程度**: P3
- **类别**: 可读性 / setup 膨胀
- **现状**: 多个 case 重复手写 compiled action node 样板。
- **风险**: compiled action shape 调整时产生大量机械 diff，遮蔽真实 control-flow 断言。
- **建议**: 增加 `actionNode` / `program` builder。
- **为什么值得现在做**: 与 hard gate 拆分可一起降低测试噪音。
- **误报排除**: 复核降为 P3；已有 `makeCompiledProgram`/`staticCompiled`，当前未造成 contract 失真。
- **参考文档**: `docs/architecture/action-algebra-formal-spec.md`
- **复核状态**: 已降级

### [维度14-06] `word-editor-page-actions.test.tsx` module spy 手动 restore 缺少 afterEach 兜底

- **文件**: `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx:256-265,334-361`
- **证据片段**:
  ```tsx
  afterEach(() => {
    cleanup();
    if (originalWindowConfirm.hasOwn) {
      window.confirm = originalWindowConfirm.value;
    } else {
      Reflect.deleteProperty(window, 'confirm');
    }
    vi.useRealTimers();
  });
  ```
  ```tsx
  const providerSpy = vi
    .spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
    .mockReturnValue({ ... });
  providerSpy.mockRestore();
  ```
- **严重程度**: P2
- **类别**: 隔离性 / mock 清理
- **现状**: 多处 module spy 只在测试尾部 restore，afterEach 没有 `vi.restoreAllMocks()`。
- **风险**: 断言或 await 中途失败会泄漏 spy 到后续 tests。
- **建议**: afterEach 统一 `vi.restoreAllMocks()` 或 try/finally 包裹。
- **为什么值得现在做**: word editor action provider 是宿主动作边界，mock 泄漏会污染核心覆盖。
- **误报排除**: 子项复核将 P1 降为 P2，但泄漏风险成立。
- **参考文档**: `docs/references/audit-tooling.md`
- **复核状态**: 子项复核通过

### [维度14-07] flux-basic E2E 缺少页面入口后的显式 zero-error gate

- **文件**: `tests/e2e/flux-basic-row-inspect.spec.ts:1-10,31-45`
- **证据片段**:

  ```ts
  import { test, expect } from './fixtures.js';

  await page.goto('/#/flux-basic', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Renderer Playground', level: 1 }).waitFor({
    state: 'visible',
    timeout: 15000,
  });
  ```

- **严重程度**: P2
- **类别**: E2E 覆盖 / 一致性
- **现状**: 测试使用 shared fixture teardown，但未在 page ready 后显式调用 `assertTrackedPageErrors(page)`。
- **风险**: 页面入口稳定性检查模式不一致，违背 E2E 标准。
- **建议**: 导入并在 heading ready 后调用 `assertTrackedPageErrors(page)`。
- **为什么值得现在做**: 修复成本低，核心 flux-basic 页面应保持 zero-error gate。
- **误报排除**: fixture teardown 有兜底；报告的是文档要求的入口后立即 gate。
- **参考文档**: `docs/testing/e2e-standards.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

### [维度14-08] `vi.stubGlobal('FileReader')` 未 `unstubAllGlobals`

- **文件**: `packages/word-editor-renderers/src/__tests__/insert-controls.test.tsx:8-12,29-55`
- **证据片段**:

  ```ts
  describe('InsertControls', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      cleanup();
    });

    vi.stubGlobal('FileReader', FailingFileReader as any);
    vi.stubGlobal('FileReader', SuccessFileReader as any);
  ```

- **严重程度**: P2
- **类别**: 隔离性
- **现状**: `vi.stubGlobal` 改写 `FileReader`，但 setup 只 `restoreAllMocks`，未 `unstubAllGlobals`。
- **风险**: 失败路径或后续测试依赖真实 FileReader 时会发生全局污染。
- **建议**: afterEach/beforeEach 调用 `vi.unstubAllGlobals()`。
- **为什么值得现在做**: 低成本修复真实全局补丁泄漏。
- **误报排除**: `restoreAllMocks` 不恢复 `stubGlobal`。
- **参考文档**: `docs/references/audit-tooling.md`
- **复核状态**: 维度复核通过

### [维度14-09] `compilation-and-boundaries.test.tsx` console spy 手动 restore 无失败兜底

- **文件**: `packages/flux-react/src/__tests__/compilation-and-boundaries.test.tsx:112-133`
- **证据片段**:

  ```ts
  const installPreparedSpy = vi.spyOn(runtime.importStack, 'installPrepared');
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  expect(() => render(/* ... */)).toThrow('abort render');

  expect(installPreparedSpy).not.toHaveBeenCalled();
  consoleSpy.mockRestore();
  ```

- **严重程度**: P2
- **类别**: 隔离性
- **现状**: console spy 只在 assertions 后 restore，文件没有 afterEach `restoreAllMocks`。
- **风险**: 中途断言失败会吞掉后续 console.error，降低 React/runtime 错误诊断。
- **建议**: 文件级 afterEach `vi.restoreAllMocks()` 或 try/finally。
- **为什么值得现在做**: 该文件覆盖 runtime/import boundary，失败诊断依赖 console 输出。
- **误报排除**: 与 word-editor spy 泄漏不同文件，独立失败路径。
- **参考文档**: `docs/references/audit-tooling.md`
- **复核状态**: 维度复核通过

## 维度复核结论

- [维度14-01]: 保留 (P0)。hard gate 失败。
- [维度14-02]: 保留 (P2)。spreadsheet harness 重复。
- [维度14-03]: 保留 (P1)。SchemaRenderer 测试大文件且多 contract 混杂。
- [维度14-04]: 保留 (P2)。import-stack helper 重复。
- [维度14-05]: 降级为 P3。样板噪音成立但已有部分 helper。
- [维度14-06]: 保留但降级为 P2。mock leak 风险成立。
- [维度14-07]: 保留 (P2)。E2E entry gate 漏显式调用。
- [维度14-08]: 保留 (P2)。stubGlobal 未 unstub。
- [维度14-09]: 保留 (P2)。console spy restore 无失败兜底。

## 子项复核结论

- [维度14-01]: 成立 (P0)。同源 hard gate 与维度02 去重汇总。
- [维度14-03]: 成立 (P1)。大文件之外确有多 contract 混杂。
- [维度14-06]: 成立但降级为 P2。泄漏风险成立。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                     | 一句话摘要                                        |
| ----- | -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 14-01 | P0       | `packages/flux-react/src/__tests__/schema-renderer.test.tsx`                             | 四个测试文件超过 oversized hard gate              |
| 14-02 | P2       | `packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx:8-52`     | SpreadsheetGridHarness 在测试中重复内联           |
| 14-03 | P1       | `packages/flux-react/src/__tests__/schema-renderer.test.tsx:41-476`                      | SchemaRenderer 测试混合多个 contract owner        |
| 14-04 | P2       | `packages/flux-runtime/src/__tests__/import-stack.test.ts:48-84`                         | import-stack 测试 helper 重复                     |
| 14-05 | P3       | `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts:21-40` | action control-flow 测试 compiled node 样板过多   |
| 14-06 | P2       | `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx:256-265` | word-editor action tests spy restore 缺少失败兜底 |
| 14-07 | P2       | `tests/e2e/flux-basic-row-inspect.spec.ts:1-10`                                          | flux-basic E2E 缺入口后显式 zero-error gate       |
| 14-08 | P2       | `packages/word-editor-renderers/src/__tests__/insert-controls.test.tsx:8-12`             | FileReader stubGlobal 未 unstub                   |
| 14-09 | P2       | `packages/flux-react/src/__tests__/compilation-and-boundaries.test.tsx:112-133`          | console spy 手动 restore 缺少失败兜底             |
