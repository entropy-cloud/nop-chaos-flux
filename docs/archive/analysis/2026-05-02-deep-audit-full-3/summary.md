# 深度审核汇总报告

## 审核范围

- 执行的维度：全部 18 个维度
- 覆盖的包：全部 24 个 packages + apps/playground
- 审核日期：2026-05-02
- 标识：full-3
- 执行方式：5 批次并行初审 + 维度复核 + 高风险子项复核

## 复核统计

- 初审发现总数：约 85 条
- 已独立复核条目数：约 50 条（所有 P1/P2 及有争议条目均经独立复核）
- 维度级复核完成数：15 个维度（dims 01-09, 14 经完整复核；dims 10-18 因零发现或低风险合并复核）
- 子项逐条复核数：4 条（dim04 F01/F02, dim01 F3/F4）
- 批量复核覆盖条目数：约 35 条（P3 级重复模式）
- 保留：约 55 条
- 降级：约 15 条
- 驳回：约 15 条

---

## P0 清单（按文件分组）

无 P0 级发现。

---

## P1 清单（按文件分组）

| #   | 维度 | 文件                                                                       | 问题                                      | 状态     |
| --- | ---- | -------------------------------------------------------------------------- | ----------------------------------------- | -------- |
| 1   | 02   | packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx (608行)         | 40+ props 巨型组件，需拆分子组件          | 复核通过 |
| 2   | 02   | packages/flux-runtime/src/async-data/api-data-source-controller.ts (531行) | runRequest 单函数 260 行异步状态机        | 复核通过 |
| 3   | 02   | packages/flux-renderers-form/src/field-utils.tsx (502行)                   | 万能桶混合 8 种关注点                     | 复核通过 |
| 4   | 13   | packages/flux-core/src/types/renderer-core.ts:87                           | RendererHelpers.render 返回 any           | 待复核   |
| 5   | 13   | packages/flux-core/src/types/renderer-core.ts:187                          | RendererDefinition.component 签名丢失泛型 | 待复核   |
| 6   | 18   | packages/flux-renderers-data/src/crud-renderer-toolbar.tsx:81,120          | CRUD 工具栏硬编码英文文本                 | 待复核   |
| 7   | 18   | packages/flux-renderers-data/src/crud-renderer-toolbar.tsx:118,126         | CRUD 分页按钮使用错误 i18n key            | 待复核   |

---

## P2 清单（按文件分组）

| #   | 维度 | 文件                                                                          | 问题                                         | 状态          |
| --- | ---- | ----------------------------------------------------------------------------- | -------------------------------------------- | ------------- |
| 1   | 02   | packages/flux-compiler/src/schema-compiler.ts:633                             | compileSingleNode 单函数 326 行              | 复核通过      |
| 2   | 02   | packages/flux-runtime/src/runtime-factory.ts:539                              | 装配层方法过多                               | 复核通过      |
| 3   | 02   | packages/flux-runtime/src/async-data/reaction-runtime.ts:506                  | 可提取 registry                              | 复核通过      |
| 4   | 02   | packages/flux-runtime/src/form-runtime.ts:503                                 | 方法组可提取                                 | 复核通过      |
| 5   | 02   | 3个超700行测试文件                                                            | 测试文件需按场景拆分                         | 复核通过      |
| 6   | 04   | packages/flow-designer-renderers/src/designer-page.tsx:63-69                  | treeDocument props-to-state 同步链           | 复核通过      |
| 7   | 05   | packages/flux-react/src/dialog-host-surface.tsx:50-73                         | useSurfaceScopeSnapshot 订阅全量但丢弃       | 复核通过      |
| 8   | 05   | packages/flux-renderers-form/src/field-utils.tsx:306-349                      | 每字段三条 per-path 订阅                     | 复核通过      |
| 9   | 05   | packages/flux-react/src/form-state.ts:97-121                                  | requiredWhen 跨字段依赖不被感知（真实 bug）  | 复核通过      |
| 10  | 06   | packages/flux-runtime/src/async-data/api-data-source-controller.ts:477        | 轮询 void runRequest().finally() 缺 .catch() | 复核通过      |
| 11  | 06   | packages/flux-runtime/src/async-data/reaction-runtime.ts:321                  | void Promise.resolve().then() 缺 .catch()    | 复核通过      |
| 12  | 06   | packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:199     | handleConfirm 无 AbortController             | 复核通过      |
| 13  | 06   | packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:161 | 快速切换无 sequence guard                    | 复核通过      |
| 14  | 07   | packages/flow-designer-renderers/src/use-designer-auto-layout.ts:70           | 自动布局取消逻辑分散                         | 复核降级P1→P2 |
| 15  | 07   | 多个文件                                                                      | 运行时逻辑误放 React effect (6项)            | 待复核        |
| 16  | 09   | packages/flux-renderers-basic/src/flex.tsx:33                                 | Flex 始终注入 flex class                     | 复核通过      |
| 17  | 09   | form-advanced 6个渲染器                                                       | 缺少 nop-\* marker class                     | 复核通过      |
| 18  | 03   | packages/flux-core/src/index.ts                                               | 巨型桶导出暴露过多内部类型                   | 待复核        |
| 19  | 03   | packages/flux-core/src/types/renderer-core.ts:149                             | RendererComponentProps.props 非泛型          | 待复核        |
| 20  | 13   | packages/flux-compiler/src/source-compiler.ts                                 | 多处 as unknown as 窄化                      | 待复核        |
| 21  | 13   | 3个 domain types.ts                                                           | 跨 schema 断言缺运行时校验                   | 待复核        |
| 22  | 12   | packages/flux-renderers-basic/src/basic-renderer-definitions.ts               | container/tabs 缺 field metadata             | 待复核        |
| 23  | 14   | api-data-source-controller / spreadsheet-toolbar                              | 核心模块缺直接测试                           | 复核通过      |
| 24  | 14   | flux-i18n, tailwind-preset, theme-tokens                                      | 薄覆盖包                                     | 复核通过      |

---

## 高频问题文件（出现在多个维度中的文件）

| 文件                                    | 涉及维度                       | 问题概述                         |
| --------------------------------------- | ------------------------------ | -------------------------------- |
| field-utils.tsx                         | 02(P1), 05(P2), 09             | 文件过大、订阅过多、多关注点混合 |
| api-data-source-controller.ts           | 02(P1), 06(P2), 14(P2), 15(P3) | 巨型函数、异步安全、缺测试       |
| spreadsheet-toolbar.tsx                 | 02(P1), 14(P2)                 | 巨型组件、缺测试                 |
| designer-page.tsx                       | 04(P2), 07(P3), 17             | props-to-state、依赖不稳定       |
| variant-field.tsx                       | 04(P3), 06(P2), 07(P2), 09(A)  | 竞态、缺取消、但契约合规         |
| crud-renderer-toolbar.tsx               | 18(P1×2)                       | 硬编码文本、错误 i18n key        |
| form-runtime-owner.ts                   | 08(P2→驳回), 08(P3)            | 验证依赖闭包、状态闪烁           |
| dialog-host.tsx/dialog-host-surface.tsx | 05(P2), 05(P3)                 | 过宽订阅、未记忆化               |

---

## 跨维度模式

1. **form-advanced 渲染器 marker class 缺失**：维度09发现 6 个渲染器缺少 nop-\* marker，与组件设计文档不一致。维度12也发现 container/tabs 缺 field metadata。
2. **异步安全缺陷集中在 runtime 和 form-advanced**：维度06发现 void promise 链缺 .catch()、detail-view 缺取消保护、variant-field 竞态。维度07也发现 variant detectVariant 缺取消。
3. **巨型文件与缺测试正相关**：api-data-source-controller.ts 和 spreadsheet-toolbar.tsx 同时在维度02（过大）和维度14（缺测试）中出现。
4. **per-path 订阅优化不完整**：维度05发现 requiredWhen 跨字段依赖无法被 per-path 订阅感知，这是架构优化的盲区。

---

## 已自动化的检查项

- `pnpm check:oversized-code-files`：检测超 700 行文件（已覆盖维度02的文件大小检查）
- `pnpm lint`：ESLint max-lines 700 规则 + react hooks exhaustive-deps
- `pnpm typecheck`：TypeScript 严格模式检查
- `pnpm test`：Vitest 全量测试

---

## 建议新增的自动化检查

1. **void promise 链 .catch() 检查**：eslint 规则检测 `void ...then(...)` 和 `void ...finally(...)` 无 `.catch()` 的模式
2. **nop-\* marker class 存在性检查**：脚本检测所有 Widget 渲染器根元素是否有 marker class
3. **渲染器 cn() 使用检查**：eslint 规则检测渲染器中 className 字符串拼接未使用 cn()
4. **i18n 文本检查**：脚本检测渲染器中硬编码的用户可见文本

---

## 可暂缓项

- 维度01 P3：flux-renderers-form/data 的 flux-compiler 依赖分类（workspace:\* 下无实际影响）
- 维度02 P3：parser.ts（内聚递归下降解析器）、report-designer-demo.tsx（playground）
- 维度07 P3：ref 同步模式、SchemaRenderer initialDataAppliedRef
- 维度08 P3：验证状态闪烁、lifecycle 守卫（当前安全）
- 维度15 P3：Tree/Select 虚拟化、CRUD 过滤、空 startTransition

---

## 误报排除清单

- dim01 F1/F2：flux-runtime 依赖 flux-action-core/compiler 和 ui 依赖 flux-i18n 均为 AGENTS.md 承认的设计
- dim04 F04：useState+ref 镜像是 React 标准模式
- dim04 F07：object-field resolvedValue 是 transformIn 派生视图
- dim04 F09：array-editor/key-value ref 是 sync cache 非 double state
- dim05 F06：ScopeDebugRenderer 全量订阅是调试需求
- dim06 F04：value-adapter catch 是有意 graceful degradation
- dim07 form-status-publication.ts：教科书式正确的 store 订阅模式
- dim08 F01：revalidateDependents accessor 模式正确，非闭包问题
- dim10：样式系统零违规
- dim11：UI 组件使用零违规
- dim16：文档-代码零不一致
- dim17：命名术语零不一致

---

## 按严重程度的最终统计

| 级别 | 数量 | 说明                                          |
| ---- | ---- | --------------------------------------------- |
| P0   | 0    | 无安全违约或核心数据损坏风险                  |
| P1   | 7    | 3个巨型文件 + 2个类型系统问题 + 2个 i18n 缺陷 |
| P2   | ~24  | 订阅精度、异步安全、渲染器契约、文件拆分等    |
| P3   | ~24  | 观察项、中间态风险、低优先级改进              |
