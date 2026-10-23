# 715 审计修复 R2·MR3.0：P1 修复展开器—功能/UX/性能/安全/文档/开放式（追加 R3.n 行）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MR3.0（Dependencies MA5–MA9——六个维度组 21 个审计工作项全部 `done`，展开器解锁）；`docs/skills/test-first-implementation-prompt.md`（R 行 Skill 列）
> Related: `docs/audits/arm2-index.md`（P1 追踪区 MA5–MA9 ×27 条在案）、`docs/plans/00-plan-authoring-and-execution-guide.md`（Rule 22/25）、roadmap Cross-Cutting 4/5/8/11；先例 `docs/plans/711-...`（MR1.0 approved）、`docs/plans/713-...`（MR2.0 approved）
> 编号 runway 注记：714 已被 ARC 并发线占用（G2I in-flight）；本 plan 取 715，716+ 为 ARC 后继 runway——若再撞号以文件名 slug 唯一可辨（沿 plan 713 双 713 先例）

## Purpose

把 MA5（功能交互 ×6）、MA6（UX 视觉 ×4）、MA7（性能安全样式 ×3，P1 仅 MA7.1 ×1）、MA8（文档运维 ×3）、MA9（开放式 ×4）的在案 P1 finding 展开为 roadmap R3.n 修复工作项行：每行引用 finding 编号、按包族/结果面归并（Rule 22/25）、同步回填 arm2-index 修复行指针；实质已愈合者走 finding-drift 径。**产物是修复工作项行，不是修复代码**；判别性测试义务（Cross-Cutting 11）随行传递。

## Current Baseline（2026-10-24 live，HEAD `ddd6cb70d`）

- **MA5–MA9 在案 P1 ×27 全部 `open`**（arm2-index P1 追踪区实测）：
  - MA5.1 ×6（001 flow 撤销/恢复恒 disabled / 002 画布 Escape 不取消拖拽 / 003 page-designer 滚动插入 scrollTop 归零 / 004 nop-debugger 虚拟化时间线 scroll 归零 / 005 xlang-debug 整面零样式表 / 006 xlang-debug 断连不可见）
  - MA5.2 ×2（001 kanban 列级 drop target 注册覆盖 / 002 kanban 拖拽后焦点落 body Ctrl+Z 失效——**与 P1-MA4.3-009 同源**，R2.7 已带交叉注记、归并裁决归 MR4.0）
  - MA5.3 ×2（001 spreadsheet 编辑提交焦点落 body / 002 report-host 双 undo 栈时间旅行）
  - MA5.4 ×1（CRUD query/reset 工作流 UI 不可达）
  - MA5.5 ×2（001 dashboard resize 手柄死区 / 002 Save 往返清空全部面板=数据丢失类）
  - MA5.6 ×1（ai-conversations 切换永不换装消息）
  - MA6.1 ×1（ui JsonViewer dark 第三方字面色白块——**packages/ui 系统级**）
  - MA6.2 ×2（001 pivot VTable canvas dark 全灭——主题监听机制级 / 002 print 预览第 2 页物理不可达）
  - MA7.1 ×1（kanban perf-scale 虚拟化被布局击穿 6000 卡全量）
  - MA8.1 ×3（001 quick-reference Data Source Schemas 三重错误 / 002 monitor 幻影 prop / 003 refreshDataSource 签名过时）
  - MA8.3 ×2（001 knip-baseline standing 双源在案红 / 002 audit:deps standing-red 未入链未基线化）
  - MA9.2 ×1（ComponentHandle capability 声明⊂实现漂移族 5 成员）
  - MA9.3 ×2（001 taskflow 导入不校验 kind 静默清空 / 002 word 深栈 undo 内容回退失真）
  - MA9.4 ×1（page-designer 导入通道不校验 region/节点形状）
- **roadmap MR3.0 行 `todo`**；R1.1–R1.4 / R2.1–R2.14 已落位（MR1.0 `4acc19633`、MR2.0 `ddd6cb70d` 收官）。
- **修复去重**：活跃集五成员（FM-1b-b / FM-6-b / FM-7-b / UR-15 / NRP-1..5）+ 并发 ARC 线（712 已收官、714 G2I in-flight detail-field inline edit）——27 条均为 R2 审计自有 finding（功能交互/视觉/性能/文档/guard/对抗面），与走查批、FM 台账、令牌层、表格列、nop-report、detail-field inline edit 零重叠（Phase 1 逐行落字）。
- **修复面保护区预授权**（roadmap Cross-Cutting 8）：P0/P1 自动修复预授权覆盖 plan-first 保护区（flux-core/src、schema validation、renderer 定义字段、样式契约——工作项 plan 即所需 plan）；`packages/ui/src/index.ts` 公共导出与认证/安全边界 ask-first（R3.9 的 ui JsonViewer 修复若涉公共导出变更须人工确认，行内声明）；结构性重构执行前人工确认。

## Goals

- roadmap 追加 R3.1–R3.12 共 12 行（归并方案见 Phase 2），覆盖 27 条 finding（26 条指针回填 + 1 条随行交叉注记〔P1-MA5.2-002，修复行维持 `—`、归并裁决归 MR4.0，沿 713/R2.7 同侧处理〕；Phase 1 复核若遇 healed 逐条走 drift 径改判）。
- arm2-index：26 条修复行指针回填（R3.x）。
- 粒度/去重裁定落字；字母批预授权声明（执行超单 plan 收口拆 R3.x-a/b）。
- 本 plan 收口：closure audit → roadmap MR3.0 `todo`→`done`。

## Non-Goals

- 不执行任何 R3.n 修复；不处理 P2/P3；不修订 MA5–MA9 审计报告结论；P1-MA5.2-002 ↔ P1-MA4.3-009 同源归并裁决归 MR4.0（009 指针 R2.7 维持、002 指针暂缺随 MR4.0 裁决回填，沿 713/R2.7 同侧处理）；MA9.3-001 ↔ MA9.4-001 为同族异通道（taskflow vs page-designer），**分属 R3.1/R3.2 两行各自修复、判别测试共享设计**（MA9.4 报告 :60/:98 与 MA9.3 报告 :75 在案建议『MR3 两案同批修复共享判别测试』——修复执行期协调，行指针独立）。

## Scope（必填节）

### In Scope

- `docs/backlog/audit-remediation-r2-roadmap.md`：追加 R3.1–R3.12 行（MR3.0 之后、MR4.0 之前——谱系序）。
- `docs/audits/arm2-index.md`：26 条修复行指针回填。
- 本 plan 状态流转 + daily log + roadmap MR3.0 翻转（激活/收口两提交）。

### Out Of Scope

- R3.n 修复执行；P2/P3；MR4.0 归并裁决本体；并发线（docs/index.md、platform-hardening-roadmap.md、P0-MA5.1-002 plan 三项遗留 + ARC 714 线 in-flight 文件——显式路径隔离）。

## Failure Paths

| 可测场景编号   | 触发                             | 行为                                                  | 可重试 | 用户可见表现（roadmap/索引读者）     |
| -------------- | -------------------------------- | ----------------------------------------------------- | ------ | ------------------------------------ |
| dedup-hit      | live 复核发现与活跃面重叠        | 记 `delegated: <指针>` 于 Delegated 区，不排 R 行     | 否     | 该 finding 无 R 行，Delegated 区可查 |
| finding-drift  | live 复核发现已修复              | 就地注记 + 状态回填 `closed`，R 行不排，Deferred 落账 | 是     | finding 行 `closed` + 注记指针       |
| granular-split | 某 R 行执行超单 plan 收口        | 字母批拆分（R3.x-a/b，Cross-Cutting 5 预授权）        | 否     | R 行名称携带字母后缀                 |
| ask-first-hit  | R3.9 修复涉 ui 公共导出/安全边界 | 行内预声明 ask-first：修复 plan 内人工确认后再执行    | 否     | R 行名称携带 ask-first 标注          |

## Test Strategy

本档选择：**不适用**——纯展开器（零代码变更）；判别性测试义务随 R3.n 行传递（test-first；P1-MA5.5-002 数据丢失类修复 plan 内为「必须自动化」档）。

## Execution Plan

### Phase 1 - live 复核与粒度/去重裁定

Status: completed
Targets: 本 plan Current Baseline 补记、`docs/audits/arm2-index.md`

- Item Types: `Decision | Proof`

- [x] 27 条逐条状态列复核 + 实质面抽验 ≥10 条——复核实录：状态列 27/27 `open`（draft review 全量 grep + 执行者区间核对）；抽验 10 条全 live 未愈合：执行者 6 条〔5.1-001 designer-toolbar.tsx:256 `!toolbarSnapshot.canUndo` 假阴性接线 / 5.1-005 `xlang-debug-*` CSS 全仓 0 命中 / 5.2-001 kanban-column.tsx:50-53 registerColumn+registerBoardDropZone 双注册在 / 6.2-002 nop-print-paper（print-designer-canvas.tsx:244）单块无滚动容器 / 9.2-001 SIGNATURE_METHODS（signature-renderer.tsx:17）= clear/reset/undo/export 与声明 clear/reset 漂移在 / 5.1-002 Escape 面在案〕+ draft review 4 条亲验〔5.5-002 dashboard-domain-adapter.ts:123 裸数组 serialize vs editor-renderer.tsx:63 对象消费、8.3-001 knip-baseline 实跑 exit 1 双源、9.3-001 dsl.ts 仅查 steps、9.4-001 session.ts:56-68〕。4 条交叉/族行处置：5.2-002 随行交叉注记（修复行 `—`、归并 MR4.0）/ 9.2-001 R3.12 独立行 / 9.3-001 R3.1 / 9.4-001 R3.2（双向互注记已入 roadmap 行文）
- [x] 去重裁决落字（活跃集五成员 + ARC 线〔712 已收官、714 in-flight detail-field inline edit〕逐行对照零重叠；ui JsonViewer 与 FM-7-b 区分维持 Current Baseline 判定：6.1-001 是 dark 模式第三方字面色 token 缺口、非令牌层批次）
- [x] 粒度裁定落字：12 行归并方案逐行理由=同包族/同结果面（R3.1 flow 族跨包同族 / R3.2 page-designer 同包 / R3.3 调试面同结果面跨 C10+C12 / R3.4 scheduling 交互+性能同包 / R3.5 office 同族 / R3.6-R3.8 单点面 / R3.9 视觉 dark+预览同主题层 / R3.10 同 owner docs 面 / R3.11 同 check 链结果面 / R3.12 单族），防 micro-plan 且无 closure 语义分叉（Rule 22/25）

Exit Criteria:

- [x] 三项裁定全部落字可追溯；抽验实录在案

### Phase 2 - R 行追加与指针回填

Status: completed
Targets: `docs/backlog/audit-remediation-r2-roadmap.md`、`docs/audits/arm2-index.md`

- Item Types: `Fix`

- [x] roadmap 追加 R3.1–R3.12 行（归并方案：R3.1 flow-designer 族交互+导入校验 = 5.1-001/002 + 9.3-001〔同族：跨 flow-designer-renderers 包与 playground 宿主 taskflow lib——9.3-001 落 apps/playground/src/taskflow-designer-lib/dsl.ts，修复 plan 落点含宿主 lib；行文互加注记 9.3-001〔与 P1-MA9.4-001/R3.2 同族、判别测试设计共享〕〕；R3.2 page-designer 交互+导入校验 = 5.1-003 + 9.4-001〔同包；行文互加注记 9.4-001〔与 P1-MA9.3-001/R3.1 同族、判别测试设计共享〕〕；R3.3 调试面修复 = 5.1-004/005/006〔debugger+xlang 调试面同结果面〕；R3.4 scheduling 交互与性能 = 5.2-001/002〔002 交叉注记〕+ 7.1-001；R3.5 office 族编辑器修复 = 5.3-001/002 + 9.3-002；R3.6 CRUD 工作流可达性 = 5.4-001；R3.7 dashboard 交互与数据安全 = 5.5-001/002；R3.8 ai demo 装配 = 5.6-001；R3.9 视觉面 dark 与预览 = 6.1-001〔ask-first 标注〕/6.2-001/6.2-002；R3.10 文档修复批 = 8.1-001/002/003〔同 owner docs 面〕；R3.11 guard 链治理 = 8.3-001/002〔同 check 链结果面〕；R3.12 capability 声明族收敛 = 9.2-001）——12 行已落位（MR3.0 之后、MR4.0 之前，:113-124）
- [x] arm2-index 26 条修复行指针回填（R3.x）——python 行号映射逐行 ID 断言（172-198 连续块）后批量编辑，27 行改动（26 指针 + 002 描述注记）
- [x] grep 双侧复核（roadmap 12 行 ↔ 索引 26 指针 + 1 随行注记〔002 修复行 `—`〕；计数链 27 = 26 指针回填 + 1 交叉注记 + 0 closed/drift + 0 delegated/遗漏）——实测分布 R3.1×3/R3.2×2/R3.3×3/R3.4×2/R3.5×3/R3.6×1/R3.7×2/R3.8×1/R3.9×3/R3.10×3/R3.11×2/R3.12×1 = 26 ✓；002 注记在、修行列 `—` ✓；33 todo = MR4/MV/MG 3 + R1×4 + R2×14 + R3×12 咬合 ✓

Exit Criteria:

- [x] roadmap 行追加 prettier 干净；arm2-index 指针回填 grep 双侧命中；计数链咬合

### Phase 3 - 状态流转与收口

Status: completed
Targets: roadmap MR3.0 行、本 plan、daily log

- Item Types: `Proof`

- [x] draft review 通过后：MR3.0 `todo`→`planned` 翻转入激活提交，plan→`active`（dbdce8020）
- [x] closure audit（fresh subagent）approved 后：MR3.0 `planned`→`done`（regex 定位替换 + 回读核验），plan→`completed`
- [x] daily log 追加；单次提交（显式路径；并发线不入 stage）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致；提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_f3526a5d`（五项检查：可想象性/格式/引用准确性/声称-实况 PASS——27 条分布逐项吻合、MA5.5-002 双锚点亲读、knip-baseline 实跑 exit 1 双源在案、MA9.3/9.4 源码锚点亲读；内容稳健性 FAIL 由 M1 计数链驱动）
- Verdict: R1 `revised`（0B/1M/3m）→ 回修 → R2 **共识零 B/M**（M1 方案 A 四处对齐 27=26+1+0+0、m1 归因改 MA9.4/9.3 报告行号、m2 R3.1 跨包措辞、m3 双向交叉注记；drift 分支公式低于 Minor 阈值）
- Rounds: 2
- Findings addressed: M1 计数链 26→方案 A（26 指针 + 002 随行交叉注记修复行 `—`，沿 713/R2.7 同侧）；m1 两案同批建议归因改 MA9.4 :60/:98 + MA9.3 :75；m2 R3.1 改「同族跨包」（taskflow 宿主 lib dsl.ts 落点警示）；m3 R3.1/R3.2 行文互加双向交叉注记——均已落字

## Closure Gates

- [x] R3.1–R3.12 行落 roadmap 且每行 finding 编号可追溯
- [x] arm2-index 26 指针回填 + P1-MA5.2-002 交叉注记（修复行 `—`；零 drift）
- [x] Phase 1 三项裁定有 live 证据（抽验 10 条实录：执行者 6 + draft review 4）
- [x] 不存在被静默降级的 in-scope 项（27 条全部有 R 行承接、交叉注记随行、delegated 登记或 drift 闭环）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44；auditor 独立复跑同证）
- [x] `pnpm test`（82/82 @ 03:42 无并发干扰窗口；auditor 独立复跑同证）

> build/lint 按 guide 纯文档条款删除（零 ts/tsx/css 变更）；保留 typecheck+test（test 受并发线 test-first 循环干扰时按 713 先例：绿窗实测 + 排除法验证 + 干扰如实披露）。

## Deferred But Adjudicated

（待执行中落账——Phase 1 复核若遇 healed finding，逐条落本节并走 drift 径。）

## Non-Blocking Follow-ups

- R3.1/R3.2 修复执行期：9.3-001 与 9.4-001 同族判别测试共享设计（两行独立收口，测试设计协调不阻塞本展开器）。
- R3.9 ask-first 面：ui JsonViewer 修复若涉 `packages/ui/src/index.ts` 公共导出，按 ai-autonomy-policy 人工确认后执行。

## Closure

Status Note: MR3.0 收官——R3.1–R3.12 十二行落位、26 指针回填、P1-MA5.2-002 随行交叉注记（归并裁决归 MR4.0）；27 条 MA5–MA9 P1 全处置（26 排行 + 1 注记 + 0 delegated/遗漏、零 drift）；零代码变更。三展开器收官：R1×4 + R2×14 + R3×12 = 30 个修复工作项行承接全部 73 条 P1（open 累计 73→71，两次 drift 闭环）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 审查子代理 `agent_282f60c4`（2026-10-24 03:5x）
- Evidence: R1 **`approved`**（8/8 PASS + 0 findings）——12 行谱系序落位（git diff -w 净内容核验）、26+1 双向指针逐行亲核、3 条抽验亲核全中（designer-toolbar :256 / xlang CSS 0 命中 / SIGNATURE_METHODS 漂移）、4 交叉行处置吻合、ask-first 标注在、零越界（716 ARC 线文件印证 runway 分配）、typecheck/test 独立复跑双绿。

Follow-up:

- no remaining plan-owned work（R3.1–R3.12 修复执行由各行自身 plan 承接）
