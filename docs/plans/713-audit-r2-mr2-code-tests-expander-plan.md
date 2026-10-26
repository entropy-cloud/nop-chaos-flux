# 713 审计修复 R2·MR2.0：P1 修复展开器—代码+测试（追加 R2.n 行）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MR2.0（Dependencies MA3、MA4——MA3×18 全部 `done` 且 **P1 零立案**、MA4×5 全部 `done`，展开器解锁）；`docs/skills/test-first-implementation-prompt.md`（R 行 Skill 列）
> Related: `docs/audits/arm2-index.md`（P1 追踪区 MA4 ×40 条在案）、`docs/plans/00-plan-authoring-and-execution-guide.md`（Rule 22/25 合并优先）、roadmap Cross-Cutting 4/5（展开与字母批预授权）/8（修复去重）/11（判别性测试纪律随行传递）
> 先例：`docs/plans/711-audit-r2-mr1-structure-runtime-expander-plan.md`（MR1.0 同构展开器，closure audit approved——粒度裁定/去重对照/drift 径模式沿用）
> 编号冲突注记：ARC 并发线 c11a30d48（2026-10-24 02:03）亦产出 `713-arc-g2d-inline-edit-design.md`——双 713 并存（文件名唯一可辨；本 plan 引用以 audit-r2 前缀/slug 为准，历史提交不改写）

## Purpose

把 MA3（代码质量 18 项，P1 零立案）与 MA4（测试有效性 5 项，P1 ×40）的在案 P1 finding 展开为 roadmap R2.n 修复工作项行：每行引用 finding 编号、按包簇+验证路径归并（Rule 22/25）、同步回填 arm2-index 修复行指针；finding 实质已愈合者走 finding-drift 径不排 R 行。**产物是修复工作项行，不是修复代码**；修复执行由 R2.n 各自展开（判别性测试纪律 Cross-Cutting 11 随行传递）。

## Current Baseline（2026-10-24 live，HEAD `4acc19633`）

- **MA3：18 个审计工作项全部 `done`，P1 零立案**（arm2-index MA3 区实测——代码质量面发现均为 P2/P3 deferred，Rule 2 范围纪律不展开）。
- **MA4：P1 ×40 全部 `open`**（arm2-index P1 追踪区 :132-171 实测），分布与内容概要：
  - MA4.1 core+runtime 契约覆盖 ×9（001 defineRendererFamily / 002 getFormulaNamespaces 播种链 / 003 xui:actions dispatcher 解析 / 004 built-in 遮蔽免疫序 / 005 structuralWhen 交接 bug51 / 006 lastChange 新鲜度 bug30 / 007 imports overlay 写捕获 bug163 / 008 错误无通道必 notify 分支 bug69 / 009 arm2-index mutants 基线行）
  - MA4.2 basic 契约 ×5（001 node-renderer-resolved meta 投影 gate / 002 input-signature capability / 003 array-field 标量子项校验 / 004 CRUD/Form stale-result 族 / 005 serverPagination 纠正写回）
  - MA4.3 content/domain 契约 ×9（001 carousel autoplay 生命周期 / 002-004 mobile wheel×2+image-viewer pinch / 005 three-canvas onReady 三方漂移〔MA5.5 注记 live 确认〕/ 006 kanban WIP 旁路 / 007 gantt 改期→undo 零执行〔MA5.2 注记改判测试接线补强〕/ 008 calendar 换位提交〔MA5.2 注记 plan 546 已修待回填 closed〕/ 009 kanban Ctrl+Z 消费链〔MA5.2 注记独立证据成立 = P1-MA5.2-002〕）
  - MA4.4 designer+office 契约 ×11（001 flow readonly 全链 / 002 xyflow remove→delete / 003 端口六步校验脱节 / 004 page-designer transient/命令分离 / 005 spreadsheet 公式错误值 live defect / 006 word save/recovery / 007 theme-tokens↔preset 变量闭合 / 008 code-editor label 转发 bug19 复发 / 009 code-editor 受控值模型 / 010 xlang-debug env 适配 / 011 print-core bind.ts 错误分类 3/7）
  - MA4.5 e2e+mutation ×6（001 stryker 测量装置 / 002 e2e 门禁 strict 诊断策略 / 003 dashboard-demo panel / 004 antdpro 批量删除 / 005 加号按钮拦截 / 006 form valuesPath 初始快照）
- **带既有注记的 4 条**（MA5 批 live 复核回写）：MA4.3-005（成立确证）/007（改判测试接线补强）/008（已修待回填 closed）/009（同源 P1-MA5.2-002——与 MR3 域 finding 交叉，R 行注记 MR4.0 裁决归并）。
- **roadmap MR2.0 行 `todo`**；R1.1–R1.4 已落位（MR1.0 收官 `4acc19633`）。
- **修复去重**：活跃集五成员（FM-1b-b / FM-6-b / FM-7-b / UR-15 / NRP-1..5）——40 条均为 R2 自有 finding（测试契约补测/测量装置/e2e 门禁面），与走查/令牌/表格列/nop-report 面零重叠（Phase 1 逐行落字；P1-MA4.4-007 theme-tokens 变量闭合与 FM-7-b 令牌族显式区分：FM-7-b 是设计系统令牌层批次、4.4-007 是**测试面变量集闭合性契约**，验证路径不同）；并发 712 password-strength 线已收官入库（7945a4228，组件面零重叠结论不变），现行未提交并发集 = docs/index.md、platform-hardening-roadmap.md、P0-MA5.1-002 plan 三项。

## Goals

- roadmap 追加 R2.1–R2.14 共 14 行（粒度裁定见 Phase 2 表），覆盖 40 条 finding（39 条排 R 行〔MA4.1-009 并入 R2.3 计入 39 内〕+ MA4.3-008 drift 闭环回填 closed）。
- arm2-index：39 条修复行指针回填（R2.x）+ MA4.3-008 注记 `closed`。
- 粒度裁定与去重裁决落字；字母批预授权声明（执行超单 plan 收口时拆 R2.x-a/b）。
- 本 plan 收口：closure audit → roadmap MR2.0 `todo`→`done`。

## Non-Goals

- 不执行任何 R2.n 修复；不处理 P2/P3；不修订 MA4 审计报告结论（含 MA5 批注记原文——引用不重开，注记随行传递到 R 行名称/plan）；MA5–MA9 的 P1 归 MR3.0；P1-MA4.3-009 与 P1-MA5.2-002 的同源归并裁决归 MR4.0（R2.7 行注记交叉引用，两行各自保留指针）。

## Scope（必填节）

### In Scope

- `docs/backlog/audit-remediation-r2-roadmap.md`：追加 R2.1–R2.14 行（MR2.0 之后、MR3.0 之前——R 行随其 MR 里程碑行的谱系序）。
- `docs/audits/arm2-index.md`：MA4 区 39 条修复行指针回填 + P1-MA4.3-008 注记 `closed`。
- 本 plan 状态流转 + daily log + roadmap MR2.0 翻转（激活/收口两提交）。

### Out Of Scope

- R2.n 修复执行；P2/P3；并发线（起草时并发集三项 docs/index.md、platform-hardening-roadmap.md、P0-MA5.1-002 plan；closure m2 注记：执行期间 714 G2I 线 ~6 文件进树〔detail-field inline edit，含 test-first 红绿循环〕——全部不入 stage，收口提交显式路径仅 In-Scope 三文件）。

## Failure Paths

| 可测场景编号   | 触发                                 | 行为                                              | 可重试 | 用户可见表现（roadmap/索引读者）     |
| -------------- | ------------------------------------ | ------------------------------------------------- | ------ | ------------------------------------ |
| dedup-hit      | live 复核发现与活跃面重叠            | 记 `delegated: <指针>` 于 Delegated 区，不排 R 行 | 否     | 该 finding 无 R 行，Delegated 区可查 |
| finding-drift  | live 复核发现已修复（如 008）        | 就地注记 + 状态回填 `closed`，R 行不排            | 是     | finding 行 `closed` + 注记指针       |
| granular-split | 某 R 行执行超单 plan 收口            | 字母批拆分（R2.x-a/b，Cross-Cutting 5 预授权）    | 否     | R 行名称携带字母后缀                 |
| cross-ref      | 同源 finding 跨 MR 域（009↔5.2-002） | 两行各自保留 + 注记 MR4.0 裁决归并，不单侧删除    | 否     | MR4.0 裁决区收口归并结论             |

## Test Strategy

本档选择：**不适用**——纯展开器（零代码变更）；判别性测试义务随 R2.n 行传递（test-first）。

## Execution Plan

### Phase 1 - live 复核与粒度/去重裁定

Status: completed
Targets: 本 plan Current Baseline 补记、`docs/audits/arm2-index.md`

- Item Types: `Decision | Proof`

- [x] 40 条逐条状态列复核 + 实质面抽验 ≥10 条——复核实录：状态列 40/40 `open`（draft review 全量 grep + 执行者区间核对）；抽验 11 条全 live 未愈合：4.1-001 defineRendererFamily 测试 0 命中 / 4.1-005 structuralWhen runtime 测试 0 引用 / 4.2-003 publishScalarArrayItemErrors（array-field.tsx:41/:496）测试 0 引用 / 4.3-001 setInterval stub（carousel-autoplay.test.tsx:189）即报告所述 / 4.3-005 three-canvas.tsx:124 仅 engine.onReady 内部消费、零 events.onReady 派发 / 4.4-001 readonly:true 两包测试 0 命中 / 4.4-007 theme-tokens 测试 0 pin / 4.5-002 schema-diagnostics-reporter.ts:13 全 severity console.error（锚点 flux-react/src 实位）/ 4.5-006 form-runtime.ts:236-281 valuesPath 锚点在；另 2 条由 draft review 亲验（4.4-005 formula-engine.ts 谓词缺口、4.5-001 package.json:12 装置在案）。注记行处置：005 成立确证维持 / 007 改判测试接线补强维持 / 008 drift 径（见 Deferred）/ 009 与 P1-MA5.2-002 同源交叉注记落 R2.7 行、归并裁决归 MR4.0
- [x] 去重裁决落字（活跃集五成员逐行对照维持 Current Baseline 结论——FM-1b-b 走查面 / FM-6-b FM 台账异 finding / FM-7-b 令牌层 vs 4.4-007 测试面变量闭合契约 / UR-15 表格列 / NRP nop-report 面，零重叠零 delegated；712 线已收官入库 7945a4228 组件面零重叠）
- [x] 粒度裁定落字：14 行归并方案每行理由=同包簇+同验证路径（vitest 契约补测批 R2.1/2.2/2.4/2.5/2.6/2.7/2.8/2.9/2.10/2.11 + 装置修复批 R2.3 + 门禁治理 R2.12 + e2e 红批 R2.13 + 单点运行时修复 R2.14），防 micro-plan 且无 closure 语义分叉（Rule 22/25）

Exit Criteria:

- [x] 三项裁定全部落字可追溯；008 drift 闭环完成（closed + 注记）

### Phase 2 - R 行追加与指针回填

Status: completed
Targets: `docs/backlog/audit-remediation-r2-roadmap.md`、`docs/audits/arm2-index.md`

- Item Types: `Fix`

- [x] roadmap 追加 R2.1–R2.14 行（归并方案：R2.1 core 簇契约补测 = 4.1-001/002/003/004/008〔同簇同 vitest 契约补测路径〕；R2.2 运行时交接面+react = 4.1-005/006/007 + 4.2-001〔compiler→runtime→react 接缝同验证路径〕；R2.3 mutation 装置修复+基线勘正 = 4.5-001 + 4.1-009〔同根：装置修复后基线行重测登记〕；R2.4 form/data 契约补测 = 4.2-002/003/004/005〔renderers-form 族〕；R2.5 content+3d = 4.3-001/005〔单条包合并〕；R2.6 mobile 族 = 4.3-002/003/004；R2.7 scheduling 族 = 4.3-006/007/009〔007 改判注记 + 009↔5.2-002 交叉注记随行；008 不排行走 drift 径〕；R2.8 designer 族 = 4.4-001/002/003/004；R2.9 office 族 = 4.4-005/006；R2.10 platform 族 = 4.4-007/008/009；R2.11 print+xlang = 4.4-010/011；R2.12 e2e 门禁 strict 诊断 = 4.5-002；R2.13 playground e2e 红批 = 4.5-003/004/005〔同 demo 载体〕；R2.14 form valuesPath = 4.5-006）——14 行已落位（MR2.0 之后、MR3.0 之前，行号 98-111）
- [x] arm2-index 39 条修复行指针回填（R2.x）+ MA4.3-008 `closed`——python 行号映射校验（132-171 逐行 finding ID 断言）后批量回填，40 行改动（39 指针 + 008 closed+注记）
- [x] grep 双侧复核（roadmap 14 行 ↔ 索引 39 指针 + closed 1；计数链 40 = 39 排行〔4.1-009 并入 R2.3 计入 39 内〕+ 008 closed + 0 delegated/遗漏）——实测分布 R2.1×5/R2.2×4/R2.3×2/R2.4×4/R2.5×2/R2.6×3/R2.7×3/R2.8×4/R2.9×2/R2.10×3/R2.11×2/R2.12×1/R2.13×3/R2.14×1 = 39 ✓；008 行尾修行列保持 —（drift 径无 R 行）✓

Exit Criteria:

- [x] roadmap 行追加 prettier 干净；arm2-index 指针回填 grep 双侧命中；计数链咬合

### Phase 3 - 状态流转与收口

Status: completed
Targets: roadmap MR2.0 行、本 plan、daily log

- Item Types: `Proof`

- [x] draft review 通过后：MR2.0 `todo`→`planned` 翻转入激活提交，plan→`active`（f51c2e9c4；closure m1 补勾）
- [x] closure audit（fresh subagent）approved 后：MR2.0 `planned`→`done`（sed 回读核验），plan→`completed`
- [x] daily log 追加；单次提交（显式路径；并发线〔三项遗留 + 714 线〕不入 stage）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致；提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_787b0bb1`（五项检查：格式/引用准确性 PASS——roadmap/索引/注记行/2 个实质面抽验全中；可想象性/内容稳健性/声称-实况 FAIL 由 2 Major 驱动；专项裁定：R2.3 并入 4.1-009 获索引终裁背书 ：140/:248 同根四层失效）
- Verdict: R1 `revised`（0B/2M/3m）→ 回修 → R2 残留 1M+2m（M1 六处改五漏一 Closure Gates 计数、m2 两处 712 陈旧）→ 三处机械收尾 → **共识零 Blocker / 零 Major**
- Rounds: 2
- Findings addressed: M1 ×41→×40 计数链全面修正（分布实测 9+5+9+11+6=40、:132-171、39 指针、计数链 40=39 排行〔009 并入 R2.3〕+008 closed）；M2 008 从 R2.7 剔除（对照 711 先例 2.1-001 同构：已愈合 finding 不排任何 R 行）；m1 Deferred 预登记 008 条目；m2 712 线改述已收官入库 7945a4228、并发集收敛三项；m3 插入位改 MR2.0 之后 MR3.0 之前（谱系序）——均已落字

## Closure Gates

- [x] R2.1–R2.14 行落 roadmap 且每行 finding 编号可追溯
- [x] arm2-index 39 指针回填 + MA4.3-008 闭环（`closed`）
- [x] Phase 1 三项裁定有 live 证据（含抽验 ≥10 条实录——11 条）
- [x] 不存在被静默降级的 in-scope 项（40 条全部有 R 行承接、drift 闭环或 MR4.0 交叉注记）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44；auditor 独立复跑同证）
- [x] `pnpm test`（82/82 @ 03:06 并发绿窗；auditor 独立复跑 82/82 + form-advanced 单包 175 文件/1224 测试全绿；并发 714 线 test-first 红→绿循环两次干扰如实披露——非本批面）

> build/lint 按 guide 纯文档条款删除（零 ts/tsx/css 变更）；保留 typecheck+test。

## Deferred But Adjudicated

### P1-MA4.3-008 不排 R 行（finding-drift，预登记）

- Classification: `watch-only residual`（calendar 换位提交通道已由 plan 546 seed-4 修复，MA5.2 live 三路径复核确认）
- Why Not Blocking Closure: 修复已落地且 MA5.2 注记确认（索引 :153），无剩余修复面；本 plan Phase 1 完成注记 + `closed` 回填即闭环。
- Successor Required: `no`
- Successor Path: —（注记在本 plan Phase 1 内完成，无后继 plan）

（执行中若再遇 healed finding，逐条落本节并走 drift 径。）

## Non-Blocking Follow-ups

- R2.3（mutation 装置）修复后按 roadmap Current Baseline MA4.5 勘误注记口径重测 mutation 基线，MV 对该维度不做"不得高于 M0"比较（装置修复前）——重测义务随 R2.3 行传递。

## Closure

Status Note: MR2.0 收官——R2.1–R2.14 十四行落位、39 指针回填、P1-MA4.3-008 drift 闭环（open 累计 72→71）；40 条 MA4 P1 全处置（39 排行 + 1 closed + 0 delegated/遗漏）；MA3 P1 零立案（无展开面）；零代码变更。双 713 编号冲突注记在案（:8，ARC 线 c11a30d48，文件名唯一可辨）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 审查子代理 `agent_24633270`（2026-10-24 03:3x）
- Evidence: R1 **`approved`**（8/8 PASS + 2m 随收口落地）——14 行落位/39+1 双向指针/计数链 40=39+008 咬合、4 条注记行处置对照原注记逐条吻合、3 条抽验亲核全中（defineRendererFamily 0 守护 / three-canvas :124 / diagnostics-reporter :13）、R2.7 交叉注记 + MR4.0 归并归属在案、零越界（并发 714 线隔离干净）、typecheck/test 独立复跑双绿；m1 激活 checkbox 补勾、m2 并发集注记更新均已落字。

Follow-up:

- no remaining plan-owned work（R2.1–R2.14 修复执行由各行自身 plan 承接；R2.3 的 mutation 基线重测义务随行传递）
