# 维度 14: 测试覆盖与质量

## 第 1 轮（初审）

### [维度14-01] `designer-page-shell.test.tsx` 已从“契约集中测试”滑向跨域集成大杂烩，测试维护边界与模块边界一起失真

- **文件**: `packages/flow-designer-renderers/src/designer-page-shell.test.tsx:25-279`, `packages/flow-designer-renderers/src/designer-page-shell.test.tsx:392-725`
- **证据片段**:
  ```tsx
  describe('designer-page status publication', () => {
  ...
  it('mounts toolbar, inspector, and dialogs regions with designer host scope...', async () => {
  ...
  describe('DesignerPageRenderer basic rendering', () => {
  ```
- **严重程度**: P2
- **现状**: 同一测试文件同时承担 host status publication、dialog submit failure、region host-scope、basic rendering marker 等跨域断言，且已超过 `700` 行硬门禁。
- **风险**: fixture 和断言跨域共享会放大测试雪崩，review 很难判断失败究竟来自 status contract、host failure path 还是纯 DOM rendering。
- **建议**: 以“status/failure/rendering”三条契约线拆分测试文件，并把通用 renderer/env helper 留在 test support。
- **为什么值得现在做**: 维度 02 已证明它是职责混合文件；从测试质量角度看，这种跨域测试会直接拖低可维护性与定位速度。
- **误报排除**: 不是单纯重复大文件门禁；这里强调的是测试域边界混合，而不是文件长度本身。
- **历史模式对应**: 对应 prompt handbook 中“超过 400 行测试文件要检查跨领域测试和 setup 膨胀”的明确要求。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 14；`docs/references/audit-tooling.md`；`AGENTS.md` Testing 章节。
- **复核状态**: 未复核

### [维度14-02] `page-renderer.test.tsx` 把 report designer shell、field-source async init、statusPath/reactive projection 一并塞进单文件，削弱测试可诊断性

- **文件**: `packages/report-designer-renderers/src/page-renderer.test.tsx:148-339`, `packages/report-designer-renderers/src/page-renderer.test.tsx:413-652`
- **证据片段**:
  ```tsx
  it('reports refreshFieldSources failures through monitor in addition to notify', async () => {
  ...
  it('starts report designer initialization from mount effects instead of render construction', async () => {
  ...
  it('projects canonical selectionTarget into report designer host scope and keeps it reactive', async () => {
  ```
- **严重程度**: P2
- **现状**: `ReportDesignerPageRenderer` 单文件测试已经混合 workbench shell、mount effect init、host projection/status cleanup 等多个测试主题。
- **风险**: 当报表设计器变更 field-source init 或 host projection 任一子系统时，会让 unrelated test setup 和断言一起改，降低 failure diagnosis fidelity。
- **建议**: 拆成 `page-renderer-shell.test.tsx`、`page-renderer-init.test.tsx`、`page-renderer-host-projection.test.tsx`。
- **为什么值得现在做**: 该文件同样命中 oversize hard gate，且当前 `it(...)` 名称已经给出了天然切片边界。
- **误报排除**: 不是为了追求小文件；问题是测试覆盖结构已经无法忠实映射 owner 边界。
- **历史模式对应**: 对应仓库对复杂 renderer/runtime 测试逐步拆分为 focused contract tests 的通用模式。
- **参考文档**: `docs/skills/deep-audit-prompts.md` 维度 14；`AGENTS.md` Testing 章节。
- **复核状态**: 未复核

### [维度14-03] `field-panel-renderer.test.tsx` 通过模块级可变 mock 状态驱动 hook mock，当前虽有 cleanup，但仍保留顺序耦合与 future async 泄漏风险

- **文件**: `packages/report-designer-renderers/src/field-panel-renderer.test.tsx:15-27`, `packages/report-designer-renderers/src/field-panel-renderer.test.tsx:65-70`
- **证据片段**:

  ```tsx
  let mockScopeData: Record<string, unknown> = {};
  let mockActionScope: { resolve: (action: string) => unknown } | undefined;
  let mockRuntime: Record<string, unknown> = {};

  vi.mock('@nop-chaos/flux-react', async () => ({
    ...actual,
    useOwnScopeSelector: (selector) => selector(mockScopeData),
    useRendererRuntime: () => mockRuntime,
  }));
  ```

- **严重程度**: P2
- **现状**: 被 mock 的 hooks 直接读取模块级可变对象；测试通过 `afterEach` 手动复位，但状态仍跨 case 共享。
- **风险**: 未来一旦增加未 await 完成的异步断言或并发 helper，模块级共享 mock state 容易产生顺序耦合和污染。
- **建议**: 改为 per-test render harness 注入或在 `beforeEach` 内生成局部 mock provider，避免模块级 live mutable state 成为测试依赖。
- **为什么值得现在做**: `pnpm check:audit-test-global-leaks` 已把它列为高噪声候选；此类测试一旦继续扩展最容易先退化成脆弱用例。
- **误报排除**: 不是“任何 module-top let 都有罪”；这里的变量直接被 mocked hook 闭包读取，确实参与 live test execution，而不是单纯常量夹具。
- **历史模式对应**: 对应 `test-module-top-let` suspect 的高频模式。
- **参考文档**: `docs/references/audit-tooling.md`；`docs/skills/deep-audit-prompts.md` 维度 14。
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度14-01]: 保留 (P2)。该文件的测试主题已明显跨域，且与硬门禁失败相互印证。
- [维度14-02]: 保留 (P2)。问题不在“行数”而在 test contract 混合，结论保留。
- [维度14-03]: 降级为 P3。`afterEach` 已有明确 reset，短期内不至于形成当前错误行为；但模块级 mutable mock 仍值得在后续测试重构中收敛。

## 子项复核结论

- [维度14-01]: 子项复核通过。建议拆为 focused contract tests。
- [维度14-02]: 子项复核通过。建议拆为 shell/init/projection 三组。
- [维度14-03]: 子项复核通过并降级。保留为低优先级测试卫生项。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                   | 一句话摘要                                           |
| ----- | -------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| 14-01 | P2       | `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`    | Flow Designer page shell 测试已跨域混合多个契约      |
| 14-02 | P2       | `packages/report-designer-renderers/src/page-renderer.test.tsx`        | Report Designer page renderer 测试已跨域混合多个契约 |
| 14-03 | P3       | `packages/report-designer-renderers/src/field-panel-renderer.test.tsx` | field panel 测试仍依赖模块级可变 mock 状态           |
