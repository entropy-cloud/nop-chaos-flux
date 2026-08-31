# R3 一致性 P0/P1 修复与共性归类收口

> Plan Status: completed
> Mission: ui-review
> Work Item: R3. 一致性 P0/P1 修复与共性归类收口
> Last Reviewed: 2026-08-29
> Source: `docs/analysis/ui-review/R2-consistency-audit.md`（owner doc，§发现清单 / §P0–P3 映射与共性归类 / §给 R3 的输入清单）；`docs/analysis/ui-review/r2-audit/summary.md`、`r2-audit/round-01..08.md`、`r2-audit/review-g1..g7.md`
> Related: `docs/plans/2026-08-28-1701-1-r2-consistency-audit.md`（R2，completed）；roadmap `docs/backlog/ui-review-roadmap.md`（R3 条目）

## Purpose

把 R2 全量 UI 一致性审查的产出收口到修复/裁决终态：修复全部 17 条 P0/P1 预授权发现（test-first + 回归测试 + 类别清扫），完成 172 条 P2 按共性族批量裁决路由与 87 条 P3 backlog 登记，并把共性归类裁决结果回写 C2 追加区，更新 R2 owner doc 收口节。

## Current Baseline

- R1/R2 均已 `done`（R2 closure audit 2026-08-29 通过）。R2 owner doc 终稿：276 条发现 → 273 保留 / 3 降级 / 0 驳回，终判严重度 HIGH 17 / MEDIUM 172 / LOW 87；P0 5 条 / P1 12 条（预授权修复集）/ P2 172 条（裁决路由集）/ P3 87 条（backlog）。
- R2 已产出"给 R3 的输入清单"（`R2-consistency-audit.md` §给 R3 的输入清单）：17 条 HIGH 按 9 个同根因批次组织（① disabled 门禁全通道批 ② 草稿脏态守卫批 ③ variant:"primary" 批 ④ 虚拟化组合批 ⑤ 表格列错位批 ⑥ 会话删除确认 ⑦ 导出链接修复 ⑧ Drawer 滚动+resize 批 ⑨ 其余单点）；共性归类 10 族（disabled 门禁覆盖缺失 / 状态已发射样式零消费 / 长内容无滚动溢出契约 / hover-only 低触点 / 失败错误静默 / 写后界面不同步 / 键盘等价路径缺失 / 确认取消语义分裂 / i18n 语义色硬编码 / 空态加载态分裂）。
- **精度修正前置**：R2 复核期共 9 处修正（尺寸/行号/机制/失效面）落在 `r2-audit/review-g1..g7.md`；owner doc 明确要求"修复前先读对应组复核报告，勿直接按发现原文的精度实施"。
- **代码基线（live 实测 2026-08-29）**：worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），HEAD `1129772fe`，工作区干净。08-28 记录的两处既有红（`flux-renderers-form` input-date-relative-wiring 4 用例、`nop-debugger` 3 用例）已于 08-29 修复（`docs/logs/2026/08-29.md`：`pnpm test` 68/68 任务全绿；typecheck/build/lint/check 全绿）。R3 修复工作建立在 unit 全绿基线上。
- e2e 基线：最近一次在案全量 e2e 为 2026-08-25（`docs/logs/2026/08-25.md`）：**1310 passed / 14 failed / 43 skipped**，14 条失败全部 stash 实证为 master 干净树同红的登记 baseline red（barcode ×5 / crud-demo ×6 / sundial ×2 / scada ×2，归各自 owner）；既有 watch-only 终态（gantt-perf ×2 / kanban-perf ×1）当次全过未触发。08-26～08-29 无 e2e 运行记录（08-29 日志明确"e2e 未运行"）；R3 代码变更后收口须全量复跑，验收口径 = 零新增红 vs 已登记 baseline red 清单。
- C2 滚动文档已有追加回写区（`docs/analysis/ui-review/C2-capability-gaps.md` §3，R2 已完成首个回写）；本 plan 的 C2 回写沿同一追加方式（roadmap Cross-Cutting 5），不重开 C2 状态。
- ma5-ux 6 条已知发现经 R2 Phase 1 复核全部已修复（`r2-audit/dedup-baseline.md` §1），修复时不得复述。

## Goals

- 17 条 P0/P1（= skill HIGH，预授权修复集）全部修复落地：每条有先红后绿的 focused 回归测试，且任一实例修复必 grep 全类兄弟做类别清扫（模式同 component-audit）。
- 172 条 P2 按共性族批量裁决路由（每族裁定：本计划内随批清扫修 / 登记后续修复候选 / 拒绝），87 条 P3 登记 backlog；裁决台账落 R2 owner doc R3 收口节。
- 共性归类裁决结果回写 C2 追加区（供 D1 产品化参考的素材行）。
- R2 owner doc 增加 R3 收口节（P0/P1 落点清单、回归测试清单、P2/P3 裁决台账），roadmap R3 状态可被 closure audit 判定。

## Non-Goals

- 不修复 P3 backlog 87 条（登记即为终态，修复归属后续独立裁决）。
- 不做 P2 中与 P0/P1 批次不同根因、不同落点文件的独立新修复（只登记候选，避免本计划无界膨胀；P2 大面积修复若裁决需要，另立 successor plan）。
- 不新增/变更 C2 能力缺口裁决条目（renderer 语义缺口归 D1；本计划只做"共性素材回写"）。
- 不做全量 WCAG 合规（归 deep-audit 维度 20，按 skill 边界表不重复报告）。
- 不改两张 sundial 复刻页的 light-only 设计（R2 已裁定为既有设计非回归）。
- 不重开 R2 审查范围、不新增审查轮次。

## Scope

### In Scope

- 9 个 P0/P1 修复批次（17 条）涉及的面：`packages/ui`（Dialog 脏态守卫、Drawer 滚动/resizable、button-group/cva variant）、`flux-renderers-form`/`form-advanced`（input-time、period、composite、checkbox-group、editor disabled 通道）、`flux-renderers-data`（表格 VirtualBody radio/scrollRef、列错位、列宽手柄）、`flux-renderers-ai`（会话删除确认）、`flux-renderers-basic`（锚点 disabled）、`flux-renderers-scheduling`（barcode-input 五通道 disabled）、`flux-renderers-industrial`（scada 编辑器 disabled 通道）、playground schema（variant:"primary" 实例、导出链接）。精确落点以 `r2-audit/round-*.md` 发现条目 + `review-g1..g7.md` 复核修正为准，实施前逐批读取。
- P2 172 条按 10 共性族的批量裁决记录；P3 87 条 backlog 登记确认。
- `r2-audit/` 复核报告与 `R2-consistency-audit.md` 收口节、C2 追加区、`docs/logs/2026/08-29.md` 后续日志。

### Out Of Scope

- C2 新缺口立项、D1 产品化 plans。
- 复刻页（P 系列）相关工作。
- 除上列表 + 类别清扫命中外的任何 renderer 包改动。

## Failure Paths

| 可测场景编号               | 触发                                                            | 行为                                     | 可重试 | 用户可见表现                               |
| -------------------------- | --------------------------------------------------------------- | ---------------------------------------- | ------ | ------------------------------------------ |
| dirty-guard-confirm        | 草稿弹层有未保存编辑时关闭/遮罩/Esc                             | 阻断直接关闭，弹确认；确认丢弃才关闭     | 是     | 用户看到"放弃更改？"确认框，数据不静默丢失 |
| disabled-channel-block     | 任一写入通道（stepper/快捷钮/拖拽/粘贴/键盘）在 disabled 下触发 | 全通道拦截，无状态变更                   | 是     | 控件呈禁用态且操作无效                     |
| session-delete-confirm     | 会话删除触发                                                    | 先确认再物理删除                         | 是     | 出现破坏性确认对话框                       |
| export-no-response         | 导出动作最末一步                                                | 链接可达或给出明确错误反馈，不静默无响应 | 是     | 用户得到导出结果或错误提示                 |
| virtual-scroll-interaction | 虚拟化下 radio 单选 / scrollRef 取行                            | radio 单选生效；scrollRef 返回有效引用   | 是     | 虚拟化表格交互与非虚拟化一致               |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（P0/P1 为已确认 live defect，修复必须 test-first：每个批次先写失败测试（Proof）再实施修复（Fix），先红后绿；类别清扫新命中同根因实例必须补同款回归测试。`pnpm test:e2e` 在 Closure Gates 执行全量回归。）

## Execution Plan

> 批次①–⑨ 编号沿用 R2 owner doc §给 R3 的输入清单。每批实施前必读对应组 `review-g1..g7.md` 复核报告（9 处精度修正所在）。

### Phase 1 - P0 批次修复（批次②④⑥⑦，5 条）

Status: completed
Targets: `packages/ui/`（Dialog）、`packages/flux-renderers-data/`（表格 VirtualBody）、`packages/flux-renderers-ai/`（会话删除）、playground schema（导出链接）

- Item Types: `Proof | Fix`

- [x] 批次② 草稿脏态守卫：`ui` Dialog 层加 dirty-guard 原语，修复 [G2-R6-视角6-01]（P0，草稿弹层静默丢弃多字段编辑）；先红后绿
- [x] 批次④ 虚拟化组合：VirtualBody 修 RadioGroup 包裹（[G3-R3-视角4-01]，P0）+ scrollRef 接线（[G3-R4-视角5-01]，P0）；先红后绿
- [x] 批次⑥ 会话删除确认：[G5-视角10-01]（P0，会话删除无确认物理删除）；先红后绿
- [x] 批次⑦ 导出链接修复：[G7-R2-视角11-01]（P0，导出最末一步 100% 无响应，data: URL 拦截）；先红后绿
- [x] 各批次类别清扫：grep 全 14 renderer 包 + ui 同根因兄弟实例，新命中同批修复并补回归测试

Exit Criteria:

- [x] 5 条 P0 全部落地，每条至少 1 个先红后绿的 focused 回归测试（测试名对应发现 ID 记入 R3 收口节）
- [x] 类别清扫记录（grep 模式 + 命中清单 + 处置）落 R3 收口节
- [x] `pnpm --filter` 局部测试（受影响包）通过

### Phase 2 - P1 批次修复（批次①③⑤⑧⑨，12 条）

Status: completed
Targets: `packages/ui/`（Drawer、button-group、cva variant）、`packages/flux-renderers-form/`+`form-advanced/`（input-time、period、editor disabled）、`packages/flux-renderers-basic/`（锚点）、`packages/flux-renderers-scheduling/`（barcode-input）、`packages/flux-renderers-industrial/`（scada 编辑器）、`packages/flux-renderers-data/`（列错位/列宽手柄）、playground schema（variant:"primary"）

- Item Types: `Proof | Fix`

- [x] 批次① disabled 门禁全通道批（P1 ×3）：[G2-R2-视角3-01]+[G2-R3-视角3-01]+[G4-R4-视角3-01]，一次全次要写入通道回溯（含 scada/board 类 meta.disabled 零消费面）。口径勘误：R2 owner doc §给 R3 的输入清单把 [G2-R4-视角3-01] 列入本批，但其终判严重度为 MEDIUM→P2（owner doc P0/P1 表与 `r2-audit/summary.md` 一致），故按 P2 同根因随批清扫处理，不计入 17 条门禁数
- [x] 批次③ variant:"primary" 批：[G1-视角2-01]+[G7-视角2-01]，cva 补键或运行时归一化（一处修复两处失效面）
- [x] 批次⑤ 表格列错位批：[G3-视角5-01]+[G3-R3-视角8-01]+[G3-R4-视角8-01]，header/colgroup/fixed 三处配对 + 手柄包含块
- [x] 批次⑧ Drawer 滚动+resize 批：[G6-R2-视角6-01]（DrawerBody 无滚动契约）+[G6-R3-视角6-01]（resizable 死链）
- [x] 批次⑨ 其余单点：[G1-视角3-02]（锚点 disabled 不生效）、[G1-视角3-03]（button-group 选中态零样式）
- [x] 各批次类别清扫（同 Phase 1 规则；P2 同根因实例随批收口——含批次①的 [G2-R4-视角3-01] 与共性族 1/2 其余命中，逐条记入 Phase 3 裁决台账）

Exit Criteria:

- [x] 12 条 P1 全部落地，每条至少 1 个先红后绿的 focused 回归测试
- [x] 类别清扫记录落 R3 收口节；共性族 1（disabled 门禁）与族 2（死状态）的 P2 同根因实例处置已逐条登记
- [x] `pnpm --filter` 局部测试（受影响包）通过

### Phase 3 - P2 按族裁决路由 + P3 登记

Status: completed
Targets: `docs/analysis/ui-review/R2-consistency-audit.md`（R3 收口节）、`r2-audit/summary.md`（引用）

- Item Types: `Decision | Proof`

- [x] 制定并落盘裁决规则：每族裁定 ∈ {`随批清扫修`（仅限与 Phase 1/2 批次同根因且同落点文件的实例）/ `登记后续修复候选` / `拒绝`（附理由）}；10 个共性族逐族出具裁定与理由
- [x] 172 条 P2 逐条获得族归属 + 裁决结果（台账表格落 R3 收口节；`随批清扫修` 条目回链对应批次回归测试）
- [x] 87 条 P3 backlog 登记确认（引用 `r2-audit/summary.md` §可暂缓项，收口节声明其终态归属）

Exit Criteria:

- [x] R2 owner doc 新增 R3 收口节：P2 台账 172 行全覆盖（无一条无归属）、P3 登记声明
- [x] 裁决抽查：任意抽 10 条 P2 可从台账追溯到发现原文（round 文件）与裁决理由

### Phase 4 - C2 回写与文档收口

Status: completed
Targets: `docs/analysis/ui-review/C2-capability-gaps.md`（追加区）、`docs/analysis/ui-review/R2-consistency-audit.md`、`docs/backlog/ui-review-roadmap.md`、daily log

- Item Types: `Fix | Proof`

- [x] 共性归类裁决结果回写 C2 追加区（沿 Cross-Cutting 5 追加方式；含供 D1 参考的素材行，如族 2/族 7 与 option-row/键盘框架的佐证更新）
- [x] R2 owner doc 收口节补全 P0/P1 落点清单与回归测试清单
- [x] daily log 记录修复批次、裁决结论与验证结果

Exit Criteria:

- [x] C2 追加区含本计划回写段（日期 + HEAD 标注）
- [x] R3 收口节与台账、daily log 三处彼此一致（无"已修复"与"未登记"并存的矛盾状态）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb5f487e8ffeHcweDvJm1S1KIi`
- Verdict: `revised`
- Rounds: 2
- Findings addressed: R1-Major1 批次①仅保留 3 个 P1 ID，[G2-R4-视角3-01]（终判 P2）以口径勘误路由至随批清扫并记 Phase 3 台账，17 条门禁口径全文一致；R1-Major2 e2e 基线改引 2026-08-25 全量运行（1310/14/43，14 条登记 baseline red），Closure Gate 改为"零新增红 vs 已登记 baseline red 清单"。R2 复审零 Blocker/Major，达成共识。

## Closure Gates

> 关闭条件：本 section 与各 Phase Exit Criteria 全部 `[x]` 后才能 `completed`。全量验证归此处。

- [x] 17 条 P0/P1 全部修复，每条有先红后绿回归测试证据（测试名 ↔ 发现 ID 映射在 R3 收口节 §2）
- [x] P2 172 条裁决台账全覆盖、P3 87 条登记终态，无一条悬空
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（P2 `登记后续修复候选` 裁决须逐条给出"非本计划修复面"理由）
- [x] C2 回写完成；R2 owner doc / roadmap / daily log 已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（37/37，2026-08-29）
- [x] `pnpm build`（37/37，2026-08-29）
- [x] `pnpm lint`（37/37，2026-08-29）
- [x] `pnpm test`（68/68 任务全绿，2026-08-29）
- [x] `pnpm test:e2e`（1315 passed / 11 failed / 3 flaky / 43 skipped——零新增红 vs 已登记 baseline red 清单：11 条失败 = barcode ×4（登记 ×5 子集）+ crud-demo ×6（登记同 6 条）+ scada-perf:155 ×1（stash 实证干净树同红的负载波动型既有红）；登记 sundial ×2 / scada-edge-cases ×2 未红或 flaky 复跑过，watch-only 未触发；清单与归属已落 R3 收口节 §6 与 daily log）
- [x] `pnpm check`（exit 0，零新增命中）

## Deferred But Adjudicated

（无——本计划不设 deferred 区。P2/P3 中不修的条目走 Phase 3 裁决台账登记，属于裁决产物而非 deferred；理由随台账落盘。）

## Non-Blocking Follow-ups

- P2 裁决为"登记后续修复候选"的条目池：若后续裁决需要大面积修复，由 successor plan 承载（触发条件记入 R3 收口节）。
- P3 backlog 87 条：归属 roadmap backlog，不入 D2 门禁候选。

## Closure

Status Note: 全部 4 Phase 完成、Closure Gates 全勾，2026-08-29 收口。17 条 P0/P1（9 批次）先红后绿修复落地（15 个新回归测试文件，映射见 owner doc R3 收口节 §2）；P2 172 条裁决台账全覆盖（随批修 3 / 候选 169 / 拒绝 0）、P3 87 条登记终态；共性归类回写 C2 §3「回写 ②」。验证：typecheck/build/lint 37/37、test 68/68 任务全绿、check exit 0、e2e 1315 passed / 11 failed（全部 stash/登记归因为既有 baseline red，零新增红 vs 08-25 登记 14 条）/ 3 flaky / 43 skipped。roadmap R3 `done`。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent fresh session `ses_fb4589abaffeqrHt1MkZyRtBw7`（2026-08-29，executor session 之外）
- Evidence: verdict `approved`，零 Blocker/Major，3 Minor（测试文件计数 16→15 已订正；In Scope 未点名 content/layout 包——由"精确落点以 round 条目为准"条款覆盖；程序性收尾步骤已执行）。审计覆盖 A–H 八面：plan 文本一致性、17 条修复落点与 6 个测试文件逐字核对 + 3 处 live 源码抽查（dirty-close-guard 消费链 / button-group data-selected 消费 / drawer 滚动+resize 几何）、P2 台账 172 行 + 5/5 追溯抽样、C2 回写 ②、daily log 三方一致性（3+169=172、族分布和 83+89=172）、deferred 诚实性、diff 范围纪律（check-finite-prop-contracts.mjs 为 primary 键登记同步非放宽）。

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
