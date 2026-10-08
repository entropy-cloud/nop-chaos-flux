# 549 interaction-state IS-6 表单/AI/移动端与其余 domain 页序列审查批——52 页审查 + P0/P1 修复

> Plan Status: completed（2026-10-08 closure audit APPROVED；full-green verification）
> Last Reviewed: 2026-10-08
> Source: `docs/backlog/interaction-state-quality-roadmap.md`（IS-6）；`docs/skills/interaction-state-audit-prompt.md`（§4 五步法 / §6 六类缺陷 / §9 诚实条款）；`docs/audits/interaction-state/ledger.md`（IS-6 页面清单以 IS-0 枚举器输出为准，不手抄）
> Related: `docs/plans/547-interaction-state-is4-designers-plan.md` / `docs/plans/548-interaction-state-is5-data-viz-tables-plan.md`（双审查组取证模式、判别修正与 stash 红对照纪律沿袭）

## Purpose

对 IS-6 批 52 页（表单/输入/编辑器、AI 族、移动端/看板/工作台波次与索引页）执行 prompt §4 全序列交互审查（V1–V6 读数取证），findings 全量入台账；P0/P1 随批先红后绿修复，P2/P3 逐条三态裁决，零静默。

## Current Baseline

批次页面清单（`pnpm interaction:inventory` 枚举器输出，ledger IS-6 全部 pending，profile 均 dynamic）：

1. **表单/输入/编辑器族（16 页，审查组 A）**：`condition-builder`、`condition-builder-formula`、`code-editor`、`input-suggest`、`form-input-enhancements`、`boolean-control-value-contract`、`text-icon-visual-fields`、`diff-view`、`tree-display-ux`、`component-handles`、`event-prevention`、`w2b-date-family`、`w3c-value-mapping`、`w3d-advanced-input-family`、`w4c-composite-form-family`、`layout-family-enhancements`。
2. **AI 族（14 页，审查组 B）**：`ai-chat`、`ai-conversations`、`ai-tools`、`ai-attachments`、`ai-component-handle`、`ai-virtual-scroll`、`ai-persistence`、`ai-citations`、`ai-hitl`、`ai-p4`、`ai-linkage`、`ai-rich-text`、`ai-widgets`、`ai-coverage`。
3. **移动端/看板/工作台波次/索引族（22 页，审查组 C）**：`mobile-infrastructure`、`mobile-components`、`m1-responsive`、`m2-touch`、`m3-layout`、`m4-data`、`m5-showcase`、`kanban`、`kanban-perf-scale`、`diff-perf-scale`、`w1a-content`、`w1b-content`、`w2a-data-composition`、`w3a-w3b-layout-action-family`、`w4a-multimedia`、`w4b-process-display`、`barcode-input`、`env-stream`、`flux-basic`、`home`、`lab-index`、`complex-pages-index`。

预注册种子：无（ledger 无 IS-6 域 pending 种子）。跨批已知候选反模式（审查时按对应 V 读数协议主动探测，不预设结论）：①raw 事件通道 `${event.*}` 模板求值依赖 renderer 传递的 bindings 形态（IS-5 两处 P1 同根，scada-editor-demo 注释记载的框架语义）；②公式引擎不支持对象展开（demo 内联行变换须宿主 namespaced actions 承接）；③受控 width/selection 无 change 通道的假供纳（538/548 姊妹面）；④perf-scale 页测量防污染豁免先例（IS-3/IS-5-B 口径）。m1–m5 移动端页允许移动视口仿真（375×667）驱动。

## Goals

- 52 页 §4 五步审查全覆盖（三审查组独立 fresh session 真实驱动浏览器取证），findings 全量入 ledger，零静默。
- P0/P1（若有）随批先红后绿修复（红 e2e 先行取证 + stash 对照）；P2/P3 逐条三态裁决（watch-only / successor-required / moved-to-successor）。
- 批次页面行 flip audited；roadmap IS-6 双表回写；is6 证据卡落盘。

## Non-Goals

- P2/P3 行为修复（除实现成本极小者随批顺手，逐条留痕）。
- `kanban-perf-scale` / `diff-perf-scale` 性能基准面改造（测量污染豁免沿先例，若适用则登记）。
- 索引/导航及基础演示页（home/lab-index/complex-pages-index/flux-basic）的路由面重构——只审其交互状态（导航反馈、动态面），不动信息架构。

## Scope

### In Scope

- 52 页 live 序列审查取证（三审查组）；`docs/audits/interaction-state/is6-form-ai-mobile/` 证据卡 + ledger 登记（findings 行 + 页行 audited）。
- P0/P1 修复涉及面（以 live 取证定位为准；候选落点 `packages/flux-renderers-form*`、`flux-renderers-ai`、`flux-renderers-mobile`、`flux-renderers-scheduling`（kanban/barcode-input）、`flux-renderers-content/layout/data` 或 playground demo bridge——归属裁定按 prompt §4 步骤 5）。
- 红→绿 e2e：`tests/e2e/form-ai-mobile-interaction-state.spec.ts`（新，P0/P1 各一用例；读数断言，截图仅佐证）。
- roadmap IS-6 回写 + dev log。

### Out Of Scope

- IS-7a/7b complex-pages 批、IS-8a–c renderer lab 批的页面（含 scheduling lab 路由）。
- `dingtalk-flow-demo`（ledger 归属 IS-1 批的遗留 pending 页，IS-1/plan 544 未审查）——归属勘误随 ledger/IS-9 裁定，不在本批。
- 渲染器视觉风格/主题面（非交互状态缺陷）。
- IS-9 的守护固化（共享 helper 沉淀与门禁扩展）。

## Failure Paths

不适用：渲染器交互与宿主接线审查/修复，无错误处理/API 契约/鉴权/外部集成路径（沿 545–548 批口径）。

## Test Strategy

**Must automate**：P0/P1 修复必须先固化红 e2e（读数断言定位缺陷；stash 对照取证），修复后转绿；Proof items 先于 Fix items。P2/P3 裁决不强制自动化，但登记必须含 live 读数证据。

## Execution Plan

### Phase 1 - 三审查组 52 页红取证（先红）

Status: completed
Targets: 52 页 live 面 + `docs/audits/interaction-state/is6-form-ai-mobile/findings.md`（新建）

- Item Types: `Proof`

- [x] Proof：审查组 A（16 页）——9 findings（P1×4/P2×4/P3×1）+ watch 9 + n/a 1；每页 5–12 条清洁序列。
- [x] Proof：审查组 B（14 页）——5 findings（P1×1/P2×1/P3×3）+ watch 9 + n/a 3；反模式候选核销（`${event.*}` 模板在该族全面求值成功）；3 处初判复探推翻的诚实改判。
- [x] Proof：审查组 C（22 页）——12 findings（P1×2/P2×2/P3×8）+ watch 11 + 豁免 2 + 3 处探针伪影撤案（kanban-perf 滚动复位/w3a dropdown/flux-basic 添加项——受控重测留痕）；m1–m5 以 375×667 hasTouch 仿真驱动。
- [x] Proof：合并 26 findings（P1×7/P2×7/P3×12）+ watch 29 主题项 + n/a/豁免登记 → 证据卡 is6-form-ai-mobile/findings.md + survey-readings-a/b/c.json；ledger 全量登记（reconcile OK：audited 85 / findings 81）。

Exit Criteria:

- [x] 52 页全覆盖零遗漏（inventory 清单对照）；每条 P1 finding 附可复现序列 + 程序化读数。
- [x] 证据卡落盘；ledger findings 行全量登记（P2/P3 全部三态 disposition），零静默。

### Phase 2 - P0/P1 修复（逐项转绿）

Status: completed
Targets: 以 Phase 1 取证定位为准（候选见 In Scope）

- Item Types: `Fix | Proof`

- [x] Fix：IS-w2b-date-family-001——**根因十探针定位（审查组候选链证伪）**：ui Calendar components 对象内联身份churn → focused-day 重渲染整棵日树 mid-click 重挂载；修复 packages/ui calendar.tsx components useMemo 身份稳定。
- [x] Fix：IS-diff-view-001——demo remount key（calendar-demo rendererRevision 先例；SchemaRenderer schema-prop 语义为已登记框架 watch）。
- [x] Fix：IS-component-handles-001——checkbox-group handle methods [focus,clear] + clearValue。
- [x] Fix：IS-component-handles-002——flux-runtime form.reset() 无参还原 creation-time initialValues；新增 2 个回归单测；1 个既有契约测试按修正语义更新（其原断言 codified 了缺陷行为——如实记录）。
- [x] Fix：IS-ai-conversations-001——bug-163 demo 缓解（去 xui:imports、connector 经 page data；ai-coverage 先例）；运行时根治仍为 docs/bugs/163 successor。
- [x] Fix：IS-mobile-components-001——demo host 移除卸载 clearTimeout（pending 定时器即 in-flight 假请求，StrictMode 模拟重挂载须存活）。
- [x] Fix：IS-m5-showcase-001——demo schema 按钮 ajax onSuccess → messages.success（当前消费面）；按钮 ajax onSuccess 契约漂移登记框架 watch。
- [x] Proof：ledger 七行 P1 → verified（fixed-in-batch）；无 P0/P1 静默降级。

执行实况注记：date 根因定位链（合成 click 可提交/焦点单独即可复现重挂载/blur 不触发/表格重挂载与 popover 分离）推翻了审查组"RDP v9 onSelect 未触发/PopoverContent onBlur 重挂载"双候选——诚实登记于证据卡。

Exit Criteria:

- [x] `form-ai-mobile-interaction-state.spec.ts` 全绿（7/7 passed 16.3s；stash 对照 pre-fix 树 7/7 failed）。
- [x] 受影响包单测零回归：ui 243/243、flux-runtime 1492/1492（含新增 2）、flux-renderers-form 1093/1093（1 契约测试按修正语义更新）、flux-renderers-mobile 189/189。
- [x] 无 P0/P1 被静默降级（七项全部 verified；ai-conversations 运行时层显式 successor = bug-163）。

### Phase 3 - P2/P3 裁决登记与台账收口

Status: completed
Targets: ledger + is6 证据卡 + roadmap

- Item Types: `Decision | Proof`

- [x] Decision：P2×7/P3×12 逐条三态裁决入 ledger（全部 watch-only，零静默）；n/a 豁免按组登记（w3c 交互面 n/a、AI 语音 headless n/a、kanban-perf/diff-perf 测量防污染豁免等）+ 3 处探针伪影撤案留痕。
- [x] Proof：52 页行 flip audited（reconcile OK：audited 85 / findings 81 = found 57 + verified 24）；roadmap IS-6 双表回写（done 于 closure audit 后）。

Exit Criteria:

- [x] ledger 全量登记 + 页行翻转完成；reconcile OK。
- [x] roadmap IS-6 双表回写完成。

## Draft Review Record

- Reviewer / Agent: agent_03e4716d（fresh session 独立子 agent，2026-10-08）
- Verdict: `pass`（零 Blocker / 零 Major；2 Minor + 2 Trivial 随 activation 全部落盘：In Scope 补 scheduling 包候选、Out of Scope 补 dingtalk-flow-demo 遗留 pending 页注记、flux-basic 措辞、新 spec 显式命名）
- Rounds: 1
- Findings addressed: 4/4（2M 落盘；2T 落盘）

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（P1×7 全部 verified fixed-in-batch——stash 对照 7/7 红 → 修复树 7/7 绿；ai-conversations 运行时层显式 successor = docs/bugs/163）
- [x] 所有 in-scope confirmed contract drifts 已收敛（F 类三处 P1 即本批修复面；按钮 ajax onSuccess 契约漂移显式框架 watch；裁决全落 ledger，零静默）
- [x] 行为/契约结果已达成（52 页审查面覆盖零遗漏；26 findings + watch/n-a/豁免 + 3 撤案全登记）
- [x] 必要 focused verification 已完成（红→绿 e2e 7/7 + ui 243/runtime 1492/form 1093/mobile 189 回归绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（P2×7/P3×12 全部显式 watch-only disposition）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap IS-6 回写 done；ledger + 证据卡 + dev log 同步）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_c0f3b242，2026-10-08，R1 VERDICT: APPROVED——1 Minor + 2 Trivial 全部随收口提交落盘；执行 session 未自审）
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78/78 任务）
- [x] `pnpm check`（exit 0，零新增未登记红）

## Deferred But Adjudicated

（无——执行中推翻/改判当场落本节。）

## Non-Blocking Follow-ups

- 移动视口仿真驱动的序列是否沉淀为共享 helper（沿 IS-9 候选口径登记，不随批实现）。

## Closure

Status Note: 已收口（2026-10-08，full-green verification）。IS-6 52 页序列审查批完成：26 findings（P1×7/P2×7/P3×12）+ watch/n-a/豁免/撤案全量登记零静默；P1 七项先红后绿；台账 audited 85 / findings 81 reconcile OK。

Closure Audit Evidence:

- Auditor / Agent: agent_c0f3b242（fresh session 独立子 agent，2026-10-08）
- Evidence: R1 VERDICT: APPROVED。审计独立复跑：reconcile（audited 85 / findings 81 全等）、playwright 7 用例 7 passed（16.6s）、ui/runtime/form/mobile 包回归（243/1492/1093/189，runtime 1 条 pre-existing skip）、console-baseline 无新红、typecheck/lint/check exit 0；关键主张逐条代码级证实（calendar components 身份churn 链经 react-day-picker 9.14 dist 证实、input-reset-resync 旧断言确证 codified 缺陷行为、m5-showcase runtime 未动/契约漂移如实登记、bug-163 缓解与 docs/bugs/163 记载一致、红跑算术逐用例核算成立）。Issues 全部随收口落盘：R1-1 [Minor] ledger IS-6 翻转行 7 列幻影 → 6 列收敛；R1-2 [Trivial] calendar 修复注释精化（焦点冒泡经 PopoverContent onFocus → DateFieldControl 重渲染链）；R1-3 [Trivial] runtime 测试计数措辞（1492 passed | 1 pre-existing skip）。

Follow-up:

- 见 Non-Blocking Follow-ups。
