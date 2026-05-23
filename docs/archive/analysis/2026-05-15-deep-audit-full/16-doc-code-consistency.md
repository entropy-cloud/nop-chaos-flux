# 维度 16：文档-代码一致性

## 第 1 轮（初审）

### [维度16-01] `report-inspector-shell` owner doc 仍与 live type、registration 和 root marker 漂移

- **文档路径**: `docs/components/report-inspector-shell/design.md`
- **代码路径**:
  - `packages/report-designer-renderers/src/types.ts`
  - `packages/report-designer-renderers/src/renderers.tsx`
  - `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`
- **严重程度**: P1
- **漂移类型**: 行为不一致 / 公开字段漂移
- **文档描述**: 文档仍写 `emptyLabel`、`saveLabel`、`errorLabel` 等字段与 `nop-report-inspector-shell` marker。
- **代码现状**: live type 和 registration 只剩 `title`、`noSelectionLabel`、`errorLabel`；renderer 根 marker 实际是 `nop-report-designer`。
- **建议**: 按 live type 与 renderer 更新组件文档，并删除失效字段和 marker 约定。
- **为什么值得现在做**: 这会直接误导接入者写无效字段，或错误依赖不存在的 root marker。
- **误报排除**: 不是“文档没那么新”的泛泛问题；当前 doc 与 live public surface 已明确分叉。
- **历史模式对应**: 对应 renderer public contract 文档漂移。
- **参考文档**: `docs/components/report-inspector-shell/design.md`
- **复核状态**: 未复核

### [维度16-02] `field-metadata-slot-modeling.md` 把 `allowSource` 描述成通用字段能力，但 live compiler 无法兑现 `value-or-region + allowSource`

- **文档路径**: `docs/architecture/field-metadata-slot-modeling.md`
- **代码路径**: `packages/flux-compiler/src/schema-compiler/node-compiler.ts`
- **严重程度**: P1
- **漂移类型**: 行为不一致
- **文档描述**: owner doc 以现行契约口吻描述 `allowSource?: boolean` 是字段级能力。
- **代码现状**: live compiler 对 `value-or-region` 先做 `isSchemaInput(value)` 判定，`{ type: 'source' }` 会先进入 region/schema 路径，无法走 value-channel source 语义。
- **建议**: 要么补齐 compiler 支持，要么收窄 owner doc，明确当前不支持该组合。
- **为什么值得现在做**: 当前描述会误导 renderer 与 DSL 扩展者以为该组合可用，实际语义跑偏。
- **误报排除**: 不是 draft-doc 噪音；这是 active architecture doc 与 live compiler 的真实 contract drift。
- **历史模式对应**: 对应 field metadata owner doc 先于实现收敛造成的 live drift。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

### [维度16-03] `FieldCompileContext.compileValue()` 文档和类型允许传 `symbolTable`，但 live 实现会强制覆盖

- **文档路径**: `docs/architecture/field-metadata-slot-modeling.md`
- **代码路径**: `packages/flux-compiler/src/schema-compiler/node-compiler.ts`
- **严重程度**: P2
- **漂移类型**: 行为不一致
- **文档描述**: 文档和公开接口都把 `compileValue(..., options?: Omit<ExpressionCompileOptions, 'sourcePath'>)` 描述成可传编译选项。
- **代码现状**: live implementation 在 `compileValue` 内固定写回外层 `symbolTable`，调用方传入不会生效。
- **建议**: 让实现与 contract 对齐，或在文档和类型里明确 `symbolTable` 不可覆盖。
- **为什么值得现在做**: 这会误导 renderer-owned custom compile 的实现者，属于低频但真实的 public compile contract drift。
- **误报排除**: 不是抽象化简；同一上下文里的 `compileSchema()` 又会尊重 `compileOptions?.symbolTable`，说明这里确实不一致。
- **历史模式对应**: 对应 compiler helper API 文档与实现漂移。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

### [维度16-04] `designer-page` owner doc 要求 `config` 和 `document` 必填，但 live public schema type 仍暴露为可选

- **文档路径**: `docs/components/designer-page/design.md`
- **代码路径**:
  - `packages/flow-designer-renderers/src/schemas.ts`
  - `packages/flow-designer-renderers/src/index.tsx`
  - `packages/flow-designer-renderers/src/designer-page.tsx`
- **严重程度**: P1
- **漂移类型**: 公开契约漂移
- **文档描述**: owner doc 明确写 `document` / `config` 是必填宿主输入。
- **代码现状**: `DesignerPageSchemaInput` 仍是 `config?` / `document?`，runtime 缺失时走 `configRequired` / `documentRequired` fallback。
- **建议**: 若确为必填，则把 public schema type 收紧；若仍允许缺失，则收窄 owner 文档表述。
- **为什么值得现在做**: 当前是“类型允许、runtime 报错页”的接入偏差，会直接误导宿主接线。
- **误报排除**: 不是单纯 type drift；它已经反向破坏 owner doc 所宣告的 public contract。
- **历史模式对应**: 对应 host page public schema type 与 owner doc 不一致。
- **参考文档**: `docs/components/designer-page/design.md`
- **复核状态**: 未复核

### [维度16-05] 活跃 Plan 281 的 current baseline 已被同日日志推翻，但文本仍保留已修 blocker 为 live

- **文档路径**: `docs/plans/281-deep-audit-2026-05-14-runtime-owner-lifecycle-validation-closure-plan.md`
- **代码路径**: `docs/logs/2026/05-14.md`
- **严重程度**: P1
- **漂移类型**: 计划状态失真
- **文档描述**: `Current Baseline` / `Closure Audit Evidence` 仍写 retained Report Designer truth-surface items `04-03/04-06` live。
- **代码现状**: 同日开发日志已明确记录这些 truth-surface/history/saved-baseline 问题已落地修复，并同步了 owner docs。
- **建议**: 更新 plan baseline、evidence 和 phase 文本，去掉已修 blocker，并校正未勾选 exit criteria 与 phase 标记。
- **为什么值得现在做**: 活跃 plan 会直接误导后续 closure audit，把已完成项继续当 blocker。
- **误报排除**: 不是历史旧计划噪音；该文件仍是活跃计划且文本失真明显。
- **历史模式对应**: 对应活跃 plan baseline 被新日志推翻但未回写。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md`
- **复核状态**: 未复核

### [维度16-06] 活跃 Plan 282 的 phase 状态与自身 exit criteria 明显冲突

- **文档路径**: `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md`
- **代码路径**: 无直接代码对应；属 plan 自身状态失真
- **严重程度**: P1
- **漂移类型**: 计划状态失真
- **文档描述**: `Phase 1 - Public Surface And Typing Closure` 被标为 `completed`。
- **代码现状**: 同一 phase 的主 exit criterion 仍未满足，phase 内仍保留未完成 public-contract items。
- **建议**: 将 phase 状态改回未完成，或补齐 exit criteria 与剩余项后再标记完成。
- **为什么值得现在做**: 会误导后续审阅者把 Phase 1 当成已收口，而不是仅落了最小 slice。
- **误报排除**: 这与 plan authoring guide 的 phase-complete 规则直接冲突，不是措辞偏好。
- **历史模式对应**: 对应活跃 plan 内部状态与 exit criteria 冲突。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md`
- **复核状态**: 未复核

### [维度16-07] 三份历史 plan baseline drift 仍 live，当前仅被 Plan 285 挂起接管

- **文档路径**:
  - `docs/plans/132-runtime-schema-dependency-elimination-plan.md`
  - `docs/plans/108-form-field-consumer-performance-plan.md`
  - `docs/plans/159-code-refactor-discovery-remediation-plan.md`
  - `docs/plans/285-deep-audit-2026-05-14-plan-baseline-normalization-plan.md`
- **代码路径**: `docs/analysis/2026-05-14-deep-audit-batch1/16-doc-code-consistency.md`
- **严重程度**: P2
- **漂移类型**: 计划状态失真
- **文档描述**: 这三项历史计划与 batch1 的保留结论一致，当前仓库仍未修正。
- **代码现状**: Plan 285 只是 `planned`，所以这些误导性文本仍 live。
- **建议**: 在 Plan 285 执行前，至少给三份旧计划补显式“已失真/待归一化”提示，避免继续误导 closure audit。
- **为什么值得现在做**: 这些历史计划仍会被执行者当基线引用。
- **误报排除**: 不是重复报告旧问题；本轮复核确认 drift 仍未处理。
- **历史模式对应**: 对应历史计划 baseline drift 被新 plan 挂起但未标记失真。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度16-01]：驳回。`report-inspector-shell` 文档与 live type/marker 已基本对齐。
- [维度16-02]：驳回。live compiler 已补上 `allowSource + value-or-region` 的关键判定保护。
- [维度16-03]：驳回。`compileValue()` 已尊重传入的 `symbolTable`。
- [维度16-04]：降级为 P2。真实漂移收窄为 `document` 必填/条件必需的表述不精确，`config` 必填指控不成立。
- [维度16-05]：驳回。Plan 281 现已转为历史计划，保留执行前 baseline 不等于 live 断言失真。
- [维度16-06]：保留 (P1)。Phase 1 标记与未满足的 exit criteria 直接冲突。
- [维度16-07]：降级为 P2。历史 plan drift 仍在，但已被 Plan 285 显式接管，更像历史文本治理 backlog。

## 子项复核结论

- [维度16-06]：成立。plan phase 状态与自身 closure 条件冲突。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                            | 一句话摘要                                  |
| ----- | -------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| 16-06 | P1       | `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md` | Phase 1 已标完成但主 exit criteria 仍未满足 |
