# D2 P3 裁决与残余收口（149 P3 逐条裁决 + @reserved 契约核对 + watch-only e2e 复核 + Follow-ups 归集）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: D2
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/component-audit-round2-roadmap.md`（D2 行 + Phase Details）、`docs/audits/cr-inventory-adjudication.md`（先例）、`docs/audits/round2-p3-inventory.md`（D0 产物）
> Related: 依赖 `docs/plans/2026-08-08-0715-1-round2-d0-orchestration-baseline.md`（D0 输入盘点：`docs/audits/round2-p3-inventory.md`）；`docs/plans/2026-08-08-0715-2-round2-d1-gate-drift-pattern-family-rescan.md`（P3 由 D1 登记入本 plan 裁决表）；`docs/plans/2026-08-06-0329-2-cv-full-verification.md`（watch-only 清单基线）

## Purpose

把第二轮的"P3 裁决与残余收口"收口：① 对 113 卡 149 条 P3（+ 08-06/08-07 审计新增 P3 + D1 回扫登记的 P3——裁决口径有意宽于 roadmap 的"149 + 08-07"表述，与 D0 库存范围一致）逐条裁决——约 30 条需实质裁定，其余低成本当场修复 / 记录留痕 / 驳回 + 理由——裁决表落 `docs/audits/round2-p3-adjudication.md` 且**零悬挂**（对齐 `cr-inventory-adjudication.md` 先例）；② `@reserved` 契约全量核对（schema 字段 + design.md 标注 vs live 消费，ghost contract 专项）：确认仍零消费者则维持 `@reserved` 并回写状态，发现新消费者则裁决激活或撤销标注；③ 6 条 watch-only e2e 复核裁决（Tiptap 批次 ×2 + w3d-editor 是否真缺陷、gantt-perf/kanban-perf 60Hz 环境阈值复测、ai-attachments 已解 flake 记录复核）；④ 各 plan Non-Blocking Follow-ups 归集收口。

## Current Baseline

（全部为 live repo 核对事实，2026-08-08）

- **P3 盘点**：113 卡 149 条 P3（pc-index 2026-08-06 汇总；live grep `- [P3-` 于 `docs/audits/per-component/` 实测 149 条，一致）——D0 全量提取落 `docs/audits/round2-p3-inventory.md`（本 plan 的输入，开工前确认 D0 Phase 1 已完成）；08-06/08-07 审计 P3（08-06 multi-audit 42 条 P2+P3 中含 P3、08-07 multi-audit 19 条中含降级 P3 的 14-4/14-5+23-3——后者已由 0150-3 修复）。
- **@reserved 现状**：live grep 实测 7 处 / 3 文件——`packages/flux-renderers-data/src/crud-schema.ts`、`packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts`、`packages/flux-renderers-scheduling/src/calendar/calendar.tsx`；已知第一轮语义：零消费者时维持 `@reserved` 标注。
- **6 条 watch-only e2e 基线**（CV 2026-08-06 归因清单，见 `docs/plans/2026-08-06-0329-2-cv-full-verification.md`）：c3-5-host-surfaces Tiptap 批次 ×2、w3d-editor（:28）、gantt-perf/kanban-perf（本机主屏 50.00Hz，rAF 50fps 上限致阈值不可达）；ai-attachments 为已解瞬时 flake 记录（不占 6 席）。基线方法学：隔离重跑（`npx playwright test <spec>:<line> --reporter=list`）+ clean HEAD stash 对照。
- **Follow-ups 归集输入**（D0 归集核验）：2228-1 ERP 设计文档 `polling.stopWhen` watch-only（`docs/components/schema-gap-from-erp-integration-design.md` :355/:359/:453/:481，依赖未发布的 SurfaceRuntime `$surface.hasOpenSurface`）；2228-3 工具治理条目（01-02/03-01/03-02/03-03/14-1/14-2/14-4/14-5+23-3，已由 0150-1/2/3 全部落定，D0 核验终态）；0150-1 `find-event-dispatch-without-ctx.test.ts:14-33` stagedDirs 治理条目。
- **先例**：`docs/audits/cr-inventory-adjudication.md`（第一轮 CR 输入裁决表，零悬挂先例：低成本当场修复 / 记录留痕 / 驳回 + 理由）。
- **授权边界**：mission description 已授权全部保护区域代码变更；P3 低成本修复属自动修复机制 §2 的"P2 若修复成本低（约 15 分钟内）也当场修复"同型纪律（P3 记录即可，但低成本 P3 当场修复不违背）。

## Goals

- `docs/audits/round2-p3-adjudication.md` 完成且**零悬挂**：149 P3 + 08-06/08-07 审计新增 P3 + D1 登记 P3 逐条裁决（低成本当场修复 / 记录留痕 / 驳回 + 理由），每条有最终状态；对齐 `cr-inventory-adjudication.md` 格式先例。
- `@reserved` 契约核对完成：7 处 / 3 文件 vs live 消费核对，维持/激活/撤销裁决全部留痕；ghost contract 专项（`component:*` 句柄、schema 字段、design.md 标注双向核对）结论记录。
- 6 条 watch-only e2e 复核完成：Tiptap 批次/w3d-editor 隔离复跑判真缺陷 vs 环境；gantt-perf/kanban-perf 60Hz 阈值评估（本机 50Hz 则维持归因 + 标注"需 60Hz 环境最终确认"）；ai-attachments flake 多轮复跑确认不再现；复核结论落裁决表或 daily log。
- 各 plan Non-Blocking Follow-ups 归集收口（2228-1 ERP watch-only 维持 + 复核结论记录、2228-3 工具治理条目终态、0150-1 stagedDirs 路由），全部落 collected/closed 状态。

## Non-Goals

- 不执行 D1 的门禁漂移回扫与模式族回扫（P0/P1/P2 不在此裁决；D1 发现的 P3 只登记入本 plan 裁决表）。
- 不审计 4 个 host renderer 包（D3.x）。
- 不补写 bug notes（DB，历史缺口）、不写 lessons（DL）。
- 不做结构性重构（公共 API、包边界）。

## Scope

### In Scope

- ① 149 P3 + 08-06/08-07 审计 P3 + D1 登记 P3 逐条裁决 → `docs/audits/round2-p3-adjudication.md`（零悬挂，计数 = 库存 + D1 登记行）。
- ② `@reserved` 契约核对：`rg "@reserved" packages/*/src` + design.md 标注 vs live 消费；零消费者维持标注并回写状态；新消费者裁决激活或撤销标注。
- ③ 6 条 watch-only e2e 复核裁决（隔离复跑 + 60Hz 环境阈值评估 + 归因记录终态）。
- ④ Non-Blocking Follow-ups 归集收口（2228-1 ERP watch-only / 2228-3 工具治理终态 / 0150-1 stagedDirs 路由）。

### Out Of Scope

- P0/P1/P2 修复（D1/DR 归属）。
- host 大面审计（D3.x）。
- bug note 回补（DB）、lessons 沉淀（DL）。
- 结构性重构。

## Failure Paths

| 场景                               | 触发                                   | 行为                                                                               | 可重试 | 用户可见表现                             |
| ---------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- | ------ | ---------------------------------------- |
| watch-only e2e 复核出现真缺陷      | 隔离复跑稳定失败 / clean HEAD 同值复现 | 判定真缺陷 → 归 DR（或 D3.x 若属 host 面），不阻塞本 plan                          | 是     | 裁决表标注"真缺陷 → DR"路由              |
| D1 登记 P3 行晚于本 plan 收口      | D2 先收口、D1 后登记                   | 顺序纪律：Phase 1 裁决在 D1 登记完成后执行或收口前补裁 D1 行；零悬挂口径覆盖 D1 行 | 是     | 裁决表标注"待补裁 D1 行"（若顺序未遵守） |
| gantt-perf/kanban-perf 本机仍 50Hz | 显示刷新率实测 50.00Hz                 | 维持归因 + 标注"需 60Hz 环境最终确认"，不判定修复                                  | 是     | 裁决表维持 watch-only 记录               |
| `@reserved` 发现新消费者           | `rg` 消费点命中                        | 裁决激活（移除 `@reserved` + 对齐 design.md）或撤销标注（若契约废弃）              | 否     | 标注状态回写 + design.md 同步            |

## Test Strategy

本档选择：**建议有测** —— P3 低成本当场修复的条目补 focused 测试（断言正确行为）；e2e 复核为既有 spec 隔离复跑（不新增 spec，除非复核暴露真缺陷需回归锁）；`@reserved` 激活/撤销属契约 Decision，以 `pnpm check`（`check:audit-*` 门禁）验证；裁决表本身为 Proof 交付物。

## Execution Plan

### Phase 1 - P3 逐条裁决

Status: completed
Targets: `docs/audits/round2-p3-inventory.md`（D0 产物）、新建 `docs/audits/round2-p3-adjudication.md`、`docs/audits/per-component/*.md`（回写）

- Item Types: `Decision | Fix | Proof`

- [x] 确认 D0 输入就绪：`docs/audits/round2-p3-inventory.md` 存在且零悬挂（149 P3 + 审计 P3 + Follow-ups）。
- [x] 逐条裁决 149 P3 + 08-06/08-07 审计 P3 + **D1 登记入表的 P3 行**：四档处理——(a) 低成本（约 15 分钟内）当场修复（test-first，回写卡内状态 fixed + plan 引用）；(b) 卡内既有 `fixed`（已带 plan 引用，如 array-field P3-1、condition-builder P3-1）直接镜像为 fixed；(c) 记录留痕（keep，卡内既有裁决保持）；(d) 驳回 + 理由（dismissed）；（约 30 条需实质裁定优先处理）。
- [x] **D1 P3 交接收口（顺序纪律）**：D1（`2026-08-08-0715-2`）与 D2 并行开工，但本 Phase 的裁决在 D1 回扫登记完成后再执行（或在收口前补裁 D1 行）——零悬挂口径必须覆盖 D1 登记行，不得先宣布零悬挂再等 D1 行到达。
- [x] 裁决表结构：每条 = 卡/P3 编号、内容摘要、裁决（fixed/keep/dismissed + 理由）、证据（`文件:行` 或 plan 引用）；零悬挂声明（与库存表 149 + 新增 P3 逐条对齐）。
- [x] 当场修复验证：受影响包 `pnpm --filter <pkg> typecheck/build/lint/test` 绿；修复后卡内状态回写。

Exit Criteria:

- [x] `docs/audits/round2-p3-adjudication.md` 零悬挂（149 P3 + 审计 P3 + D1 登记 P3 逐条裁决，每条有裁决 + 理由；裁决表计数 = 库存 + D1 登记行，与逐条对齐而非与 D0 库存等值）；低成本修复条目带 focused 测试并验证绿。
- [x] 审计卡回写完成（fixed 条目标注 plan 引用）；裁决表与卡内状态一致。

### Phase 2 - @reserved 契约核对

Status: completed
Targets: `packages/flux-renderers-data/src/crud-schema.ts`、`packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts`、`packages/flux-renderers-scheduling/src/calendar/calendar.tsx`、对应 design.md

- Item Types: `Proof | Decision | Fix`

- [x] `rg "@reserved" packages/*/src` 全量登记（实测 7 处 / 3 文件）+ design.md 标注对照。
- [x] 逐处 live 消费核对：schema 字段消费、`component:*` 句柄注册、文档引用；零消费者 → 维持 `@reserved` 并回写状态；新消费者 → 裁决激活（移除标注 + 对齐 design.md）或撤销（契约废弃，design.md 同步）。
- [x] ghost contract 专项结论：核对结果（维持/激活/撤销逐处留痕）落裁决表或 daily log。

Exit Criteria:

- [x] 7 处 `@reserved` 全部有逐处裁决（维持/激活/撤销 + 证据 `文件:行`）；任何激活/撤销已同步 design.md；`pnpm check` 无新增命中。

### Phase 3 - 6 条 watch-only e2e 复核

Status: completed
Targets: `tests/e2e/component-lab/c3-5-host-surfaces.spec.ts`、`tests/e2e/w3d-editor.spec.ts`、`tests/e2e/gantt-perf.spec.ts`、`tests/e2e/kanban-perf.spec.ts`、`tests/e2e/ai-attachments.spec.ts`

- Item Types: `Proof | Decision`

- [x] Tiptap 批次（c3-5-host-surfaces :27/:81）与 w3d-editor（:28）隔离复跑（`npx playwright test <spec>:<line> --reporter=list`）：稳定失败 → 判真缺陷归 DR/D3.x；隔离绿 → 维持 watch-only 环境归因。
- [x] gantt-perf / kanban-perf：实测显示刷新率（本机 50.00Hz 则阈值不可达）→ 维持归因 + 标注"需 60Hz 环境最终确认"。
- [x] ai-attachments：多轮复跑确认 flake 不再现（不占 6 席，复核记录终态）。
- [x] 复核结论落裁决表或 daily log（每项：复跑结果 + 归因 + 路由）。

Exit Criteria:

- [x] 6 条 watch-only 每条有复核结论（真缺陷→DR 路由 / 维持 watch-only + 依据 / flake 确认不再现）；daily log 记录复跑计数。

### Phase 4 - Non-Blocking Follow-ups 归集收口

Status: completed
Targets: `docs/components/schema-gap-from-erp-integration-design.md`、`docs/plans/2026-08-07-2228-3-*.md`、`docs/plans/2026-08-08-0150-1-*.md`、`docs/logs/2026/08-08.md`

- Item Types: `Decision | Proof`

- [x] 2228-1 ERP 设计文档 watch-only（`polling.stopWhen`，依赖 SurfaceRuntime `$surface.hasOpenSurface`）复核：无新消费者证据 → 维持 watch-only 并记录复核结论。
- [x] 2228-3 工具治理条目终态核验：01-02/03-01/03-02/03-03/14-1/14-2/14-4/14-5+23-3 已由 0150-1/2/3 落定的逐条复核引用。
- [x] 0150-1 `find-event-dispatch-without-ctx.test.ts` stagedDirs 治理：路由裁定（工具治理轮次或 D1 承接），记录于归集表。
- [x] 归集收口声明：全部 Follow-up 条目落 collected/closed，无遗留悬挂。

Exit Criteria:

- [x] 归集表每条落最终状态（closed/维持 watch-only/路由明确）；daily log 记录归集收口结论。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，Round 1 task `ses_02177a078ffev7n4a7dxKWO2JT`；Round 2 task `ses_021729285ffevuHdU4uSZdtN41`）
- Verdict: `pass-with-minors`（Round 2；Round 1 为 `fail`，1 条 Major 已修正后重审通过）
- Rounds: 2
- Findings addressed: Major M1（D1 登记 P3 行无裁决路径/门禁）——Phase 1 增补"逐条裁决 … + D1 登记入表的 P3 行"四档处理 + "D1 P3 交接收口（顺序纪律）"执行项、Failure Paths 增 D1 晚到行、Closure Gate 1 零悬挂口径扩至含 D1 登记 P3；3 条 Minor（fixed 镜像档、裁决口径有意放宽注记、DR 行具名）全部修正。

## Closure Gates

- [x] `docs/audits/round2-p3-adjudication.md` 零悬挂（149 P3 + 审计 P3 + **D1 登记 P3** 逐条裁决，每条有状态 + 理由）
- [x] 低成本修复条目带 focused 测试并验证绿；审计卡状态回写一致
- [x] 7 处 `@reserved` 逐处裁决完成（维持/激活/撤销 + 证据）；激活/撤销已同步 design.md
- [x] 6 条 watch-only e2e 每条有复核结论（真缺陷路由 / 维持 watch-only / flake 终态）
- [x] Non-Blocking Follow-ups 归集收口（全部 collected/closed，无遗留悬挂）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（真缺陷显式路由 DR/D3.x，非静默延期）
- [x] 受影响的 owner docs 已同步（design.md 若 @reserved 变更、`docs/audits/` 索引、daily log）或明确写明 No owner-doc update required
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增命中）

## Deferred But Adjudicated

### 60Hz 环境最终确认（gantt-perf/kanban-perf）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本机主屏 50.00Hz 使 rAF 上限 50fps、阈值不可达（CV 基线已隔离重跑 + clean HEAD 对照复现一致）；需 60Hz 显示环境才能最终确认阈值可达性，非代码缺陷证据，不阻塞 supported baseline。
- Successor Required: `no`
- Successor Path: 环境变化（60Hz 显示）时复测即可，无需 plan

### Tiptap 批次（c3-5-host-surfaces ×2 / w3d-editor）——按复核结果路由

- Classification: `watch-only residual`（c3-5 ×2：隔离复跑 6/6 全绿，维持环境归因，根因纳入 DR editor 面）`out-of-scope improvement`（w3d-editor：**2026-08-08 Phase 3 复核判真缺陷**——隔离复跑 3/15 绿，click+type keystroke 丢失竞态，CV 后 editor 代码零变更，"隔离全绿"归因不再成立）
- Why Not Blocking Closure: w3d-editor 竞态属 editor 面非本轮 supported baseline 缺口，已显式路由 DR（editor 面跨面集中修复），非静默延期；c3-5 隔离全绿维持 watch-only。
- Successor Required: `yes`
- Successor Path: `docs/backlog/component-audit-round2-roadmap.md` DR 行（跨面集中修复，editor/Tiptap 面）

## Non-Blocking Follow-ups

- 0150-1 stagedDirs 工具治理条目：路由裁定后入工具治理轮次（不阻塞本 plan 收口）。
- 裁决表中 keep 状态条目：维持既有审计卡裁决（非本 plan 新增债务），无 successor。

## Closure

Status Note: 2026-08-08 执行完毕。4 Phase 全 completed。交付物：① `docs/audits/round2-p3-adjudication.md` 零悬挂（149 P3 = fixed 26 / keep 99 / dismissed 24 + 审计 P3 5 条 fixed + D1 登记 0 条；live `rg -c -- "[P3-"` 复核一致）——6 条低成本当场修复（wizard/kanban/gantt/diff-view/form/input-time）带 focused 测试（layout 110 / content 292 / scheduling 918 / form 772 包级全绿），卡内状态回写 6 卡；② @reserved 7 处/3 文件逐处裁决（1 激活-注释更正 crud-schema.ts + 6 维持），ghost contract 专项结论在案；③ 6 条 watch-only e2e 复核——c3-5 ×2 隔离 6/6 绿（维持 watch-only）、**w3d-editor:28 判真缺陷（隔离 3/15 绿）显式路由 DR（editor 面）**、gantt/kanban-perf 主屏 50.00Hz 实测维持 watch-only（需 60Hz 最终确认）、ai-attachments 8/8 flake 终态 closed；④ Follow-ups 归集收口（2228-1 watch-only 维持 / 2228-3 8 条 collected / 0150-1 stagedDirs 路由工具治理轮次）无悬挂；全量验证 typecheck/build/lint 32/32、test 59/59、`pnpm check` exit 0（零新增命中）；roadmap D2 行 `todo`→`done`（附执行证据引用）；daily log `docs/logs/2026/08-08.md` D2 节收口。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，task `ses_021350e58ffeWBQS8iYCFqyu5P`）
- Evidence: live repo 复核通过——4 Phase `Status: completed` + 全部 item/exit criteria `[x]`；裁决表 §1.1/1.2/1.3 行数 26/99/24 = 149 与汇总一致、随机 8 行与卡内原文比对一致；6 处代码修复逐处 live 核对（wizard-renderer.tsx:609 `className="mt-4"`、kanban-board.tsx:6-8 command-based 注释、gantt.tsx:162-166 `store.destroy()` + gantt-store.test.ts:453 destroy 用例、diff-three-column-view.tsx:83-90 clearTimeout cleanup + 假时钟用例、form-lifecycle-helpers.ts:92-96 message 参数 + form-load-action.ts:76 + form-loadaction.test.tsx:333-335 断言、input-time design.md:22 §4 说明在案）；6 卡回写带 plan-2026-08-08-0715-3 引用；`rg "@reserved"` 7 处 + §5 七行裁决；§6 watch-only 六行结论 + plan Deferred 节终态路由一致；§7 Follow-ups 全终态；无静默降级（w3d-editor 真缺陷显式路由 DR）；4 包 typecheck + focused 测试全绿；聚合 `pnpm check` exit 0（oversized 2 条既有 locale 豁免）；首轮 verdict `issues`（daily log 缺失 + 表头计数 Minor）→ 修正后复审 verdict `approved`。

Follow-up:

- 裁决表中 keep/dismissed 条目：维持既有审计卡裁决（非本 plan 新增债务），无 successor。
- 0150-1 stagedDirs 工具治理条目：已路由工具治理轮次（DR/后续工具治理 plan 承接）。
- w3d-editor:28 Tiptap click+type keystroke 丢失竞态：已显式路由 DR（editor/Tiptap 面跨面集中修复）。
- gantt-perf/kanban-perf 60Hz 环境最终确认：环境变化（60Hz 显示）时复测即可，无需 plan。
