# 543 interaction-state IS-0 审查基建——枚举器/台账/对账命令/V1–V6 探针模板/e2e 序列模板

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/interaction-state-quality-roadmap.md`（IS-0 工作项）；`docs/skills/interaction-state-audit-prompt.md`（§4–§7 定义本基建要支撑的审查流程）；`docs/audits/visual-quality-r2/`（R2-0 枚举/台账先例）
> Related: `docs/plans/538-shell-collapse-wiring-plan.md`（同轨道已收口工作项 IS-1b）

## Purpose

为交互状态质量轨道（IS-0–IS-9）建立审查基建：页面清单程序化枚举器、findings 台账与对账命令、V1–V6 读数探针模板库、交互序列 e2e 模板。后续 IS-1–IS-8c 各批审查与 IS-9 复检全部复用本基建。本计划零产品代码修改。

## Current Baseline

- **R2-0 先例可照搬**：`pnpm visual:inventory` = `vitest run --config scripts/visual-quality/vitest.inventory.config.ts`，生成器 `scripts/visual-quality/generate-visual-inventory.test.ts` 以 vitest 测试形态导入 live 路由模型（`apps/playground/src/route-model.ts` 的 `ALL_SHARED_RENDERER_ROUTES`/`DOMAIN_RENDERER_ROUTES`、`apps/playground/src/complex-pages/complex-pages-model.ts` 的 `COMPLEX_PAGE_ENTRIES`）写 `inventory/{pages,controls}.json`，并以 `ledger-lib.mjs`（parse/serialize，注释式 section 标记 `<!-- ledger:pages -->`）合并台账、保留既有状态、消失条目标 `orphan`；对账命令 `pnpm visual:reconcile`（`reconcile-coverage.mjs`）。
- **live 枚举源计数（2026-10-07 实测；复杂页计数经独立 draft review 复核修正）**：`DOMAIN_RENDERER_ROUTES` 80 条 domain 路由；`COMPLEX_PAGE_ENTRIES` **40** 条复合页（注意：对整文件 `grep -c "id:"` 得 47 是表面计数——含 category meta 键与接口字段声明，禁止用作条目数）；`ALL_SHARED_RENDERER_ROUTES` 134 条 lab 路由，按 sourcePackage 分布：basic 18 / form 31 / form-advanced 19 / data 14 / layout 9 / content 20 / mobile 5 / ai 14 / scheduling 4。
  - roadmap 前提漂移（执行时须就地勘误，见 Phase 3，共八处）：
  - roadmap Reuse 表写 "75 domain 页"——live 为 80；"~133 lab 路由"——live 为 134；"47 复合页"——live `COMPLEX_PAGE_ENTRIES` 为 40（47 为文件内 `id:` 出现次数的表面计数）。
  - roadmap Reuse 表把 lab 枚举源写作 `renderer-lab-registry.ts`——该文件实为 React 组件注册表（0 个路由 id），lab 路由清单在 `route-model.ts` 的 `ALL_SHARED_RENDERER_ROUTES`。
  - roadmap IS-4 写 "report×3"——live report 域路由仅 2 条（`report-designer`、`report-designer-host`）。
  - roadmap IS-3 写 `#/complex-pages/cal-replica`——live 无此 id，calendar 复刻面为 `cal-booking`/`cal-confirm`/`cal-success` 三条复合页。
  - roadmap IS-4 写 "dashboard-editor"——live 无独立 dashboard-editor 域路由；该编辑器面内嵌于 `#/dashboard-demo`（`apps/playground/src/pages/dashboard-demo.tsx` schema 含 `type: 'dashboard-editor'`），随 IS-5 审查。
  - roadmap IS-8c 写 "scheduling / graph / map / pivot / dashboard / 3d / industrial"——live shared lab 路由中该组仅 scheduling 有 4 条；graph/map/pivot/dashboard/3d/industrial 无 lab 路由（其面为 domain 页，归 IS-4/IS-5）。
- **批次归属规则（本计划裁定，写进枚举器 batch 规则）**：
  - IS-1：`flow-designer`、`dingtalk-flow-demo`（flow-designer 域；`taskflow-designer` 按 roadmap Phases 表归 IS-4，IS-1 仅对 tree 模式做种子修复的回归抽查）。
  - IS-2：`gantt`、`gantt-states`、`gantt-perf-scale`。
  - IS-3：`scheduling-calendar`、`calendar-perf-scale` + 复合页 `cal-booking`/`cal-confirm`/`cal-success`（裁定：原 "cal-replica" 三页实体）。
  - IS-4：`taskflow-designer`、`report-designer`、`report-designer-host`、`page-designer`、`print-designer`、`spreadsheet`、`word-editor`、`scada-editor-demo`、`debugger-lab`。
  - IS-5：`dashboard-demo`、`pivot-table-demo`、`map-demo`、`graph-demo`、`three-canvas-demo`、`three-industrial-demo`、`scada-demo`、`scada-pressure-demo`、`scada-edge-cases`、`scada-perf-scale`、`performance-table`、`table-popover`、`table-column-width`、`data-verify`、`leafer-examples`。
  - IS-6：其余全部 domain 路由 + 3 条 index 路由（`#/`、`#/lab`、`#/complex-pages`）。
  - IS-7a/7b：其余 37 条复合页按模型声明序对半分（偶数索引前半 → 7a）。
  - IS-8a/8b/8c：lab 路由按 sourcePackage——8a = basic/form/form-advanced/data（82 条）；8b = content/layout/mobile/ai（48 条）；8c = scheduling（4 条）。
- **探针基建现状**：`tests/e2e/helpers/` 有 canvas-pixel-probe/visual-assert 等静态断言工具，无交互状态读数探针；e2e 家族无"交互前后读数对账"先例模板。
- **台账落点不存在**：`docs/audits/interaction-state/` 尚未创建。
- **种子缺陷 1–6 未登记**（roadmap §Current Baseline；种子 7 已随 plan 538 修复收口）：将预登记进台账为 `pending` findings，证据（红 e2e）在各修复批开局补。
- **测试组织先例**：`visual:inventory` 不入 turbo `pnpm test` 的 78 任务（独立 vitest config + 独立 script）；本基建沿同一组织方式。`tests/e2e/helpers/*.ts` 为普通模块，由 spec 引用，不入独立任务。

## Goals

- `pnpm interaction:inventory` 一条命令再生成 `docs/audits/interaction-state/inventory/pages.json` + 台账 page 行（保留状态、新增 pending、消失标 orphan），清单全部来自 live 路由模型，零手抄。
- `docs/audits/interaction-state/ledger.md` 双 section 台账：pages（`pending → audited`，orphan 终态）+ findings（`pending → found → fixed → verified`，逐条 `IS-<page>-<seq>`），种子 1–6 预登记。
- `pnpm interaction:reconcile` 结构对账 + uncovered 计数报告；`--strict` 模式 uncovered>0 或结构违例即 exit 1（IS-9 关闭前置的机器判定）。
- `tests/e2e/helpers/interaction-state-probes.ts` V1–V6 读数探针模板库（读数采集、前后 diff、V4 几何锚定测量、V6 实体样式读数），断言读数非截图。
- `tests/e2e/interaction-state-probe-template.spec.ts` 交互序列 e2e 模板 spec：演示"采集 → 交互 → 再采集 → diff 定罪"模式并证明探针读的是 live 值。

## Non-Goals

- 任何产品代码/renderer/demo 修复（种子 1–6 的修复归 IS-1/IS-2/IS-3）。
- 任何批次的实际序列审查与 findings 立案（IS-1 起）。
- 对账门禁接入 `pnpm check` 链（IS-9 门禁扩展评估裁决）。
- `expectScrollPreserved` 等逐不变量断言式 helper 的沉淀（IS-9；本计划交付读数采集与 diff 原语层）。
- per-page 可交互面的静态全量枚举（无法静态可知；prompt §4-1 规定审查时 page.evaluate 现场枚举，本基建只交付页面维度清单 + 规则派生的交互形态 profile，提示每页该跑 §6 哪些序列族）。

## Scope

### In Scope

- `scripts/interaction-state/`：`generate-interaction-inventory.test.ts`（枚举器）、`interaction-ledger-lib.mjs`（台账解析/序列化）、`reconcile-coverage.mjs`（对账）、`vitest.inventory.config.ts`。
- `package.json`：新增 `interaction:inventory`、`interaction:reconcile` 两个 script。
- `docs/audits/interaction-state/`：`README.md`（再生命令、状态机、对账约定）、`ledger.md`、`inventory/pages.json`。
- `tests/e2e/helpers/interaction-state-probes.ts` + `tests/e2e/interaction-state-probe-template.spec.ts`。
- `docs/backlog/interaction-state-quality-roadmap.md`：IS-0 状态回写 + Reuse/批次前提就地勘误。

### Out Of Scope

- `docs/audits/interaction-state/<批次>/` 证据目录（各批自建）。
- findings 的 `found` 及之后状态推进（各修复批驱动）。
- Playwright 配置改动（模板 spec 沿用既有 webServer/bootstrap 口径）。

## Failure Paths

不适用：纯审查基建，无错误处理/API 契约/鉴权/外部集成路径。（对账命令对结构违例的失败行为在 Phase 1 exit criteria 写实。）

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（本计划交付物本身就是自动化基建）。Proof 先行/同批：枚举器即测试（vitest 形态，断言计数与批次规则）；台账幂等再生成有断言；探针模板库由 e2e 模板 spec 实跑证明读取 live 值；对账命令的 strict/非 strict 行为有脚本级验证。

## Execution Plan

### Phase 1 - 枚举器、台账与对账命令

Status: completed
Targets: `scripts/interaction-state/`、`package.json`、`docs/audits/interaction-state/`

- Item Types: `Fix | Proof`

- [x] Fix：`scripts/interaction-state/generate-interaction-inventory.test.ts`——vitest 测试形态枚举器，导入 live `route-model.ts` / `complex-pages-model.ts`（相对路径，零手抄 id，计数断言读 live 数组长度而非硬编码期望值），按 Current Baseline 批次规则输出三族页面（family: domain/complex/lab + index），每条含 id/hash/title/family/batch/interactionProfile。interactionProfile 规则派生：IS-1/IS-4 页 = canvas+drag+selection+dialog+feedback；WorkbenchShell 侧板宿主另加 shell-host（实扫为准：`grep -rl WorkbenchShell packages/*/src` 消费方映射到页面——已证实宿主 flow-designer-renderers `designer-page-body.tsx`→flow-designer 族、spreadsheet-renderers `page-renderer.tsx`→spreadsheet、report-designer-renderers `page-renderer.tsx`→report-designer/report-designer-host、word-editor-renderers `word-editor-page.tsx`→word-editor、flux-renderers-industrial editor→scada-editor-demo、flux-renderers-dashboard editor→dashboard-demo）；IS-2 页 = scroll+drag+feedback+dialog；IS-3 页 = scroll+drag+selection+feedback+dialog；IS-5 页 = scroll+feedback+dialog+selection；其余（IS-6/7/8 面）= dynamic（审查时按 prompt §4-1 现场枚举）。
- [x] Fix：`scripts/interaction-state/interaction-ledger-lib.mjs`——台账 parse/serialize（pages + findings 两 section，注释式标记），pages 状态词表 `pending|audited|orphan`，findings 状态词表 `pending|found|fixed|verified`；再生成合并语义：保留既有状态、新增条目 pending、消失条目 orphan（pages）；findings section 为人工维护区，再生成不触碰。
- [x] Fix：`scripts/interaction-state/reconcile-coverage.mjs`——结构对账（每个 inventory 页面有 page 行、finding 行的 page 存在于 inventory、状态词表合法、orphan 不计 uncovered）+ 报告（总页面/audited/pending（=uncovered）/findings 各状态计数）；`--strict` 时 uncovered>0 或结构违例 exit 1。
- [x] Fix：`package.json` scripts 增 `interaction:inventory` / `interaction:reconcile`；`scripts/interaction-state/vitest.inventory.config.ts` 独立 config（node 环境——本枚举器只导入纯数据路由模型，与 R2-0 config 不同：R2-0 因导入 renderer definition 包而需 happy-dom + leafer stub；若本枚举器实测出现传递 DOM 依赖再改 happy-dom）。
- [x] Proof：首跑 `pnpm interaction:inventory` 生成 inventory + ledger（pages 行数 = domain 80 + complex 40 + lab 134 + index 3 = **257**，枚举器内以 `COMPLEX_PAGE_ENTRIES.length` 等 live 长度断言，不用硬编码期望值）；台账预登记种子 findings 六条（`IS-flow-designer-001` 种子1/B/P1、`IS-flow-designer-002` 种子2/A/P1、`IS-flow-designer-003` 种子3/D/P1、`IS-gantt-001` 种子6/A/P1、`IS-scheduling-calendar-001` 种子4/C/P1、`IS-scheduling-calendar-002` 种子5/E/P2，均 pending，note 注明"预登记自 roadmap §Current Baseline，红 e2e 证据随修复批开局补"）。
- [x] Proof：幂等再生成断言（测试内：二次生成 statuses 不变、无重复行）；`pnpm interaction:reconcile` 报告 uncovered=257-audited(0)=257 且 exit 0（非 strict），`--strict` exit 1；人为制造结构违例（删一行 page 行）时 strict 模式能红（验证后还原）。
- [x] Fix：`docs/audits/interaction-state/README.md`——再生命令、状态机语义、对账约定、批次证据目录约定（prompt §7）。

Exit Criteria:

- [x] `pnpm interaction:inventory` exit 0，`docs/audits/interaction-state/inventory/pages.json` + `ledger.md` 落盘，页面清单与 live 路由模型一致（含批次与 profile 字段），二次运行幂等。
- [x] `pnpm interaction:reconcile` exit 0 并报告 uncovered=257（首-generation 全 pending）；`--strict` 在 uncovered>0 或结构违例时 exit 1（有实跑证据）。
- [x] 种子 1–6 六条 findings 行存在于 ledger.md，状态/类别/级别与 Current Baseline 裁定一致。
- [x] 新增测试随 `vitest.inventory.config.ts` 独立可跑绿（`pnpm interaction:inventory` 即其运行形态），不破坏既有 78 turbo 任务。

### Phase 2 - V1–V6 探针模板与 e2e 序列模板

Status: completed
Targets: `tests/e2e/helpers/interaction-state-probes.ts`、`tests/e2e/interaction-state-probe-template.spec.ts`

- Item Types: `Fix | Proof`

- [x] Fix：探针模板库 `interaction-state-probes.ts`——①`captureInteractionReadings(page, opts)`：滚动容器族（通用 overflow 可滚扫描发现 + `extraScrollSelectors` 追加，按 prompt §4-1 现场枚举口径）scrollLeft/scrollTop、画布 viewport transform、首节点 boundingRect、节点/事件计数、toast 文本集、url；②`diffReadings(before, after)`：字段级 diff（数组按集语义）；③`measureControlAnchor(page, controlSelector, anchorSelector)`：V4 控件/锚双 boundingRect 与中心偏差；④`readEntityStyles(page, selector, states)`：V6 常态/hover/选中 computedStyle 读数。每函数 JSDoc 标注对应不变量与 prompt §5 口径。
- [x] Proof：`interaction-state-probe-template.spec.ts` 五场景（较原稿四场景增 V4 几何探针场景）：①V1 liveness（`#/gantt` 滚动容器滚到非零 → 轮询至滚动同步稳定值 → 读数非零 → 等待后复采不变，证明读 live 值且基线稳定；执行发现 gantt scroll-sync 异步改写 scrollLeft——写入值与落定值不同——场景按"轮询至稳定再采集"实现，该行为本身已作为种子 6 候选链路证据登记）；②V2 模式（`#/flow-designer` 视口 transform 读数 → 无视口意图交互（点击空白）→ diff 为空）；③V4 模式（measureControlAnchor 对 `.react-flow__node` vs `.react-flow__pane` 返回真实几何 + 中心偏差 + 无裁剪）；④V6 模式（`#/flow-designer` 节点 computedStyle 读数非空且含 border 宽度字段）；⑤diff 工具（构造两次采集 diff 为空 + 人为变更字段 diff 非空）。全部断言读数，零截图定罪。
- [x] Fix：模板 spec 头注释写明复用方式（后续批次照此模式写序列 spec：采集 → 驱动 → 采集 → diff → 断言违反的不变量）。

Exit Criteria:

- [x] 模板 spec 五场景 focused 运行全绿（`npx playwright test tests/e2e/interaction-state-probe-template.spec.ts`），断言全部基于读数。
- [x] 探针函数有类型签名且被模板 spec 全部真实调用（无死导出——knip 不新增红）。
- [x] 既有 e2e helpers 消费方零回归（模板 spec 是唯一新引用方）。

### Phase 3 - roadmap 回写、前提勘误与收口

Status: completed
Targets: `docs/backlog/interaction-state-quality-roadmap.md`

- Item Types: `Proof | Decision`

- [x] Decision：roadmap 前提就地勘误（历史文本不改写、原文处附注，共八处）：Reuse 表 "75 domain 页"→附注 live 80；"~133 lab 路由"→附注 live 134；"47 复合页"→附注 live 40（47 为文件内 `id:` 出现次数表面计数）；Reuse 表 lab 枚举源 `renderer-lab-registry.ts`→附注实为组件注册表、路由清单在 `route-model.ts` `ALL_SHARED_RENDERER_ROUTES`；IS-4 "report×3"→附注 live 2 条 report 域路由；IS-3 "cal-replica"→附注实际为 cal-booking/cal-confirm/cal-success；IS-4 "dashboard-editor"→附注面内嵌于 dashboard-demo（归 IS-5 审查）；IS-8c 范围→附注 live 仅 scheduling 有 lab 路由。
- [x] Proof：draft review 通过、本 plan 转 `active` 时，roadmap IS-0 状态回写 `todo` → `planned`（Phase Status 与 Phases 表同步，Plan 列填本 plan 路径）。
- [x] Proof：closure audit 通过后 roadmap IS-0 状态回写 `planned` → `done`（双表同步）。

Exit Criteria:

- [x] roadmap 勘误八处逐条落字且与 live repo 一致（勘误只加注不改史）。
- [x] roadmap IS-0 双表状态回写完成（转 active 时 `planned`、closure audit 通过后 `done` 均已落）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_03215ed4-8f7c-4759-a5a9-d9e43c3bc2d7）
- Verdict: `pass-with-minors`（R1 `fail` 1 Major + 4 Minor → 全部修订 → R2 复核又揪出 1 处计数残留（Phase 1 Proof 项 uncovered=264）→ 修正后 R3 定点确认通过）
- Rounds: 3（R1 fail；R1 修订点：复合页计数链 47→40/44→37/264→257 + 补 roadmap 第七/八处勘误 + shell-host 宿主清单按 WorkbenchShell 实扫补全（加 flow-designer 族/spreadsheet）+ 转 active 时 `todo`→`planned` 回写项 + config 先例描述对齐事实；R2 fail 1 Major——L93 Proof 项 uncovered=264 残留未随计数链改净 → 一行修正 → R3 定点确认该行与全文件计数链一致，零 Blocker/零 Major）
- Findings addressed: Major 2 条（同根）——①复合页条目数声称 "实测 47" 与 live 不符（`COMPLEX_PAGE_ENTRIES` 实为 40，47 为文件内 `id:` 出现次数表面计数），污染 4 处派生数字且漏列 roadmap Reuse 表同源漂移；②R1 修订漏改 Phase 1 Proof 项一处 uncovered=264。修法：计数链全改净 + 勘误清单补第七/八处 + 枚举器计数断言改读 live 数组长度。Minor 4 条随共识修复。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（本计划无产品缺陷修复面——基建交付型计划，此条为 N/A 说明而非跳过）
- [x] 所有 in-scope confirmed contract drifts 已收敛（roadmap 前提漂移八处已就地勘误）
- [x] 行为/契约结果已达成（枚举器/台账/对账/探针/模板五件套可运行、可复用）
- [x] 必要 focused verification 已完成（枚举器 6/6 绿 + 幂等断言 + reconcile strict/结构违例行为 + 模板 e2e 五场景绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap 八处勘误与 IS-0 双表回写；`docs/index.md` audits 目录列举补登记 interaction-state 台账落点）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78/78 任务）
- [x] `pnpm check`（exit 0；执行中 scanner-baselines +4 suspects 与 knip 未使用导出两类新红当场消解）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- 对账命令接入 `pnpm check` 链的时机与形态（IS-9 门禁扩展评估统一裁决）。
- 逐不变量断言式 helper（expectScrollPreserved 等）沉淀（IS-9 交付面）。

## Closure

Status Note: 2026-10-07 收口。三 Phase 全 completed：交互状态审查基建五件套落地——①程序化枚举器（live 路由模型零手抄，257 页三族清单 + 批次/交互形态 profile，WorkbenchShell 宿主 live-scan guard）；②双 section 台账（pages pending→audited/orphan + findings pending→found→fixed→verified，种子 1–6 预登记）；③对账命令（结构违例与 uncovered 报告，--strict 供 IS-9 门禁）；④V1–V6 读数探针模板库；⑤交互序列 e2e 模板 spec（五场景全读数断言）。roadmap 八处前提漂移就地勘误 + IS-0 双表回写 done。全量验证 full-green（typecheck/build/lint 42/42、test 78/78 任务、check exit 0、inventory 6/6、reconcile/strict/违例注入行为实证、模板 e2e 5/5×2 复跑稳定）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general-purpose fresh session，agent_19814dc2-b545-4058-9a09-309cea7b2b17）
- Evidence: APPROVED 零 Blocker/零 Major，2 Minor（Closure Gates "四场景"残留已改"五场景"；dev log 缺条目已随收口 commit 补）+ 3 Trivial（批次对半括注措辞、新增 TS 不在 tsc project 图内沿 R2-0 既有组织模式、docs/index.md 列举补登记）均随收口处理/记录。审计员独立实跑核验：inventory 6/6、计数链独立探针复算（80/40/134/3=257）、幂等 MD5 一致、reconcile 三态行为（exit 0/strict exit 1/结构违例 exit 1+还原）、模板 e2e 5/5 零截图定罪、八处勘误原文处落字、五门禁 42/42/42/78/exit 0 复现。

Follow-up:

- 见 Non-Blocking Follow-ups。
