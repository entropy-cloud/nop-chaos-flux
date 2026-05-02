# 175 Review-4 Findings Remediation Plan

> Plan Status: in progress
> Last Reviewed: 2026-05-02
> Source: `docs/analysis/2026-05-02-adversarial-audit-review-4.md`
> Related: `docs/plans/166-module-hygiene-and-designer-async-cleanup-plan.md`, `docs/plans/171-workbench-surface-and-package-boundary-successor-plan.md`

## Purpose

修正 `review-4` 中确认成立的 5 个问题，重点收口三类风险：跨实例 owner 隔离失效、designer/host bridge 语义漂移、word-editor 持久化与 autosave 状态错位。

## Current Baseline

- `docs/analysis/2026-05-02-adversarial-audit-review-4.md` 已确认 5 个高置信度问题，分布在 `flow-designer-*`、`report-designer-*`、`word-editor-renderers`。
- Plan 166 已给 `flow-designer` 的 ELK 布局添加 stale-result guard，但 live code 仍使用模块级 `layoutRequestId`，导致多个 designer 实例之间互相取消，请求隔离没有真正落到实例 owner 边界。
- `report-designer-renderers/src/bridge.ts` 当前把 `designer.dirty` 绑定到 `spreadsheet.runtime.dirty`，而 `page-renderer.tsx`、`host-data.ts`、`report-designer-core` 对 dirty 语义使用的是 `designer || spreadsheet` 聚合逻辑，已形成跨出口语义分裂。
- `report-designer:importTemplate` 当前替换 `document` 后未调用 `refreshDerivedState()`，导致 `fieldSources` 和 inspector 派生状态可短暂或持续停留在旧文档上。
- `word-editor-action-provider.ts` 当前在宿主 `saveEvent` 成功前就清除本地 dirty；`editor-canvas.tsx` 的 autosave 仍把 `charts/codes` 从 `initialDocument` 读取，而 `word-editor-page.tsx` 又优先把 autosave 结果投影给 host scope，形成持久化真相分叉。

## Goals

- 让 Flow Designer 的 ELK stale/cancel 语义收敛到实例级 owner，而不是模块级全局共享状态。
- 统一 Report Designer 对 `dirty` 和导入后派生状态刷新的契约，避免 bridge、host scope、toolbar 看到不同真相。
- 让 Word Editor 的 save/autosave 语义与真实宿主持久化结果一致，避免“假已保存”和 autosave 回退附件数据。
- 为上述修复补齐 focused regression tests，并同步相关 architecture / logs 文档。

## Non-Goals

- 不重构 `flow-designer` 的全部布局管线，也不引入新的通用任务取消基础设施；本计划只修正当前实例隔离缺陷。
- 不重新设计 Report Designer 的整体 host projection 结构；仅收敛 `dirty` 语义和导入模板后的派生刷新行为。
- 不重写 Word Editor 的本地存储模型或草稿系统；仅修复保存时序和 autosave 取值来源。
- 不处理 `review-4` 之外的新审查项，除非在执行中证明是当前 5 个问题的直接根因。

## Scope

### In Scope

| Finding                                                  | Severity | Phase   |
| -------------------------------------------------------- | -------- | ------- |
| Flow Designer ELK 全局取消令牌污染多实例                 | HIGH     | Phase 1 |
| Report Designer `designer.dirty` bridge 语义错误         | HIGH     | Phase 2 |
| Report Designer importTemplate 后派生状态未刷新          | HIGH     | Phase 2 |
| Word Editor 保存先清 dirty 后等宿主保存                  | HIGH     | Phase 3 |
| Word Editor autosave 用旧 `initialDocument` charts/codes | HIGH     | Phase 3 |

### Out Of Scope

- Flow Designer 其它布局性能问题或 React host 层大规模重构
- Report Designer 的 preview、codec、field-source 体系重设计
- Word Editor 的并发保存队列、远端冲突解决、草稿版本化

## Execution Plan

### Phase 1 - Flow Designer Instance-Owned ELK Request Isolation

Status: completed
Targets: `packages/flow-designer-core/src/elk-layout.ts`, `packages/flow-designer-renderers/src/designer-page.tsx`, focused tests under `packages/flow-designer-renderers/src/` or `packages/flow-designer-core/src/`

- [x] 审计当前 `layoutRequestId` / `invalidateElkLayoutRequests()` 的所有调用点，确认全局状态影响范围，避免只修 `designer-page` 一个入口却遗漏其它实例化路径。
- [x] 将 ELK stale-result guard 从模块级共享计数改为实例 owner 私有令牌或等价的 per-request controller，确保一个 designer 的卸载或重布局不会使别的 designer 请求失效。
- [x] 让 `designer-page` 只失效自己创建的布局请求，不再调用会污染其它实例的全局 invalidation。
- [x] 添加 regression tests：验证两个并存 designer 实例中，一个实例卸载/重布局不会吞掉另一个实例的布局结果。

Exit Criteria:

- [x] ELK stale-result 判定已收敛到实例 owner 边界，不再依赖模块级全局计数器
- [x] 多实例并存时，一个实例的 cleanup 不会取消另一个实例的在途布局结果
- [x] focused tests 覆盖“并存实例 + 卸载/重布局”场景
- [x] `docs/architecture/flow-designer/canvas-adapters.md` 或相关 flow-designer 文档已更新为最终设计状态，或记录无需更新的 live-code 证据
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Report Designer Dirty Semantics And Derived-State Refresh

Status: completed
Targets: `packages/report-designer-renderers/src/bridge.ts`, `packages/report-designer-renderers/src/bridge.test.ts`, `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-core/src/core-dispatch.ts`, `packages/report-designer-core/src/__tests__/designer-core.test.ts`, additional focused tests as needed

- [x] 明确 `designer.dirty` 与 `runtime.dirty` 的语义边界，并将 `bridge.ts`、`host-data.ts`、`page-renderer.tsx`、相关 tests 收敛到同一套定义。
- [x] 修复 `deriveDesignerHostSnapshot()`，让 bridge 输出不再忽略 designer 自身的 dirty 状态；必要时区分 `designer.dirty` 与聚合后的 `runtime.dirty`。
- [x] 修复 `bridge.test.ts`，删除把错误行为固化为预期的断言，并新增 metadata-only 变更场景的回归测试。
- [x] 在 `report-designer:importTemplate` 路径补上 `refreshDerivedState()` 或等价刷新机制，确保文档替换后 `fieldSources`、inspector schema、loading/error 状态与新文档一致。
- [x] 添加 focused tests：验证导入模板后派生状态立即对齐新文档，而不是等待后续无关操作触发刷新。

Exit Criteria:

- [x] `designer.dirty`、`runtime.dirty`、status summary、host scope 对 dirty 的语义不再互相矛盾
- [x] metadata-only 变更可通过 bridge 正确暴露为 designer dirty
- [x] `report-designer:importTemplate` 完成后 `fieldSources` 和 inspector 派生状态立即刷新到新文档
- [x] focused tests 覆盖 dirty 语义和导入模板后的派生状态刷新
- [x] `docs/architecture/report-designer/design.md` 或相关 report-designer 文档已更新为最终设计状态，或记录无需更新的 live-code 证据
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Word Editor Save And Autosave Truth Alignment

Status: completed
Targets: `packages/word-editor-renderers/src/word-editor-action-provider.ts`, `packages/word-editor-renderers/src/editor-canvas.tsx`, `packages/word-editor-renderers/src/word-editor-page.tsx`, relevant tests under `packages/word-editor-renderers/src/`

- [x] 调整 `save` 时序：只有在宿主 `saveEvent` 成功后，才清理本地 dirty 并确认本地保存结果；失败路径必须保持 dirty 或显式恢复 dirty。
- [x] 梳理 `saveDocument`、`saveDatasets`、宿主 `saveEvent` 的职责顺序，避免修复 dirty 后又引入“本地保存成功但远端失败”的半提交假象。
- [x] 修复 autosave 组装 `SavedDocumentData` 的来源，让 `charts/codes` 来自当前运行时状态，而不是 `initialDocument`。
- [x] 校对 `word-editor-page` 中 `savedDocument`、host scope、React state `charts/codes` 的优先级，避免 autosave 结果覆盖更新后的运行时附件。
- [x] 添加 focused tests：验证宿主保存失败时 dirty 不会被清空；验证新增 chart/code 后 autosave 与 host scope 均保留最新内容。

Exit Criteria:

- [x] 宿主 `saveEvent` 失败时，Word Editor 不会伪装成“已保存”
- [x] autosave 生成的 `SavedDocumentData` 包含最新 `charts/codes`，不会回退到 `initialDocument`
- [x] host scope 与页面内运行时状态对文档附件内容保持一致，不再出现双轨真相
- [x] focused tests 覆盖 save failure 和 autosave 附件回归场景
- [x] `docs/architecture/word-editor/design.md` 或相关 word-editor 文档已更新为最终设计状态，或记录无需更新的 live-code 证据
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

> **关闭条件**：只有本 section 所有条目及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] Flow Designer 的 ELK 请求隔离已按实例 owner 收敛
- [x] Report Designer 的 bridge / host scope / status summary dirty 语义一致
- [x] Report Designer 导入模板后派生状态立即刷新到新文档
- [x] Word Editor 保存失败不会误清 dirty
- [x] Word Editor autosave 不会回退 `charts/codes`
- [x] focused regression tests 已覆盖 5 个问题的关键行为
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

| Risk                                                                        | Impact                           | Mitigation                                                                         |
| --------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| ELK request isolation 改动误伤单实例 stale-guard                            | 布局结果重复应用或不再丢弃旧结果 | 先写双实例 regression test，再收敛实现                                             |
| `designer.dirty` / `runtime.dirty` 重新定义引发下游 schema/tooling 误解     | 宿主状态面板或工具栏行为变化     | 执行前 grep 全仓库读取路径，保证 bridge、host-data、toolbar helper、tests 一起同步 |
| `importTemplate` 后立即刷新派生状态可能暴露旧测试对延迟刷新的依赖           | 测试或 UI 行为变化               | 补 focused tests，必要时显式更新旧测试预期                                         |
| Word Editor 保存顺序调整导致本地草稿与远端保存职责混乱                      | 用户看到重复保存或状态闪烁       | 明确“dirty 清理只在最终成功后发生”，并用失败场景测试约束                           |
| autosave 改用运行时附件状态后，如果状态来源不唯一，可能引出新的覆盖顺序问题 | 文档附件仍可能错乱               | 同时梳理 `savedDocument` 与 `charts/codes` 的优先级，不只改单点取值                |

## Closure

Status Note: 实现与 focused regression coverage 已完成，三阶段 exit criteria 已全部满足，独立 closure audit 也已完成；plan 仍保持 `in progress`，因为 validation checklist 中的仓库级 `pnpm test` 仍受本计划之外的红项阻塞。

Closure Audit Evidence:

- Reviewer / Agent: fresh general subagent (`ses_21a0053f1ffe6YsO3FJRRSSx4U`)
- Evidence: subagent closure audit initially发现 `packages/report-designer-renderers/src/host-data.ts` 未发布 `designer.dirty`；已补 `host-data.ts` + `packages/report-designer-renderers/src/host-data.test.ts`，并在 `docs/logs/2026/05-02.md` 记录审计与修复结果

Follow-up:

- 若要求计划关闭时必须全仓 green，则需先解决当前 workspace `pnpm test` 的非 Plan 175 红项，再决定是否将本计划标记为 `completed`
- no remaining plan-owned code work
