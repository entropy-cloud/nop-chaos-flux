# 649 最终成熟度审计 FM-6：局部缺陷消化·首批（local 族 P2 全量 + 同族 P3 顺带）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/final-maturity-audit-roadmap.md` FM-6；`missions/final-maturity-audit.json`（local→FM-6 候选族）；口径 = `docs/plans/00-plan-authoring-and-execution-guide.md`（审计卡 + test-first + 类别清扫机制）
> Related: `docs/audits/final-maturity-audit/ledger.md`（FM-010/011/012/016/017/020/021/024/025/028/031/033/034/036/037/039/040/041）；plan 643/644/645/646/647/648（发现来源批）；plan 613（RM-11 silent no-op 判例，FM-016 修复方向背书）

## Purpose

消化台账 local→FM-6 候选族的首批：**全部 P2 局部缺陷（12 个台账行 / 15 处修复——10 个 P2 行 13 处 + 同文件/同族 P3 顺带 FM-010 / FM-020）**；其中判别基础/修复方向在案的按既定方向修，FM-039/040 为判别方向已写定、根因待行级证实（见 Baseline 双口径），每处修复携带判别测试（先红后绿）；其余 local 族（测试缺口批 / 视觉复发族 / ux 叠加批 / 能力可达项 / P3 批量行）按执行模型分界裁决字母批滚动。

## Current Baseline（2026-10-18 台账 live 核对）

- **首批对象（P2 ×10 行）**：
  - runtime/action 契约类（flux-runtime / flux-action-core）：FM-011（attachThrownMetadata 丢 name/code，AbortError 降级 failure → 误报 toast）、FM-012（并行聚合丢 cancelled/timedOut 旗标 → 全取消批次被判纯 failure）、FM-010（P3 顺带：第五/第六条未收口验证入口，与 FM-009 同族同修法）；
  - 渲染器 ownership/语义类：FM-016（use-table-filter/sort ownership 读侧 `==='scope'` 写侧 `&&statePath`——静默 no-op，RM-11 判例已背书修复方向）、FM-017（form triggerHook 失败仅 console.warn）、FM-024（splitResponsiveColumns 双索引空间错位，skip 立案测试待翻绿）、FM-028（container-hooks F2–F5：loadMore 单槽 resolver 并发孤儿化 / import-bindings 裸 disposeScope / StrictMode 期真实派发等 4 项——F3 schema-renderer env 宽依赖如裁决属行为变更则立案不改）；
  - 设计器交互类（FM-1b 新案）：FM-039（flow-designer palette 插入不入撤销史）、FM-040（taskflow-designer 插入视口漂移）；
  - 展示类：FM-031（linear-settings light 宿主画布恒暗 × 响应式 token → 标签 1.00:1）、FM-036（tabs keepMounted 非活动 tabpanel 不隐藏，双视图叠加）。
- **同族 P3 顺带**：FM-020（use-row-quick-edit-draft 漏 version bump——与 FM-010 同为"重置路径不对称"族）。
- **判别基础在案**：FM-024 已有 `it.skip` 立案（fm3-contract-probes）可翻绿；FM-016 RM-11 判例 + dev warn 标准在案；FM-039/040 判别方向已写定（undo 节点数回落 / vp transform 逐字节相等）；FM-031 同族对照探针（18.73:1）已坐实。
- **滚动承接对象（字母批 FM-6-b，非本批）**：FM-025（补测清单 25 条 test-gap 批）、FM-033（R2 复发维持 11 条——视觉族清扫）、FM-034（ux MEDIUM ×5）、FM-037（行拖拽 draggable 实例 + e2e）、FM-021（P3 批量行 ×14：局部重复/死导出/死参数等组织问题）。
- **watch-only 不入本批**：FM-023（并发领地 successor）、FM-041（P3 观感候选）等维持原处置。

## Goals

- 15 处修复（13 处 P2 + 2 处顺带 P3）全部判别测试先红后绿；每行一张审计卡、共 12 张（FM-028 单卡覆盖四处逐项落卡；卡含发现坐标 / 根因证实至行 / 修复 / 判别 / 复检）。
- 台账 **12 行**状态翻转（fixed→verified 或裁决注记；FM-028 为单行台账含四处）；FM-024 skip 测试翻绿；FM-028 四项逐项裁决（修复或改判理由落卡）。
- ledger `uncovered=0` 维持；批次记录落账。

## Non-Goals

- FM-6-b 承接对象（FM-025/033/034/037/021）；watch-only 项翻案；FM-023 并发领地；任何 systemic→FM-7 项（FM-018 等）；行为级语义重裁决（如 tabs keepMounted 全局默认翻转——FM-036 仅修消费侧隐藏语义）。

## Scope

### In Scope

- 上列 12 个台账行（15 处修复）+ 判别测试 + 审计卡；落点按 live repo 行级证实为准，当前最佳归属：
  - FM-011/FM-012 → `packages/flux-action-core/src/action-dispatcher/action-runners.ts` / `action-execution.ts`；
  - FM-010 → `packages/flux-runtime/src/form-runtime-owner.ts` + `form-runtime-field-ops.ts`；
  - FM-020 → `packages/flux-renderers-data`（use-row-quick-edit-draft）；
  - FM-016 → `packages/flux-renderers-data/src/table-renderer/`（use-table-filter / use-table-sort）；FM-024 → 同包 `responsive.ts`；
  - FM-017 → `packages/flux-renderers-form/src/renderers/form.tsx`（surface triggerHook 面 :218-235）；
  - FM-028 → F2 crud-renderer-load 在 `packages/flux-renderers-data/src/crud-renderer-load.ts`；F3–F5 在 `packages/flux-react`（schema-renderer / node-renderer 等）；
  - FM-039 → `packages/flow-designer-renderers`（designer-command-adapter；core/renderers 边界以行级证实为准）；FM-040 → `apps/playground` taskflow-designer-lib；
  - FM-031 → linear-settings 为 playground complex-page：落点 = demo schema 定向 token/色值修补或标签渲染器包（**定向 token/色值修补不属 Out-of-Scope 的"demo schema 重设计"，在范围内**）；
  - FM-036 → tabs 消费侧隐藏语义（tabs 基础组件行为不翻转，见 Non-Goals）。
- FM-036 的 11 处 tabs 消费 schema 类扫描回归（修复方向原文要求）。

### Out Of Scope

- 字母批清单（见 Baseline）；跨包系统性契约（FM-018 asReactNode shim 族——FM-7 首批对象）；demo schema 重设计。

## Failure Paths

| 编号                  | 触发                                                                                | 行为                                                         | 可重试 | 用户可见表现 |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | ------------ |
| root-cannot-prove     | 候选根因证实失败（如 FM-039 designer-command-adapter 行级未证实）                   | 审计卡如实记录证实边界；改判 watch-only 或升级调查项，不硬修 | 是     | 无           |
| behavior-adjudication | 修复需要行为裁决（如 FM-028 F3 env 依赖语义）                                       | 当场裁决落卡；无法裁决 → Deferred 节披露                     | 否     | 无           |
| protected-area        | 触并发会话领地（FM-023 IME/Enter 提交同族 + xlang 域；FM-017 triggerHook 面已豁免） | 停手立案披露                                                 | —      | 无           |
| discriminator-flaky   | 判别测试本身 flaky                                                                  | 修测试至确定性，不入 findings                                | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：**必须自动化**——本批 = 缺陷修复批，每处修复必须先有失败判别测试（或 skip 翻绿）再修；Proof 项（判别红）前置在 Execution Plan 各 item。FM-036 的 tabs 类扫描回归属合同面回归（11 处消费 schema）也必须自动化。

## 口径执行模型声明

- **执行载体**：主会话直接修复（代码批，非走查批）；每项独立审计卡（`_tmp/fm6-cards/<FM-ID>.md`）+ 判别测试同 PR 落地；串行按类别推进（runtime/action → 渲染器 → 设计器 → 展示）。
- **bounded 单轮**：12 个台账行（15 处修复）为上界；单项证实失败即走 Failure Paths，不带病扩项。
- **设计器坐标边界**：FM-039/040 落点以行级证实的最小所属包为准（flow-designer-core vs renderers vs playground lib），不预设。
- **并发领地（收窄口径）**：仅限台账已登记领地面——FM-023 的 IME/Enter 提交同族（`input-suggest.tsx` 及 form.tsx 内 IME/Enter 提交路径）与 xlang 域文件不改；**FM-017 的 surface triggerHook 面（form.tsx:218-235）显式豁免于领地，正常修复**；FM-016 若证实需触碰前述领地面则只立案不改。

## Execution Plan

### Phase 1 - runtime/action 契约类（FM-011 / FM-012 / FM-010 / FM-020）

Status: done（2026-10-18）
Targets: `packages/flux-action-core/src/`、`packages/flux-runtime/src/`、`packages/flux-renderers-data/src/`（FM-020）

- Item Types: `Proof | Fix`

- [x] Proof：FM-011 判别红（AbortError 经 attachThrownMetadata 后 name/code 丢失 + isAbortError 判定失败）。
- [x] Proof：FM-012 判别红（并行批次全取消 → 聚合结果丢失 cancelled/timedOut 旗标）。
- [x] Proof：FM-010 判别红（第五/第六入口裸抛或 fire-and-forget unhandled rejection，套 FM-009 同款收口断言）。
- [x] Proof：FM-020 判别红（外部刷新后 isRowDirty 卡 true → 保存钮误亮）。
- [x] Fix：四项修复 + 判别绿 + 审计卡。

Exit Criteria:

- [x] 四项判别红→绿在案（flux-core 6 红→绿 / action-core 4 红→绿 / flux-runtime 2 红→绿 / data 1 红→绿）；套件全绿；审计卡 ×4（\_tmp/fm6-cards/）。

### Phase 2 - 渲染器 ownership/语义类（FM-016 / FM-017 / FM-024 / FM-028）

Status: done（2026-10-18）
Targets: `packages/flux-renderers-data/src/`（FM-016/FM-024 + FM-028 F2 crud-renderer-load）、`packages/flux-renderers-form/src/`（FM-017）、`packages/flux-react/src/`（FM-028 F3–F5）

- Item Types: `Proof | Fix | Decision`

- [x] Proof：FM-016 判别红（误配 ownership 时静默 no-op，无降级无 dev warn——RM-11 标准断言）。
- [x] Proof：FM-017 判别红（triggerHook 失败无 notify/monitor 通道）。
- [x] Proof：FM-024 skip 翻红→绿（双索引空间用例）。
- [x] Decision：FM-028 F3 裁决表——env 宽依赖语义是否当批改（行为变更裁决），不改则立案注记落卡。
- [x] Proof：FM-028 F2/F4/F5 判别红。
- [x] Fix：判别绿 + 审计卡 ×4（F3 裁决落卡）。

Exit Criteria:

- [x] 四行判别在案（F3 裁决 = refreshTick 零订阅者，移除空转 bump，env 替换传播回归钉在案）；flux-react 627/627、data/form 套件全绿。注：F4 的 StrictMode 窗口经可达性分析证不可达（async-only bindings），修复为约定归一 + pin，卡内披露并修正 FM-4 原始 claim。

### Phase 3 - 设计器交互类（FM-039 / FM-040）

Status: done（2026-10-18；两项经 Failure Paths root-cannot-prove 改判，零静默降级）

- Item Types: `Proof | Fix`

- [x] Proof：FM-039 行级根因证实（designer-command-adapter history 覆盖面读码）+ 判别红（insert→undo 节点数不回落）。
- [x] Proof：FM-040 行级根因证实（插入后 auto-pan 源头读码）+ 判别红（insert 前后 vp transform 漂移）。
- [x] Fix：两处修复 + 判别绿 + 审计卡（含包归属裁定记录）。

Exit Criteria:

- [x] 两项行级证实完成、判别方向落地形式为裁决——FM-039 候选根因**证伪**（adapter/core 均 pushHistory，探针 fm39-insert-undo-probe 2 绿），FM-040 time-box 未达行级（xyflow 视口面排除三项）→ 双双改判 watch-only + 升级调查去向（台账/IS 台账/Deferred 节同步），判别基线留档。无 in-scope live defect 被静默降级（改判即显式裁决）。

### Phase 4 - 展示类（FM-031 / FM-036）+ 收口

Status: done（2026-10-18）
Targets: linear-settings 落点 = apps/playground/src/linear-replica/linear-replica.css（live probe 行级证实后定）、tabs 消费面 = flux-renderers-basic/tabs.tsx

- Item Types: `Proof | Fix`

- [x] Proof：FM-036 行级根因证实（tabs keepMounted/hidden 语义读码；未证实走 root-cannot-prove 不硬修）。
- [x] Proof：FM-031 判别（light 宿主标签对比度 <3:1 → ≥4.5:1；引用 FM-5 证据卡 `docs/analysis/fm5-render-recheck/cards/page/linear-settings.md` 已坐实的 token 机制——画布恒定浅色 × 响应式 token，同族对照 18.73:1）；FM-036 判别红（激活 B 视图后 A tabpanel 仍可见）。
- [x] Fix：FM-031 修复（画布本地固定色或 dark 作用域，同族对照已坐实）；FM-036 修复（消费侧隐藏语义）+ 11 处 tabs 消费 schema 类扫描回归。
- [x] 收口：台账 12 行翻转 + 批次记录（15 处修复/12 张审计卡，FM-028 单卡含四处逐项落卡）；`_tmp/fm6-cards/` 归档至报告附录；roadmap FM-6 行裁决（done 或注记滚动 FM-6-b）；mission 对应任务翻转；daily log。

Exit Criteria:

- [x] FM-031 判别 live probe 1.00:1 → 6.13:1（≥4.5 达标）；FM-036 判别红→绿（getAnimations 永挂 polyfill）+ tabs 消费面全量回归绿（676/676）；台账 10 行 fixed→verified + 2 行改判 watch-only，uncovered=0；roadmap/mission 已翻转（daily log 随收口提交落盘）。

## Draft Review Record

- Reviewer / Agent: agent_788b0b52（fresh session 独立子 agent，单轮）
- Verdict: R1 `revised`（1B/3M/3m）→ 全量修订 → R2 `revised`（0B/0M/3m 机械残留，复审员授权起草人自检后激活）
- Rounds: 2
- R2 处置（agent_8a345f94）：Minor-A FM-028 F2 crud-renderer-load 归属改 flux-renderers-data（In Scope + Phase 2 Targets）；Minor-B 卡计数统一为 12 张（每行一张，FM-028 单卡四处，选项 a）；Minor-C Phase 3 补 Item Types；随修 cosmetic 拼写 root-cannot-prove（两处一致）。B1/M1/M2/M3/m1/m3 复核全过（复审员 live 逐点证实）。
- Findings addressed: R1-B1 并发领地声明与 FM-017 落点自斥 → 收窄至 FM-023 IME/Enter 提交同族 + xlang 域，显式豁免 triggerHook 面（Scope/口径声明/Failure Paths 三处同步）；R1-M1 包归属七处与 live repo 不符 → In Scope 重写为行级落点清单 + Phase Targets 修正（FM-017→flux-renderers-form、FM-024→flux-renderers-data/responsive、FM-039→flow-designer-renderers、FM-040→playground taskflow-designer-lib、FM-031→demo schema 定向修补注记在范围内、FM-020→Phase 1 补 flux-renderers-data、FM-028→flux-react F2–F5 实际落点）；R1-M2 "15 行"计数失实 → 全文统一双口径"12 台账行 / 15 处修复"；R1-M3 FM-036 缺行级证实 Proof → Phase 4 前置根因证实项 + FM-031 引 FM-5 证据卡；m1 Phase 2–4 补 Item Types（Phase 2 含 Decision）；m3 Purpose 措辞与 Baseline 双口径对齐（m2 于激活时落 Last Reviewed 日期）。

## Closure Gates

- [x] 12 个台账行 / 15 处修复全部有审计卡（根因证实至行 / 修复 / 判别红→绿 / 复检——`_tmp/fm6-cards/` 12 张）
- [x] 无法证实项全部走 Failure Paths 并落 Deferred（零静默降级——FM-039 候选根因证伪、FM-040 time-box 未达行级，均改判 watch-only + 升级去向）
- [x] 台账翻转与批次记录一致，uncovered=0（10 行 fixed→verified + 2 行改判 watch-only）
- [x] 受影响 owner docs 已同步或明确 No owner-doc update required——No owner-doc update required（FM-031 修复落 playground demo CSS 层与 `docs/analysis/fm5-render-recheck/cards/page/linear-settings.md` 证据卡修复方向一致；FM-036 行为收敛在既有 tabs 契约内；FM-016 落 RM-11 判例既有标准）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure 节）
- [x] `pnpm typecheck`（唯一 playground vite.config 既有红，归属在案）
- [x] `pnpm build`（唯同红）
- [x] `pnpm lint`（44/44）
- [x] `pnpm test`（82/82 tasks exit 0）
- [x] `pnpm check`（exit 1 唯一新红段 = knip `tests/e2e/xlang-debug-mock-server.mjs` 并发归属 + scanner-baselines 有意识再登记 730→733/334→337 triage 注记落盘。审计 B-1 修正记录：首轮门禁陈述漏读 knip 第二 hit（FM-028 F5 重构导出的未用类型 NodeLifecycleActions），已改为文件内私有并复验收敛为单 hit）

## Deferred But Adjudicated

- **FM-039 改判 watch-only（root-cannot-prove）**：台账候选根因（adapter history 未覆盖 palette insert）经行级读码 + 单元探针证伪（addNode/insert 路径均 pushHistory，canUndo=true）；走查读数与 core/adapter 层证据矛盾，嫌疑收敛至页面层（host re-baseline/快照订阅/demo 家族）→ 归 FM-1b-b 复走（探针留作判别基线）。零硬修。
- **FM-040 改判 watch-only（root-cannot-prove，time-box）**：走查证据真实但行级根因未达——xyflow-canvas 视口面排除 init-fitView 一次性/受控 viewport/epsilon persist 门三项 → 升级调查项归 FM-1b-b 或独立小批，判别方向不变。
- **FM-028 F4 可达性修正**：StrictMode live-dispose 窗口经可达性分析证不可达（bindings 仅 async 落地，mount 模拟窗口无 scope 可 disposed）——修复仍执行（约定归一防缺陷类），FM-4 原始 claim 的 StrictMode 表述已在卡内修正。
- **FM-6-b 字母批（Rule 3 预授权）**：FM-021（P3 批量行 ×14）/ FM-025（补测清单）/ FM-033（R2 复发族）/ FM-034（ux MEDIUM）/ FM-037（draggable 实例）。

## Closure

Status Note: completed（2026-10-18 独立收口审计后置位；首轮 verdict `issues`（1B/1M/6m），修复项全数处置后按审计授权签署收口）

Closure Audit Evidence:

- Auditor / Agent: agent_dea86169（fresh session 独立收口审计员，只读，90 tool-uses，复验日志 `_tmp/fm6-audit-*.log`）
- Evidence: 首轮 verdict `issues`——**实质面全绿**（A 判别真实性抽 4+ 项旧实现推演必红且实跑绿；B 改判诚实性：FM-039 探针实跑证伪候选根因、FM-040 三项排除逐一读码证实，三处披露一致；C FM-036 base-ui merge 右者胜源码实证 + basic 676/676 重跑；D FM-031 WCAG 独立复算逐位一致；F 边界零越界、form.tsx IME 面归属可清晰区分；G 台账三方对应）。**处置清单**：B-1 knip 第二 hit（NodeLifecycleActions 未用导出）→ 改文件内私有 + 复验收敛单 hit + gate 行修正（首轮"唯一"陈述失实如实记录在案）；M-1 台账 10 行状态格 token 重复（追加未替换机械损坏）→ 全部修复且管道数校验通过；m1 zh-CN surfaceHookFailed 补中文；m2 FM-011 红数陈述修正（真判别红 4 = flux-core 2 + action-core 2）；m3 "一次性 dev warn"措辞写实（每渲染，与 use-column-resize 先例同形）；m4 FM-031 probe 读数归档 `_tmp/fm6-fm31-probe/readings.md`；m5 daily log 随本收口提交落盘；m6 FM-041 维持 watch-only（备忘不阻）。

Follow-up:

- FM-6-b 字母批（Rule 3 预授权）：FM-021 / FM-025 / FM-033 / FM-034 / FM-037。
- FM-1b-b 复走批：FM-039 页面层复走（探针基线在案）、FM-040 视口漂移升级调查 + mobile 族/spreadsheet/dashboard-demo 等。

## Non-Blocking Follow-ups

- FM-6-b 字母批：FM-025 补测清单 / FM-033 视觉复发族 / FM-034 ux MEDIUM / FM-037 draggable 实例 / FM-021 P3 批量行（Rule 3 预授权滚动）。
