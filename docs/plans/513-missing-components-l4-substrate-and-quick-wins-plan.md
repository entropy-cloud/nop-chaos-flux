# 513 Missing Components L4 — 交互残留：共享底座设计 + 裁决 + 快赢实现

> Plan Status: completed
> Last Reviewed: 2026-09-26
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §7（L4 全表）+ §11（QA.1-L4 出口绑定）；`docs/analysis/ui-review/C2-capability-gaps.md` 回写③④⑤⑨⑩⑫⑬⑭⑮；`docs/analysis/visual-quality/2026-09-24-page-archetype-coverage-audit.md` §3.6（共享底座六条规则）/ §3.2 行 9；`docs/analysis/visual-quality/2026-09-24-missing-component-gap-analysis.md`
> Related: `docs/plans/512-missing-components-l3-host-channels-plan.md`（L3 收口先行，plan 512 in flight——本计划执行不阻塞于其收口，但 roadmap 回写时序在其后）

## Purpose

收口 roadmap L4 线「交互残留」中**条件已成熟**的实现项（L4.1 density、L4.5 kanban 手势配置面、L4.7 graph 状态色、L4.8 cardTemplate params、L4.10 docs-only、L4.11a 列拖拽排序、L4.11b gantt selectedClass），并对**证据显示应继续挂起**的项（L4.3 range/fill-handle、L4.4 hover-peek、L4.11c/d/e）做出带出处的正式裁决，回写 roadmap §13。L4.2（calendar 6 周格）、L4.6（Resizable schema 化）体量为 M~L 且各有独立设计张力（V11a A3 否决先例 / bespoke resize 统一口径），归 successor plan 514；L4.9 replica retrofit 为 plan 族（roadmap Rule 4 例外），归 515+。

**单计划边界依据**：本计划服务同一结果面——「L4 交互残留的裁决与快赢收口」；七个实现项全部遵循 archetype §3.6「统一 substrate + 编译面 + 共享 helper + N 采纳方」的同一底座模式（Phase 1 一并立约），roadmap §13 对 L4.1–L4.8 为单行登记；plan guide Rules 22/24/26 合并优先。

## Current Baseline

2026-09-26 live repo 核对（两轮独立只读调研，HEAD = plan 512 收口前）：

- **L4.1 density**：`flux-renderers-data`/`flux-renderers-basic` 源码 `density` 零命中（回写③复测一致）；token 侧仅单档 `--table-row-height: 40px`（theme-tokens/styles.css:87）。三档参照值 32/40/48px 已由 stripe replica CSS + e2e 锁定（stripe-replica.css:84-88，P7a；P6b A9 className 表达式驱动切换机制已证）——「切换机制已证」≠「产品字段已证」，语义字段仍缺。
- **L4.5 kanban 手势**：拖拽基于 pragmatic-drag-and-drop（use-kanban-dnd.ts）；键盘重排 `moveCardKeyboard` 固定 Space+←/→ 且挂接以 `draggable` 为门（use-kanban-board-effects.ts:76），无 schema 配置面（回写⑫ deferred ③）。
- **L4.7 graph 状态色**：levelField/levelMap→`data-level`→CSS 仅 border-color 三条规则（graph styles.css:42/:46/:50），填充色恒 `--card`（styles.css:23）；G-K 数据驱动着色缺口 = fill/宽语义色映射（登记处：C2 初版裁决表 G-K 行「构想库存」+ archetype §2 B2 行 :48「G-K open」）。
- **L4.8 cardTemplate params**：根因在 region 契约——`render(options)` 的 per-card 参数 `{card, column, index}` 被作位置参数传入（kanban-card.tsx:82-86），未走 `bindings` 通道，region 内表达式拿不到 card scope（flux-core render-fragment-types.ts:24-34）；linear 复刻 mock-backend-linear-issues.ts:256-261 有现役绕行注释。
- **L4.10 docs-only**：wizard `mountOnEnter` live 已实现（schemas.ts:50 / wizard-step-body.tsx:34-36）但 guide 缺「不开就丢已发布值」footgun 警示（flux-guide/examples/wizard-values-path.md:18/:120 仅懒渲染说明）；`refreshSource` scoped lookup 无父链回退（source-registry.ts:440-457），form 内刷新页面级 data-source 正解是 `component:refresh` + componentId，data-source.md 对此零记载。
- **L4.11a 列拖拽排序**：固定列 `fixed?: 'left'|'right'` **已在库**（schemas.ts:83 + table-renderer/fixed-columns.ts 全套 sticky）——roadmap 行「+ 固定列」子句被 live 超越；列拖拽排序未实现，`columnSettings.draggable` 为死配置（全包无消费），现仅设置浮层上移/下移（table-column-settings.tsx:103-115）。
- **L4.11b gantt selectedClass**：选中态为 renderer 内部 store（gantt-store.ts:25/:62），marker+token CSS 已通（防回归测试在案），未采纳 schema `selectedClass` 通道（scheduling 包 grep 零命中；回写⑨ residual「按价值可后续采纳」，C2:287）。
- **L4.11c calendar drop-target CSS**：已被 plan 481 V11a 消费（calendar/calendar.css:71-80 `[data-drop-target]` + drag-ok/drag-conflict token 驱动规则）——回写⑨该项基本闭合，仅 `data-drop-valid` 属性由 class 通道替代。
- **L4.11d 共享 roving helper**：不存在且回写⑫⑮双重「not adopted」；落地消费方计数 <2（table 方向键漫游显式 deferred、L4.2 calendar 6 周格未实现）——触发条件未满足。
- **L4.11e command-palette**：产品化已收口（回写⑩）；fuzzy 自定义评分/最近使用排序/app 级单例三项 successor 均未做、无消费诉求登记（C2:299）。
- **L4.3 range/fill-handle**：roadmap 行的设计输入即「G-B2+G-B3 双前置就位后重评」——该重评已由 C2 回写⑮完成并裁定「无 consuming 复刻页，时点实现属投机基础设施；Successor: D1 输入池，出现消费诉求时在编辑双态矩阵之上叠加」。spreadsheet 侧 range/fill 能力本就在独立编辑器面（spreadsheet-core types.ts:167-173 / use-fill-handle.ts），table renderer 侧无需第二套。
- **L4.4 hover-peek**：回写⑫ deferred ④ 裁定 watch-only residual（Space hover 保持计时事件，禁全局 keydown 注入 hack）；回写⑭① 裁定「视图↔peek 联动」为作者侧创作约定（successor: no）。全仓 hover-peek 实现零命中。
- **L4.12 phone mask**：input-text design.md §2 明文暂不实现，archetype 记 demand-gated——维持不动。

## Goals

- Phase 1 一份共享底座 mini-design 文档落盘（六实现项的 substrate 契约：density token 档、kanban 手势配置面、graph 语义色面、cardTemplate bindings 通道、gantt selectedClass 采纳口径、列拖拽排序接线口径）+ 五项挂起裁决记录（L4.3/L4.4/L4.11c/d/e），过独立 review。
- L4.1：table `density` 语义档（enum → theme token 档位），schema + 渲染 + focused 单测 + e2e。
- L4.5：kanban 键盘重排手势的 schema 配置面 + `draggable` 门解耦（缺省行为零回归）。
- L4.7：graph 节点数据驱动着色面扩展（fill/徽标语义色，levelMap 兼容）。
- L4.8：region `bindings` 通道承载 per-card params（flux-react 核心面），kanban cardTemplate 消费 + linear 复刻绕行回灌评估。
- L4.11a：table 列拖拽排序接线（消解 `columnSettings.draggable` 死配置：接线或移除，随 Phase 1 裁定）。
- L4.11b：gantt 选中态 schema 通道采纳（接口随 Phase 1 裁定，不硬套 optionRow）。
- L4.10：wizard mountOnEnter footgun 警示 + refreshSource/component:refresh 刷新姿势落 flux-guide（纯文档）。
- roadmap §13 回写：L4.1/L4.5/L4.7/L4.8/L4.10/L4.11 各行落终态；L4.2/L4.6 登记 successor plan 514；L4.9 登记 plan 族 successor；L4.3/L4.4/L4.11c/d/e 落 demand-gated/watch-only/销项裁决注记。

## Non-Goals

- 不实现 L4.2（calendar 6 周格）与 L4.6（Resizable schema 化）——successor plan 514（各有需先立约的设计张力）。
- 不做 L4.9 replica retrofit（plan 族，515+；与 L3.5 错峰规则见 roadmap §12）。
- 不动 spreadsheet-core/spreadsheet-renderers 独立编辑器面（L4.3 裁决不重开原语）。
- 不实现 hover-peek 全局事件 hack（回写⑤明令禁止的绕道方式）。
- 不迁移 workbench/flow-designer/dashboard 的既有 bespoke pointer-resize 实现（L4.6 范围裁决归 514）。

## Scope

### In Scope

- `packages/theme-tokens`（density token 档）、`packages/ui`（table.css 行高档规则——底座 review M1 修订纳入）、`packages/flux-renderers-data`（table density/列拖拽）、`packages/flux-renderers-scheduling`（kanban 手势配置、gantt selectedClass）、`packages/flux-renderers-graph`（状态色面）、`packages/flux-react`（keyboard 别名表 + region bindings 消费面）、`flux-guide`（L4.10 两处文档）、roadmap §13。
- 底座 mini-design 文档 `docs/discussions/2026-09-26-l4-interaction-residual-substrate.md`。

### Out Of Scope

- 新 renderer type 注册（本计划无 matrix flip 项；L4.6 若裁定为新 type 归 514 走 flip）。
- calendar/spreadsheet/resizable renderer 面。
- replicas schema 改动（L4.9 边界；linear cardTemplate 绕行回灌仅评估并记录，若回灌也只动 mock-backend 注释级绕行对应的 cardTemplate 声明——不触碰其它 e2e 断言面）。

## Failure Paths

| 可测场景编号                      | 触发                                                 | 行为                                            | 可重试 | 用户可见表现           |
| --------------------------------- | ---------------------------------------------------- | ----------------------------------------------- | ------ | ---------------------- |
| density-invalid-value             | schema `density` 值非法（枚举外）                    | 归落 default 档，不抛错                         | 是     | 默认行高               |
| kanban-gesture-unchanged-default  | 未配置手势 schema                                    | 行为与现状逐字节一致（Space+←/→、draggable 门） | —      | 无变化                 |
| cardtemplate-no-bindings-consumer | 旧 region 消费方未传 bindings                        | bindings 通道为增量可选参数，旧路径行为不变     | —      | 无变化                 |
| column-drag-reorder-conflict      | 拖拽排序与列设置浮层同时操作 orderedColumnsStatePath | 后写胜出（既有 scope 写语义），顺序一致         | 是     | 列序以最后一次操作为准 |
| graph-legacy-levelmap             | 既有 levelMap schema 不变                            | 渲染输出与现状兼容（data-level 语义四档保留）   | —      | 无回归                 |

## Test Strategy

档位选择：**必须自动化**（roadmap §10 预声明：代码线 plan 一律必须自动化；每个实现项 focused 单测先于或随实现落地，行为面 e2e 断言随后）。L4.10 为纯文档（不适用档，理由：无行为变更）。

## Execution Plan

### Phase 1 - 共享底座 mini-design + 挂起项正式裁决（design gate）

Status: completed
Targets: `docs/discussions/2026-09-26-l4-interaction-residual-substrate.md`、roadmap §13（裁决行）

- Item Types: `Decision`

- [x] 底座文档落盘：六实现项 substrate 契约（density enum 词表与 token 档映射；kanban 手势配置 schema 形状与 draggable 门解耦口径；graph 语义色面与 levelMap 兼容规则；region bindings 通道形状——`render(options)` 增量可选参数不破坏既有消费方；gantt selectedClass 采纳接口口径；列拖拽排序接线 vs 死配置移除的裁定）+ 与 archetype §3.6 六条规则逐条对齐说明
- [x] 挂起项裁决记录（带 C2 回写出处）：L4.3 → demand-gated（回写⑮）；L4.4 → watch-only residual（回写⑫④ + ⑭①）；L4.11c → 销项核实（V11a calendar.css 证据复核）；L4.11d → deferred（触发条件未满足）；L4.11e → demand-gated（无消费诉求登记）
- [x] 独立 review 共识（fresh 子 agent）：r1 fail（1M+6m）→ 全部修订落字 → r2 fail（M1′+m1′+m4′）→ 修订 → r3 **pass**（0B/0M/0m，2026-09-26）；M 级修订含 In-Scope 扩 `packages/ui`（table.css 档位规则属地）与 flux-react keyboard 别名表面

Exit Criteria:

- [x] 底座文档含六项契约 + 五项裁决（无「待定」残留）+ review 记录在案（文档 Review 头注，三轮记录齐）
- [x] roadmap §13 对应行已带裁决注记（L4.3/L4.4/L4.11c/d/e，L4.1–L4.8 行 + L4.9/L4.10/L4.11 行更新为 in progress + 去向）

### Phase 2 - L4.1 density 语义档

Status: completed
Targets: `packages/theme-tokens/src/styles.css`、`packages/ui`（table.css 档位规则——review M1 修订属地）、`packages/flux-renderers-data/src/schemas.ts`、`table-renderer/`

- Item Types: `Fix`、`Proof`

- [x] theme tokens 增 `--table-row-height-compact: 32px` / `--table-row-height-relaxed: 48px`（default 档沿用既有 `--table-row-height: 40px`）
- [x] table schema 增 `density?: 'compact' | 'default' | 'relaxed'`（Phase 1 定稿词表），根元素 `data-density` 属性（default 档不输出）+ ui table.css 档位规则（`--table-row-height` 局部覆写 + `[data-density] tbody td { height; padding-block: 0 }`）；非法值归 default
- [x] focused 单测（三档 data-density 属性断言 + 非法值回退 + ui 规则生效行高程序化断言）+ e2e 一条（档位切换行高程序化断言，参照 stripe P7a 口径）——table-density.test.tsx ×2（data 1172/1172 绿）+ table-density.spec.ts（bounding box ±2px 精确命中 32/40/48，table lab 页新增三档场景）

Exit Criteria:

- [x] 三档 token 在库 + table prop 接线，focused 单测与 e2e 全绿
- [x] quick-reference 登记 density 行（Interaction-Surface Fields 节）

### Phase 3 - L4.7 graph 节点状态色面扩展

Status: completed
Targets: `packages/flux-renderers-graph/src/`（graph-node.tsx、styles.css）

- Item Types: `Fix`、`Proof`

- [x] 数据驱动着色面扩展：按 Phase 1 裁定落地（实施口径按底座 §3 收窄为 **fill tint**——`data-level` 四语义级 border+fill 双消费，token/color-mix 驱动；「徽标语义色」预期由契约管辖未纳入）
- [x] focused 单测（graph-node.test.tsx 增四语义级 marker 例，graph 51/51 绿）+ e2e/程序化断言一条（graph-level-tint.spec.ts：tinted ≠ plain + 无 level 零回归 + plan-482 亮暗断言保持绿）

Exit Criteria:

- [x] 着色面扩展落地且既有 levelMap schema 渲染无回归（单测断言）
- [x] archetype B2 行 G-K open 口径回写（archetype 文档 B2 行 2026-09-26 dated 注记：G-K CLOSED；C2 为快照档案不改）

### Phase 4 - L4.5 kanban 手势 schema 配置面

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/`（kanban.types.ts，经包根 schemas.ts re-export；use-kanban-board-effects.ts、use-kanban-dnd.ts）

- Item Types: `Fix`、`Proof`

- [x] 键盘重排手势 schema 配置面：`keyboardReorder?: boolean | { enabled?, keys?: { prev?, next? } }`（缺省=现状逐字节一致；对象形与 `draggable` 解耦；`keys` 走 flux-react `parseKeyCombo`/`comboMatchesKey`，keyboard.ts 增 key 别名表 `"space"→" "`）
- [x] focused 单测：keyboard.ts 别名归一 ×1（flux-react 521/521 绿）+ kanban dnd 集成 ×3（keyboard-only 解耦 / false 关闭 / prev-next 覆写且 Arrow 抑制，scheduling 1036/1036 绿，缺省零回归由既有 12 个 dnd 键盘用例承载）+ e2e 一条（kanban-keyboard-reorder.spec.ts：draggable:false + Space/ArrowRight 跨列移动）

Exit Criteria:

- [x] 缺省行为逐字节不变（既有 kanban e2e/单测全绿）+ 配置面生效有测试钉住
- [x] quick-reference 登记 keyboardReorder 行（Interaction-Surface Fields 节）

### Phase 5 - L4.8 cardTemplate per-card params（region bindings 通道）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/`（kanban-card.tsx、kanban-column.tsx）+ `scheduling-renderer-definitions.ts`（region params 声明）

- Item Types: `Fix`、`Proof`

- [x] 根因修复落地（实施范围较底座收窄）：kanban-card 改走 `render({ bindings: { card, column, index } })` + cardTemplate region 声明补 `params: ['card', 'column', 'index']`（无 params 时 flux-react instantiateRegion 不建 $slot frame——底座漏检的半个根因）；**flux-core/flux-react 零改动**（通道在库）
- [x] focused 单测：kanban-card-template-bindings.test.tsx（bindings 通道逐卡断言 card/column/index，scheduling 全绿）+ e2e 一条（kanban-card-template.spec.ts：cardTemplate 模板 `${$slot.card.data.title}`/`${$slot.index}` 逐卡解析命中，kanban lab 新增 L4.8 场景）
- [x] linear 复刻绕行回灌评估：裁定**不回灌**（linear 用默认卡面、无模板块可改；自绘模板属 replica 重设计归 L4.9）；mock 注释已更新为 L4.8 后事实

Exit Criteria:

- [x] cardTemplate region 内表达式可读 card/column/index（e2e 实证），旧 region 消费方零回归（scheduling 1036+ / flux-react 521 / data 1172 全绿）
- [x] 回写⑪ G-A 观察面该项销项注记（roadmap §13 L4 行 + 底座文档 §4；C2 为快照档案不改）

### Phase 6 - L4.11a table 列拖拽排序

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/`（table-column-settings.tsx、use-table-visible-columns.ts、table-renderer.tsx 接线）

- Item Types: `Fix`、`Proof`

- [x] 裁定落地：**接线** `columnSettings.draggable`（不删字段）——inline 面板行加拖拽把手（HTML5 DnD，dataTransfer `text/nop-table-column`），drop = 新序写入既有 `orderedColumnsStatePath` 单写通道（新 `reorderColumn`，与上移/下移同一 write path，后写胜出）；overlay 形态同样可用；把手 aria-label/title 走 flux.table.reorderColumn（zh/en 新键；原名 dragColumn 与 flux.table 既有键撞名 TS1117，收口时改名）
- [x] focused 单测（table-column-drag.test.tsx ×2：拖拽重排 header 顺序 Email/Role/Name + 未配置时零把手零行为，data 包全绿）+ e2e 一条（table-column-drag.spec.ts：lab 新增 L4.11a 场景，结构化选择器 locale 无关，dragTo 重排断言）

Exit Criteria:

- [x] 死配置消解（grep 可证：columnSettings.draggable 已有消费——table-renderer.tsx `draggable={schemaProps.columnSettings?.draggable === true}`）+ focused/e2e 全绿
- [x] 回写③ G-E/G-D 观察面「列拖拽排序」子项（C2:97）销项注记（roadmap §13 L4 行 Phase 9 回写；C2 为快照档案不改）

### Phase 7 - L4.11b gantt 选中态 schema 通道

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/`（gantt.types.ts、gantt-bars.tsx）

- Item Types: `Fix`、`Proof`

- [x] 采纳落地（实施裁定：**字面字段**与 optionRow selectedClass 同构，非表达式——gantt task 为数据面，表达式版需接 evaluate 管线且需求未现，底座文档 §6 已记）：`GanttTaskData.selectedClass?: string`，选中 bar 追加该 class；`data-selected` + token CSS 不动
- [x] focused 单测（gantt-selection-critical.test.tsx 增 1 例：选中 bar 带 class、未选任务不带、无字段任务选中不污染，9/9 绿；既有防回归全保持）

Exit Criteria:

- [x] schema/数据通道生效且有测试钉住；回写⑨ residual「selectedClass」子项销项注记（roadmap §13 Phase 9 回写）

### Phase 8 - L4.10 docs-only（wizard footgun + refreshSource 姿势）

Status: completed
Targets: `flux-guide/examples/wizard-values-path.md`、`flux-guide/design-patterns/data-source.md`

- Item Types: `Fix`（docs）

- [x] wizard-values-path.md 增「footgun：未开 mountOnEnter 时离开步即丢已发布值」警示（external publication 清理语义：dispose 路径写回 `undefined`）
- [x] data-source.md 增「刷新上游数据源的正确姿势」节：refreshSource scoped lookup 无父链回退（仅本 scope 桶）→ form 内刷新页面级 source 用 `component:refresh` + componentId；refreshSource 适用面 = 同 scope 注册的 source
- [x] 纯文档计划变体：pnpm test/build/lint/typecheck 不适用；`check:active-doc-code-anchors` exit 0

Exit Criteria:

- [x] 两处 guide 增量落盘且与 live 代码语义一致（锚点检查通过）

### Phase 9 - 收口验证 + 登记回写

Status: completed
Targets: 全仓 + 登记面

- Item Types: `Proof`

- [x] `pnpm typecheck` / `build` / `lint` / `test` 全绿（40/40 ×3 + 74/74 task）；`pnpm check` 零新增红（exit 0；第一次全链曾红：i18n `dragColumn` 键与 flux.table 既有键撞名 TS1117 + kanban 测试类型收窄——改 `reorderColumn` 新键 + 类型放宽后复跑全绿；oversized 204w/2e/2exempt 与 512 后基线一致）；e2e 全量（42.2m）**1598 passed / 43 skipped / 2 failed / 0 flaky**——2 失败 = kanban-perf:34（在册 watch-only 60Hz 口径）+ layout-family-enhancements:58（page aside 负载 flake，隔离复跑全绿，511「负载 flake 隔离复跑全过」同款消化口径；新观察项随 QA.4 复核）——零新增红
- [x] roadmap §13 L4 各行回写终态 + dev log
- [x] L4.2/L4.6 successor plan 514 与 L4.9 plan 族（515 scoping + 516+）在 roadmap §13 带去向注记

Exit Criteria:

- [x] 全量验证记录于 Closure；roadmap/dev log 落盘

## Draft Review Record

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26，未参与起草；17 处 file:line 抽验全命中 + C2 回写链逐条核对）
- Verdict: `pass-with-minors`（r1：0 Blocker / 0 Major / 9 Minor，达成共识）
- Rounds: 1
- Findings addressed: 9 Minor 全部当轮落字——①Related「L3 先行完成」改时序表述；②L4.7 登记出处更正（C2 初版 G-K 行 + archetype B2，非回写⑨）；③Phase 6 销项锚点改回写③（C2:97）；④L4.3 Deferred 分类沿用回写⑮原档 optimization candidate；⑤Closure Gates 补 `pnpm check` 行；⑥Deferred 节「successor 已立项」改「登记于本 plan roadmap 回写」；⑦Phase 4/7 Targets 写实际文件路径；⑧Phase 9 oversized 口径改「实际输出对照在册基线」；⑨graph CSS 区间更正（:42/:46/:50 三规则、fill --card :23、gantt-store :25/:62）

## Closure Gates

- [x] Phase 1 契约与裁决全部落地（无偏离裁决的实现；两处实施裁定——L4.8 补 region params 声明、L4.11b 字面字段非表达式——已回写底座文档并在案）
- [x] 各实现 Phase Exit Criteria 全勾
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（挂起项均有 Phase 1 正式裁决 + roadmap 注记）
- [x] 受影响 owner docs 已同步（quick-reference Interaction-Surface Fields 五行 / flux-guide 两处 / 底座文档）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（r1 `issues` 0B/2M/4m → 全部修复 → delta 复审 `approved` 0B/0M，2026-09-26）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增红，oversized 204w/2e/2exempt 与基线一致）
- [x] `pnpm test:e2e`（零新增红口径：1598/43/2——watch-only ×1 + 负载 flake ×1 隔离复跑全绿）

## Deferred But Adjudicated

### L4.2 calendar 6 周格视图档 + date-cell 选中 API

- Classification: `out-of-scope improvement`（本计划边界）
- Why Not Blocking Closure: M~L 体量 + V11a A3 否决先例需正面重裁（新视图档而非改既有月视图语义），独立 plan 收口更诚实
- Successor Required: `yes`
- Successor Path: plan 514（L4 深化：L4.2 + L4.6），立项登记于本 plan 的 roadmap §13 回写（Phase 1 Exit + Phase 9）

### L4.6 Resizable schema 化

- Classification: `out-of-scope improvement`（本计划边界）
- Why Not Blocking Closure: 新 type 与 bespoke resize 统一口径两大设计裁决未立约（roadmap 铁律：设计先行）
- Successor Required: `yes`
- Successor Path: plan 514（同上，立项登记于 roadmap §13 回写）

### L4.9 replica retrofit（plan 族）

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: roadmap Rule 4 例外规定逐 replica 拆子 plan；与本计划收口无依赖
- Successor Required: `yes`
- Successor Path: scoping 小 plan + 逐 replica 子 plan（编号收口时登记于 roadmap §13 回写）

### L4.3 range / fill-handle 选区模型

- Classification: `optimization candidate`（沿用 C2 回写⑮原档，C2:373；Phase 1 裁决时如需改档须记录理由）
- Why Not Blocking Closure: C2 回写⑮已重评（双前置就位后）并裁定无消费诉求时点实现属投机基础设施；spreadsheet 独立编辑器面已有 range/fill 能力
- Successor Required: `yes`
- Successor Path: D1 输入池——出现消费诉求时在 table 编辑双态矩阵之上叠加

### L4.4 hover-peek

- Classification: `watch-only residual`（Phase 1 正式裁决后生效）
- Why Not Blocking Closure: 回写⑫④ watch-only + 回写⑭① 联动面 successor: no；交互态状态源需求无消费登记
- Successor Required: `no`（归 D1 输入池按需）

### L4.11c calendar drop-target CSS / L4.11d roving helper / L4.11e command-palette 增强

- Classification: `watch-only residual`（c 预期销项核实后销项；d 触发条件未满足；e 无消费诉求）
- Why Not Blocking Closure: 各自证据见 Current Baseline 对应条目（V11a 已消费 / 回写⑫⑮ not adopted / 回写⑩ successors 无 demand）
- Successor Required: `no`

## Non-Blocking Follow-ups

- （收口时填写，或明确写无）

## Closure

Status Note: 九个 Phase 全部落地并经独立 closure audit 两轮通过（r1 issues 0B/2M/4m → 修复 → delta 复审 approved 0B/0M）：六项快赢按底座契约实现（density 三档 token 阶梯 / kanban keyboardReorder 解耦+键位覆写 / graph levelMap fill-tint 消费面 / cardTemplate bindings+params 通道 / 列拖拽接线消解死配置 / gantt selectedClass 字面字段）+ L4.10 两处 guide；五挂起项正式裁决落 roadmap §13。全量验证在案：typecheck/build/lint 40/40、test 74/74 task、check exit 0（oversized 204w/2e/2exempt 在册口径）、e2e 1598/43/2/0 零新增红（watch-only ×1 + 负载 flake ×1 隔离复跑全绿）。L4.2/L4.6 → plan 514（active）、L4.9 → plan 515（active scoping）、demand-gated 项维持登记。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26，未参与起草与执行；42 次工具调用逐 Phase live 抽查 + 测试实跑）
- Evidence: r1 verdict `issues`（0B/2M/4m）——M1 Phase 3 文本未收口 + archetype B2 G-K 注记缺失、M2 底座 §4 params 补记缺失、m1-m4 文本一致性；全部修复后 delta 复审 `approved`（0B/0M，六处逐项 file:line 核对 + 流程状态核查：audit gate 未预勾、Plan Status 未提前翻转）。审计同时实证：六契约实现零偏离、7 个新/增测试文件断言语义相符且实跑全绿（data 4/scheduling 25/graph 7/flux-react 22 聚焦子集）、验证日志与声称吻合、deferred 诚实、514/515 successor 在册。

Follow-up:

- layout-family-enhancements:58（page aside）负载 flake 为本线新观察项（全量轮失败、隔离复跑全绿）——随 QA.4 集成审计复核定性
- no remaining plan-owned work
