# B7 — P2/P3 Signal Triage & Residual Adjudication

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md` (Wave B7, 工作项 B7) + `docs/components/amis-bug-driven-improvements/README.md` + 14 per-component signal docs (`01-14*.md`)
> Related: B1.1 (`2026-06-26-0234-1-b11-*.md`) … B6.2 (`2026-06-26-2016-1-b62-*.md`) — 全部 `done`，其 `Deferred But Adjudicated` / Non-Blocking Follow-ups 是本 plan 的 deferred-item 输入
> Mission: amis-bug-driven-improvements
> Work Item: B7 P2/P3 信号收口（103 条，未细化工作项）

## Purpose

把 amis-bug-driven-improvement roadmap 的最后一个工作项 **B7** 收口到 `done`：对 14 个源 signal doc 中全部 P2/P3 signal 做一次性 triage，逐条给出显式裁定，把 B1–B6 已顺手覆盖的标 `done`、需补回归锚/owner-doc note 的低风险 residual 落地、genuinely-absent 的 feature 缺口确认为 `DESIGN-ACK-NOT-IMPL` + 明确 successor 所有权（不实现），从而使「B1–B6 closure 成立后 B7 可启动评估」这个 roadmap gate 兑现，整个 amis-bug-driven mission 闭环。

本 plan 是 **triage + residual-landing** 计划，不是 feature 实现计划。依据 B3.3 / B6.2 已确立的先例——「本 roadmap 是测试/文档边界债 roadmap，非 feature roadmap」——所有 DESIGN-ACK-NOT-IMPL feature 项裁定为 out-of-scope improvement + successor 指向，不在本 plan 实现。

## Current Baseline

**已成立（本 plan 不重复）：**

- Wave B1–B6 共 12 个工作项全部 `done`（`amis-bug-driven-improvement-roadmap.md:24-51` Phase Status）。B6.2 Status Note 明确「B1–B6 closure 成立，B7 可启动评估」。
- P0+P1（114 条 signal）已全部在 B1–B6 收口：每条要么 LOCK（回归锚已落地）、要么 TEST-GAP（focused 测试 green）、要么 DESIGN-GAP（owner doc 裁定已写）、要么裁定为刻意契约 / DESIGN-ACK-NOT-IMPL + successor。
- `docs/components/amis-bug-driven-improvements/` signal 库：README + 14 per-component doc，215 条 signal（经两轮独立 sub-agent review `ACCEPT`：Flux-principles audit 0 hard violation、请求下沉 audit 0 violation）。
- README 已定义 entry 处理工作流与裁定词表（`RESOLVED → <link>` 标记约定、`DESIGN-GAP`/`TEST-GAP`/`BOTH`/`LOCK`/`DESIGN-ACK-NOT-IMPL`/`NOT-ADOPTED`）。

**B7 现状（本 plan 要补的 gap）：**

- B7 在 roadmap 为 `todo`、`Plan: none`、`未细化工作项`。roadmap 明文：B7 = 「103 条 P2/P3 signal…等 B1–B6 closure 后再评估：哪些已被顺手覆盖（直接 `done`）、哪些值得细化为 successor 工作项、哪些降级为 watch-only。不丢弃原则：每条在源 doc 仍有 AMIS-REF 可反查」。
- 14 个源 doc 的 P2/P3 signal 共 **99 条**（live grep severity 列 `\| P[23]` = P2 85 + P3 14 = 99）。其中 **97 条**为单一 decision-type（live grep `\| (TEST-GAP|DESIGN-GAP|BOTH|LOCK|DESIGN-ACK-NOT-IMPL) \| P[23]`）：
  - `TEST-GAP`：**56**（设计声称但无回归锚；多数预期已被 B1–B6 顺手覆盖，少数需补锚）
  - `DESIGN-GAP`：**35**（owner doc 沉默需补裁定 note）
  - `LOCK`：**5**（设计已正确，补锁锚）
  - `DESIGN-ACK-NOT-IMPL`：**1**（源 doc 内显式标注；与下方 deferred 项有重叠）
- 另 **2 条为复合标签行**（经 Flux-principles audit 重述，bare-type grep 不命中但属同一 triage 范围、不得遗漏）：
  - **I11**（`05-input-fields.md:83`）`BY-DESIGN / TEST-GAP` P3 — min/max clamp 是已定 BY-DESIGN（非 gap），residual 仅文档化 clamp-vs-validate 理由 + 锚「input 超 max clamp 到 max 而非报错」。
  - **D3**（`06-date-fields.md:27`）`DESIGN-GAP / TEST-GAP` P3 — 清空 date 提交 `undefined` 是 Flux-idiomatic；B4.2 显式 non-goal deferred → B7（`transformOutAction` submit-transformer 为 Flux-idiomatic 路径）。
  - 这 2 条同样适用本 plan 五类裁定 taxonomy（预期落 `landed-doc-note` / `landed-anchor` / `watch-only`）。
- 与 roadmap 「103 条」的 4 条残差 = 部分 entry 跨多行 / 含 NOT-ADOPTED 行 / 复合标签；本 plan 以逐条核对 99 为准，不强行凑数，亦不丢弃任何 AMIS-REF 行。
- 全部 14 源 doc 当前 `RESOLVED` 标记数 = **0**（triage 尚未开始）。
- B1–B6 各 plan 的 `Deferred But Adjudicated` / Non-Blocking Follow-ups 中显式指向「successor B7」的 DESIGN-ACK-NOT-IMPL feature 项（共约 10 项，全部为 genuinely-absent distinct feature，Flux 从未声称，非 live defect）：
  - **V6**（B3.2）array/combo 行本地相对跨字段寻址（validation-collection + path-binding + 投影 runtime 架构性改动）
  - **C10 submit-payload-projection 半边**（B3.2）hidden 字段排除投影；已裁定刻意保留 + `clearValueWhenHidden` opt-in，仅投影半边 deferred
  - **T11**（B3.3）tree-table per-node lazy-children / on-expand fetch（镜像 input-tree `childrenSource`）
  - **U5**（B4.2）input-file `deleteAction`（genuinely-absent feature）
  - **U6**（B4.2）input-file `maxSize`/`onReject`/`onDelete*`（genuinely-absent feature）
  - **DD9**（B5.1）markdown 远程 `src` fetch（content-only 契约已锁；远程拉取是 distinct feature）
  - **I1 schema-string 半边**（B5.1）runtime schema-string i18n 翻译 pass（Loader/host 层职责）
  - **I4**（B5.2）reactive locale 全量接线（100+ renderer 架构性改动 / Loader re-mount 策略）
  - **L16**（B5.2）iframe renderer + listener clone-safety（host 集成，flux 无 iframe renderer；successor: no，除非未来引入）
  - **MP2 loader**（B6.2）mapping loader-sourced map + 「loader wins」precedence（组件级 loader 被请求下沉审计拒绝）
- B6.2 Non-Blocking Follow-ups 另列 doc-14 余项（`B2/B4/T1/MP1/CD2/CD3/CD5/CD6/ST1-ST3/STY1/STY3/STY4/DB1/DB2/AG2/AG4/AG5`）→ B7 backlog 评估（这些即 doc-14 的 P2/P3 行，本 plan Phase 1 覆盖）。

**核心缺口陈述：** 99 条 P2/P3 signal 目前没有任何一条有显式裁定标记；B1–B6 实现的回归锚/owner-doc note 是否已顺手覆盖这些 P2/P3 属性，无人系统核对过。B7 的交付 = 让这 99 条每一条都有可反查的显式归宿（covered-by / landed-residual / watch-only / out-of-scope-feature），并把 deferred feature 项收敛成单一 successor 清单。

## Goals

- **逐条裁定**：99 条 P2/P3 signal 每一条在源 doc 获得 `RESOLVED → <裁定+证据>` 标记（含 2 条复合标签行 I11/D3），证据可反查（B1–B6 哪个 plan/test/design.md 覆盖、或本 plan 新落地的锚/note、或 watch-only 理由、或 DESIGN-ACK-NOT-IMPL successor 指向）。
- **落地低风险 residual**：DESIGN-GAP（owner doc 沉默）补 owner-doc 裁定 note；confirmed-uncovered 且 low-risk 的 TEST-GAP/LOCK 补 focused 回归锚（行为按构造已成立，仅锁回归）。
- **收敛 deferred feature 清单**：把 B1–B6 显式 deferred 到「successor B7」的 ~10 项 DESIGN-ACK-NOT-IMPL feature 统一登记到本 plan `Deferred But Adjudicated` + 汇总 successor 指向（不实现；feature roadmap / 独立 plan 职责）。
- **closure**：roadmap Phase Status `B7` → `done`；amis-bug-driven mission 闭环（所有 wave B1–B7 done）。

## Non-Goals

- **不实现任何 DESIGN-ACK-NOT-IMPL feature**：V6 / C10-projection / T11 / U5 / U6 / DD9 / I1-schema / I4 / MP2-loader / L16 全部裁定 out-of-scope + successor 指向。本 roadmap 是「测试/文档边界债」roadmap，feature 由独立 feature plan / 主 roadmap 承接（B3.3 / B6.2 先例）。
- **不重审 P0/P1（114 条）**：B1–B6 已收口，不重开。
- **不重审 NOT-ADOPTED 条目**：这些是稳定的 amis 坏设计拒绝记录，不参与 triage。
- **不预建 successor feature plan**：只裁出 + 记 successor 指向；是否开 feature plan 由产品/主 roadmap 决策。
- **不为大簇重写/重构代码**：若 triage 发现某簇 TEST-GAP 实为需真实代码修复的 live defect（非按构造成立），该簇移出本 plan、开 successor fix plan，不在本 plan 强行收口。

## Scope

### In Scope

- 14 源 doc（`docs/components/amis-bug-driven-improvements/01-14*.md`）的全部 P2/P3 signal 行的逐条裁定与 `RESOLVED` 标记。
- 对 DESIGN-GAP（owner doc 沉默）条目：把裁定 note promote 进对应 `docs/components/<x>/design.md`（或 `docs/architecture/<x>.md`）决策表，与 live code 一致，无「Proposed vs Current」叙事。
- 对 confirmed-uncovered 且按构造已成立的 TEST-GAP/LOCK：补 focused 回归锚（新增/扩展 `*.test.ts(x)`，falsifiable 断言）。
- 把 B1–B6 deferred feature 项收敛进本 plan `Deferred But Adjudicated`。
- 更新 roadmap Phase Status（B7 → `done`）+ roadmap 末尾 B7 Phase Detail（记录 triage 结论摘要 + successor 清单）。

### Out Of Scope

- 任何 feature 的实现（见 Non-Goals）。
- P0/P1 signal 的重审、NOT-ADOPTED 重审。
- 大簇 live-defect 修复（→ successor fix plan）。
- 新增 playground 页 / 新用户可感知能力（B7 无新能力）。

## Failure Paths

> 本 plan 以裁定/文档/回归锚为主，无鉴权 / 对外 API 契约 / 外部集成。错误处理路径限于「triage 裁定误判」场景，故简化。

| 场景                                                    | 触发                                                  | 行为                                                                  | 可重试 | 用户可见表现                |
| ------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- | ------ | --------------------------- |
| 裁定误判（把 live defect 标 watch-only / out-of-scope） | closure-audit 或后续维护发现某 P2/P3 实为真实行为缺陷 | 重开 successor fix plan，回填 RESOLVED 标记                           | 是     | 无运行时表现（文档/测试层） |
| 回归锚失败（TEST-GAP 实为未成立行为）                   | 新增锚 test 跑红                                      | 该条降级为 successor fix plan（不在本 plan 强行收口），记 `needs-fix` | 是     | 测试红                      |

## Test Strategy

本档选择：**建议有测**

理由：B7 全部为 P2/P3 signal（无 P0 锚点；P0/P1 已在 B1–B6 用「必须自动化」档收口）。本 plan 的代码产出仅为「confirmed-uncovered 且按构造已成立的 TEST-GAP/LOCK 回归锚」——行为已正确、仅补锁，属一般功能补测，对应「建议有测」档。若 Phase 2 执行期发现某 TEST-GAP 实为 live defect（行为不成立），则该条移出本 plan、转 successor fix plan（该 successor 适用「必须自动化」，failing-test-first），不在本 plan 内强行实现。

## Execution Plan

### Phase 1 - Triage & Classify（全部 P2/P3 signal 逐条裁定）

Status: completed
Targets: `docs/components/amis-bug-driven-improvements/01-14*.md`（99 条 P2/P3 行，含 I11/D3 复合标签）、`amis-bug-driven-improvement-roadmap.md`

- Item Types: `Decision | Proof`

- [x] (Decision) 建立 triage 工作表（可临时落 `docs/components/amis-bug-driven-improvements/_b7-triage.md` 或直接进各源 doc inline）：14 源 doc × P2/P3 行，每行四列裁定槽 `{verdict | evidence-ref | successor? | action}`。覆盖全部 99 条（含 I11/D3 复合标签行，grep 须用 severity 列 `\| P[23]` 而非 bare-type 列，避免漏计）。
- [x] (Decision) 逐 doc（01→14）核验每条 P2/P3 signal vs B1–B6 已落地的 test/lock/design-note，给出五类裁定之一：
  - `covered-by` — B1–B6 某 plan/test 已覆盖（evidence = plan file + test name/`file:line` 或 design.md 段）。
  - `landed-anchor` — confirmed-uncovered 且按构造成立，转入 Phase 2 补锚。
  - `landed-doc-note` — owner doc 沉默（DESIGN-GAP），转入 Phase 2 补 note。
  - `watch-only` — 残余风险可接受、不锁不补（须写 non-blocking 理由，如行为依赖未引入的 feature、recharts/host mock 限制等）。
  - `out-of-scope-feature` — genuinely-absent distinct feature（DESIGN-ACK-NOT-IMPL），转入 Phase 3 收敛 successor。
- [x] (Proof) 抽查 5 条 `covered-by` 裁定：独立核对所引 B1–B6 test/design 确实覆盖该属性（防止「声称覆盖实则未覆盖」），核对证据写进 triage 工作表。
- [x] (Decision) 在每条 P2/P3 行源 doc 追加 `RESOLVED → <裁定 + evidence/successor>` 内联标记（沿用 README 已定义的 RESOLVED 约定）；保证 AMIS-REF 原行不丢。

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的 repo-observable 结果 + 保证后续 Phase 能继续的局部检查。全量 typecheck/build/test 是 Closure Gates 的事。

- [x] 14 源 doc 全部 99 条 P2/P3 行均有 `RESOLVED` 标记且每条归入五类裁定之一（含 I11/D3 复合标签行）；无遗漏、无 AMIS-REF 丢失。
- [x] triage 工作表（或源 doc inline）含每条的 evidence-ref（`covered-by` 须指向具体 plan/test/design 段）。
- [x] 5 条 `covered-by` 抽查核对记录存在且结论一致。
- [x] Phase 2 输入清单已确定（`landed-anchor` 集合 + `landed-doc-note` 集合）、Phase 3 输入清单已确定（`out-of-scope-feature` 集合 + B1–B6 deferred 项）。

### Phase 2 - Land Low-Risk Residuals（补 owner-doc note + 回归锚）

Status: completed
Targets: `docs/components/<x>/design.md`（DESIGN-GAP note）、相关 `packages/*/src/**/*.test.ts(x)`（回归锚）

- Item Types: `Fix | Proof`

- [x] (Fix) 对 `landed-doc-note` 集合：把每条 DESIGN-GAP 裁定 note promote 进对应 owner doc 决策表（`design.md` 或 `docs/architecture/*.md`），陈述当前最终设计状态、与 live code 一致、无「Proposed vs Current」叙事（guide Minimum Rule 14）。
- [x] (Proof) 对 `landed-anchor` 集合：为每条 confirmed-uncovered 且按构造已成立的 TEST-GAP/LOCK 补 focused 回归锚（falsifiable 断言，命名体现源 doc 条目 ID 如 `T26-loadDataOnce-cleared-filter`），spot-run 该新测试 green。
- [x] (Decision) 边界判定：若 `landed-anchor` 集合中出现「行为未成立」的条目（锚跑红），该条移出本 plan → 记为 `needs-fix` 并指向 successor fix plan；不在本 plan 强行实现。
- [x] (Decision) 大簇判定：若 `landed-anchor`/`landed-doc-note` 形成需大量代码改动的大簇（同一组件 ≥6 条且非纯锚/note），该簇移出本 plan → successor plan 提案，本 plan 只保留裁定 + successor 指向。

Exit Criteria:

- [x] `landed-doc-note` 集合全部 note 已进对应 owner doc 且与 live code 一致（无 Proposed-vs-Current）。
- [x] `landed-anchor` 集合全部锚 test spot-run green（或已按边界判定移出 successor 并记录理由）。
- [x] 任何移出项（`needs-fix` / 大簇）均有 successor 指向 + 移出理由，未静默丢弃。

### Phase 3 - Adjudicate Deferred Features & Close B7

Status: completed
Targets: 本 plan `Deferred But Adjudicated`、`amis-bug-driven-improvement-roadmap.md`

- Item Types: `Decision | Follow-up`

- [x] (Decision) 把 B1–B6 显式 deferred 到「successor B7」的 ~10 项（V6 / C10-projection / T11 / U5 / U6 / DD9 / I1-schema / I4 / L16 / MP2-loader）+ Phase 1 新裁出的 `out-of-scope-feature` 项，统一登记进本 plan `Deferred But Adjudicated`：每项 `Classification: out-of-scope improvement` + `Why Not Blocking Closure` + `Successor Required/Path`（feature roadmap / 独立 feature plan / 主 roadmap）。
- [x] (Follow-up) 汇总 successor feature 清单写入 roadmap B7 Phase Detail（`amis-bug-driven-improvement-roadmap.md:199-201`）作为「若产品判断需要」的可反查 backlog，不丢弃 AMIS-REF 反查链。
- [x] (Decision) 更新 roadmap Phase Status：`B7` `todo` → `done`（仅在 closure-audit 通过后执行，见 Closure Gates）。
- [x] (Follow-up) 若 Phase 1/2 产出 `needs-fix` 或大簇 successor，在本 plan Follow-up 登记其 plan 路径占位（待创建则标 `pending successor plan`）。〔本 plan 无 `needs-fix`、无大簇 successor——T13 锚 green、F2 note 与 live code 一致；故无 successor plan 占位需登记。〕

Exit Criteria:

- [x] B1–B6 deferred feature 项 + Phase 1 新裁 feature 项全部在 `Deferred But Adjudicated` 有完整登记（classification + non-blocking 理由 + successor 指向）。
- [x] roadmap B7 Phase Detail 含 successor feature 清单（可反查）。
- [x] roadmap Phase Status `B7` 已改为 `done`（closure-audit pass 之后）。
- [x] daily dev log（`docs/logs/2026/06-26.md` 或当日）记录 B7 triage 结论摘要 + full-green 验证。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子 agent 填写（见 Plan Review Rule）。两轮 review 达共识（零 Blocker / 零 Major），plan 升级为 `active`。

- Reviewer / Agent: independent fresh-session `general` sub-agent（round 1 `ses_0fbf8734fffeuBjAP865zmZpCJ`、round 2 `ses_0fbee9410ffeoUwdU92ksYHnY5`，均不复用起草者上下文）
- Verdict: `pass-with-minors`（round 2 终判）
- Rounds: 2
- Findings addressed:
  - **M1（round-1 Major，已修）**：P2/P3 计数 97 → **99**。round-1 指出 bare-type grep 漏 2 条复合标签行（I11 `BY-DESIGN / TEST-GAP` P3 @`05-input-fields.md:83`、D3 `DESIGN-GAP / TEST-GAP` P3 @`06-date-fields.md:27`，D3 为 B4.2 显式 non-goal deferred→B7）。已修：全部「总数」引用改 99、显式登记 2 复合行 + file:line + taxonomy 覆盖、补 103→99 残差说明；live grep `\| P[23]` = 99 经 round-2 独立复核。
  - **m1/m2/m3（round-1 Minor，已修）**：m1 103→99 残差说明已补；m2 U5/U6 拆为独立 `###` 标题；m3 U5/U6 补「B4.2 裁定 B（non-goal）」引用。
  - **m4（round-2 Minor，已修）**：核心缺口陈述与 Phase 1 Targets 两处 stray「97」(指总数) 已改 99；唯一保留的「97」为显式标注的 bare-type 子集（`其中 97 条为单一 decision-type`），算术 97+2=99 内部一致。
- 共识结论：核心方案（triage → land low-risk residuals → adjudicate deferred features → close B7）与 roadmap B7 定义一致；格式完整；Anti-Slacking 满足（deferred 项均含 non-blocking 理由 + successor，无 in-scope live defect 静默降级）；引用经 live repo 核对准确。可进入执行队列。

## Closure Gates

> 关闭条件：本 section 全部条目 + 每 Phase Exit Criteria 全 `[x]` 后，且独立 fresh-session closure-audit 通过，方可将 `Plan Status` 改为 `completed`。全量 typecheck/build/lint/test 在此跑一次（Minimum Rule 18）。

- [x] 14 源 doc 全部 99 条 P2/P3 signal 均有显式裁定（`RESOLVED` + 五类之一，含 I11/D3），无遗漏、无静默丢弃。
- [x] `landed-doc-note` 全部 owner-doc note 已落地且与 live code 一致。
- [x] `landed-anchor` 全部回归锚 spot-run green（或已移出 successor 并记录）。
- [x] 无 in-scope live defect / contract drift 被静默降级为 deferred / watch-only（`needs-fix` 项已显式转 successor）。
- [x] B1–B6 deferred feature 项 + Phase 1 新裁 feature 项全部在 `Deferred But Adjudicated` 有完整 non-blocking 理由 + successor 指向。
- [x] 受影响 owner docs（`design.md` / `docs/architecture/*.md`）与 live baseline 一致、无 Proposed-vs-Current 叙事。
- [x] roadmap Phase Status `B7` = `done`、Phase Detail 含 successor 清单。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> Phase 3 落地后填充完整登记。以下为已知输入（来自 B1–B6），Classification 全部为 `out-of-scope improvement`（genuinely-absent distinct feature，Flux 从未声称；本 roadmap 是测试/文档边界债 roadmap，非 feature roadmap）。

### V6 — array/combo 行本地相对跨字段寻址

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Flux array 行使用绝对 index-addressed 路径是刻意契约（`getChildFieldPathPrefix` 返回 false 有意——item 子校验经投影 form 运行时注册）；行本地相对引用需 validation-collection + path-binding + 投影 runtime 架构性改动，是 distinct feature。B3.2 已裁定 + 文档化。
- Successor Required: `yes`
- Successor Path: 独立 feature plan（form-runtime 投影能力）/ 主 roadmap，不属本 mission。

### T11 — tree-table per-node lazy-children / on-expand fetch

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: table 树模式按设计即预加载递归 flatten（`table/design.md:38,74`、`use-table-tree.ts:62` 同步读），lazy-children 是 feature 非已声称属性。B3.3 已裁定 + 文档化（镜像 input-tree `childrenSource`，用户交互驱动 pattern #3）。
- Successor Required: `yes`
- Successor Path: 独立 feature plan / 主 roadmap table 能力增强。

### DD9 — markdown 远程 `src` fetch

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: markdown 仅渲染 `content`（`markdown.tsx`、`schemas.ts` 无 `src`），`content` 已支持表达式/source 绑定覆盖多数远程内容；远程 md 拉取是 distinct feature。B5.1 已裁定。
- Successor Required: `yes`
- Successor Path: 独立 feature plan（如产品判断需要）。

### I1 schema-string 半边 — runtime schema-string i18n 翻译 pass

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 架构将 i18n 归 Loader/组装层（`frontend-programming-model.md`）；renderer message-key 半边（`t()`）已满足+已测；schema-string 统一翻译 pass 是编译期/加载期 distinct feature。B5.1 已裁定。
- Successor Required: `yes`
- Successor Path: Loader/host 层 feature 工作项。

### I4 — reactive locale 全量接线

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 当前 renderer 用非 reactive `t()`；全量接线涉及 100+ renderer 架构性改动；既有 `useFluxTranslation` hook 已提供 opt-in reactive 路径。B5.2 已裁定。
- Successor Required: `yes`
- Successor Path: 独立 feature plan（全量接线或 Loader re-mount 策略）。

### MP2 loader — mapping loader-sourced map + 「loader wins」precedence

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: live 无 mapping loader/source（`MappingSchema` 无 `source`、`mapping.tsx` 无 fetch）；组件级 loader 被请求下沉审计拒绝（应经 loader/组装层或 `map:"${...}"` 表达式注入）。B6.2 已裁定。
- Successor Required: `yes`
- Successor Path: loader/组装层 feature plan。

### U5 — input-file `deleteAction`

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: live 无 `deleteAction` 字段（grep 零命中）；genuinely-absent distinct feature。B4.2 裁定 B（non-goal，`2026-06-26-0830-3-b42-*.md` deferred → B7）。
- Successor Required: `yes`
- Successor Path: input-file 能力增强 feature plan / 主 roadmap。

### U6 — input-file `maxSize` / `onReject` / `onDelete*`

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: live 无 `maxSize`/`onReject`/`onDelete*` 字段（grep 零命中）；genuinely-absent distinct feature。B4.2 裁定 B（non-goal，`2026-06-26-0830-3-b42-*.md` deferred → B7）。
- Successor Required: `yes`
- Successor Path: input-file 能力增强 feature plan / 主 roadmap。

### C10 submit-payload-projection 半边

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: hidden 提交契约已裁定 B（刻意保留 + `clearValueWhenHidden` opt-in 清值排除，已锁+文档化）；仅「hidden 字段排除投影」是 distinct feature 半边。B3.2 已裁定。
- Successor Required: `yes`
- Successor Path: form-runtime submit-projection feature plan。

### L16 — iframe renderer + listener clone-safety

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: flux 无 iframe renderer（grep 零命中），`iframe` 显式 notRetained / host-specific；listener 累积/clone-safety 是 host 集成职责。B5.2 已裁定。
- Successor Required: `no`（host 集成；若未来 flux 引入 iframe renderer 再评估）

---

> 以下 8 项为 Phase 1 triage 新裁出的 `out-of-scope-feature`（genuinely-absent distinct feature，Flux 从未声称；P2/P3）。与上方 B1–B6 deferred 项同属 `out-of-scope improvement`，统一登记以便 successor 反查。

### T2 — 字面符号/含点字段名的 bracket-key 路径解析

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: B3.1 已裁定（orthogonal to T6 的 dotted-nested-path）；字面含 `.`/符号的字段名需 bracket-key 路径解析，是 distinct path-binding feature。当前 path binder 按嵌套 dotted path 解析（T6 已锁），字面含点键的解析能力未引入。
- Successor Required: `yes`
- Successor Path: 独立 path-binding feature plan / 主 roadmap。

### T28 — 动态 `columns:${expr}` 重编译

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `columns` 是静态 schema；动态列绑定表达式并随 scope 变化重编译是 distinct feature（Flux 当前无 column-recompile 机制）。
- Successor Required: `yes`
- Successor Path: table 能力增强 feature plan / 主 roadmap。

### I10 — input-number precision 舍入模式

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `precisionMode`/truncate 舍入模式是 feature gap（X5）；Flux input-number 按 BY-DESIGN clamp（非 validate），`input-number/design.md` §6 已锁。
- Successor Required: `yes`
- Successor Path: input-number 能力增强 feature plan / 主 roadmap（仅当产品判断需要）。

### D10 — 相对日期表达式（min/max/value）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 相对日期词表（`now`/`today+1d`）是 feature gap；Flux date 字段使用绝对值，相对日期可经 `when`/表达式计算为绝对日期绕过。
- Successor Required: `yes`
- Successor Path: input-date 能力增强 feature plan / 主 roadmap。

### TR7 — input-tree `enableNodePath` 路径串

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `enableNodePath` 显式 暂不实现（`input-tree/design.md` §4）；path-string 值构造是 distinct feature，pinned 不测直到实现。
- Successor Required: `yes`
- Successor Path: input-tree 能力增强 feature plan / 主 roadmap。

### DD7 — image fetcher-backed 模式（auth-protected 源）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: live image 直接渲染 URL（`<img src>`），无 fetcher 模式；fetcher-backed（data-source → data URI）用于 auth-protected 源是 distinct feature。
- Successor Required: `yes`
- Successor Path: image 能力增强 feature plan / 主 roadmap。

### A10 — polling jitter

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Flux polling（data-source `interval`）无 jitter；`interval: { base, jitter }` 防同步峰值是 enhancement feature。
- Successor Required: `yes`
- Successor Path: data-source 能力增强 feature plan / 主 roadmap。

### M2 — multi-tab keep-alive shell

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: multi-tab keep-alive shell（可关闭 tab + 缓存 surface）是 app-shell feature；Flux 无 app shell / keep-alive shell，属产品决策非 renderer gap。
- Successor Required: `yes`
- Successor Path: app/navigation shell feature plan（若产品判断需要）。

## Non-Blocking Follow-ups

- Phase 1/2 若产出 `needs-fix`（TEST-GAP 实为 live defect）或大簇 successor → 登记对应 successor fix plan 路径（待创建标 `pending successor plan`）。
- triage 过程若发现某 P2/P3 与主 roadmap（`docs/components/roadmap.md`）/ mobile-roadmap 已有工作项重叠，登记交叉引用，不重复收口。
- RESOLVED 标记的长期维护：未来新增 signal 时沿用 README 的 RESOLVED 约定，保持 backlog 可反查。

## Closure

Status Note: B7 收口成立——99 条 P2/P3 signal 全部有可反查的显式归宿（covered-by 21 / landed-anchor 1 / landed-doc-note 1 / out-of-scope-feature 8 / watch-only 68），每条在源 doc 带 `RESOLVED (B7)` 内联标记；2 处低风险 residual（T13 锚、F2 note）已落地并与 live code 一致；18 项 deferred feature 有完整 non-blocking 理由 + successor 指向。amis-bug-driven mission 全 7 wave（B1–B7）闭环，roadmap B7 `done`。

Closure Audit Evidence:

- Auditor / Agent: independent fresh-session `general` sub-agent `ses_0fbc83bfaffeelLU1TI7bQZXnh`（不复用执行 session 上下文，三-piece 输入：plan + diff summary + verification）
- Verdict: `approved`（零 Blocker / 零 Major；3 个 self-resolving minor：roadmap narrative vs gate-field、daily log 预写翻转、worksheet 辅助行数——均随 flip 自洽）
- Evidence（独立 live repo 核对）：
  - RESOLVED 标记数：跨 14 源 doc `grep` = **99**（per-file `5,21,6,6,6,4,2,2,7,6,9,1,1,23`）；verdict tally 精确吻合（covered-by 21 / landed-anchor 1 / landed-doc-note 1 / out-of-scope-feature 8 / watch-only 68）。
  - 独立 re-derive P2/P3 行：`| P2 |`=85 + `| P3 |`=14 = 99；零 P2/P3 行缺 RESOLVED；edge cases（T19/AG4 embedded `|`、D8/L4/L5/DD11 blockquote、I11/D3 复合）均覆盖。
  - T13 锚独立 spot-run：`pnpm --filter @nop-chaos/flux-renderers-data test -- --run table-tree-selection-no-cascade` → 73 files / 591 tests green。
  - F2 note vs live code 一致：`crud-renderer-state.ts:159-164`（`applyQueryToRows` 丢空值）+ `crud-renderer-ownership.ts:150-178,258`（`submitQueryValues(toRecord(valuesResult.data))` 不 strip empty key）。
  - I11 重分类诚实：`input-number.test.tsx:160`（value 200 > max 100 → submit 100，无 error）。
  - 18 项 deferred 全部含 Classification + non-blocking 理由 + successor；watch-only 抽查（02 T4/T7、11 A6/A12、14 B2/B4）均有具体理由；无 in-scope live defect 被静默降级。
  - 状态字段审计前正确 held（roadmap `:55`/`:139`=`todo`、Phase 3 item 3 `[ ]`、Closure Gates `[ ]`）——经 audit approved 后由执行 session 翻转。

Follow-up:

- 18 项 successor feature（10 B1–B6 deferred + 8 B7 新裁）指向 feature roadmap / 独立 feature plan（本 roadmap 是测试/文档边界债 roadmap，不实现 feature；产品判断需要时另开 plan）。
- 无剩余 plan-owned work（无 `needs-fix`、无大簇 successor）。
