# 711 审计修复 R2·MR1.0：P1 修复展开器—结构+运行时（追加 R1.n 行）

> Plan Status: active
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MR1.0（Dependencies MA1、MA2——两簇 13 个审计工作项全部 `done`，展开器解锁）；`docs/skills/test-first-implementation-prompt.md`（R 行 Skill 列声明，修复执行时使用）
> Related: `docs/audits/arm2-index.md`（P1 追踪区 6 条在案）、`docs/plans/00-plan-authoring-and-execution-guide.md`（Rule 22/25 合并优先）、roadmap Cross-Cutting 4（R\*.0 展开预授权）/8（修复去重）/11（判别性测试纪律——约束的是 R 行修复执行，非本展开器）
> 中间产物：无 \_tmp 依赖；零入库代码变更（docs/plans + docs/backlog + docs/audits 三处文档）

## Purpose

把 MA1（结构契约层 9 项）与 MA2（运行时正确性层 4 项）审计产出的在案 P1 finding 展开为 roadmap Work Item Status 表的具体修复工作项行（R1.1、R1.2…），每行引用 finding 编号、按粒度规则（单 plan 可收口五判定 + Rule 22/25 合并优先）裁定归并、同步回填 `docs/audits/arm2-index.md` 修复行指针（finding 实质已愈合者走 finding-drift 径不排 R 行，见 P1-MA2.1-001）。**本 plan 的产物是修复工作项行，不是修复代码**（roadmap MR\*.0 定义）；修复执行由 R1.n 各自展开。

## Current Baseline（2026-10-24 live，HEAD `b32fa3fa2`）

- **MA1/MA2 在案 P1 共 6 条，arm2-index 状态列全部 `open`、修复行列全部 `—`**（P1 追踪区实测）：
  - P1-MA1.1-001 owner doc validation 归属三处实质 drift（rules.ts 职责失实 / Where-To-Add 指向未接线文件 / Versus 两 bullet 与 Compiler boundary 节相反）
  - P1-MA1.2-001 Bundle Default Registration Face 写 7 族 vs live 注册 9 族（宿主可见契约 drift；draft review 复核 ：569 仍 live）
  - P1-MA1.5-001 flux-renderers-3d 零 `nop-*` 语义根 marker（报告锚点 `three-canvas.tsx:125`，live 经 f60c8840c 合并已漂移至 :144——实质未愈合，Phase 1 重钉）+ missing-markers 扫描器盲区（P2-MA1.5-002 在案，不在本批）
  - P1-MA1.7-001 flow-designer-renderers 16 处 BEM 违规（6 状态修饰符冗余违规 + 10 `__` 元素类；CSS 零消费、**测试锚点依赖**——修复须同步测试选择器）
  - P1-MA2.1-001 arm2-index M0 基线 reactive-render-reads 行曾登记 2 失实——**MA2.1 审计 plan 已于 2026-10-19 就地勘正为 21（arm2-index :227 勘误注记在案）**，finding 实质面已愈合、仅索引行状态滞留 `open`（draft review M2 live 核实）→ 走 finding-drift 路径：不排 R 行，Phase 1 注记 + 状态回填 `closed`
  - P1-MA2.3-001 barcode-input 直调 `navigator.mediaDevices.getUserMedia`（use-barcode-camera.ts:67，live 钉扎复核）+ `window.BarcodeDetector` + `navigator.onLine`——媒体 IO 唯一无治理成员（同包 WASM IO 显式经 env.fetcher 对照在案）
- **roadmap MR1.0 行 `todo`**（Work Item Status :92 实测）；MA1.1–1.9/MA2.1–2.4 全部 `done`（依赖满足）。
- **修复去重 live 复核**（roadmap Purpose 第 3 条活跃集原文五成员 = FM 字母批 FM-1b-b / FM-6-b / FM-7-b、cross-roadmap UR-15、report-designer-nop-report NRP-1..5）：FM-1b-b = mobile 族/spreadsheet/dashboard-demo/three-gallery 交互**走查**（审计面非修复面）；FM-6-b = FM 台账 FM-021/025/033/034/037 局部缺陷（异 finding 异面）；FM-7-b = FM 台账 systemic 令牌/契约族批次——与本批零重叠：本批 6 条均为 R2 自有 finding，P1-MA1.7-001 是组件内类名清理而非令牌层缺口、P1-MA1.5-001 是 marker 缺失而非令牌契约；UR-15 = 表格 fixed 列宽预留（异面）；NRP-1..5 = report-designer nop-report 面（异面异包）——**逐条零重叠，无 delegated 指针需要登记**（Phase 1 逐条落字）。

## Goals

- roadmap Work Item Status 表追加 R1.1–R1.4 共 4 行（粒度裁定见 Execution Plan Phase 2；P1-MA2.1-001 经 finding-drift 裁定不排行），每行携带 finding 编号引用、Status `todo`、Owner Doc、Dependencies=MR1.0、Skill=test-first-implementation-prompt.md。
- `docs/audits/arm2-index.md` P1 追踪区：5 条「修复行」列回填 `R1.x` 指针；P1-MA2.1-001 行注记「修复已由 MA2.1 plan 落地」并回填状态 `closed`。
- 粒度裁定记录落字（合并理由/拆分理由，Rule 22/25 口径），字母批预授权声明（closure 时若单 plan 不可收口拆 R1.x-a/b）。
- 本 plan 自身收口：closure audit（fresh subagent）→ roadmap MR1.0 `todo`→`done`。

## Non-Goals

- 不执行任何 R1.n 修复（代码/owner-doc 修复由 R1.n 各自 plan 承接）。
- 不处理 P2/P3 finding（Rule 2 范围纪律——P2-MA1.5-002 扫描器盲区等留报告 deferred 区，MR2/MR3 展开器同口径排除）。
- 不修订 MA1/MA2 审计报告结论（finding 定级已 closure，引用不重开）。
- MA3–MA9 的 P1 展开归 MR2.0/MR3.0。

## Scope（必填节）

### In Scope

- `docs/backlog/audit-remediation-r2-roadmap.md`：Work Item Status 表追加 R1.1–R1.4 行（唯一动态状态区）。
- `docs/audits/arm2-index.md`：P1 追踪区 5 条「修复行」列回填 R1.x 指针；P1-MA2.1-001 行注记 + 状态回填 `closed`（finding-drift 径）。
- 本 plan 文件状态流转 + Draft Review Record / Closure 节落账。
- roadmap MR1.0 行 `todo`→`planned`（激活提交）→`done`（收口提交）。
- daily log 追加。

### Out Of Scope

- R1.n 修复的执行；P2/P3 处置；MA3+ finding 展开；并发线遗留（docs/index.md、platform-hardening-roadmap.md、P0-MA5.1-002 plan 清理行——工作树已知遗留不入 stage）。

## Failure Paths

| 可测场景编号   | 触发                             | 行为                                                                        | 可重试 | 用户可见表现（roadmap/索引读者）                            |
| -------------- | -------------------------------- | --------------------------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| dedup-hit      | live 复核发现与活跃 roadmap 重叠 | 该 finding 行记 `delegated: <指针>` 于 arm2-index Delegated 区，不排 R 行   | 否     | 对应 finding 无 R 行，Delegated 区可查指针                  |
| finding-drift  | live 复核发现 finding 已修复失实 | 就地勘误注记（plan guide Rule 21 口径），R 行不排，状态回填 `closed`        | 是     | finding 行状态 `closed` + 注记指针（P1-MA2.1-001 已走此径） |
| granular-split | 某 R 行执行时超单 plan 收口      | 该行 closure 时字母批拆分（R1.x-a/b，Cross-Cutting 5 预授权），R 行行内声明 | 否     | R 行名称携带字母批后缀                                      |

## Test Strategy

本档选择：**不适用**——纯展开器（零代码变更，产物为 roadmap 行与索引指针）；判别性测试义务（Cross-Cutting 11）随行传递给 R1.n 修复 plan 承接。

## Execution Plan

### Phase 1 - live 复核与粒度裁定

Status: planned
Targets: 本 plan Current Baseline 补记、`docs/audits/arm2-index.md`

- Item Types: `Decision | Proof`

- [ ] 6 条 P1 逐条 live 复核：状态列仍 `open` + **逐条打开 finding 实质面确认未愈合**（文档段落/git diff/代码锚点——P1-MA1.5-001 锚点重钉 :125→live 实位）
- [ ] P1-MA2.1-001 finding-drift 裁定落字：修复已由 MA2.1 plan 落地（:227 勘误注记）→ 该行就地注记 + 状态回填 `closed`，R 行不排（Failure Paths finding-drift 径）
- [ ] 修复去重裁决落字：对照集 = roadmap Purpose 第 3 条原文五成员（FM-1b-b / FM-6-b / FM-7-b / UR-15 / NRP-1..5），逐条零重叠结论（FM-7-b 显式排除理由：本批均为 R2 自有 finding，P1-MA1.7-001 为组件内类名清理非令牌层缺口、P1-MA1.5-001 为 marker 缺失非令牌契约）
- [ ] 粒度裁定落字：R1.1 = P1-MA1.1-001 + P1-MA1.2-001 合并（同 owner doc 同修复型 doc-drift 收敛）；R1.2 = P1-MA1.5-001（marker 代码修复）；R1.3 = P1-MA1.7-001（BEM 清理 + 测试锚点同步，同包）；R1.4 = P1-MA2.3-001（media IO env 治理，涉及 env 通道裁定故独立）

Exit Criteria:

- [ ] 四项裁定（实质面复核 / drift 闭环 / 去重 / 粒度）全部落字，可追溯到 live 证据

### Phase 2 - R 行追加与指针回填

Status: planned
Targets: `docs/backlog/audit-remediation-r2-roadmap.md`、`docs/audits/arm2-index.md`

- Item Types: `Fix`

- [ ] roadmap Work Item Status 表追加 R1.1–R1.4 行（MR1.0 之后、MR2.0 之前；Status `todo`；每行名称内嵌 finding 编号）；Dependencies 选 `MR1.0`（谱系指针——R 行由本展开器产出、closure 依赖其状态机，异于 r1 先例「无」的扁平登记；选型理由随行注记一句）
- [ ] arm2-index P1 追踪区 5 条「修复行」列 `—`→`R1.x` 回填；P1-MA2.1-001 行注记 + `closed`
- [ ] grep 双侧复核（roadmap R1.1–R1.4 ↔ arm2-index 修复行指针 4+5 命中 + closed 1）

Exit Criteria:

- [ ] roadmap 行追加且 prettier 干净；arm2-index 指针回填且 grep 双侧命中

### Phase 3 - 状态流转与收口

Status: planned
Targets: roadmap MR1.0 行、本 plan、daily log

- Item Types: `Proof`

- [ ] draft review 通过后：roadmap MR1.0 `todo`→`planned` 翻转入激活提交（翻转纪律），plan→`active`
- [ ] closure audit（fresh subagent）approved 后：roadmap MR1.0 `planned`→`done`（sed 回读核验），plan→`completed`
- [ ] daily log 追加；单次提交（显式路径；并发线不入 stage）

Exit Criteria:

- [ ] roadmap 与 plan 状态流转一致（sed 回读核验）；提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_fedcc0ab`（五项检查：格式/内容稳健性/引用准确性 PASS——roadmap :92、6 条 P1 open 实测、use-barcode-camera.ts:67 精确命中、FM-1b-b/FM-6-b/UR-15 面描述与实文一致；可想象性/声称-实况 FAIL 由 2 Major 驱动）
- Verdict: R1 `revised`（0B/2M/5m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 活跃集补全为五成员（+NRP-1..5）+ FM-7-b 显式零重叠结论落 Current Baseline 与 Phase 1；M2 P1-MA2.1-001 勘正已落地（:227 亲验）→ 走 finding-drift 径不排 R1.5、展开集改 R1.1–R1.4、Current Baseline 改「曾登记 2 已勘正」口径、Deferred「无」预声明撤回；m1 three-canvas 锚点 :125→:144 漂移注记 + Phase 1 重钉；m2 Closure Gates 拆显式两条保留 + build/lint 删除声明；m3 Failure Paths 补「用户可见表现」列；m4 Dependencies=MR1.0 选型理由随行注记；m5 Phase 1 复核加「逐条打开实质面」——均已落字
- Round 2（同一审查子代理回审）: 共识达成 **零 Blocker / 零 Major**——M1/M2 全链路一致闭环核对通过（无 R1.5 残留痕迹、Deferred 记账合规、与 P1-MA4.3-008 closed 回填先例不冲突）、m1–m5 逐条确认、修订新增声称实况抽验通过；残留 m6（Purpose 摘要句补 finding-drift 短语）已随激活落字，不阻塞

## Closure Gates

- [ ] R1.1–R1.4 行落 roadmap 且每行引用 finding 编号可追溯
- [ ] arm2-index 5 条 P1 修复行指针全部回填 + P1-MA2.1-001 注记闭环（`closed`）
- [ ] Phase 1 四项裁定有 live 证据
- [ ] 不存在被静默降级的 in-scope 项（6 条 P1 全部有 R 行承接、delegated 登记或 drift 闭环处置）
- [ ] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm test`

> build/lint 按 guide 纯文档条款删除（零 ts/tsx/css 变更）；保留 typecheck+test 抽查以证零意外。

## Deferred But Adjudicated

### P1-MA2.1-001 不排 R 行（finding-drift 改判）

- Classification: `watch-only residual`（实质修复已落地，仅索引状态记账）
- Why Not Blocking Closure: arm2-index :227 基线值已由 MA2.1 plan 于 2026-10-19 就地勘正为 21 并附勘误注记（draft review M2 + 执行者亲验），finding 无剩余修复面；本 plan Phase 1 完成索引行注记 + `closed` 回填即闭环。
- Successor Required: `no`
- Successor Path: —（注记在本 plan Phase 1 内完成，无后继 plan）

## Non-Blocking Follow-ups

- R1.4 的 env 媒体 IO 通道设计若超出缺陷修复（新 IO 类型扩展），在 R1.4 plan 内按 `docs/architecture/renderer-env.md` + `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md` 先例走独立裁定，不阻塞本展开器。

## Closure

Status Note: （待收口）

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:
