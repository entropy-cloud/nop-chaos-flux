# 深度审核汇总报告

## 范围

- 执行批次：完整 20 个维度
- 审核目录：`docs/analysis/2026-05-14-deep-audit-batch1/`
- 方法：初审 -> 迭代深挖 -> 独立维度复核 -> 必要子项复核
- 基线：按当前 live code / 当前文档判定，`v1 / 无兼容负担 / 不接受过渡态主路径`

## 深挖统计

| 维度                        | 轮次 | 每轮发现数          | 初审总数 |
| --------------------------- | ---- | ------------------- | -------- |
| 01 依赖图与包边界           | 1    | `0`                 | 0        |
| 02 模块职责与文件边界       | 1    | `14`                | 14       |
| 03 API 表面积与契约一致性   | 1    | `6`                 | 6        |
| 04 状态所有权与单一事实来源 | 5    | `1 / 2 / 2 / 1 / 2` | 8        |
| 05 响应式订阅精度           | 3    | `2 / 3 / 1`         | 6        |
| 06 异步模式与取消安全       | 3    | `3 / 4 / 3`         | 10       |
| 07 生命周期与副作用归属     | 3    | `1 / 1 / 1`         | 3        |
| 08 验证系统一致性           | 3    | `1 / 2 / 1`         | 4        |
| 09 渲染器契约合规性         | 3    | `5 / 2 / 1`         | 8        |
| 10 样式系统合规性           | 1    | `2`                 | 2        |
| 11 UI 组件使用合规性        | 3    | `0 / 1 / 2`         | 3        |
| 12 表单字段与 Slot 建模     | 1    | `2`                 | 2        |
| 13 类型安全与动态边界       | 1    | `3`                 | 3        |
| 14 测试覆盖与质量           | 2    | `2 / 3`             | 5        |
| 15 安全与性能红线           | 5    | `2 / 3 / 1 / 1 / 1` | 8        |
| 16 文档-代码一致性          | 1    | `3`                 | 3        |
| 17 命名与术语一致性         | 1    | `3`                 | 3        |
| 18 跨包模式一致性           | 1    | `1`                 | 1        |
| 19 错误传播保真度           | 1    | `2`                 | 2        |
| 20 可访问性                 | 1    | `2`                 | 2        |

## 复核统计

| 维度 | 初审总数 | 保留 | 降级 | 驳回 |
| ---- | -------- | ---- | ---- | ---- |
| 01   | 0        | 0    | 0    | 0    |
| 02   | 14       | 13   | 0    | 1    |
| 03   | 6        | 6    | 0    | 0    |
| 04   | 8        | 2    | 5    | 1    |
| 05   | 6        | 2    | 3    | 1    |
| 06   | 10       | 6    | 3    | 1    |
| 07   | 3        | 3    | 0    | 0    |
| 08   | 4        | 3    | 1    | 0    |
| 09   | 8        | 6    | 2    | 0    |
| 10   | 2        | 2    | 0    | 0    |
| 11   | 3        | 3    | 0    | 0    |
| 12   | 2        | 2    | 0    | 0    |
| 13   | 3        | 3    | 0    | 0    |
| 14   | 5        | 4    | 1    | 0    |
| 15   | 8        | 3    | 2    | 3    |
| 16   | 3        | 3    | 0    | 0    |
| 17   | 3        | 3    | 0    | 0    |
| 18   | 1        | 1    | 0    | 0    |
| 19   | 2        | 2    | 0    | 0    |
| 20   | 2        | 2    | 0    | 0    |

## 已复核通过的问题

### P1

| 编号  | 维度     | 文件                                                           | 摘要                                                           |
| ----- | -------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| 07-02 | 生命周期 | `packages/flux-react/src/schema-renderer.tsx:162-166`          | SchemaRenderer render-phase 创建并挂接 pageStore 订阅          |
| 07-03 | 生命周期 | `packages/report-designer-renderers/src/page-renderer.tsx:306` | ReportDesignerCore 在 render 阶段构造即启动 async refresh      |
| 08-02 | 验证系统 | `packages/flux-runtime/src/form-runtime-field-ops.ts:384-394`  | hidden->visible 转换后未触发 owner-managed system revalidation |
| 08-03 | 验证系统 | `packages/flux-runtime/src/runtime-owned-factories.ts:117-123` | 无 root validation plan 的 owner 仍直接发布为 active/ready     |
| 08-04 | 验证系统 | `packages/flux-runtime/src/form-runtime-array.ts:19-72`        | 数组索引变更期间 validating 可能永久卡住                       |

### P2

| 编号  | 维度        | 文件                                                                                  | 摘要                                                                                            |
| ----- | ----------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 02-01 | 模块职责    | `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test.tsx`   | word-editor host-scope 测试继续混装 recovery/shell/window probe/metadata                        |
| 02-02 | 模块职责    | `packages/flux-react/src/__tests__/hook-surface-lifecycle-contracts.test.tsx`         | hook-surface-lifecycle 已成跨层 omnibus contract 文件                                           |
| 02-03 | 模块职责    | `packages/flux-runtime/src/__tests__/request-runtime.test.ts`                         | request-runtime 测试混装 helper、prepare、error、dedup 与 dispose 生命周期                      |
| 02-04 | 模块职责    | `packages/flow-designer-renderers/src/designer-page.tree.test.tsx`                    | designer-page.tree 继续把 tree/graph/runtime-props/history/warning 混在同一入口                 |
| 02-05 | 模块职责    | `packages/nop-debugger/src/controller-inspect-advanced.test.ts`                       | debugger advanced inspect 测试混装 inspect/tree/explain/form-state/failure-trace                |
| 02-06 | 模块职责    | `packages/report-designer-core/src/__tests__/designer-core.test.ts`                   | designer-core 测试把 metadata/preview/codec/field-source async 混成单入口                       |
| 02-09 | 模块职责    | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`                             | spreadsheet-grid 混装虚拟化、编辑、键盘、拖拽与上下文菜单壳层                                   |
| 02-10 | 模块职责    | `packages/report-designer-renderers/src/page-renderer.tsx`                            | report-designer page renderer 同时承担 host boot、双 runtime 同步与 shell 布局                  |
| 02-13 | 模块职责    | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`           | variant-field 同时承担 UI、value migration、validation 与 child contract bridge                 |
| 03-01 | API Surface | `packages/flow-designer-renderers/src/schemas.ts:4-13`                                | DesignerPageSchemaInput 把 `config` 暴露为可选，但 live contract 实际要求必填                   |
| 03-03 | API Surface | `packages/report-designer-renderers/src/types.ts:31-40`                               | report-designer-page 公开类型把 toolbar/fieldPanel/inspector 错窄化                             |
| 03-04 | API Surface | `packages/report-designer-renderers/src/page-renderer.tsx:152-163`                    | report-designer-page 把必填 `document/designer` 静默降格为 runtime fallback                     |
| 03-05 | API Surface | `packages/report-designer-renderers/src/index.ts:1-51`                                | report-designer-renderers 包入口遗漏导出 createReportDesignerActionProvider                     |
| 03-06 | API Surface | `packages/spreadsheet-renderers/src/page-renderer.tsx:77-88`                          | spreadsheet-page 默认 body/canvas 合同与组件文档漂移                                            |
| 04-04 | 状态所有权  | `packages/word-editor-renderers/src/editor-canvas.tsx:52-73`                          | autosave 与 host save 共用同一个 dirty 真相面                                                   |
| 04-07 | 状态所有权  | `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:151-170`        | field-drop 一次手势被拆成多个 history owner                                                     |
| 05-03 | 响应式订阅  | `packages/flux-react/src/workbench/hooks.ts:88-90`                                    | host projection `replace()` 只发布根级 changed paths                                            |
| 05-06 | 响应式订阅  | `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:32-43`           | inspector shell/inner renderer 重复输出同一 root meta                                           |
| 06-02 | 异步安全    | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:489-490`       | detail-view confirm 的空 catch 吞掉主确认链异常                                                 |
| 06-06 | 异步安全    | `packages/flow-designer-renderers/src/designer-page-helpers.tsx:202-209`              | create-dialog 失败被压平成裸 `{ ok:false }`                                                     |
| 06-07 | 异步安全    | `packages/report-designer-renderers/src/field-panel-renderer.tsx`                     | insert/drop 忽略 resolved `{ ok:false }` 失败                                                   |
| 06-08 | 异步安全    | `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:86-118`              | 通用字段 async adapter 失败仍只日志可见                                                         |
| 06-09 | 异步安全    | `packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:171-212`  | SQL execute 主路径没有真实 abort                                                                |
| 06-10 | 异步安全    | `packages/report-designer-renderers/src/report-designer-toolbar.tsx:23`               | 默认 toolbar fire-and-forget dispatch 会静默丢失失败                                            |
| 07-01 | 生命周期    | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts:39-44`     | useResize 在 render 阶段直接 setState                                                           |
| 08-01 | 验证系统    | `packages/flux-runtime/src/form-runtime-owner.ts:497-557`                             | direct commit validateSubtree/validateAll 缺入口级 supersession                                 |
| 09-01 | 渲染器契约  | `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:117-126`             | `text` renderer 消费了未注册的 `tag` 字段                                                       |
| 09-02 | 渲染器契约  | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:265-279`      | detail-field 根控件丢失 meta.className/testid/cid                                               |
| 09-03 | 渲染器契约  | `packages/flux-renderers-form-advanced/src/tree-controls.tsx:199-205`                 | input-tree/tree-select 缺稳定 renderer root marker                                              |
| 09-05 | 渲染器契约  | `packages/flow-designer-renderers/src/designer-field.tsx:18-19`                       | designer-field.label 的 region 分支永远不生效                                                   |
| 09-08 | 渲染器契约  | `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:32-43`           | inspector shell/inner renderer 重复输出同一 node meta                                           |
| 10-01 | 样式系统    | `packages/flux-renderers-form/src/form-renderers.css:1-71`                            | form renderers 包级样式使用裸 `[data-slot]` 选择器，作用域会泄漏到包外                          |
| 10-02 | 样式系统    | `packages/flux-code-editor/src/code-editor-styles.css:15-286`                         | code-editor 样式同时存在裸 `[data-slot]` 选择器和硬编码颜色                                     |
| 11-02 | UI 组件     | `packages/flow-designer-renderers/src/designer-inspector.tsx:124-142`                 | Flow Designer inspector 分支卡片仍用 `div role=button`                                          |
| 11-03 | UI 组件     | `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:188-208` | Condition Builder 可移除值标签仍用 `Badge role=button`                                          |
| 12-01 | 字段与 Slot | `packages/flux-compiler/src/schema-compiler/node-compiler.ts:174-206`                 | `value-or-region + allowSource` 在 live compiler 中不可兑现                                     |
| 12-02 | 字段与 Slot | `packages/flux-compiler/src/schema-compiler/node-compiler.ts:214-228`                 | `FieldCompileContext.compileValue()` 类型允许传 `symbolTable`，实现却强制覆盖                   |
| 13-01 | 类型安全    | `packages/flux-bundle/src/types.ts:3-17`                                              | `flux-bundle` 公共 facade 把任意对象值错误收窄为必须带 `type`                                   |
| 13-02 | 类型安全    | `packages/flux-bundle/src/types.ts:26-31`                                             | `FluxApiRequestContext` 公共类型遗漏 `scope` / `env`                                            |
| 14-02 | 测试覆盖    | `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test.tsx`   | host-scope 测试文件混装四类职责且共享 mutable mocks                                             |
| 14-03 | 测试覆盖    | `packages/flux-react/src/__tests__/hook-surface-lifecycle-contracts.test.tsx`         | hook-surface-lifecycle 已成跨层 omnibus contract 文件                                           |
| 14-04 | 测试覆盖    | `packages/report-designer-renderers/src/renderers.integration.test.tsx`               | report renderers integration 混装 UI 集成与 provider 单元契约                                   |
| 14-05 | 测试覆盖    | `packages/flow-designer-renderers/src/designer-page.tree.test.tsx`                    | designer-page.tree 把 tree/graph/history/runtime props 混成同一入口                             |
| 15-04 | 安全与性能  | `packages/flux-runtime/src/action-adapter.ts:98-116`                                  | targeting 分支把批量 `setValues` 退化为 repeated `setValue`                                     |
| 15-05 | 安全与性能  | `packages/flux-runtime/src/form-runtime.ts:542`                                       | dependent revalidation 失败仍仅 console 可见                                                    |
| 15-07 | 安全与性能  | `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:112-159`      | formula data-source 缺 unchanged-value no-op guard                                              |
| 16-01 | 文档一致性  | `docs/plans/132-runtime-schema-dependency-elimination-plan.md`                        | Plan 132 已标 completed，但仍保留 deferred phase 与未勾选 closure/checklist 项                  |
| 16-02 | 文档一致性  | `docs/plans/108-form-field-consumer-performance-plan.md`                              | Plan 108 仍用旧式 Validation Checklist，并把 lint gate 写成带免责说明的已通过                   |
| 17-02 | 命名一致性  | `packages/report-designer-renderers/src/host-data.ts`                                 | Report Designer 当前选择目标仍并行发布 `selectionTarget` / `selection` / `target`               |
| 17-03 | 命名一致性  | `docs/components/report-designer-page/design.md`                                      | owner doc 仍写 `reportDocument.document.spreadsheet`，与 live `reportDocument.spreadsheet` 不符 |
| 18-01 | 跨包一致性  | `packages/report-designer-renderers/src/types.ts`                                     | `report-designer-page` 仍以 `designer` 承载顶层配置，而同类页面 renderer 已使用 `config`        |
| 19-01 | 错误保真度  | `packages/flux-action-core/src/action-dispatcher/action-runners.ts`                   | `monitor.onActionEnd` 仍非 fail-safe，监控回调抛错会污染主 dispatch                             |
| 19-02 | 错误保真度  | `packages/flux-action-core/src/action-dispatcher/action-execution.ts`                 | failure-class 且无 `onError` 时仍缺默认 observable failure fallback                             |
| 20-01 | 可访问性    | `packages/word-editor-renderers/src/panels/dataset-panel.tsx`                         | Word Editor dataset 主卡片仍以非语义 `div` 承担主激活路径                                       |
| 20-02 | 可访问性    | `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx`                                | Spreadsheet sheet rename 仍是 double-click only，无等价键盘或显式入口                           |

### P3

| 编号  | 维度        | 文件                                                                                 | 摘要                                                                                   |
| ----- | ----------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 02-07 | 模块职责    | `packages/flux-runtime/src/runtime-factory.ts`                                       | runtime-factory 同时承载 module cache、runtime boot、imports、registries 与 dispose    |
| 02-11 | 模块职责    | `packages/report-designer-core/src/core.ts`                                          | report-designer core 继续汇总 bootstrap、derived refresh、preview 与 registry mutation |
| 02-12 | 模块职责    | `packages/flux-runtime/src/async-data/reaction-runtime.ts`                           | reaction-runtime 混装执行引擎、全局测试钩子、registry 与 debug 快照                    |
| 02-14 | 模块职责    | `packages/flow-designer-core/src/tree-layout.ts`                                     | tree-layout 继续把 structured/simple/ELK 三套布局策略放在同一模块                      |
| 03-02 | API Surface | `docs/components/report-inspector-shell/design.md:15-27`                             | report-inspector-shell 的 docs/type/registration/runtime 仍有字段漂移                  |
| 04-01 | 状态所有权  | `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:163-176`          | 空态 `document` fallback 混入 live `charts/codes`                                      |
| 04-02 | 状态所有权  | `packages/report-designer-renderers/src/host-data.ts:180-187`                        | canonical 选择与 convenience 选择字段存在短暂不同步窗口                                |
| 04-03 | 状态所有权  | `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts:11-20`   | 默认 Undo/Redo 的启用态与执行 owner 不一致                                             |
| 04-06 | 状态所有权  | `packages/report-designer-core/src/core-dispatch.ts:319-322`                         | save 成功语义与 dirty/status 缺少统一 saved baseline owner                             |
| 04-08 | 状态所有权  | `packages/word-editor-renderers/src/word-editor-action-provider.ts:45-64`            | 显式保存会在 host save 成功前前移本地 recovery baseline                                |
| 05-02 | 响应式订阅  | `packages/flux-react/src/dialog-host.tsx:84,173`                                     | Dialog/Drawer host 仍保留 broad scope 订阅                                             |
| 05-04 | 响应式订阅  | `packages/flux-renderers-form/src/field-utils/field-presentation.tsx:59-65`          | non-form requiredness 欠订阅依赖路径                                                   |
| 05-05 | 响应式订阅  | `packages/flux-renderers-basic/src/page.tsx:18-20`                                   | PageRenderer 读取 `refreshTick` 时仍是 broad subscription                              |
| 06-01 | 异步安全    | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:199-250`  | variant-field 仅丢弃旧结果，未真实 abort 旧异步                                        |
| 06-04 | 异步安全    | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:305-309`     | detail-field confirm 失败仅 console 可见                                               |
| 06-05 | 异步安全    | `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:273-315` | object-field transformOut 失败仅日志可见                                               |
| 09-04 | 渲染器契约  | `packages/report-designer-renderers/src/page-renderer.tsx:559-563`                   | report-designer 家族多个 renderer 共用同一 root marker                                 |
| 09-06 | 渲染器契约  | `packages/flow-designer-renderers/src/index.tsx`                                     | designer-canvas/palette 把 className 错注册为 prop                                     |
| 09-07 | 渲染器契约  | `packages/flow-designer-renderers/src/designer-page.tsx:29-41`                       | designer-page fallback 根节点遗漏 root meta                                            |
| 11-01 | UI 组件     | `packages/flux-code-editor/src/code-editor-renderer/toolbar-button.tsx:27-52`        | Code Editor toolbar 仍用 `span role=button` 模拟按钮                                   |
| 13-03 | 类型安全    | `packages/flux-bundle/src/types.ts:71-78`                                            | `onActionError` 在公共 facade 中把 `ActionContext` 擦成了 `unknown`                    |
| 14-01 | 测试覆盖    | `tests/e2e/component-lab/simple-form.spec.ts:151-168`                                | input-password E2E 仍接受 validator-not-firing 的弱门禁                                |
| 15-01 | 安全与性能  | `packages/word-editor-core/src/document-io.ts:257-277`                               | 恢复路径把 storage/parse 异常折叠成空状态                                              |
| 15-02 | 安全与性能  | `packages/flux-runtime/src/form-runtime-status.ts:23-43`                             | `$form` broad summary 仍依赖非增量聚合与 summary stringify                             |
| 16-03 | 文档一致性  | `docs/plans/159-code-refactor-discovery-remediation-plan.md`                         | Plan 159 将 cancelled slice 记为 completed，phase 状态语义不合 guide                   |
| 17-01 | 命名一致性  | `packages/flow-designer-renderers/src/designer-context.ts`                           | Flow Designer host scope 同时暴露 `dirty` 与 `runtime.isDirty`                         |

## 零发现维度

- `01 依赖图与包边界`：独立复核确认当前包图、公开 subpath、manifest 与 `exports` map 基本对齐，未发现可报告边界缺陷。

## 建议优先级

1. 先处理全部 P1：`07-02`、`07-03`、`08-02`、`08-03`、`08-04`。这些都在 runtime owner/lifecycle 主路径。
2. 处理跨包公开契约漂移：`03-01`、`03-03`、`03-04`、`03-05`、`03-06`、`12-01`、`12-02`、`13-01`、`13-02`、`18-01`。
3. 处理结构性测试与文件边界问题：`02-*`、`14-*`。这组问题会持续放大后续维护和复核成本。
4. 处理错误可观测性与用户反馈缺口：`06-02`、`06-06`、`06-07`、`06-08`、`06-10`、`19-01`、`19-02`。

## 备注

- 本批次未改代码；仅完成深度审核归档。
- 本批次未运行 `typecheck`、`build`、`lint`、`test`；`02/14` 的文件大小基线使用了 `pnpm check:oversized-code-files`。
- `summary.md` 只汇总经过独立维度复核与必要子项复核后仍成立或被降级保留的条目。
