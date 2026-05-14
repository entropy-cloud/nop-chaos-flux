# 维度 16：文档-代码一致性

## 第 1 轮（初审）

本维度复核后存在 3 项可报告问题，均为 `docs/plans/` live 文件与 `docs/plans/00-plan-authoring-and-execution-guide.md` 的明确格式或闭环要求不一致。

### [维度16-01] Plan 132 已标 `completed`，但仍保留 deferred phase 与未勾选 closure/checklist 项

- **文件**: `docs/plans/132-runtime-schema-dependency-elimination-plan.md`
- **证据片段**:

  ```md
  > Plan Status: completed
  > ...

  ## Phase 4: DevTools Compatibility

  Status: deferred
  ...

  - [ ] DevTools still works
  ```

- **严重程度**: P2
- **现状**: plan 顶部已声明 `completed`，但文件内部仍保留 deferred phase 与未勾选 checklist；同时使用 `Validation Checklist` 而不是 guide 要求的 `Closure Gates` 结构。
- **风险**: closure audit 容易把“核心目标 landing”误读成“整份 plan 可关闭”，让剩余工作失去明确归属。
- **建议**: 按 guide 重写 closure 形态：要么降级为 `partially completed`/`deferred`/`superseded`，要么把剩余项移入显式 successor ownership，并补齐 `Closure Gates` 与 closure-audit 证据。
- **误报排除**: 不是因为 plan 中存在 deferred 工作就机械报错；问题在于 guide 明确要求 `completed` 前不得残留未关闭的 slice 或 checklist。
- **复核状态**: 未复核

### [维度16-02] Plan 108 仍沿用旧式 `Validation Checklist`，且把 lint 硬门禁写成带保留说明的“已通过”

- **文件**: `docs/plans/108-form-field-consumer-performance-plan.md`
- **证据片段**:

  ```md
  ## Validation Checklist

  - [x] `useBoundFieldValue()` installs only one necessary subscription per mode (via constant sentinel selector)
        ...
  - [x] `pnpm lint` (pre-existing OOM issues unrelated)
  ```

- **严重程度**: P2
- **现状**: 文件缺少 guide 要求的 `Closure Gates` 段落，且代码计划把 `pnpm lint` 记录为带免责说明的“已通过”。
- **风险**: 会把不可降级的仓库硬门禁，弱化成“说明性通过”；后续读者无法判断这是 closure-ready baseline，还是带条件放行的局部收口。
- **建议**: 改写为 guide 模板：补 `Closure Gates`；若 lint 真受仓库级独立问题阻塞，应显式记录 blocker owner，而不是在已勾选项里附带免责短语。
- **误报排除**: 不是单纯挑标题命名；问题是该 plan 同时缺少强制 closure 结构，并把 guide 明示不可降级的 lint/CI 规则写成带条件的已满足项。
- **复核状态**: 未复核

### [维度16-03] Plan 159 的 slice 状态与 closure 形态混用，`cancelled` 语义被写成 `completed`

- **文件**: `docs/plans/159-code-refactor-discovery-remediation-plan.md`
- **证据片段**:

  ```md
  ### Phase 4 - 目录结构归组

  Status: completed
  Reason: 目录归组是人类可读性优化，不改变任何架构契约或运行时行为。
  ```

- **严重程度**: P3
- **现状**: guide 允许的 execution-slice status 包含 `cancelled`，但该 phase 明确是取消执行，却仍记为 `completed`；全文件也仍使用旧式 `Validation Checklist`。
- **风险**: phase 级 closure 语义被污染，后续 audit 难以区分“已完成 landing”与“已裁定取消”。
- **建议**: 将该 phase 状态改成 `cancelled`，并用 `Deferred But Adjudicated` 或 closure note 解释原因；同时把 plan 收口结构迁到当前 guide。
- **误报排除**: 不是反对 descoped 或 cancelled 决策本身；问题是 live 文本把取消执行的 slice 记成 `completed`。
- **复核状态**: 未复核

## 维度复核结论

- [维度16-01]: 保留为 P2。
- [维度16-02]: 保留为 P2。
- [维度16-03]: 保留为 P3。

## 子项复核结论

- 无需额外子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                                           | 一句话摘要                                                                     |
| ----- | -------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 16-01 | P2       | `docs/plans/132-runtime-schema-dependency-elimination-plan.md` | Plan 132 已标 completed，但仍保留 deferred phase 与未勾选 closure/checklist 项 |
| 16-02 | P2       | `docs/plans/108-form-field-consumer-performance-plan.md`       | Plan 108 仍用旧式 Validation Checklist，并把 lint gate 写成带免责说明的已通过  |
| 16-03 | P3       | `docs/plans/159-code-refactor-discovery-remediation-plan.md`   | Plan 159 将 cancelled slice 记为 completed，phase 状态语义不合 guide           |
