# 02 Industrial HMI Component Audit — HCA-CR 跨层集中修复与裁决（deferred P2 backlog + P3 裁定 + watch-only 复核）

> Plan Status: completed
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
| HCA5-P3×3     | symbols core      | P3         | P3-1 deepMerge 无深度上限（归 CR residual）；P3-2 静默丢弃（HCA6 已解→out-of-scope）；P3-3 binding-vs-revert（已记录→out-of-scope）                          | live 复核：仅 P3-1 真 归 CR；措辞已在「裁定结果」对账                                                        |
| HCA6-P3×4     | symbol shapes     | P3         | switch on/off 推断边缘 / extent 族内边距 cosmetic / polygon 空点 / NaN 防御纵深                                                                              | 4 项 cosmetic / 防御纵深                                                                                     |
| HCA8-P3×13    | editor panels     | P3         | live 复核：归 CR 实为 **11 项**（P2-FE-1 + P3-FE-2 均 fixed 不入 CR）；11 项措辞已在「裁定结果」逐项裁定（FLD-1/2/3、SCH-1、PAL-1/2/3、INS-1、TB-1/2、AD-1） | 多为 cosmetic / 防御纵深 / latent；Phase 1 对账                                                              |
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

Status: completed
Targets: 本 plan Current Baseline 清单 + HCA5/HCA8 审计记录 Finding Triage（措辞拉取）

- Item Types: `Decision`

- [x] 从 `docs/audits/2026-08-08-0748-hca5-symbols-core.md` 拉取 HCA5 P3×3 + 从 `docs/audits/2026-08-08-1230-hca8-editor-panels.md` 拉取 HCA8 P3×13 的精确措辞 + `文件:行`，补全本 plan backlog 表。
- [x] 逐项裁定终态，落裁定表（写入本 plan「裁定结果」节）：
  - `修复（Fix）`：真实缺陷 / 契约闭环值得做 / 防御纵深阻断可复现路径——附 fix 方向 + 是否需 test-first。
  - `watch-only residual`：附 Why-Not-Blocking（无可复现路径 / 低概率 / cosmetic 不影响 supported baseline）+ Successor Required yes/no。
  - `out-of-scope`：附理由（如属 HCA-CG 所有权 / 已 done）。
- [x] 唯一 P2（HCA11-P2-2）必须裁定为「修复」——它是真实交互缺陷，不可降级 residual。
- [x] 复核 #1 / #5 watch-only residual：确认仍 residual（接线完整 + e2e 覆盖）或升级修复（若发现新可复现路径）。

Exit Criteria:

- [x] 本 plan「裁定结果」节含全量 backlog（1 P2 + 约 20–25 P3（Phase 1 对账后下调）+ 2 watch-only）逐项终态，零「optional / consider / nice-to-have」模糊措辞。
- [x] HCA5/HCA8 措辞已拉取，backlog 表无「精确措辞从...拉取」占位残留。
- [x] HCA11-P2-2 裁定为修复；#1/#5 复核结论明确（residual 或升级）。

### Phase 2 - 修复裁定为 Fix 的项（test-first）

Status: completed
Targets: 裁定为 Fix 的源文件 + 对应 `*.test.ts`（按裁定结果，含 HCA11-P2-2 + 4 项防御纵深 / 校验覆盖）

- Item Types: `Fix | Proof`

- [x] **HCA11-P2-2（connection-wiring pointerup 容器外卡死）**：先写 failing-first focused test（`connection-wiring.test.ts`——拖拽中指针移出 container 后 window pointerup，断言 `connectionDragActiveRef===false`），再修 `connection-wiring.ts`（pointerdown 命中 junction 后挂 `window.addEventListener('pointerup', endConnDrag, { once: true })`，对齐 editor-adapter.ts:80；移除 container pointerup；cleanup 兜底 removeEventListener + ref=false），转绿（4 测）。
- [x] 对其余裁定为 Fix 的 P3 项：每项 same-PR 回归测试（断言 guard 行为结果值），再修代码。
  - HCA2-P3-ENG-1：`scada-engine.ts` 公共命令族（reset/applyAttrs/setViewport/zoomAt/fit/center/setSize/applyDiff）增 `if (this.destroyed) return` 守卫；failing-first 3 测（`scada-engine.test.ts` destroyed guard）。
  - HCA4-P3-1：`validate.ts` 增 align 枚举校验（`'left'|'center'|'right'`）；failing-first 2 测（`serialization-validate.test.ts`）。
  - HCA4-P3-2：`validate.ts` background.grid 子形状 assertShape（size:number/color:string）；failing-first 3 测（`serialization-validate.test.ts`）。
  - HCA11-P3-1：`undo-redo-adapter.ts` cloneNodeDeep 增 `structuredClone(node.custom)`（对齐 P2-1/editor-session）；failing-first 2 测（`undo-redo-adapter.test.ts`）。
- [x] 每条 fix 在对应审计记录「归 HCA-CR」项回写 `fixed` + fix 落点 `文件:行`。

Exit Criteria:

- [x] HCA11-P2-2 failing-first test 存在且转绿（断言结果值，非 not.toThrow）。
- [x] 其余 Fix 项均有回归测试且转绿。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿（包级局部验证）。
- [x] 审计记录「归 HCA-CR」fixed 项已回写落点。

### Phase 3 - Residual 裁定回写 + 回归抽查

Status: completed
Targets: 本 plan「Deferred But Adjudicated」、各层审计记录、roadmap

- Item Types: `Follow-up`

- [x] 对裁定为 residual 的项：逐项写本 plan「Deferred But Adjudicated」（Classification + Why Not Blocking Closure + Successor Required + Successor Path），并在对应审计记录回写 `residual-adjudicated at HCA-CR`。
- [x] 抽查构成依赖回归：P2-2 修复不破坏 HCA9 connection 算法 / HCA11 adapter 事件序；防御 guard 不误拒合法输入（HCA2/HCA4/HCA5/HCA6/HCA8/HCA10 受影响项）。
- [x] roadmap §HCA-CR 行状态预留 closure audit 通过后改 `done` 的说明（实际改写在 closure audit pass 后）。

Exit Criteria:

- [x] 所有 residual 项在本 plan「Deferred But Adjudicated」有 Classification + Why-Not-Blocking + Successor 判定，无裸 deferred。
- [x] 各层审计记录「归 HCA-CR」项无残留未结状态（fixed / residual-adjudicated 二选一）。
- [x] 构成依赖回归抽查通过。

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

- [x] 全量 CR backlog（1 P2 + 24 P3 residual + 2 watch-only）已逐项裁定终态，零模糊措辞。
- [x] HCA11-P2-2 真实交互缺陷已 test-first 修复（failing-first proof 存在，断言结果值）。
- [x] 所有裁定为 Fix 的 P3 项已修复并带回归测试。
- [x] 所有裁定为 residual 的项在本 plan「Deferred But Adjudicated」有 Why-Not-Blocking，无 in-scope live defect / contract drift 被静默降级。
- [x] 各层审计记录「归 HCA-CR」项状态全部回写（fixed / residual-adjudicated）。
- [x] roadmap §HCA-CR 行 closure 后状态一致（`done`）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（`ses_01fc7ae3affepjO1mMYegbl7vk`，PASS）；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`（32/32）
- [x] `pnpm build`（32/32）
- [x] `pnpm lint`（32/32）
- [x] `pnpm test`（59/59；industrial 100 files / 1340 tests）

## Deferred But Adjudicated

> Phase 1/3 产出（2026-08-08）。每项含 Classification（watch-only residual / optimization candidate / out-of-scope improvement）+ Why Not Blocking Closure + Successor Required + Successor Path。
>
> **通用 Successor 判定**：除明确标注外，全部 residual 项 Successor Required = **no**——它们是 cosmetic / latent（无可复现路径）/ 低概率时序 / 防御纵深冗余（主路径已有前置守卫），不构成 supported baseline 的行为缺口，无需开 successor plan。若未来需求升级（如世界坐标对齐、monotonic 时钟、a11y 增强），由对应需求 plan 重新评估。

### engine 层（HCA2）

| ID            | Classification      | Why Not Blocking Closure                                                                                                                                                               | Successor |
| ------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| HCA2-P3-ENG-2 | watch-only residual | `applyDiff(diff, nextConfig?)` nextConfig 省略时 currentConfig 返旧值——renderer（use-scada-config-sync）恒传 nextConfig，主路径无影响；公共 API 可选参数契约 footgun，非 live defect。 | no        |
| HCA2-P3-ENG-3 | watch-only residual | `tree-registry.add` 不查重——validator（duplicate symbol id）主路径已拒绝重复 id，无可复现路径；重复 add 是 caller 责任。                                                               | no        |

### symbols core 层（HCA5）

| ID        | Classification      | Why Not Blocking Closure                                                                                                                                                                                     | Successor |
| --------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| HCA5-P3-1 | watch-only residual | `deepMergeInstanceProps` 无递归深度上限——author-controlled 输入 + validate.ts `MAX_VALIDATE_DEPTH=100` fail-closed 已守（validator 是最外层防线，merge 在其内）；equality.ts deepEqual 有对应 100 深度守卫。 | no        |

### symbol shapes 层（HCA6）

| ID        | Classification      | Why Not Blocking Closure                                                                                                                     | Successor |
| --------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| HCA6-P3-1 | watch-only residual | switch `lever.x !== 3` 推断 on/off——默认 48×28 不触发；需 width===height 边缘尺寸（author-controlled），且仅 on/off 视觉态误判，非数据损坏。 | no        |
| HCA6-P3-2 | watch-only residual | extent 族（level/thermometer/progress）容器 resize 丢失 create-time 内边距——cosmetic；height 绑定值路径正确，容器 resize 非主绑定用例。      | no        |
| HCA6-P3-3 | watch-only residual | polygon `custom.points=[]` 空数组→空图形——author-controlled（显式清空 points 语义合理），无崩溃。                                            | no        |
| HCA6-P3-4 | watch-only residual | composite/common rotation/几何 NaN 无守卫直传 leafer——validate.ts `Number.isFinite` 已拒绝 NaN 节点字段；binding 层应产合法值（纵深冗余）。  | no        |

### editor panels 层（HCA8）

| ID            | Classification      | Why Not Blocking Closure                                                                                                                              | Successor |
| ------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| HCA8-P3-FLD-1 | watch-only residual | inspector-field 注释/代码不符（point-ref/action-editor fallback）——latent，无 live symbol 显式声明 widget（symbols 全靠 deriveWidget 按 type 推导）。 | no        |
| HCA8-P3-FLD-2 | watch-only residual | number-input 清空时 `Number('')=0`——type="number" 已限非法字符；空→0 为 documented M1 简化，非数据损坏（消费者可改 undefined）。                      | no        |
| HCA8-P3-FLD-3 | watch-only residual | Label/Input 未经 htmlFor/id 关联（a11y）——inspector 非高频 a11y 面；canvas a11y 主体已由 HCAX-2 收口。                                                | no        |
| HCA8-P3-SCH-1 | watch-only residual | schema-extractor props 显式声明 bindings/states 时注入重复字段——latent，live symbols 不在 props 声明这些键（compositePropSchema 验证）。              | no        |
| HCA8-P3-PAL-1 | watch-only residual | palette onError prop 声明但从不调用——palette 无错误上浮路径（放置失败经 validate 兜底）。                                                             | no        |
| HCA8-P3-PAL-2 | watch-only residual | palette 拖入 id 不主动查重——validate 兜底拒绝重复 id；多 palette 实例场景非主流。                                                                     | no        |
| HCA8-P3-PAL-3 | watch-only residual | palette drag 无 aria-label/键盘放置路径（a11y）——canvas 交互面 a11y 已由 HCAX-2 收口；palette drag 为增强交互。                                       | no        |
| HCA8-P3-INS-1 | watch-only residual | inspector onError prop 声明但从不调用——inspector 经 validateScadaConfig 单源，无错误上浮路径。                                                        | no        |
| HCA8-P3-TB-1  | watch-only residual | toolbox onError prop 声明但从不调用——toolbox 经 statusMessage 上浮（runtime 方法返 boolean），无 onError 路径。                                       | no        |
| HCA8-P3-TB-2  | watch-only residual | toolbox 图标按钮依赖 title 非 aria-label（a11y）——title 提供 accessible name；增强项非阻断。                                                          | no        |
| HCA8-P3-AD-1  | watch-only residual | align-distribute 位移判定精确 0 比较——输入为整数坐标，无 float 尘；近零 patch 无视觉影响。                                                            | no        |

### editor connection 层（HCA9）

| ID        | Classification         | Why Not Blocking Closure                                                                                           | Successor |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| HCA9-P3-1 | optimization candidate | moveDrag 每 pointermove 全量 collectSymbolBounds O(n)——编辑器规模可接受；非热路径（仅 connection drag 期触发）。   | no        |
| HCA9-P3-2 | watch-only residual    | 等距吸附候选 tie-break 首入数组——确定性结果（首入胜出），无错误行为；仅缺文档化。                                  | no        |
| HCA9-P3-3 | watch-only residual    | anchor-snap 源码注释「共 12 锚点」vs EDGE_ANCHORS 实际 8 条——注释措辞误导，无行为影响。                            | no        |
| HCA9-P3-4 | watch-only residual    | sky overlay 颜色硬编码 `#22c55e`/`#ffffff`——非 DOM/CSS（sky 层 leafer 节点），主题独立性规则不直接适用；调参增强。 | no        |

### editor undo-redo 层（HCA10）

| ID         | Classification      | Why Not Blocking Closure                                                                                                                                                      | Successor |
| ---------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| HCA10-P3-1 | watch-only residual | 合并窗口时间戳源 `Date.now()` 非单调（wall clock）——单 tab 短窗口（500ms）低概率；系统时钟回拨致负数误合并需 NTP 调整/多 tab；monotonic 时钟（performance.now）需 host 接入。 | no        |

### editor infra 层（HCA11）

| ID         | Classification      | Why Not Blocking Closure                                                                                                                                                 | Successor |
| ---------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| HCA11-P3-2 | watch-only residual | handleGeometryChange microtask teardown 竞态——try/catch 已含住（applyDiff 抛→onError，已 unmounted 组件无副作用）；detach 后无新调度；极低概率（microtask 同 tick 尾）。 | no        |

### watch-only residual 复核（#1 / #5）

| ID      | Classification      | Why Not Blocking Closure                                                                                                                                                                                               | Successor                                               |
| ------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| HCA8-#5 | watch-only residual | align-distribute 跨层级混选 local 坐标限制——M3 T1 文档化接受（design-toolbox.md §12.1）：扁平算法对「同父兄弟」自洽，仅「跨父容器混选」不对齐到世界坐标。接线完整（:5-7 注释 + :156-185 单测）。无 P1-C2/C3 回归迹象。 | yes（M3 后跨 group 嵌套对齐若提需求再评估世界坐标对齐） |
| HCA9-#1 | watch-only residual | connection drag pointermove vs viewport-pan 手势仲裁——preventDefault + connectionDragActiveRef 接线完整；e2e `scada-editor-interaction-correctness.spec.ts` #1 覆盖通过。HCA11 接线侧复核未发现新缺陷。                | no                                                      |

### out-of-scope（已在他处解决 / 已记录非新缺陷）

| ID        | Classification | Why Not Blocking Closure                                                                                           | Successor |
| --------- | -------------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| HCA5-P3-2 | out-of-scope   | HCA6 per-shape 裁定表已解：12 composite 全有 extent/resize，pipe-junction 升级 P2-1 landed fix。非新缺陷，不重做。 | no        |
| HCA5-P3-3 | out-of-scope   | visual-state.ts:83-91 binding-vs-revert 边缘 case——代码已标 Non-Blocking Follow-up，已记录非新缺陷。               | no        |

## Non-Blocking Follow-ups

- HCA-CV（全量验证）：依赖本 plan 修复落地后做 typecheck/build/lint/test + e2e full-green + 性能基线复测。
- HCA-CG（Guard 沉淀）：validate.ts 524 行拆分（CG 所有权）+ checklist v2 industrial 专项 + 工具脚本升级；CR 的 residual 裁定结果喂入 CG 的 checklist 治理。
- HCA-LL（lesson）：若 CR 修复暴露新模式 lesson，喂入 LL successor。

## Closure

Status Note: backlog 裁定 5 修复（1 P2 + 4 P3）/ 24 residual / 2 out-of-scope；2 watch-only residual（#1/#5）复核维持；HCA11-P2-2 connection-wiring pointerup test-first 修复转绿（4 failing-first 测）；HCA2/HCA4/HCA11 防御纵深/校验覆盖/克隆一致性 4 项 test-first 修复转绿（10 failing-first 测）；roadmap §HCA-CR 改 done；解锁 HCA-CV。closure audit PASS（fresh session `ses_01fc7ae3affepjO1mMYegbl7vk`，零 Blocker / 零 Major，1 Minor 计数标签已修）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_01fc7ae3affepjO1mMYegbl7vk`
- Verdict: PASS（A-E 五维独立核验：fix 正确性 + 裁定完整性 + 审计记录一致性 + 回归风险 + scope 纪律）
- Evidence:
  - `pnpm typecheck` 32/32、`pnpm build` 32/32、`pnpm lint` 32/32、`pnpm test` 59/59（industrial 100 files / 1340 tests，+14 新测）
  - 5 项 fix 落点：connection-wiring.ts（P2-2 window pointerup）/ scada-engine.ts（ENG-1 destroyed guard）/ validate.ts（P3-1 align + P3-2 grid）/ undo-redo-adapter.ts（P3-1 custom 深克隆）
  - 24 项 residual Why-Not-Blocking + Successor 判定入「Deferred But Adjudicated」
  - 各层审计记录 Finding Triage fixed/residual-adjudicated 状态回写

Follow-up:

- HCA-CV successor：基于本 plan 修复后的全量验证（typecheck/build/lint/test + e2e full-green + 性能基线复测）。
- 除 successor 外无 plan-owned remaining work。

## 裁定结果

> Phase 1 产出（2026-08-08）。全量 backlog 逐项裁定，措辞已从各层审计记录 Finding Triage 拉取对账。
>
> **合计**：1 项 P2 Fix + 4 项 P3 Fix + 24 项 P3 residual + 2 项 watch-only residual 复核维持 + 2 项 out-of-scope（已在他处解决/已记录）。

### 裁定为「修复（Fix）」— 5 项（test-first，见 Phase 2）

| ID            | 来源层        | 文件:行                                        | 摘要                                                                                                                     | Fix 方向                                                                                                                                                                    | test-first          |
| ------------- | ------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| HCA11-P2-2    | editor infra  | `connection-wiring.ts:58-60`                   | pointerup 挂 container，释放于容器外时 connectionDragActiveRef 卡 true + overlay 残留                                    | pointerdown 命中 junction 后挂 `window.addEventListener('pointerup', endConnDrag, { once: true })`，对齐 editor-adapter.ts:80；cleanup 兜底 removeEventListener + ref=false | 是（failing-first） |
| HCA2-P3-ENG-1 | engine        | `scada-engine.ts:173-189`（公共命令族）        | engine 公共命令 API 缺 destroyed 门控（reset/applyAttrs/setViewport/zoomAt/fit/center/setSize/applyDiff/setSymbolProps） | 公共命令入口增 `if (this.destroyed) return;` 守卫（no-op，不操作已销毁 app），对齐 binding 层门控纪律                                                                       | 是（回归）          |
| HCA4-P3-1     | serialization | `validate.ts:287` vs `config-types.ts:91`      | validateSymbolNode 字符串校验循环遗漏 `align` 字段（`'left'\|'center'\|'right'`）                                        | 增 align 枚举校验（非上述三值则报错），关闭校验覆盖缺口                                                                                                                     | 是（回归）          |
| HCA4-P3-2     | serialization | `validate.ts:448-451` vs `config-types.ts:105` | background.grid 子形状（`{size:number;color:string}`）未校验                                                             | background 校验增 `grid` assertShape（size:number / color:string），关闭校验覆盖缺口                                                                                        | 是（回归）          |
| HCA11-P3-1    | editor infra  | `undo-redo-adapter.ts:253-256`                 | `cloneNodeDeep`（事务快照）未深克隆 custom，与 P2-1（已修）/ editor-session.cloneNode 同型残留                           | cloneNodeDeep 增 `if (node.custom) clone.custom = structuredClone(node.custom);`，闭合 custom 深克隆全站点一致                                                              | 是（回归）          |

### 裁定为「watch-only residual」— 17 项 P3（Why-Not-Blocking 见「Deferred But Adjudicated」）

| ID            | 来源层            | 文件:行                                               | 摘要                                                     | Why-Not-Blocking（一句话）                                                |
| ------------- | ----------------- | ----------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| HCA2-P3-ENG-2 | engine            | `config-adapter.ts:55,71-79`                          | applyDiff nextConfig 省略时返旧 config（footgun）        | renderer 恒传 nextConfig，主路径无影响；公共 API 可选参数契约             |
| HCA2-P3-ENG-3 | engine            | `tree-registry.ts:19-32`                              | add 不查重，重复 id 旧 node 成孤儿                       | validator 主路径拒绝重复 id（duplicate symbol id），无可复现路径          |
| HCA5-P3-1     | symbols core      | `compound.ts:28-47`                                   | deepMergeInstanceProps 无递归深度上限                    | author-controlled 输入 + validate MAX_VALIDATE_DEPTH=100 fail-closed 已守 |
| HCA6-P3-1     | symbol shapes     | `switch.ts:60-62`                                     | lever.x!==3 推断 on/off，width===height 时误判 off       | 默认 48×28 不触发；需 width===height 边缘尺寸（author-controlled）        |
| HCA6-P3-2     | symbol shapes     | `level.ts:42`/`thermometer.ts:50`/`progress.ts:44`    | extent 族容器 resize 丢失 create-time 内边距（cosmetic） | cosmetic；容器 resize 非主绑定用例（height 绑定值路径正确）               |
| HCA6-P3-3     | symbol shapes     | `polygon.ts:41`                                       | custom.points=[] 空数组 → 空图形无 fallback              | author-controlled（显式清空 points 语义合理），无崩溃                     |
| HCA6-P3-4     | symbol shapes     | `composite.ts:53-56`/`common.ts:20-22`                | rotation/几何 NaN 无守卫直传 leafer                      | validate.ts finite 守卫已拒绝 NaN；binding 层应产合法值（纵深冗余）       |
| HCA8-P3-FLD-1 | editor panels     | `inspector-field.tsx:16`                              | 注释/代码不符（point-ref/action-editor fallback）        | latent，无 live symbol 显式声明 widget（symbols 全靠 deriveWidget 推导）  |
| HCA8-P3-FLD-2 | editor panels     | `inspector-field.tsx:83`                              | number-input 清空时 Number('')=0                         | type="number" 已限非法字符；空→0 为 documented 简化，非数据损坏           |
| HCA8-P3-FLD-3 | editor panels     | `inspector-field.tsx:73-74`                           | Label 与 Input 未经 htmlFor/id 关联（a11y）              | inspector 非高频 a11y 面；HCAX-2 已收口 canvas a11y 主体                  |
| HCA8-P3-SCH-1 | editor panels     | `schema-extractor.ts:85-99`                           | props 显式声明 bindings/states 等键时注入重复字段        | latent，live symbols 不在 props 声明这些键（compositePropSchema 验证）    |
| HCA8-P3-PAL-1 | editor panels     | `editor-palette.tsx:8`                                | onError prop 声明但从不调用                              | palette 无错误上浮路径（放置失败经 validate 兜底）                        |
| HCA8-P3-PAL-2 | editor panels     | `editor-palette.tsx:28-29`                            | 拖入 id 不主动查重                                       | validate 兜底拒绝重复 id；多 palette 实例场景非主流                       |
| HCA8-P3-PAL-3 | editor panels     | `editor-palette.tsx:48-51`                            | drag 无 aria-label/键盘放置路径（a11y）                  | canvas 交互面 a11y 已由 HCAX-2 收口；palette drag 为增强                  |
| HCA8-P3-INS-1 | editor panels     | `inspector-panel.tsx:13`                              | onError prop 声明但从不调用                              | inspector 经 validateScadaConfig 单源，无错误上浮路径                     |
| HCA8-P3-TB-1  | editor panels     | `toolbox-panel.tsx:13`                                | onError prop 声明但从不调用                              | toolbox 经 statusMessage 上浮（runtime 方法返 boolean），无 onError 路径  |
| HCA8-P3-TB-2  | editor panels     | `toolbox-panel.tsx:131-135`                           | 图标按钮依赖 title 非 aria-label（a11y）                 | title 提供 accessible name；增强项非阻断                                  |
| HCA8-P3-AD-1  | editor panels     | `align-distribute.ts:104-105`                         | 位移判定精确 0 比较（浮点输入理论近零 patch）            | align/distribute 输入为整数坐标，无 float 尘；近零 patch 无视觉影响       |
| HCA9-P3-1     | editor connection | `connection-drag-controller.ts:87`                    | moveDrag 每 pointermove 全量 O(n) bounds 重建            | 编辑器规模可接受；非热路径（仅 connection drag 期）                       |
| HCA9-P3-2     | editor connection | `anchor-snap.ts:130`                                  | 等距吸附候选 tie-break 为首入数组（未文档化）            | 确定性结果（首入胜出），无错误行为；仅缺文档化                            |
| HCA9-P3-3     | editor connection | `anchor-snap.ts:58`                                   | 源码注释「共 12 锚点」vs EDGE_ANCHORS 实际 8 条          | 注释措辞误导，无行为影响                                                  |
| HCA9-P3-4     | editor connection | `connection-overlay-renderer.ts:28,41-43`             | sky overlay 颜色硬编码 `#22c55e`/`#ffffff`               | 非 DOM/CSS（sky 层 leafer 节点），主题独立性规则不直接适用；调参增强      |
| HCA10-P3-1    | editor undo-redo  | `undo-redo-adapter.ts:232`/`operation-coalesce.ts:44` | 合并窗口时间戳源 Date.now() 非单调（系统时钟回拨）       | 单 tab 短窗口（500ms）低概率；monotonic 时钟需 host 接入                  |
| HCA11-P3-2    | editor infra      | `runtime-factories.ts:224-231`                        | handleGeometryChange microtask teardown 竞态             | try/catch 已含住（applyDiff 抛→onError 无副作用）；detach 后无新调度      |

### watch-only residual 复核 — 2 项（维持 residual）

| ID      | 来源层            | 文件:行                                     | 复核结论                                                                                                                                                                                                                                        |
| ------- | ----------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HCA8-#5 | editor panels     | `align-distribute.ts:5-7`                   | **维持 watch-only residual**。`align-distribute.ts:5-7` 文档化注释仍在（M3 T1 扁平算法，不解析 group 嵌套相对坐标）；`align-distribute.test.ts:156-185` group-relative 三测仍覆盖且通过；无 P1-C2/C3 回归迹象；无新 live 渲染缺陷。不升级修复。 |
| HCA9-#1 | editor connection | connection drag pointermove vs viewport-pan | **维持 watch-only residual**。手势仲裁 preventDefault + connectionDragActiveRef 接线完整；e2e `scada-editor-interaction-correctness.spec.ts` #1 覆盖通过；HCA11 接线侧复核未发现新缺陷（P2-2 是接线层新 finding，非 #1 同型）。不升级修复。     |

### out-of-scope — 2 项（已在他处解决 / 已记录非新缺陷）

| ID        | 来源层       | 理由                                                                                                                   |
| --------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| HCA5-P3-2 | symbols core | HCA6 已解（per-shape 裁定表：12 composite 全有 extent/resize，pipe-junction 升级 P2-1 landed fix）。非新缺陷，不重做。 |
| HCA5-P3-3 | symbols core | visual-state.ts:83-91 binding-vs-revert 边缘 case，代码已标 Non-Blocking Follow-up，已记录非新缺陷。不重做。           |
