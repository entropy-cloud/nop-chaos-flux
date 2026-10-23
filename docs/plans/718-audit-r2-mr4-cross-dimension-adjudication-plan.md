# 718 审计修复 R2·MR4.0：跨维度 P1 裁决与冲突修复

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MR4.0（Dependencies MR1.0/MR2.0/MR3.0——三展开器已收官 `4acc19633`/`ddd6cb70d`/`0338bd23f`）；`docs/skills/discussion-grilling-prompt.md`（裁决方法：主张-质询-裁决三段记录）
> Related: `docs/audits/arm2-index.md`（P1 索引区 71 open + 修复行指针区）、roadmap Cross-Cutting 6（报告归档纪律——ID 不可变）/8（修复去重）；先例 plan 711/713/715（R 行指针体系）
> 编号 runway：716（G3D）与 717（G3I）均已被 ARC 线占用；本 plan 取 718，719+ ARC runway

## Purpose

处理同一问题被多维度报告、修复方案冲突、需全局视角定级的 P1：产出裁决记录（**创建** arm2-index 裁决区），回填修复行指针，使 MV 的「每个 P0/P1 可追溯」完整性校验可执行。无冲突的维度对逐一记录排除结论。

## Current Baseline（2026-10-24 live，HEAD `0338bd23f`）

- **在案跨维度交叉（三展开器执行中已登记线索）**：
  - **A · kanban Ctrl+Z 同源对**：P1-MA4.3-009（R2.7，测试面：消费链 + 空壳 e2e）↔ P1-MA5.2-002（交互面：拖拽后焦点落 body → Ctrl+Z 失效；修复行 `—`、随行注记「归并裁决归 MR4.0」）——同一根因缺陷的两个面（根因修复 vs 测试守护），当前分落两行且 002 无指针。
  - **B · capability 族双重登记**：P1-MA4.2-002（R2.4，signature 成员单案）是 P1-MA9.2-001（R3.12，capability 声明⊂实现漂移族 5 成员：signature 2/4、barcode-input 0/6、calendar 0/7、dashboard-editor 0/4、ai-chat 0/7）的成员——同一修复机制（声明↔实现对齐）分落 R2.4/R3.12 两行，存在重复修复面。
  - **C · 导入校验同族对**：P1-MA9.3-001（R3.1，taskflow kind）↔ P1-MA9.4-001（R3.2，page-designer region 形状）——同族异通道异包，两行互注记「判别测试设计共享」，无冲突（协调类）。
- **arm2-index 无裁决区**（现有区：P0 追踪区 :109 / P1 Finding 索引区 :120 / Delegated 指针区 :200 / 工具基线区 / 全量门禁基线区）——MR4.0 产物「并入 arm2-index 的裁决区」需新建 `## 跨维度裁决区` 节。
- **roadmap MR4.0 行 `todo`**；R1.1–R1.4 / R2.1–R2.14 / R3.1–R3.12 共 30 行已落位。
- **系统性交叉排查义务**：除上述三条线索外，须对 71 open finding 做一次同根/同文件/同缺陷跨维度扫描（以 arm2-index 描述锚点文件为键聚类），证明无第 4 处遗漏（Phase 1 落字）。

## Goals

- 创建 arm2-index `## 跨维度裁决区`，逐案落裁决记录（格式：案号 / 涉案 finding 对 / 冲突类型 / 裁决 / 指针动作 / 依据〔discussion-grilling 主张-质询-裁决〕）。
- 裁决 A：kanban Ctrl+Z 同源对——推荐方向：R3.4 为根因修复 canonical（002 指针回填 R3.4），R2.7 行内注记更新为测试守护面（009 维持）；随裁决回填指针。
- 裁决 B：capability 族——推荐方向：R3.12 为族修复 canonical（4.2-002 指针改指 R3.12 + 注记「族成员归并」），R2.4 行名收窄（003/004/005）与指针计数连锁（R2.4 族 4→3）随裁决落字。
- 裁决 C：导入校验族——协调类裁决（两行独立 + 判别测试设计共享，无指针动作）。
- 系统性交叉排查记录（同根聚类证据，排除第 4 处）。
- 本 plan 收口：closure audit → roadmap MR4.0 `todo`→`done`。

## Non-Goals

- 不执行任何 R 行修复；不动 finding ID 本体与 arm2-index 既有登记（Cross-Cutting 6：ID 落索引后不可变）；roadmap 行名枚举允许随裁决收窄/扩注，溯源以索引指针列为准；不处理 P2/P3；并发线隔离（三项遗留 + ARC 716/717 线）。

## Scope（必填节）

### In Scope

- `docs/audits/arm2-index.md`：新建裁决区（3 案记录 + 系统性排查记录）；裁决 A/B 的指针回填（002→R3.4、4.2-002→R3.12）。
- `docs/backlog/audit-remediation-r2-roadmap.md`：R3.4 行扩注记（案 A：002 根因修复归本行，测试面仍归 R2.7/009）；R2.4 行名收窄注记（003/004/005，002 归并 R3.12）；R2.7 行内注记更新（裁决落字：根因归 R3.4，本行守 009 测试面）。
- 本 plan 状态流转 + daily log + roadmap MR4.0 翻转（激活/收口两提交）。

### Out Of Scope

- R 行修复执行；P2/P3；MV/MG；并发线。

## Failure Paths

| 可测场景编号   | 触发                                 | 行为                                                                | 可重试 | 用户可见表现                 |
| -------------- | ------------------------------------ | ------------------------------------------------------------------- | ------ | ---------------------------- |
| 4th-crossing   | 系统性排查发现第 4 处交叉            | 依同格式立案裁决（或判定非同根并记录排除理由）                      | 是     | 裁决区追加案记录             |
| pointer-drift  | 指针回填后发现与 R 行 scope 子句矛盾 | 行名收窄注记就地修正，裁决记录更新动作列                            | 是     | roadmap 行内注记与裁决区一致 |
| adjudicate-hit | 裁决方向与 owner doc/在案 plan 冲突  | discussion-grilling 记录主张-质询-裁决三段，必要时改判并落 Deferred | 否     | 裁决区含完整质询链           |

## Test Strategy

本档选择：**不适用**——纯裁决记账（零代码变更）。

## Execution Plan

### Phase 1 - 系统性交叉排查

Status: completed
Targets: 本 plan 补记、裁决区草稿

- Item Types: `Decision | Proof`

- [x] 71 open finding 以描述锚点文件为键聚类扫描（含裸文件名二扫）——结论：同文件组 4〔action-execution.ts 与 crud-renderer-load.ts 两组为同 R 行内共置非冲突；index.ts 泛名误报分属三包；three-canvas.tsx 1.5-001/4.3-005 同文件异缺陷=协同类案 D 无指针动作〕；语义同根对（案 A 异文件、案 B 锚点别名）为文件聚类盲区、已由语义评审覆盖——无第 4 处需裁决冲突，全记录落裁决区排查节
- [x] 三案涉案 finding 行与 R 行现状逐一复核（002 `—`+注记 / 4.2-002 `R2.4` / 009 `R2.7` / 9.2-001 `R3.12`——draft review 亲核 + 执行者复核一致）

Exit Criteria:

- [x] 排查结论可追溯（聚类证据）；无未登记交叉

### Phase 2 - 裁决落盘与指针动作

Status: completed
Targets: `docs/audits/arm2-index.md`、`docs/backlog/audit-remediation-r2-roadmap.md`

- Item Types: `Decision | Fix`

- [x] 新建 `## 跨维度裁决区`：裁决 A/B/C 记录（含 discussion-grilling 主张-质询-裁决三段）+ 系统性排查记录（含案 D 协同记录）+ 指针计数链节
- [x] 裁决 A 指针动作：P1-MA5.2-002 修复行 `—`→`R3.4` + 注记更新（根因修复归 R3.4、测试守护归 R2.7/009）；R3.4 行追加归并注记；R2.7 行内注记更新
- [x] 裁决 B 指针动作：P1-MA4.2-002 修复行 `R2.4`→`R3.12` + 「族成员归并」注记；R2.4 行名收窄（003/004/005）
- [x] 裁决 C 记录（协调类，无指针动作）
- [x] grep 双侧复核（裁决区 ↔ 指针列 ↔ roadmap 行注记三侧一致）——实测指针计数 R2.4×3/R2.7×3/R3.4×3/R3.12×2 与声明链逐项咬合；roadmap 案 A 注记 ×2（R3.4+R2.7）、案 B 注记 ×1（R2.4）

Exit Criteria:

- [x] 裁决区三案 + 排查记录落字；指针动作完成且三侧一致；指针计数链：open 71 全有指针（70 原有 + 1 案 A 新回填）；R2.4 族 4→3；R3.4 族 2→3；R3.12 族 1→2；R2.7 不变；0 漂移

### Phase 3 - 状态流转与收口

Status: completed
Targets: roadmap MR4.0 行、本 plan、daily log

- Item Types: `Proof`

- [x] draft review 通过后：MR4.0 `todo`→`planned` 翻转入激活提交，plan→`active`（c25727390）
- [x] closure audit（fresh subagent）approved 后：MR4.0 `planned`→`done`（regex 定位替换 + 回读核验），plan→`completed`
- [x] daily log 追加；单次提交（显式路径；并发线不入 stage）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致；提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_3a68d35e`（五项检查：可想象性/格式/引用准确性 PASS——三案现状/指针列/同源注记/discussion-grilling skill 逐一亲核；内容稳健性/声称-实况 FAIL 由 2 Major 驱动；质询三点回结：收窄与 Cross-Cutting 6 相容、R2.4 连锁未声明属实、裁决 C 确无指针动作）
- Verdict: R1 `revised`（0B/2M/3m）→ 回修 → R2 `pass-with-minors`（0B/0M/1m m4）→ **共识可升 active**
- Rounds: 2
- Findings addressed: M1 重编号 718（717 双占 ARC G3I 在飞，runway 改「716+717 已占，719+ ARC runway」）；M2 R3.4 扩注记补入 In Scope/Phase 2（三侧一致 Exit 可判定）；m1 Non-Goals 改「不动 finding ID 本体与索引登记，行名枚举随裁决收窄/扩注」；m2 指针计数链落 Exit（71=70+1；R2.4 4→3；R3.4 2→3；R3.12 1→2；R2.7 不变）；m3 R2.7 措辞改「行内注记更新」；m4 并发线隔离改「ARC 716/717 线」——均已落字

## Closure Gates

- [x] 裁决区落盘：A/B/C 三案 + 系统性排查记录（含案 D 协同）
- [x] 指针动作完成（002→R3.4、4.2-002→R3.12）且三侧一致（裁决区/指针列/roadmap 行）——auditor 程序化复核分布 3/3/3/2 零漂移
- [x] Phase 1 排查结论有聚类证据（auditor 独立脚本全量复聚——无第 5 组）
- [x] 不存在被静默降级的 in-scope 项（三案全部有裁决记录；案 D 备查归入排查节）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44 @ 04:1x 绿窗 + auditor turbo replay 同证）
- [x] `pnpm test`（82/82 @ 04:12 绿窗；auditor 三跑——两红窗为 scheduling coverage-v8 报告期 ENOENT 零断言失败〔并发高载，工具链治理族在案面，m1 观察入 MV/MG 线索〕、run3 静止窗 exit 0 82/82 独立复现）

> build/lint 按 guide 纯文档条款删除；保留 typecheck+test。

## Deferred But Adjudicated

（待执行中落账。）

## Non-Blocking Follow-ups

- 裁决 A/B 的 R 行修复执行期按裁决分工落地（R3.4 根因 + R2.7 守护；R3.12 族修复）——义务随裁决记录传递，非本 plan 债务。

## Closure

Status Note: MR4.0 收官——裁决区三案落盘（A kanban Ctrl+Z 同源→R3.4 canonical / B capability 族→R3.12 canonical / C 导入校验协调类）+ 系统性排查（71 open 聚类无第 5 组 + 案 D three-canvas 协同备查）+ 指针动作三侧一致（R2.4 4→3、R3.4 2→3、R3.12 1→2、R2.7 不变、71 全有指针零漂移）；零代码变更。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 审查子代理 `agent_b1e95480`（2026-10-24 06:5x）
- Evidence: R1 **`approved`**（8/8 PASS + 2 minor 备忘）——裁决区结构完整三段齐全、案 A/B 三侧一致程序化亲核、排查诚实（auditor 独立脚本复聚无第 5 组、5.3-001/8.3-002 未漏聚）、计数链 73=71+2 零漂移、零越界（delta git diff -w 甄别：本 plan 仅 arm2-index 2 行指针 + 裁决区 + roadmap 3 行 + plan 自身）、typecheck 44/44 + test 82/82 绿窗独立复现（两红窗如实归因 scheduling coverage-v8 ENOENT 并发高载零断言失败——m1 观察移交 MV/MG 工具链线索）；m2 计数措辞差无实质。

Follow-up:

- no remaining plan-owned work（裁决分工义务随裁决记录传递至 R3.4/R2.7/R3.12 修复执行）
