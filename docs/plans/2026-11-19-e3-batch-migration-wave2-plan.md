# E3 批量迁移 Wave 2（批次 2：20 spec）

> Plan Status: completed
> Last Reviewed: 2026-11-19
> Source: docs/research/2026-11-17-flux-test-backend-design.md（§5.2 T2）、roadmap E 轨道 E3（Wave 2 后继）
> Related: docs/plans/2026-11-18-e3-batch-migration-wave1-plan.md（completed）

## Purpose

E3 Wave 2：批次 2 迁移 20 个中低复杂度 spec（"引擎替换→语义重写"两步，新全绿 + 旧删除同 commit），复用 Wave 1 的能力面（expectWeb/keyboard/mouse/viewport/getByRole）与 codemod；把 Wave 1 实测的 6 条缺口按需小步补齐（本批 spec 实际触发的为准）。

## Current Baseline

- Wave 1 已收口：驱动能力面齐（expectWeb 9 断言 + not、嵌套/last/boundingBox/inputValue/selectOption/check/uncheck、keyboard Chord/mouse 拖拽真实输入、setViewportSize、getByRole 基础版、SVG 可见性、expectNoPageErrors、spec 可 import driver）；codemod 可用；Console Watch/抽屉可用；存量 Playwright spec 225。
- Wave 1 实测守则（写入迁移指令）：`ft.reload()` 中途重载摧毁 CDP 上下文——用稳定门控 hash 路由反弹隔离；runner 默认视口 756×469——桌面断点 spec 须显式 setViewportSize；`nth(i).locator(sub)` 丢索引——用唯一属性选择器绕行；`toHaveText` 不收 RegExp——用 toContainText；`locator.getByText/getByRole` 不存在——页级 API 绕行；`setInputFiles`/`locator.evaluate` 缺口——DataTransfer / 整页 evaluate 兜底（登记债务）。

## Scope

### In Scope

- `tests/e2e/flux/`：批次 2 新增 20 个 `.flux-spec.ts`；删除对应 20 个旧 `tests/e2e/*.spec.ts`（同 commit）。
- driver：仅补批次 2 实际触发的缺口（不预建）；触发时逐项补单测。
- docs：design doc §5.5 台账续记、roadmap E3 行勘误数字更新、daily log。

### Out Of Scope

- 其余 205 个 spec（批次 3+）；visual/axe/screenshot 类 spec；Playwright 删除（E4）；touch CDP 桥（Wave 3 按需）。

## Goals

- 批次 2（20 spec）迁移全绿；20 个旧 Playwright spec 同 commit 删除（225→205）；oracle 复跑绿后删除，台账续记 §5.5。
- 触发的缺口小步修复入 driver（不预建）。

## Non-Goals

- 批次 3+（205 spec 后继 Wave 3..N plan）；visual/axe/screenshot 类 spec（本批名单已排除）；Playwright 删除（E4）。

## Failure Paths

| 编号               | 触发                                        | 行为                                                 | 可重试 | 表现         |
| ------------------ | ------------------------------------------- | ---------------------------------------------------- | ------ | ------------ |
| w2-spec-unportable | 某 spec 依赖本批不建的能力（如 axe/跨 tab） | 按 Wave 1 规则换入同复杂度替补并在 plan 记录换出理由 | 是     | 名单勘误附注 |

## Test Strategy

档位选择：`必须自动化`

理由：迁移等价性（新全绿 + 旧删除同 commit + oracle 对照）是迁移铁律；逐 spec 单独验证后全批绿再删旧。

## Execution Plan

### Phase 1 - 批次 2 迁移（20 spec）

Status: completed
Targets: `tests/e2e/flux/*.flux-spec.ts`（新增 20）、删除对应 20 个旧 spec、design doc §5.5 台账续记

- Item Types: `Fix | Proof`

- 换出记录（draft review m1）：mobile-wheel-pickers / mobile-gesture-lab / mobile-bottom-panels 依赖 `page.context().newCDPSession` + `Input.dispatchTouchEvent` 触摸拖拽（driver 无 touch 桥），换入 cron-editor / w4c-composite-form-family / scada-pressure-demo（同扫描带 0 命中）。touch 桥归 Wave 3 按需。

- [x] 批次 2 名单（API 扫描 `addInitScript|expect.poll|getByLabel|hasText|waitForTimeout|toHaveScreenshot|page.request|download|clipboard|frameLocator|route(|dragTo` 命中 ≤2 且无 screenshot）：table-column-width-layout、ai-conversations、map-demo、m2-touch、org-select-user、scada-size-consistency、w3d-markdown-editor、gantt-editor-fields、tree-display-ux、ai-persistence、w2a-data-composition、word-editor-template-expr、m3-layout、w4a-multimedia-family、gantt-splitter-scroll、w3c-value-mapping、ai-widgets-showcase、cron-editor、w4c-composite-form-family、scada-pressure-demo。
- [x] 每 spec：codemod 草案 → 精修（覆盖全部旧用例、断言强度不降级、至少 1 个升级点、expectNoPageErrors 白盒）→ `pnpm test:flux --spec` 单独绿。
- [x] 20 个旧 spec Playwright oracle 复跑绿（101 用例），全批 flux 绿后同 commit 删除（存量 205）。
- [x] 台账 §5.5 续表 20 行 + 新增缺口回灌（4 条）；roadmap E3 行勘误数字更新（Wave 2）；daily log。

Exit Criteria:

- [x] `pnpm test:flux --dir tests/e2e/flux` 全绿（45 passed，含 1 expected-fail demo）。
- [x] 存量 Playwright spec 205；oracle 101 用例复跑绿记录在案（§5.5 续表）。
- [x] 台账 + roadmap 勘误 + daily log 完成。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 行为/契约结果已达成：批次 2 迁移完成（新绿旧删同 commit）
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

- Reviewer / Agent: agent_73e35bcf（fresh session）
- Verdict: pass-with-minors（0 Blocker / 1 Major / 2 Minor，全部处置）：M1 补 Scope 节；m1 touch 三件套换出并记录理由（换入 cron-editor/w4c/scada-pressure-demo）；m2 nth 精修工作量提示已入 Current Baseline 守则。
- Rounds: 2

## Deferred But Adjudicated

### E3 剩余批次（约 205 spec，含 visual/axe/跨 tab 类）

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: Wave 2 明确为批次 2；design doc §5.2 分批节奏。
- Successor Required: `yes`
- Successor Path: E3 Wave 3..N plan（visual/axe 类需 S2 capture + axe 页内通道就位后迁）

## Closure

Status Note: 已收口（2026-11-19）。独立 closure audit（agent_c818a99f）verdict pass-with-minors（0 Blocker / 0 Major / 3 Minor，全处置）：Minor-1/2 roadmap E3 行勘误文本修复（双引擎台账残留括号 + Deferred 计数 225→205/Wave 3..N + 行标 Wave 1–2）；Minor-3 knip baseline 文件补尾换行。

Closure Audit Evidence:

- Auditor / Agent: agent_c818a99f（fresh session，三件套输入）
- Evidence: verdict pass-with-minors；审计会话独立复跑 driver 69/69、m2-touch spec 单跑绿；5 spec 抽读 + 3 spec 与 `git show` 逐用例对照（断言强度不降级，升级点真实）；205 存量核对、Playwright --list 0 收集；§5.5 续表 20 行与用例数核对一致；roadmap 勘误 Wave 2 数字在案。

Follow-up:

- <<见 Non-Blocking Follow-ups>>

## Non-Blocking Follow-ups

- Wave 1 观测的 1 次瞬态 flux-run 失败（未捕获 spec 名）：Wave 2 迁移期若复现立即登记 flake 记账。
