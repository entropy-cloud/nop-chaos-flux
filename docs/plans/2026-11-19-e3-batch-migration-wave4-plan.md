# E3 批量迁移 Wave 4（批次 4：20 spec）

> Plan Status: active
> Last Reviewed: 2026-11-19
> Source: docs/research/2026-11-17-flux-test-backend-design.md（§5.2 T2）、roadmap E 轨道 E3（Wave 4 后继）
> Related: docs/plans/2026-11-19-e3-batch-migration-wave3-plan.md（completed）

## Purpose

E3 Wave 4：批次 4 迁移 20 个 spec（185→165），复用 Wave 1–3 能力面、codemod 与守则；20 个旧 spec oracle 复跑绿后同 commit 删除，台账续记。

## Current Baseline

- Wave 1–3 已收口并提交；存量 Playwright spec 185；flux 目录 65 spec（含 demo）；evaluate 债务标记 45 处登记在案；runner 已有存储隔离（每文档清 storage）、真实输入通道（keyboard/mouse/wheel/viewport）、per-spec 超时约定（`*-perf` 200s）。
- 迁移守则（Wave 1–3 实测，全部继续有效）：reload 禁用（hash 路由反弹隔离）；桌面 spec 显式 setViewportSize(1280,800)；nth(i).locator(sub) 丢索引（已修 predicate 贯穿，子定位组合仍需属性选择器）；toHaveText 不收 RegExp；getByRole string 全匹配；setInputFiles/locator.evaluate/focus 缺口以 evaluate 兜底登记债务；keyboard.type 对 React 受控输入不可用（fill 兜底）。

## Scope

### In Scope

- `tests/e2e/flux/`：批次 4 新增 20 个 `.flux-spec.ts`；删除对应 20 个旧 spec（同 commit）。
- driver：仅补批次 4 实际触发缺口。
- docs：design doc §5.5 续表、roadmap 勘误数字、daily log。

### Out Of Scope

- 其余 165 个 spec（Wave 5+）；visual/screenshot 类与 Playwright-infra 类（E4 前专项）；addInitScript/getByLabel/touch/download 桥（按批需要）。

## Goals

- 批次 4（20 spec）迁移全绿；20 个旧 spec oracle 复跑绿后同 commit 删除（185→165）；台账续记。

## Non-Goals

- Playwright 删除（E4）；语义清零（E5）。

## Failure Paths

| 编号               | 触发              | 行为                       | 可重试 | 表现         |
| ------------------ | ----------------- | -------------------------- | ------ | ------------ |
| w4-spec-unportable | spec 依赖未建能力 | 换入同复杂度替补并记录理由 | 是     | 名单勘误附注 |

## Test Strategy

档位选择：`必须自动化`

理由：同前序批次——迁移等价性铁律（新全绿 + 旧删除同 commit + oracle 对照）。

## Execution Plan

### Phase 1 - 批次 4 迁移（20 spec）

Status: completed
Targets: `tests/e2e/flux/*.flux-spec.ts`（新增 20）、删除对应 20 个旧 spec、design doc §5.5 续表

- Item Types: `Fix | Proof`

- [x] 批次 4 名单（0–1 命中且命中类型可迁移）：url-filter-sync（expect.poll+hasText→显式轮询/文本断言）、table-column-drag（dragTo→ft.mouse move→down→move→up 序列）、large-dataset-windowing、report-designer-ux-r9、input-password-strength、word-editor-persistence、convergence-n1-n2、form-input-enhancements、table-virtual-body、table-popover、home-entry-navigation、w1c-list、word-editor-dataset、w1c-list-pagination、ai-virtual-scroll、three-gallery、designer-summary-renderers、pivot-table-demo、ai-widgets-button-actions、ai-rich-text-sender。换出：linear-issues-fetch-failure（addInitScript）、map-dark-redraw/theme-switcher（getByLabel + @watch-only 台账行随迁，Wave 5 处理）、fixtures-hard-gate/visual 类（Playwright-infra，E4 前专项）。映射守则：expect.poll→显式重试环；locator(sel,{hasText})→父定位+子文本断言或唯一属性选择器；getByLabel→[aria-label] 属性选择器；waitForTimeout→stability 门控/条件轮询；locator.filter({hasText})→predicate/属性选择器（Minor-1）；waitForLoadState networkidle fire-and-forget→直接丢弃（Minor-3）；locator.evaluate→整页 ft.evaluate 债务（Minor-2，既有规则）。
- [x] 每 spec：codemod → 精修（全部旧用例、强度不降级、≥1 升级点、expectNoPageErrors 白盒）→ 单独绿。
- [x] 20 个旧 spec oracle 复跑（57+2skip 绿；ai-widgets-button-actions 7 用例 pre-existing 红——strict-validation 诊断，P1-MA9.2-001 已裁决限制，非本批引入；勘误见 §5.5 续表附注）后同 commit 删除（存量 165）。
- [x] 台账续表 20 行 + 缺口回灌（2 处 driver 契约修复）+ roadmap 勘误数字 + daily log。

Exit Criteria:

- [x] `pnpm test:flux --dir tests/e2e/flux` 全绿（85 = 存量 65 + 批次 4 新增 20；嵌套谓词泄漏修复后）。
- [x] 存量 Playwright spec 165；oracle 真实结果（57+2skip 绿 / 7 pre-existing 红）记录在案（§5.5 续表批次 4 勘误附注）。
- [x] 台账 + roadmap + daily log 完成。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复
- [ ] 所有 in-scope confirmed contract drifts 已收敛
- [ ] 行为/契约结果已达成：批次 4 迁移完成（新绿旧删同 commit）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Draft Review Record

- Reviewer / Agent: agent_6ec30b3f（fresh session）
- Verdict: pass-with-minors（0 Blocker / 0 Major / 3 Minor，全处置入映射守则）：Minor-1 locator.filter 补映射；Minor-2 locator.evaluate 债务确认；Minor-3 networkidle 丢弃。
- Rounds: 1

## Deferred But Adjudicated

### E3 剩余批次（约 165 spec，含 visual/screenshot/touch/download/clipboard/addInitScript/getByLabel 类）

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: Wave 4 明确为批次 4；visual/infra 类需截图通道与 helper 退役专项（E4 前置），addInitScript/getByLabel/touch/download 桥未建。
- Successor Required: `yes`
- Successor Path: E3 Wave 5..N plan（须承接：ai-widgets console-channel 守卫随 P1-MA9.2-001 ai-chat invoke-model contract pattern 落地后恢复——strict 诊断消除时在 flux spec 补回 console 零错误断言）；visual/infra 专项 plan（E4 前）

## Closure

Status Note: <<待收口填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待独立子 agent 填写>>
- Evidence: <<待填>>

Follow-up:

- <<见 Non-Blocking Follow-ups>>

## Non-Blocking Follow-ups

- Wave 2 回灌的缺口（Locator.focus/遮挡检测/keyboard.type 双插/getByRole 语义）：批次 4 实际触发时修复，否则守则绕行。
