# 深度审核汇总报告

## 审核范围

- 执行的维度：01 依赖图与包边界，02 模块职责与文件边界，03 API 表面积与契约一致性，04 状态所有权与单一事实来源，05 响应式订阅精度，06 异步模式与取消安全，07 生命周期与副作用归属，08 验证系统一致性，09 渲染器契约合规性，10 样式系统合规性，11 UI 组件使用合规性，12 表单字段与 Slot 建模，13 类型安全与动态边界，14 测试覆盖与质量，15 安全与性能红线，16 文档-代码一致性，17 命名与术语一致性，18 跨包模式一致性，19 错误传播保真度，20 可访问性。
- 覆盖的包：`packages/flux-*`、`packages/flux-renderers-*`、`packages/flow-designer-*`、`packages/report-designer-*`、`packages/spreadsheet-*`、`packages/word-editor-*`、`packages/ui`、`packages/nop-debugger`、`apps/playground`、`tests/e2e`。
- 审核日期：2026-05-19。
- 执行方式：20 个维度第 1 轮初审 + 第 2 轮追加深挖 + 独立维度复核；P0/P1 与部分高影响项追加子项复核。共调度 33 个子 agent。

## 工具基线

- `pnpm check:workspace-manifest-deps` 失败：`packages/flux-react/src/__tests__/schema-renderer-strictmode-form.test.tsx` 使用 `@nop-chaos/flux-renderers-basic` 但 `packages/flux-react/package.json` 未声明。
- `pnpm check:oversized-code-files` 失败：7 个 `>700` hard error，77 个 `>500` warning。
- `pnpm check:src-artifacts` 通过。
- `pnpm check:react19` 通过。
- `pnpm check:active-doc-code-anchors` 通过。
- `pnpm check:package-css-exports` 通过。
- `pnpm check:i18n-keys` 通过，存在 unused-key warnings。
- `pnpm check:renderer-definition-fields-only` 通过。
- `pnpm check:finite-prop-contracts` 通过。
- `pnpm check:audit-fieldframe-bypasses` 无 suspect。
- `pnpm check:audit-missing-renderer-markers` 无 suspect。
- `pnpm check:audit-reactive-render-reads` 的 4 个 suspect 经复核均未保留为维度 05 问题。
- `pnpm check:audit-async-failure-paths`、`pnpm check:audit-performance-suspects`、`pnpm check:audit-styling-suspects`、`pnpm check:audit-test-global-leaks` 的 suspect 已按维度人工复核。

## 深挖统计

- 维度总数：20。
- 各维度深挖轮次：全部执行 2 轮（第 1 轮初审 + 第 2 轮追加深挖或零发现确认）。
- 深挖总轮次：40。
- 初审发现数：61。
- 第 2 轮新增发现数：16。
- 深挖总发现数：77。
- 深挖后驳回或降级前的零发现维度：05。

## 复核统计

- 深挖发现总数：77。
- 已独立复核条目数：77。
- 维度级复核完成数：20。
- 子项逐条/批量复核覆盖条目数：24。
- 最终保留：64。
- 最终降级：13。
- 最终驳回：11。

## P0 清单

| 编号  | 维度                | 文件                                                                               | 一句话摘要                                                      |
| ----- | ------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 01-01 | 依赖图与包边界      | `packages/flux-react/src/__tests__/schema-renderer-strictmode-form.test.tsx:4-8`   | `flux-react` 测试导入 renderer 包但 manifest 未声明             |
| 02-01 | 模块职责            | `packages/flux-compiler/src/schema-compiler/shape-validation.ts`                   | schema shape validation 文件超过 hard gate 且职责二次膨胀       |
| 02-02 | 模块职责            | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`        | variant-field 单文件混合 action/validation/projection/UI 多职责 |
| 02-03 | 模块职责            | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`                          | spreadsheet grid 主文件混合多交互 owner                         |
| 02-04 | 模块职责 / 测试质量 | `packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx`    | spreadsheet context menu 测试超过 oversized hard gate           |
| 02-05 | 模块职责 / 测试质量 | `packages/flux-react/src/__tests__/schema-renderer.test.tsx`                       | SchemaRenderer 测试超过 oversized hard gate                     |
| 02-06 | 模块职责 / 测试质量 | `packages/flux-runtime/src/__tests__/import-stack.test.ts`                         | import-stack 测试超过 oversized hard gate                       |
| 02-07 | 模块职责 / 测试质量 | `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts` | action control-flow edge cases 测试超过 oversized hard gate     |

## P1 清单

| 编号  | 维度           | 文件                                                                                 | 一句话摘要                                                    |
| ----- | -------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 04-01 | 状态所有权     | `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts:50-69` | scope-owned 列显隐/顺序空数组被默认列覆盖                     |
| 08-02 | 验证系统       | `packages/flux-renderers-form-advanced/src/array-editor.tsx:220-224`                 | array-editor childPaths 更新绕过 FormRuntime registration API |
| 08-03 | 验证系统       | `packages/flux-renderers-form-advanced/src/key-value.tsx:277-281`                    | key-value childPaths 更新绕过 FormRuntime registration API    |
| 14-03 | 测试覆盖与质量 | `packages/flux-react/src/__tests__/schema-renderer.test.tsx:41-476`                  | SchemaRenderer 测试混合多个 contract owner                    |

## P2 清单

| 编号  | 维度       | 文件                                                                                           | 一句话摘要                                                         |
| ----- | ---------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 02-08 | 模块职责   | `packages/flux-renderers-form/src/renderers/input.tsx`                                         | 基础字段 renderer 桶文件接近 hard gate 且聚合多控件实现            |
| 06-01 | 异步安全   | `apps/playground/src/pages/report-designer-demo.tsx:488-495`                                   | report field insert fire-and-forget 隐藏两 owner 写入失败          |
| 07-03 | 生命周期   | `packages/flux-runtime/src/async-data/request-runtime.ts:421-450`                              | request parent AbortSignal listener 正常完成不移除                 |
| 07-04 | 生命周期   | `packages/flux-runtime/src/runtime-factory.ts:157-170`                                         | ActionScope release/dispose 缺 namespace provider 兜底 cleanup     |
| 08-01 | 验证系统   | `packages/flux-compiler/src/schema-compiler/node-compiler.ts:474-487`                          | `scopePolicy: form` 遮蔽显式 validation ownerResolution            |
| 08-04 | 验证系统   | `packages/flux-runtime/src/form-runtime-owner.ts:229-255`                                      | applyChangesAndRevalidate transitional lifecycle 写入/验证语义不清 |
| 08-05 | 验证系统   | `packages/flux-runtime/src/form-runtime-validation.ts:400-408`                                 | stale async validation run 被记录为 succeeded                      |
| 09-01 | 渲染器契约 | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:307-333`               | detail-field control root 丢弃 schema className                    |
| 09-02 | 渲染器契约 | `packages/flux-renderers-data/src/table-renderer/use-table-pagination.ts:52-67`                | table 声明事件丢失 UI event/semantic payload                       |
| 09-03 | 渲染器契约 | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:144-154`               | detail renderer 直读 FormRuntime store                             |
| 09-04 | 渲染器契约 | `packages/flux-renderers-data/src/crud-renderer-ownership.ts:145-181`                          | CRUD query submit/reset event payload 为空                         |
| 10-01 | 样式系统   | `packages/report-designer-renderers/src/report-field-panel.css:1-12`                           | report field panel package CSS 裸 data-slot 未 scoped              |
| 10-02 | 样式系统   | `packages/spreadsheet-renderers/src/canvas-styles.css:248-256`                                 | spreadsheet toolbar shell 样式混入 canvas exception                |
| 10-03 | 样式系统   | `packages/spreadsheet-renderers/src/canvas-styles.css:355-407`                                 | spreadsheet overlay shell 样式混入 canvas exception                |
| 11-01 | UI 组件    | `packages/report-designer-renderers/src/report-field-panel.tsx:31-48`                          | ReportFieldPanel drag handle 绕过 UI Button                        |
| 12-02 | 字段/Slot  | `packages/flux-renderers-data/src/data-renderer-definitions.ts:157-167`                        | chart title 未按 value-or-region slot 建模                         |
| 12-03 | 字段/Slot  | `packages/flux-renderers-data/src/schemas.ts:73-78`                                            | table public schema 暴露 `loadingSlot` 内部后缀                    |
| 12-04 | 字段/Slot  | `packages/flux-renderers-data/src/schemas.ts:39-57`                                            | table column nested slots 在 TS schema 中缺少 author-facing 字段   |
| 14-02 | 测试质量   | `packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx:8-52`           | SpreadsheetGridHarness 在测试中重复内联                            |
| 14-04 | 测试质量   | `packages/flux-runtime/src/__tests__/import-stack.test.ts:48-84`                               | import-stack 测试 helper 重复                                      |
| 14-06 | 测试质量   | `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx:256-265`       | word-editor action tests spy restore 缺少失败兜底                  |
| 14-07 | 测试质量   | `tests/e2e/flux-basic-row-inspect.spec.ts:1-10`                                                | flux-basic E2E 缺入口后显式 zero-error gate                        |
| 14-08 | 测试质量   | `packages/word-editor-renderers/src/__tests__/insert-controls.test.tsx:8-12`                   | FileReader stubGlobal 未 unstub                                    |
| 14-09 | 测试质量   | `packages/flux-react/src/__tests__/compilation-and-boundaries.test.tsx:112-133`                | console spy 手动 restore 缺少失败兜底                              |
| 15-01 | 性能红线   | `packages/flux-renderers-data/src/tree-renderer.tsx:299-325`                                   | TreeRenderer expanded subtree 无虚拟化/懒渲染阈值                  |
| 15-02 | 性能红线   | `packages/flux-renderers-basic/src/tabs.tsx:177-203`                                           | TabsRenderer 默认挂载所有 hidden tab regions                       |
| 16-01 | 文档一致性 | `docs/architecture/renderer-runtime.md:575-640`                                                | `useCurrentImportFrame` 活实现缺 public/internal surface 裁定      |
| 16-02 | 文档一致性 | `docs/architecture/renderer-runtime.md:585-589`                                                | `useScopeSelector` 文档/RendererHookApi 漏 `paths` 选项            |
| 17-01 | 命名术语   | `packages/flux-react/src/__tests__/node-source-prop-controller.test.ts:102-120`                | SourceSchema 测试样例使用非规范 `sourceType` 字段                  |
| 18-01 | 跨包模式   | `packages/ui/src/lib/i18n.ts:1-25`                                                             | UI 私有 i18n fallback 未接入 flux-i18n 当前实例                    |
| 18-03 | 跨包模式   | `packages/spreadsheet-renderers/src/host-action-provider.ts:23-28`                             | spreadsheet host action result 丢失 cancelled 语义                 |
| 19-01 | 错误传播   | `packages/flux-runtime/src/runtime-action-helpers.ts:101-119`                                  | request timeout+retry 可能复用 stale active promise                |
| 19-02 | 错误传播   | `packages/flow-designer-core/src/core-node-commands.ts:42-54`                                  | flow-designer node hook 异常字符串化                               |
| 19-03 | 错误传播   | `packages/flow-designer-core/src/core-edge-commands.ts:70-89`                                  | flow-designer edge hook 异常字符串化                               |
| 19-04 | 错误传播   | `packages/flux-formula/src/compile/compile-node.ts:60-87`                                      | expression compile error 降级为 static string                      |
| 19-05 | 错误传播   | `packages/flux-compiler/src/schema-compiler/flux-value-shape-validation.ts:221-234`            | union value-shape diagnostic 丢弃 branch 失败原因                  |
| 19-06 | 错误传播   | `packages/flow-designer-renderers/src/designer-context.ts:108-114`                             | flow-designer host action error 被重建为新 Error                   |
| 20-02 | 可访问性   | `packages/flux-renderers-form-advanced/src/tree-controls.tsx:59-67`                            | input-tree 缺完整 tree roving focus/方向键模型                     |
| 20-03 | 可访问性   | `packages/flux-renderers-form-advanced/src/tree-controls.tsx:272-333`                          | tree-select popup 缺完整 tree keyboard model                       |
| 20-04 | 可访问性   | `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:108-126`         | focusable table row 缺交互 role/name                               |
| 20-05 | 可访问性   | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:398-409`                              | spreadsheet fill handle role=button 但鼠标专属                     |
| 20-07 | 可访问性   | `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx:32-69`              | DingFlow add-node menu 缺 menu keyboard model                      |
| 20-08 | 可访问性   | `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:149-164` | Flow Designer node button 缺稳定 accessible name/state             |
| 20-09 | 可访问性   | `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx:101-126` | Flow Designer edge button 缺稳定 accessible name/state             |

## P3 清单

| 编号  | 维度      | 文件                                                                                     | 一句话摘要                                                                |
| ----- | --------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 06-02 | 异步安全  | `packages/spreadsheet-renderers/src/default-page-body.tsx:121-124`                       | spreadsheet edit save 对 custom bridge reject 缺少兜底                    |
| 12-01 | 字段/Slot | `packages/flux-renderers-form/src/field-utils/field-reading.tsx:10-21`                   | shared field metadata 未显式覆盖 FieldFrame chrome inputs                 |
| 13-02 | 类型安全  | `packages/flow-designer-renderers/src/schemas.ts:23-29`                                  | domain page schema helper 用多重断言混合 opaque host config 与 BaseSchema |
| 14-05 | 测试质量  | `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts:21-40` | action control-flow 测试 compiled node 样板过多                           |
| 15-03 | 性能红线  | `packages/flux-renderers-data/src/table-renderer.tsx:299-312`                            | table column settings 存在局部 O(n²) 查找                                 |
| 19-07 | 错误传播  | `packages/flux-runtime/src/async-data/async-governance.ts:9-24`                          | async governance debug error summary 丢 stack/cause                       |
| 20-01 | 可访问性  | `packages/flux-renderers-form/src/renderers/input.tsx:540-565`                           | input-number stepper buttons 不可 Tab 聚焦                                |
| 20-06 | 可访问性  | `packages/flux-renderers-form-advanced/src/tree-controls.tsx:159-167`                    | tree loading status 未关联 aria-busy/describedby                          |

## 高频问题文件

| 文件                                                          | 涉及维度       | 说明                                                                       |
| ------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------- |
| `packages/flux-react/src/__tests__/schema-renderer.test.tsx`  | 02,14          | 同时是 oversized hard gate 与多 contract 测试混杂                          |
| `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`     | 02,20          | 同时存在文件职责膨胀与 fill handle a11y 缺口                               |
| `packages/flux-renderers-data/src/table-renderer/*`           | 04,09,12,15,20 | table owner state、event payload、field metadata、性能与 a11y 多条问题集中 |
| `packages/flux-renderers-form-advanced/src/tree-controls.tsx` | 20             | input-tree/tree-select keyboard 与 loading 状态语义集中                    |
| `packages/flow-designer-core/src/core-*commands.ts`           | 19             | lifecycle hook error 保真度缺口集中                                        |
| `packages/spreadsheet-renderers/src/canvas-styles.css`        | 10             | spreadsheet canvas exception CSS 扩散到 shell/overlay                      |

## 跨维度模式

- 自动化 hard gate 当前失败：manifest deps 与 oversized files 是最高优先级修复项。
- owner state 的“空数组/空集合”与“未初始化”仍有混淆：见 table/CRUD column settings。
- renderer event payload 仍有 `null`/`undefined` 入口：见 table 与 CRUD query events。
- runtime/debug 错误保真度不足：字符串化、重新 new Error、丢 union branch diagnostics、丢 stale/cancelled 语义。
- spreadsheet/report/flow designer 等 host surface 中，自定义 UI 和 CSS exception 边界需要更清晰的 scoped contract。
- a11y 问题集中在自定义 ARIA role 后没有实现对应键盘/name/state 模型。

## 已自动化的检查项

- React 19 legacy API：`pnpm check:react19`。
- src 产物污染：`pnpm check:src-artifacts`。
- oversized files：`pnpm check:oversized-code-files`。
- workspace manifest deps：`pnpm check:workspace-manifest-deps`。
- active doc anchors：`pnpm check:active-doc-code-anchors`。
- CSS package exports：`pnpm check:package-css-exports`。
- i18n key definitions：`pnpm check:i18n-keys`。
- renderer definition fields-only：`pnpm check:renderer-definition-fields-only`。
- finite prop contracts：`pnpm check:finite-prop-contracts`。
- fieldframe bypass suspects：`pnpm check:audit-fieldframe-bypasses`。
- missing renderer marker suspects：`pnpm check:audit-missing-renderer-markers`。

## 建议新增的自动化检查

- 检查 renderer event callbacks 是否传 `null`/`undefined` event 且缺 semantic `{ type }` payload。
- 检查 scope-backed array owner state 是否用 `.length` 判断 fallback。
- 检查 `RuntimeFieldRegistration.childPaths` 是否直接 mutate 而未调用 `updateFieldRegistration`。
- 检查 package CSS 中裸 `[data-slot]` 是否缺少 root marker scope。
- 检查 public schema 字段是否暴露 `*Slot`/`*RegionKey` internal suffix。
- 检查 tests 中 `vi.stubGlobal` 是否缺少 `vi.unstubAllGlobals`。
- 检查 `role="button"` / `role="menu"` 自定义元素是否具备键盘/name/state 基础条件。

## 可暂缓项

- P3 类型 helper 多重断言：先裁定 host page schema opaque boundary，再决定是否统一 builder。
- P3 table column settings O(n²)：可与 table column settings UI 改造一起处理。
- P3 input-number stepper Tab 顺序：已有 input keyboard 等价路径，可与基础字段 a11y pass 合并。
- P3 async governance stack/cause：debug snapshot 改造时一并处理。

## 误报排除清单

- `@nop-chaos/flux-renderers-form/definitions` 是明确 exports 的 CSS-free subpath，不作为 private API surface 缺陷。
- `flux-runtime` root 未导出底层 store/scope factory 不违反当前 root API 收窄契约。
- `use-node-source-props` / `useSourceValue` 使用 runtime SourceObserver，不构成 React-owned 第二套 source lifecycle。
- `scope-debug` broad selector 是调试 renderer 的预期行为。
- virtual table spacer raw `<tr>` 是 `aria-hidden` 几何占位，使用 UI `TableRow` 反而可能引入普通 row styling。
- `source-compiler.resultMapping` 初审风险被现有 recursive object compilation 和 tests 驳回。
- domain renderer 直接使用 external selector shim 当前未违反公开契约。
