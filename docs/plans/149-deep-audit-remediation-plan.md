# 149 Deep Audit Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-04-28
> Source: `docs/analysis/2026-04-27-deep-audit-full/summary.md` + 全部 18 份维度详细报告 (18-dimension deep audit, 38 sub-agents + 3 review sub-agents)
> Related: None

## Purpose

把 2026-04-27~28 深度审核中确认的 1 个 P1 和高 ROI P2 修正项落地到代码和文档中，使审核发现的契约违约、可观测性缺失、样式残留、文档漂移全部收敛。

## Current Baseline

- 全量 18 维度深度审核已完成，结果归档在 `docs/analysis/2026-04-27-deep-audit-full/`
- 1 个 P1：variant-field 手动实例化 FieldFrame 缺少 7 个 BoundFieldSchemaBase 属性
- 20 个 P2 经独立复核确认保留，本计划覆盖 WS1（P1）+ WS2-WS6（5 个 P2 修正主题，覆盖约 10 个 P2 条目），其余 P2 defer 到 successor plan
- 维度 09 的 8 个渲染器 testid/cid 发现经三轮独立验证确认为**误报**（均有 `wrap: true`，FieldFrame 已提供 testid/cid），不纳入本计划
- 10 个 P3 观察项不纳入本计划
- `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 当前全部通过

## Goals

1. 修复 P1：variant-field FieldFrame 属性转发不完整（required/hint/description/remark/labelRemark/labelAlign/labelWidth）
2. 清除 2 处 BEM `--` 修饰符残留（含 label-top + label-left + tabs-mode + sidebar-right），迁移到 data 属性
3. 为 schema-compiler 异常吞噬添加结构化诊断收集
4. 修正 flux-runtime-module-boundaries.md 中不存在的 debounce.ts 路径
5. 为 variant-field 和 detail-field 的异步操作添加卸载保护
6. 拆分 2 个超过 700 行的测试文件

## Non-Goals

- 维度 09 的 8 个渲染器 testid/cid（P2，误报）：均有 `wrap: true`，FieldFrame wrapper 已提供 testid/cid
- ScopeRef Record<string, any> → unknown（P2，dim 13）：改为 unknown 会产生大量类型断言噪音，独立排期
- ui 包测试覆盖（P2，dim 14）：shadcn re-export，核心逻辑在上游，独立排期
- spreadsheet/flow-designer 测试覆盖（P2，dim 14）：domain 包仍在演进中，独立排期
- 16 个测试文件在 500-700 行（P2，dim 14）：需逐文件评估，lint/check 仅对 >700 行报错，独立排期
- P3 观察项（crud-renderer 类名、Context Provider value 稳定性、code-editor 注册模式、crud-renderer-toolbar label、word-editor localStorage）不纳入
- reaction-runtime/source-registry 全量 store subscribe 改为 per-path — 架构性改动较大，独立排期
- useSurfaceScopeSnapshot 过宽订阅 — 同上
- detail-view 使用 FieldLabel 而非 FieldFrame — 需要先定义 FieldFrame 只读模式，独立排期
- form-validation.md / form-validation-runtime-types.md 类型漂移修正 — 文档重构范围较大，独立排期
- Plan 138 状态矛盾、form-validation.md Phase 标注缺失 — 文档治理问题，独立排期
- condition-builder any[] 类型收敛 — 影响面需单独评估
- RendererRendererClass 重命名 — 涉及公共 API 改名，需 deprecation cycle
- adaptor/adapter 拼写统一 — 影响面需单独评估
- spreadsheet .js 后缀移除 — 功能正确，仅风格问题

## Scope

### In Scope

| WS | 维度 | 文件 | 问题 |
|----|------|------|------|
| 1 | 12 | `variant-field.tsx` | P1: FieldFrame 缺少 7 个 BoundFieldSchemaBase 属性 |
| 2 | 10 | `field-frame.tsx`, `default-spacing.css`, `field-frame-layout.test.tsx`, `tabs.tsx` | BEM `--` 修饰符残留（含 label-left + sidebar-right） |
| 3 | 15 | `schema-compiler.ts`, `schema-diagnostics.ts`（flux-core） | 编译异常吞噬 + 扩展 SchemaDiagnosticCode |
| 4 | 16 | `flux-runtime-module-boundaries.md` | 文档路径失效 |
| 5 | 18 | `variant-field.tsx`, `detail-field.tsx` | 异步操作卸载保护（stale-check 模式） |
| 6 | 02/14 | `object-field.test.tsx`, `controller-inspect.test.ts` | 测试文件超 700 行 |

### Out Of Scope

- 所有 Non-Goals 中列出的项目

## Execution Plan

6 个 Workstream。WS1 和 WS5 共同修改 `variant-field.tsx`，**必须串行**（WS1 完成后再执行 WS5）。其余 Workstream 互相独立，可并行。

依赖关系：
```
WS1 (variant-field FieldFrame) → WS5 (variant-field 异步保护)  [串行]
WS2, WS3, WS4, WS6 各自独立 [并行]
```

### Workstream 1 - variant-field FieldFrame 属性补全

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`

**取值来源**（参考 `node-frame-wrapper.tsx:24-51`）：

| 属性 | 取值方式 |
|------|----------|
| `required` | `schemaProps.required`（运行时解析后的值） |
| `hint` | `schema.hint` |
| `description` | `schema.description` |
| `remark` | `schema.remark`，需经 `toFieldRemarkProps()` 转换 |
| `labelRemark` | `schema.labelRemark`，需经 `toFieldRemarkProps()` 转换 |
| `labelAlign` | `schema.labelAlign`，`'inherit'` 映射为 `undefined` |
| `labelWidth` | `schema.labelWidth` |

**前置条件**：`toFieldRemarkProps()` 当前是 `node-frame-wrapper.tsx` 的私有函数（非公开导出）。需要先将其提取为公共工具函数或 inline 等价转换逻辑。

- [ ] 提取 `toFieldRemarkProps()` 为公共工具函数（或在 variant-field 中 inline 等价逻辑）
- [ ] 在 variant-field.tsx 中从 `schema`（类型 `VariantFieldSchema`）读取 hint/description/remark/labelRemark/labelAlign/labelWidth
- [ ] 从 `schemaProps`（运行时解析值）读取 required
- [ ] 将这 7 个属性传递给手动实例化的 `<FieldFrame>`
- [ ] labelAlign 值为 `'inherit'` 时映射为 `undefined`
- [ ] 添加单元测试验证 variant-field 与 FieldFrame 的属性传递（至少覆盖 required、labelAlign、hint 三个关键属性）

Exit Criteria:

- [ ] variant-field 传递给 FieldFrame 的属性与 NodeFrameWrapper 一致（7 个缺失属性全部补全）
- [ ] 新增测试通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 通过
- [ ] 确认 `docs/architecture/field-metadata-slot-modeling.md` 无需同步更新（或已更新）
- [ ] `docs/logs/` 对应日期条目已更新

### Workstream 2 - BEM `--` 修饰符清除

Status: completed
Targets: `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/default-spacing.css`, `packages/flux-react/src/__tests__/field-frame-layout.test.tsx`, `packages/flux-renderers-basic/src/tabs.tsx`

**完整替换清单**：

| 旧类名 | 出现位置 | 新方案 |
|--------|----------|--------|
| `nop-field--label-top` | field-frame.tsx:116, default-spacing.css, field-frame-layout.test.tsx | `data-label-align="top"` 属性 |
| `nop-field--label-left` | field-frame.tsx:116, default-spacing.css, field-frame-layout.test.tsx | `data-label-align="left"` 属性 |
| `nop-tabs--${tabsMode}` | tabs.tsx:131 | `data-tabs-mode="${tabsMode}"` 属性 |
| `nop-tabs--sidebar-right` | tabs.tsx:132 | 独立布尔属性 `data-tabs-sidebar-right`（与 data-tabs-mode 分开，避免属性冲突） |

- [ ] field-frame.tsx: 将 `isLabelTop ? 'nop-field--label-top' : 'nop-field--label-left'` 替换为 `data-label-align` 属性
- [ ] default-spacing.css: 将 `.nop-field--label-top` 和 `.nop-field--label-left` CSS 选择器迁移为 `.nop-field[data-label-align="top"]` 和 `.nop-field[data-label-align="left"]`
- [ ] field-frame-layout.test.tsx: 将 3 处 `toContain('nop-field--label-*')` 断言和 2 处 `it()` 描述字符串更新为对应的 data 属性检查
- [ ] tabs.tsx: 将 `nop-tabs--${tabsMode}` 替换为 `data-tabs-mode` 属性，将 `nop-tabs--sidebar-right` 替换为独立布尔属性 `data-tabs-sidebar-right`（无 CSS 消费方）
- [ ] 搜索全代码库确认无其他消费方依赖被替换的类名（grep `nop-field--` 和 `nop-tabs--`）
- [ ] 搜索架构文档确认无引用需要同步（`docs/architecture/styling-system.md`、`docs/architecture/container-spacing-design.md`、`docs/architecture/renderer-markers-and-selectors.md`）

Exit Criteria:

- [ ] `nop-field--` 和 `nop-tabs--` 类名不再出现在源码和测试中
- [ ] 功能不变（labelAlign 和 tabsMode 的视觉效果保持一致）
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm --filter @nop-chaos/flux-react test` 通过
- [ ] 确认 `docs/architecture/styling-system.md`、`container-spacing-design.md`、`renderer-markers-and-selectors.md` 已同步更新（或确认无需更新）
- [ ] `docs/logs/` 对应日期条目已更新

### Workstream 3 - schema-compiler 异常可观测性

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-core/src/schema-diagnostics/index.ts`

**技术背景**：
- catch 块位于 `validateSchemaInput()` 函数（非主编译路径 `compile()`）
- `SchemaCompilerDiagnosticsContext` 已存在，可直接复用其 `emit()` 方法
- `SchemaDiagnosticCode` 联合类型当前缺少通用内部错误码，需扩展

- [ ] 在 `packages/flux-core/src/schema-diagnostics/index.ts` 的 `SchemaDiagnosticCode` 联合类型中新增 `'unhandled-compilation-error'` 值
- [ ] 在 `schema-compiler.ts` 的 `validateSchemaInput` catch 块中，将异常通过 `diagnostics.emit()` 收集（含错误消息和可用上下文）
- [ ] 不中断编译流程（保持 continueOnError 行为）
- [ ] scope 明确：仅修复 `validateSchemaInput`，不修改 `compile()` 主路径（后者直接 throw，属于正常传播）

Exit Criteria:

- [ ] `validateSchemaInput` 中的编译异常不再被静默吞噬，而是收集到 diagnostics 列表中
- [ ] 新增的 `'unhandled-compilation-error'` 诊断码在 `SchemaDiagnosticCode` 类型中存在
- [ ] 现有编译行为不变（不中断编译）
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm --filter @nop-chaos/flux-compiler test` 通过
- [ ] `docs/logs/` 对应日期条目已更新

### Workstream 4 - 文档路径修正

Status: completed
Targets: `docs/architecture/flux-runtime-module-boundaries.md`

- [ ] 将第 181 行 `packages/flux-action-core/src/utils/debounce.ts` 修正为 `packages/flux-core/src/utils/debounce.ts`
- [ ] 补充说明：debounce 由 flux-core 实现，flux-action-core 通过 re-export 消费
- [ ] 扫描该文档其余 `packages/.../src/...` 路径，确认无其他失效引用

Exit Criteria:

- [ ] 文档中所有 `packages/.../src/...` 路径指向真实存在的文件
- [ ] 验证 `packages/flux-action-core/src/index.ts` 确有从 `@nop-chaos/flux-core` re-export debounce 函数
- [ ] `docs/logs/` 对应日期条目已更新

### Workstream 5 - 异步操作卸载保护

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`

**前置条件**：WS1 完成后再执行（共改 variant-field.tsx）

**技术约束**：
- `dispatch()` 不接受 AbortSignal 参数，无法真正取消底层异步操作
- detail-field.tsx 没有 useEffect，异步操作由事件处理器触发
- 正确方案是使用 **stale-check 模式**（ref 标记组件是否仍然 mounted），防止卸载后的 state 更新

- [ ] variant-field.tsx: 为 `runDetectVariantAction`（useEffect 触发的 dispatch）添加 mounted ref 保护，在 useEffect cleanup 中标记卸载
- [ ] variant-field.tsx: 评估 `handleVariantSwitch`（事件触发）是否需要并发保护（后发先至是否可接受）
- [ ] detail-field.tsx: 新增 useEffect 初始化 mounted ref，在 `handleOpen` 和 `handleConfirm` 的 async 回调中检查 mounted 标志，卸载后跳过 state 更新
- [ ] 为两个组件分别添加测试验证卸载保护行为

Exit Criteria:

- [ ] variant-field 的 useEffect 触发的异步操作在组件卸载后不再执行 state 更新
- [ ] detail-field 的 handleOpen/handleConfirm 在组件卸载后不再执行 state 更新
- [ ] 新增卸载保护测试通过
- [ ] 现有测试通过，无功能回归
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `docs/logs/` 对应日期条目已更新

### Workstream 6 - 测试文件拆分

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/composite-field/object-field.test.tsx`, `packages/nop-debugger/src/controller-inspect.test.ts`

- [ ] object-field.test.tsx (755 行): 按领域拆分为 2-3 个文件（如渲染测试、验证测试、嵌套/联动测试）
- [ ] controller-inspect.test.ts (750 行): 按检查功能域拆分为 2-3 个文件
- [ ] 共享 setup/mocks 提取到辅助文件（如需要）
- [ ] 确认拆分后每个文件 <500 行
- [ ] 确认拆分后所有测试仍然通过

Exit Criteria:

- [ ] 拆分后每个测试文件 <500 行
- [ ] 拆分前后测试总数一致（无遗漏 describe/it 块）
- [ ] `pnpm test` 全部通过
- [ ] `pnpm check:oversized-code-files` 对拆分后的文件无 700 行报错
- [ ] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [ ] 所有 6 个 Workstream 的 Exit Criteria 全部满足
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm check:oversized-code-files` 无 700 行报错
- [ ] `docs/logs/` 已更新
- [ ] 独立子 agent closure audit 已完成并记录证据

## Closure

Status Note: All 6 workstreams completed successfully. P1 fixed, BEM cleanup done, compiler observability added, doc path corrected, async unmount protection added, test files split.

Closure Audit Evidence:

- Reviewer / Agent: opencode (glm-5.1)
- Evidence:
  - WS1: variant-field.tsx now passes all 7 BoundFieldSchemaBase attributes to FieldFrame
  - WS2: grep confirms zero `nop-field--` or `nop-tabs--` in source/tests; data attributes used instead
  - WS3: `unhandled-compilation-error` added to SchemaDiagnosticCode; validateSchemaInput catch block emits diagnostic
  - WS4: flux-runtime-module-boundaries.md debounce path corrected to flux-core with re-export note
  - WS5: mountedRef stale-check added to variant-field (useEffect) and detail-field (handleOpen/handleConfirm)
  - WS6: object-field.test.tsx split into 3 files (<320 lines each); controller-inspect.test.ts split into 2 files (<450 lines each); test counts preserved
  - `pnpm typecheck` ✓, `pnpm build` ✓, `pnpm lint` ✓, `pnpm test` ✓, `pnpm check:oversized-code-files` 0 errors

Follow-up:

以下 P2 项未纳入本计划，需在后续 successor plan 中处理：
1. reaction-runtime/source-registry per-path subscribe
2. useSurfaceScopeSnapshot 订阅收窄
3. detail-view FieldLabel → FieldFrame
4. form-validation.md / form-validation-runtime-types.md 类型漂移修正
5. Plan 138 状态矛盾修正
6. form-validation.md Phase 标注缺失修正
7. condition-builder any[] 类型收敛
8. RendererRendererClass 重命名（需 deprecation cycle）
9. adaptor/adapter 拼写统一
10. spreadsheet .js 后缀移除
11. ScopeRef Record<string, any> → unknown
12. ui 包测试覆盖提升
13. spreadsheet/flow-designer 测试覆盖
14. 16 个测试文件在 500-700 行范围
