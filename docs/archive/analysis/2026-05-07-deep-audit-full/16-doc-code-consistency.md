# 16 Doc Code Consistency

- 深挖轮次: 1
- 深挖发现数: 3
- 维度复核: 1 保留 / 2 降级 / 0 驳回
- 子项复核: 已完成唯一 P1 条目复核，降级

## 第 1 轮初审

- plan guide 的 `Plan Status` 枚举与多份 live plans 不一致
- `AGENTS.md` 将 `@nop-chaos/flux-playground` 置于 Workspace Packages 清单，但物理位置在 `apps/`
- `terminology.md` 缺失 `ValidationScopeRuntime`

## 维度复核结论

保留:

- plan 状态枚举与 live plan 值不一致

降级:

- `flux-playground` 属于 apps vs packages 的表述不严谨
- `terminology.md` 缺失 `ValidationScopeRuntime`

## 子项复核结论

降级:

- plan status 条目更准确地说是“文档-文档规范漂移”，不是文档-代码漂移

## 最终保留项

### [维度16] `docs/plans` 指南里的 `Plan Status` 枚举已与 live plan 文件实际值分叉

- **文件**: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/219-table-row-scope-publication-and-invalidation-closure-plan.md`, `docs/plans/220-cross-boundary-state-and-host-contract-closure-plan.md`, `docs/plans/132-runtime-schema-dependency-elimination-plan.md`
- **严重程度**: P2
- **现状**: 指南枚举只接受空格风格与固定词表，但 live plan 使用了 `in_progress`、`completed (core scope)` 等未定义值
- **风险**: 审核、脚本和人工 closure 判断无法稳定依赖该字段
- **建议**: 要么统一回指南枚举，要么同步扩展 guide 并批量对齐 live plans
- **复核状态**: 子项复核通过（降级）
