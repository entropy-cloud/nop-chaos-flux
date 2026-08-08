# 02 Industrial HMI Component Audit — HCA-CR 跨层集中修复与裁决（deferred P2 backlog + P3 裁定 + watch-only 复核）

> Plan Status: active
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA-CR. 跨层集中修复与裁决
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-CR；各层审计记录 / plan「归 HCA-CR」的 deferred P2/P3 项 + watch-only residual
> Related: HCA1–HCA11（done，backlog 来源）、HCAX-1/HCAX-2（done，共性重构已收口，不重做）、HCA-BL（并行 successor，bug 归档——结果面独立，BL 改文档 / CR 改代码）、HCA-CV（successor，全量验证，依赖本 plan）、HCA-CG（successor，Guard 沉淀——validate.ts 524 行拆分归 CG 所有权，非本 plan）

## Purpose

把 HCA1–HCA11 各层审计 deferred 到「归 HCA-CR」的全部 P2/P3 项 + 2 个 watch-only residual 汇总成单一 triage 表，逐项做出**最终裁定**：修复（防御纵深 / 契约闭环 hardening）/ 正式归类为 watch-only residual（附 Why-Not-Blocking）/ 移出 scope，然后对裁定为「修复」的项 test-first 修复并带回归。这是 industrial 包审计的**收敛 owner plan**（roadmap §Rule 1 + guide Rule 25「审计驱动队列先合并再拆分」——所有 deferred 项汇聚于此，不逐 finding 开 plan）。完成后解锁 HCA-CV 全量验证。

## Current Baseline

> 起草前已核对 live repo（2026-08-08）：HCA1–HCA11 全 `done`（roadmap 共识审查 3 轮 AGREE）；各层审计记录「Finding Triage 汇总」+ plan「归 HCA-CR」节含 deferred 项 + `文件:行` 证据 + Why-Not-Blocking 初判；包级机械健康 `pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿（~1326 tests / 99 files，HCA11 收口基线）。

### CR Backlog 全量清单（从各层审计记录 / plan 汇总）

> 计数说明：下表「×N」沿袭 roadmap / 源审计表述，但 live 审计记录显示部分行号含**已 fixed 不入 CR 的项**（HCA5 仅 P3-1 真 归 CR——P3-2 归 HCA6 已解、P3-3 为已记录非新缺陷；HCA8 归 CR 实为 11 项——P2-FE-1 + P3-FE-2 均 fixed 不入 CR）。**Phase 1 拉取精确措辞时以 live Finding Triage 为准做权威对账**，下表的「合计」为上限估计，实际 CR-bound 项数会在 Phase 1「裁定结果」收敛（预期低于下表）。依赖说明：roadmap 表（权威动态状态）列 HCA-CR deps = HCA1–HCA11（全 done）→ 已解锁；mermaid 图中 `LL→CR` 边标注「传递依赖 HCA1–11」，CR **不**被 LL/BL 阻塞（本 plan 可与 HCA-BL 并行）。

| ID            | 来源层            | 严重       | 一句话摘要 + `文件:行`                                                                                                                                       | Why-Not-Blocking（初判）                                                                                     |
| ------------- | ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| HCA11-P2-2    | editor infra      | P2         | `connection-wiring.ts` pointerup 挂 container，容器外释放时 `connectionDragActiveRef` 卡 true + overlay 残留（对照 `editor-adapter.ts` pointerup 挂 window） | deferred 因 test-cost 非平凡；**真实交互缺陷**，CR 须修                                                      |
| HCA2-P3-ENG-1 | engine            | P3         | engine 公共命令 API 缺 destroyed 门控（binding 层有，engine 缺）`scada-engine.ts:173-189`                                                                    | 防御纵深缺口；主路径 hook 卸载置空 ref + test handle 移除 + binding 门控无可复现路径                         |
| HCA2-P3-ENG-2 | engine            | P3         | `applyDiff` nextConfig 省略时 currentConfig/exportConfig 返旧 config `config-adapter.ts:55,71-79`                                                            | 公共 API 契约 footgun；renderer 恒传 nextConfig，主路径无影响                                                |
| HCA2-P3-ENG-3 | engine            | P3         | `tree-registry.add` 不查重，重复 id 旧 node 成孤儿 + zIndex 跳变 `tree-registry.ts:19-32`                                                                    | 防御纵深；validator 主路径拒绝重复 id                                                                        |
| HCA4-P3-1     | serialization     | P3         | `validate.ts` align 校验遗漏                                                                                                                                 | 校验覆盖缺口                                                                                                 |
| HCA4-P3-2     | serialization     | P3         | `validate.ts` background.grid 校验遗漏                                                                                                                       | 校验覆盖缺口                                                                                                 |
| HCA5-P3×3     | symbols core      | P3         | 3 项（精确措辞从 `docs/audits/2026-08-08-0748-hca5-symbols-core.md` Finding Triage 拉取）                                                                    | live 复核：仅 P3-1 真 归 CR（P3-2 归 HCA6 已解、P3-3 已记录非新缺陷）；Phase 1 对账                          |
| HCA6-P3×4     | symbol shapes     | P3         | switch on/off 推断边缘 / extent 族内边距 cosmetic / polygon 空点 / NaN 防御纵深                                                                              | 4 项 cosmetic / 防御纵深                                                                                     |
| HCA8-P3×13    | editor panels     | P3         | live 复核：归 CR 实为 **11 项**（P2-FE-1 + P3-FE-2 均 fixed 不入 CR）；精确措辞从 `docs/audits/2026-08-08-1230-hca8-editor-panels.md` Finding Triage 拉取    | 多为 cosmetic / 防御纵深；Phase 1 对账                                                                       |
| HCA8-#5       | editor panels     | watch-only | align-distribute group-relative 定位算法 edge case                                                                                                           | 已 HCA8 裁定 watch-only residual；CR 复核裁定是否仍 residual                                                 |
| HCA9-P3×4     | editor connection | P3         | moveDrag O(n) bounds 重建 / 等距候选 tie-break / 源码注释措辞 / sky overlay 颜色硬编码                                                                       | 性能 / tie-break / 措辞 / 硬编码                                                                             |
| HCA9-#1       | editor connection | watch-only | connection drag pointermove vs viewport-pan 手势仲裁                                                                                                         | 已 HCA9 裁定 watch-only residual（preventDefault + connectionDragActiveRef 接线完整 + e2e #1 覆盖）；CR 复核 |
| HCA10-P3×1    | editor undo-redo  | P3         | 合并窗口时间戳源 `Date.now` 非单调（单 tab 短窗口低概率）`operation-coalesce.ts`                                                                             | 低概率时序                                                                                                   |
| HCA11-P3-1    | editor infra      | P3         | `undo-redo-adapter.cloneNodeDeep` custom 一致性防御                                                                                                          | 防御纵深                                                                                                     |
| HCA11-P3-2    | editor infra      | P3         | `handleGeometryChange` microtask teardown 竞态（try/catch 已含住）                                                                                           | 已含住，防御纵深                                                                                             |

**合计（上限估计，Phase 1 对账后下调）**：1 项 P2（HCA11-P2-2，须修）+ 约 20–25 项 P3（HCA5 实为 1 / HCA8 实为 11，其余按表述）+ 2 项 watch-only residual（#1/#5 复核）。Phase 1「裁定结果」表产出权威终态计数。

### 已不在 CR scope（明确归属）

- **validate.ts 524 行拆分** → HCA-CG 所有权（roadmap §HCA-CG + HCA4 拆分 Decision：单一职责内聚 + 拆分致过度碎片化，拆分缝已记录供 CG 采用）。本 plan 不做。
- **HCAX-1（error code）/ HCAX-2（canvas a11y）** → 已 done，不重做。
- **dirty-collector 665 行拆分** → HCA3 已落地，不重做。
- 各 P0/P1 live defect → 已在 HCA\* 各层 test-first 修复（归 HCA-BL 文档归档），不在 CR。

## Goals

- 把全量 deferred P2/P3 backlog + 2 watch-only residual 汇总成单一 triage 表，逐项裁定终态：`修复（Fix）` / `watch-only residual（附 Why-Not-Blocking）` / `out-of-scope（附理由）`，零模糊措辞。
- 对裁定为「修复」的项 test-first 修复（failing-first proof 先于 fix，断言结果值），含唯一的真实 P2 缺陷 HCA11-P2-2（connection-wiring pointerup 容器外卡死）。
- 对裁定为 residual 的项，在本 plan「Deferred But Adjudicated」+ 对应审计记录写清 Why-Not-Blocking + 是否需 successor。
- roadmap §HCA-CR 行在 closure audit 通过后改 `done`，解锁 HCA-CV。

## Non-Goals

- 不重审 HCA1–HCA11 各层（done）；不重新发现新 finding（本 plan 只处置已 deferred 项）。
- 不做 validate.ts 拆分（HCA-CG）/ dirty-collector 拆分（已 done）/ HCAX 重构（已 done）。
- 不做 HCA-BL bug 归档（并行 plan，纯文档）/ HCA-LL lesson 沉淀（successor）/ HCA-CV 全量验证（successor，依赖本 plan）/ HCA-CG Guard 沉淀（successor）。
- 不改 industrial 包公共面或 `ScadaConfigDiff` 载荷契约（除非裁定为修复项确需）。
- 不引入新 public API（防御纵深 hardening 优先内部 guard，不扩公共面）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/`（仅裁定为「修复」的项触及的文件）。
- 各层审计记录 `docs/audits/2026-08-08-*-hca*.md` 的「归 HCA-CR」项状态回写（fixed / residual-adjudicated）。
- `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA-CR 行状态（closure 后 `todo`→`done`）。

### Out Of Scope

- `docs/bugs/`（HCA-BL）/ `docs/skills/` + `docs/audits/component-audit-checklist.md` v2（HCA-LL/CG）。
- validate.ts 行数治理（HCA-CG）。
- 全量 `pnpm test:e2e`（HCA-CV）；本 plan 仅对修复项跑包级 focused test + 必要时单条 e2e。
- 非 industrial 包代码。

## Failure Paths

> CR 修复项集中在 connection-wiring pointerup（手势/覆盖物生命周期）+ 防御纵深 guard + 校验覆盖。关注点：修复不破坏现有手势仲裁 / 不引入新公共面 / 防御 guard 不误拒合法输入。

| 可测场景编号           | 触发                                            | 行为                                                                                | 可重试 | 用户可见表现                         |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------- | ------ | ------------------------------------ |
| conn-pointerup-outside | connection drag 中指针移出 container 后释放     | pointerup 被 window 级监听捕获，`connectionDragActiveRef` 复位 false + overlay 清除 | 否     | 无残留连线覆盖物 / 无卡死 drag 态    |
| destroyed-guard        | engine.destroy 后调公共命令（reset/zoomAt/...） | destroyed 门控 no-op，不操作已销毁 app                                              | 否     | 无 console 异常 / 无 leafer 内部错误 |
| validator-strictness   | align / background.grid 缺失或 malformed        | validator 报告缺失（若裁定修复），不静默通过                                        | 否     | 导入时报错提示                       |

## Test Strategy

本档选择：**建议有测**

CR backlog 含 1 项真实 P2 交互缺陷（HCA11-P2-2 connection-wiring pointerup）+ ~25 项 P3（多为防御纵深 / cosmetic / 校验覆盖）。处置策略：

- **P2-2（connection-wiring pointerup）**：test-first（failing-first proof 先于 fix，断言 `connectionDragActiveRef` 复位 + overlay 清除，非 not.toThrow），test-cost 即当初 deferred 的理由，CR 必须承担。
- **裁定为修复的 P3**（防御纵深 guard / 校验覆盖）：same-PR 带回归测试，断言 guard 行为结果值。
- **裁定为 residual 的 P3 / #1 / #5**：附 Why-Not-Blocking，不写测试。
  验证以 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` + 修复项 focused 抽查为主；connection-wiring 修复追加 `scada-editor-interaction-correctness.spec.ts` 相关用例（若裁定需 e2e 锁定）。

## Execution Plan

### Phase 1 - Backlog 全量汇总 + 逐项裁定

Status: planned
Targets: 本 plan Current Baseline 清单 + HCA5/HCA8 审计记录 Finding Triage（措辞拉取）

- Item Types: `Decision`

- [ ] 从 `docs/audits/2026-08-08-0748-hca5-symbols-core.md` 拉取 HCA5 P3×3 + 从 `docs/audits/2026-08-08-1230-hca8-editor-panels.md` 拉取 HCA8 P3×13 的精确措辞 + `文件:行`，补全本 plan backlog 表。
- [ ] 逐项裁定终态，落裁定表（写入本 plan「裁定结果」节）：
  - `修复（Fix）`：真实缺陷 / 契约闭环值得做 / 防御纵深阻断可复现路径——附 fix 方向 + 是否需 test-first。
  - `watch-only residual`：附 Why-Not-Blocking（无可复现路径 / 低概率 / cosmetic 不影响 supported baseline）+ Successor Required yes/no。
  - `out-of-scope`：附理由（如属 HCA-CG 所有权 / 已 done）。
- [ ] 唯一 P2（HCA11-P2-2）必须裁定为「修复」——它是真实交互缺陷，不可降级 residual。
- [ ] 复核 #1 / #5 watch-only residual：确认仍 residual（接线完整 + e2e 覆盖）或升级修复（若发现新可复现路径）。

Exit Criteria:

- [ ] 本 plan「裁定结果」节含全量 backlog（1 P2 + 约 20–25 P3（Phase 1 对账后下调）+ 2 watch-only）逐项终态，零「optional / consider / nice-to-have」模糊措辞。
- [ ] HCA5/HCA8 措辞已拉取，backlog 表无「精确措辞从...拉取」占位残留。
- [ ] HCA11-P2-2 裁定为修复；#1/#5 复核结论明确（residual 或升级）。

### Phase 2 - 修复裁定为 Fix 的项（test-first）

Status: planned
Targets: 裁定为 Fix 的源文件 + 对应 `*.test.ts`（按裁定结果，预期含 HCA11-P2-2 + 部分防御纵深 / 校验覆盖项）

- Item Types: `Fix | Proof`

- [ ] **HCA11-P2-2（connection-wiring pointerup 容器外卡死）**：先写 failing-first focused test（拖拽中指针移出 container 后 pointerup，断言 `connectionDragActiveRef===false` + overlay 清除，结果值断言），再修 `connection-wiring.ts`（pointerup 挂 window 对齐 `editor-adapter.ts` 或等效 cleanup），转绿。
- [ ] 对其余裁定为 Fix 的 P3 项：每项 same-PR 回归测试（断言 guard 行为结果值），再修代码。
- [ ] 每条 fix 在对应审计记录「归 HCA-CR」项回写 `fixed` + fix 落点 `文件:行`。

Exit Criteria:

- [ ] HCA11-P2-2 failing-first test 存在且转绿（断言结果值，非 not.toThrow）。
- [ ] 其余 Fix 项均有回归测试且转绿。
- [ ] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿（包级局部验证）。
- [ ] 审计记录「归 HCA-CR」fixed 项已回写落点。

### Phase 3 - Residual 裁定回写 + 回归抽查

Status: planned
Targets: 本 plan「Deferred But Adjudicated」、各层审计记录、roadmap

- Item Types: `Follow-up`

- [ ] 对裁定为 residual 的项：逐项写本 plan「Deferred But Adjudicated」（Classification + Why Not Blocking Closure + Successor Required + Successor Path），并在对应审计记录回写 `residual-adjudicated at HCA-CR`。
- [ ] 抽查构成依赖回归：P2-2 修复不破坏 HCA9 connection 算法 / HCA11 adapter 事件序；防御 guard 不误拒合法输入（HCA2/HCA4/HCA5/HCA6/HCA8/HCA10 受影响项）。
- [ ] roadmap §HCA-CR 行状态预留 closure audit 通过后改 `done` 的说明（实际改写在 closure audit pass 后）。

Exit Criteria:

- [ ] 所有 residual 项在本 plan「Deferred But Adjudicated」有 Classification + Why-Not-Blocking + Successor 判定，无裸 deferred。
- [ ] 各层审计记录「归 HCA-CR」项无残留未结状态（fixed / residual-adjudicated 二选一）。
- [ ] 构成依赖回归抽查通过。

## Draft Review Record

> 起草后、执行前的独立审查证据（详见 guide `Plan Review Rule`）。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_01ff61b7dffeJJZyh7xrOkJj6B`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。4 Minor 全部为计数对账准确性（已落地）：
  - m-1：HCA8 归 CR 实为 11 项（P2-FE-1 + P3-FE-2 均 fixed 不入 CR），非 roadmap 表述的 13——backlog 表 + 计数说明已注明 Phase 1 以 live Finding Triage 权威对账。
  - m-2：HCA5 仅 P3-1 真 归 CR（P3-2 归 HCA6 已解、P3-3 已记录非新缺陷）——backlog 表 Why-Not-Blocking 列已注明。
  - m-3：「合计 ~25 P3」改为「上限估计约 20–25，Phase 1 对账后下调」。
  - m-4：backlog 表前增依赖说明（roadmap 表权威：CR deps = HCA1–HCA11 全 done → 已解锁；mermaid `LL→CR` 边标注「传递依赖 HCA1–11」，CR 不被 LL/BL 阻塞，可与 HCA-BL 并行）。
  - live 核对全通过：HCA2 P3-ENG-1/2/3 `文件:行` 精确匹配、HCA11-P2-2 deferred-to-CR 理由（test-cost 非平凡）确认、validate.ts 拆分归 CG 非 CR 确认、CR deps 已满足确认。

## Closure Gates

- [ ] 全量 CR backlog（1 P2 + 约 20–25 P3（Phase 1 对账后下调）+ 2 watch-only）已逐项裁定终态，零模糊措辞。
- [ ] HCA11-P2-2 真实交互缺陷已 test-first 修复（failing-first proof 存在，断言结果值）。
- [ ] 所有裁定为 Fix 的 P3 项已修复并带回归测试。
- [ ] 所有裁定为 residual 的项在本 plan「Deferred But Adjudicated」有 Why-Not-Blocking，无 in-scope live defect / contract drift 被静默降级。
- [ ] 各层审计记录「归 HCA-CR」项状态全部回写（fixed / residual-adjudicated）。
- [ ] roadmap §HCA-CR 行 closure 后状态一致（`done`）。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

> Phase 1/3 产出。起草时留空，逐项裁定后填入。每项必须含 Classification（watch-only residual / optimization candidate / out-of-scope improvement）+ Why Not Blocking Closure + Successor Required + Successor Path。

## Non-Blocking Follow-ups

- HCA-CV（全量验证）：依赖本 plan 修复落地后做 typecheck/build/lint/test + e2e full-green + 性能基线复测。
- HCA-CG（Guard 沉淀）：validate.ts 524 行拆分（CG 所有权）+ checklist v2 industrial 专项 + 工具脚本升级；CR 的 residual 裁定结果喂入 CG 的 checklist 治理。
- HCA-LL（lesson）：若 CR 修复暴露新模式 lesson，喂入 LL successor。

## Closure

Status Note: <<完成时填写：backlog 裁定 X 修复 / Y residual / Z out-of-scope；P2-2 修复转绿；roadmap §HCA-CR 改 done；解锁 HCA-CV>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent fresh session>>
- Evidence: <<task id / daily log link / 裁定表 + 修复落点 + residual Why-Not-Blocking 抽查>>

Follow-up:

- HCA-CV successor：基于本 plan 修复后的全量验证。
- 或明确：除 successor 外无 plan-owned remaining work。

## 裁定结果

> Phase 1 产出。起草时留空，Phase 1 完成后填入全量 backlog 裁定表（ID → Fix/residual/out-of-scope + fix 方向或 Why-Not-Blocking）。
