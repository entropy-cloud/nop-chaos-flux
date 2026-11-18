# E3 批量迁移 Wave 3（批次 3：20 spec）

> Plan Status: completed
> Last Reviewed: 2026-11-19
> Source: docs/research/2026-11-17-flux-test-backend-design.md（§5.2 T2）、roadmap E 轨道 E3（Wave 3 后继）
> Related: docs/plans/2026-11-19-e3-batch-migration-wave2-plan.md（completed）

## Purpose

E3 Wave 3：批次 3 迁移 20 个 spec（键盘/鼠标/性能类为主），复用 Wave 1–2 全部能力面与守则；20 个旧 spec oracle 复跑绿后同 commit 删除（205→185），台账续记。

## Current Baseline

- Wave 1–2 已收口并提交；存量 Playwright spec 205；flux 目录 45 spec（含 demo）；evaluate 债务标记 23 处登记在案。
- Wave 1–2 守则与缺口清单（design doc §5.5 及续表）继续有效：reload 禁用、视口显式设置、nth.locator 索引丢失、toHaveText 不收 RegExp、getByRole string 全匹配、setInputFiles/locator.evaluate/focus 缺口以 evaluate 兜底。

## Scope

### In Scope

- `tests/e2e/flux/`：批次 3 新增 20 个 `.flux-spec.ts`；删除对应 20 个旧 spec（同 commit）。
- driver：仅补批次 3 实际触发缺口。
- docs：§5.5 续表、roadmap 勘误数字、daily log。

### Out Of Scope

- visual/screenshot 类与 Playwright-infra 类 spec（fixtures-hard-gate / visual-assert-helpers / visual-helpers-smoke / \*-visual 系列——依赖 Playwright helper 模块或截图通道，归 E4 前专项）；download/clipboard/touch/addInitScript 类 spec；其余 spec 归 Wave 4..N。

## Goals

- 批次 3（20 spec）迁移全绿；20 个旧 spec oracle 复跑绿后同 commit 删除（存量 185）；台账续记。

## Non-Goals

- Playwright 删除（E4）；语义清零（E5）；touch/download 桥。

## Failure Paths

| 编号               | 触发              | 行为                       | 可重试 | 表现         |
| ------------------ | ----------------- | -------------------------- | ------ | ------------ |
| w3-spec-unportable | spec 依赖未建能力 | 换入同复杂度替补并记录理由 | 是     | 名单勘误附注 |

## Test Strategy

档位选择：`必须自动化`

理由：同 Wave 2——迁移等价性铁律。

## Execution Plan

### Phase 1 - 批次 3 迁移（20 spec）

Status: completed
Targets: `tests/e2e/flux/*.flux-spec.ts`（新增 20）、删除对应 20 个旧 spec、design doc §5.5 续表

- Item Types: `Fix | Proof`

- [x] 批次 3 名单（0 命中扫描带：addInitScript/getByLabel/hasText/waitForTimeout/toHaveScreenshot/page.request/download/clipboard/frameLocator/route(/dragTo/newCDPSession/dispatchTouchEvent/setInputFiles）：kanban-keyboard-reorder、three-canvas-ux、ai-component-handle、leafer-examples、graph-level-tint、flux-basic-row-inspect、calendar-perf、scada-pointer-events-regression、flow-designer-edge-creation、crud-views-export-tab-visibility、diff-perf、condition-builder-formula、debugger-ai、composite-editor-handles、w3d-period-family、gantt-perf、mobile-number-keyboard、form-atoms-slider、verification-code、w1a-content-family。换出候选：home-entry-navigation、w1c-list、w1c-list-pagination、word-editor-dataset。
- [x] 每 spec：codemod → 精修（全部旧用例、强度不降级、≥1 升级点、expectNoPageErrors 白盒）→ 单独绿。
- [x] 20 个旧 spec oracle 复跑绿（45+1skip 用例）后同 commit 删除（存量 185）。
- [x] 台账续表 20 行 + 缺口回灌 + roadmap 勘误数字 + daily log。

Exit Criteria:

- [x] `pnpm test:flux --dir tests/e2e/flux` 全绿（65 = 存量 45 + 批次 3 新增 20；附带 runner 存储隔离修复后 65/65）。
- [x] 存量 Playwright spec 185；oracle 45+1skip 记录在案（§5.5 续表批次 3）。
- [x] 台账 + roadmap + daily log 完成（含 docs/bugs/15、16）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 行为/契约结果已达成：批次 3 迁移完成（新绿旧删同 commit）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Draft Review Record

- Reviewer / Agent: agent_7e225649（fresh session）
- Verdict: pass-with-minors（0 Blocker / 0 Major / 2 Minor）：Minor-1 measure-perf helper 依赖已补执行提示；Minor-2 successor 路径起草 Wave 4/专项 plan 时具体化。
- Rounds: 1

## Deferred But Adjudicated

### E3 剩余批次（约 185 spec，含 visual/screenshot/touch/download/clipboard/addInitScript 类）

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: Wave 3 明确为批次 3；visual/infra 类需截图通道与 helper 退役专项（E4 前置），touch/download 桥未建。
- Successor Required: `yes`
- Successor Path: E3 Wave 4..N plan；visual/infra 专项 plan（E4 前）

## Closure

Status Note: 已收口（2026-11-19）。独立 closure audit（agent_18cc141c）三轮：首轮 fail（Major：App.tsx 修复在 bisect 中被 HEAD 覆盖未恢复——已从 \_tmp 恢复并双向判别复核）；二轮 fail（恢复引入 5 个 playground 单测回归——`use()` 挂起在 RTL/jsdom 不 settle，最终形态改 state+effect 内核就绪前不渲染路由树）；三轮 **pass**（0 Blocker/Major/Minor blocking）。范围裁决与证据见 Closure Audit Evidence。

Closure Audit Evidence:

- Auditor / Agent: agent_18cc141c（fresh session，三件套输入；共 3 轮直至 pass）
- Evidence: 终轮 pass——审计会话自跑：playground 570/570（含 4 个回归文件 11/11）、driver 70/70、server 45/45、ledger 脚本 6/6、全量 flux dir 65/65、typecheck/lint/check exit 0、check:devtools-tree-shake 生产内核不可达验证；App.tsx 修复形态与 docs/bugs/15 叙述一致（state+effect，两个被否决形态入档）；§5.5 批次 3 台账 20 行 ↔ 20 新增 flux-spec ↔ 20 staged 删除；存量 185。审计要求回写（状态翻转/证据/同 commit 提交）已执行。

Follow-up:

- <<见 Non-Blocking Follow-ups>>

## Non-Blocking Follow-ups

- Wave 2 回灌的 4 条缺口（Locator.focus/遮挡检测/keyboard.type 双插/getByRole 语义）：批次 3 实际触发时修复，否则继续以守则绕行。
