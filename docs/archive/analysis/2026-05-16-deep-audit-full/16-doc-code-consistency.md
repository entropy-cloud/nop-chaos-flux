# 维度 16：文档-代码一致性

## 第 1 轮（初审）

### [维度16-01] plan 281 已标记 completed，但仍保留未勾选的 in-scope exit criterion

- **文件**: `docs/plans/281-deep-audit-2026-05-14-runtime-owner-lifecycle-validation-closure-plan.md:3,54-66`
- **证据片段**:

  ```md
  > Plan Status: completed
  > Status: completed

  - [ ] Retained IDs `04-01/02/03/04/06/08` are fixed in live code, or a fresh live re-audit...
  ```

- **严重程度**: P1
- **现状**: completed 状态与未完成 checklist 同时存在。
- **风险**: 后续读者会误以为该 plan 已闭环收口。
- **建议**: 补充证据并勾选，或回调 plan/phase 状态。
- **为什么值得现在做**: 深度审核结果与 remediation routing 会直接引用这些 plan。
- **误报排除**: 不是模板残留；这是 active completed plan 中的具体 exit criterion。
- **历史模式对应**: plan status distortion。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md`
- **复核状态**: 未复核

### [维度16-02] maintenance checklist 仍把 spreadsheet/report families 写成 future packages

- **文件**: `docs/references/maintenance-checklist.md:251-252`
- **证据片段**:
  ```md
  - changes in future `packages/spreadsheet-*` packages
  - changes in future `packages/report-designer-*` packages
  ```
- **严重程度**: P1
- **现状**: 仓库里相关包早已存在并且已进入 docs/index 路由。
- **风险**: 维护路由与实际包基线脱节，影响 doc update 预期。
- **建议**: 改为当前 live package families。
- **为什么值得现在做**: 这是 active reference doc 对 live workspace 的显式漂移。
- **误报排除**: 不是 archive 文档；这是当前维护清单。
- **历史模式对应**: active doc stale package routing。
- **参考文档**: `docs/index.md`、`docs/architecture/frontend-baseline.md`
- **复核状态**: 未复核

### [维度16-03] `frontend-baseline.md` 仍链接到 superseded archive plan，属于低优先 stale routing

- **文件**: `docs/architecture/frontend-baseline.md:204`
- **证据片段**:
  ```md
  - Delivery planning: `docs/archive/plans/02-development-plan.md`
  ```
- **严重程度**: P2
- **现状**: active architecture doc 把读者引向已标记 superseded 的 archive plan。
- **风险**: 会把读者带离当前基线并接触过时链接/术语。
- **建议**: 改链到 `docs/plans/00-plan-authoring-and-execution-guide.md` 或移除。
- **为什么值得现在做**: 复核确认它只是一条 secondary related-doc link，因此降为 P2。
- **误报排除**: 目标文件存在，不是 broken link；问题是 routing stale。
- **历史模式对应**: stale secondary doc routing。
- **参考文档**: `docs/index.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度16-01]：保留 (P1)。completed plan 不应保留未勾选 in-scope exit criterion。
- [维度16-02]：保留 (P1)。maintenance checklist 仍把 live package families 写成 future。
- [维度16-03]：降级为 P2。属于 secondary routing stale。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                        | 一句话摘要                                                         |
| ----- | -------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 16-01 | P1       | `docs/plans/281-deep-audit-2026-05-14-runtime-owner-lifecycle-validation-closure-plan.md:3` | plan 281 已标 completed 但仍保留未勾选 exit criterion              |
| 16-02 | P1       | `docs/references/maintenance-checklist.md:251-252`                                          | maintenance checklist 仍把 spreadsheet/report families 写成 future |
| 16-03 | P2       | `docs/architecture/frontend-baseline.md:204`                                                | frontend-baseline 仍链接到 superseded archive plan                 |
