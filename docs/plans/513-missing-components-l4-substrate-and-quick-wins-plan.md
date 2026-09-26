# 513 Missing Components L4 — 交互残留：共享底座设计 + 裁决 + 快赢实现

> Plan Status: active
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

Status: planned
Targets: `docs/discussions/2026-09-26-l4-interaction-residual-substrate.md`、roadmap §13（裁决行）

- Item Types: `Decision`

- [ ] 底座文档落盘：六实现项 substrate 契约（density enum 词表与 token 档映射；kanban 手势配置 schema 形状与 draggable 门解耦口径；graph 语义色面与 levelMap 兼容规则；region bindings 通道形状——`render(options)` 增量可选参数不破坏既有消费方；gantt selectedClass 采纳接口口径；列拖拽排序接线 vs 死配置移除的裁定）+ 与 archetype §3.6 六条规则逐条对齐说明
- [ ] 挂起项裁决记录（带 C2 回写出处）：L4.3 → demand-gated（回写⑮）；L4.4 → watch-only residual（回写⑫④ + ⑭①）；L4.11c → 销项核实（V11a calendar.css 证据复核）；L4.11d → deferred（触发条件未满足）；L4.11e → demand-gated（无消费诉求登记）
- [ ] 独立 review 共识（fresh 子 agent）：0 Blocker / 0 Major 后才进实现 Phase

Exit Criteria:

- [ ] 底座文档含六项契约 + 五项裁决（无「待定」残留）+ review 记录在案（文档 Review 头注）
- [ ] roadmap §13 对应行已带裁决注记（L4.3/L4.4/L4.11c/d/e）

### Phase 2 - L4.1 density 语义档

Status: planned
Targets: `packages/theme-tokens/src/styles.css`、`packages/flux-renderers-data/src/schemas.ts`、`table-renderer/`

- Item Types: `Fix`、`Proof`

- [ ] theme tokens 增 `--table-row-height-compact: 32px` / `--table-row-height-relaxed: 48px`（default 档沿用既有 `--table-row-height: 40px`）
- [ ] table schema 增 `density?: 'compact' | 'default' | 'relaxed'`（Phase 1 定稿词表），行高/单元格 padding 按档消费 token；非法值归 default
- [ ] focused 单测（三档 class/token 断言 + 非法值回退）+ e2e 一条（档位切换行高程序化断言，参照 stripe P7a 口径）

Exit Criteria:

- [ ] 三档 token 在库 + table prop 接线，focused 单测与 e2e 全绿
- [ ] quick-reference 登记 density 行

### Phase 3 - L4.7 graph 节点状态色面扩展

Status: planned
Targets: `packages/flux-renderers-graph/src/`（schemas.ts、graph-node.tsx、styles.css）

- Item Types: `Fix`、`Proof`

- [ ] 数据驱动着色面扩展：按 Phase 1 裁定落地（预期：levelMap 消费面从 border-color 扩至节点填充/徽标语义色，token 驱动，`data-level` 既有语义四档保留兼容）
- [ ] focused 单测（levelMap→颜色面映射 + 既有 schema 兼容）+ e2e/程序化断言一条

Exit Criteria:

- [ ] 着色面扩展落地且既有 levelMap schema 渲染无回归（单测断言）
- [ ] archetype B2 行 G-K open 口径回写（C2 或 archetype 文档注记）

### Phase 4 - L4.5 kanban 手势 schema 配置面

Status: planned
Targets: `packages/flux-renderers-scheduling/src/kanban/`（kanban.types.ts，经包根 schemas.ts re-export；use-kanban-board-effects.ts、use-kanban-dnd.ts）

- Item Types: `Fix`、`Proof`

- [ ] 键盘重排手势 schema 配置面（按 Phase 1 定稿形状：至少支持覆盖默认键位组合），`draggable` 门与键盘重排挂接解耦（独立开关，缺省=现状）
- [ ] focused 单测（缺省零回归 + 配置生效两分支）+ e2e 断言一条

Exit Criteria:

- [ ] 缺省行为逐字节不变（既有 kanban e2e 全绿）+ 配置面生效有测试钉住
- [ ] flux-guide 或 quick-reference 登记配置面

### Phase 5 - L4.8 cardTemplate per-card params（region bindings 通道）

Status: planned
Targets: `packages/flux-core/src/types/render-fragment-types.ts`、`packages/flux-react`（region render 面）、`packages/flux-renderers-scheduling/src/kanban/kanban-card.tsx`

- Item Types: `Fix`、`Proof`

- [ ] region `render(options)` 增量承载 per-card bindings（Phase 1 定稿形状；旧位置参数消费方行为不变——Failure Path 行 3 钉住）
- [ ] kanban-card 改走 bindings 通道传 `{card, column, index}`；linear 复刻绕行回灌评估记录（回灌或不回灌的裁定 + 理由）
- [ ] focused 单测（bindings 可见性 + 旧路径回归双断言）+ e2e 一条（cardTemplate 内表达式读到 card 字段）

Exit Criteria:

- [ ] cardTemplate region 内表达式可读 card/column/index，旧 region 消费方零回归（flux-react/data 包 focused 全绿）
- [ ] 回写⑪ G-A 观察面该项销项注记（C2 或 roadmap）

### Phase 6 - L4.11a table 列拖拽排序

Status: planned
Targets: `packages/flux-renderers-data/src/`（table-column-settings.tsx、use-table-visible-columns.ts、schemas.ts）

- Item Types: `Fix`、`Proof`

- [ ] 按 Phase 1 裁定接线列拖拽排序（预期：columnSettings 浮层内拖拽重排 → `orderedColumnsStatePath` 既有顺序通道）并消解 `draggable` 死配置（接线或删除该字段，随裁定）
- [ ] focused 单测（拖拽重排→顺序持久化 + 与上移/下移按钮共存）+ e2e 一条（键盘可达的等效重排路径断言）

Exit Criteria:

- [ ] 死配置消解（grep 可证：要么接线有消费，要么 schema 字段移除）+ focused/e2e 全绿
- [ ] 回写③ G-E/G-D 观察面「列拖拽排序」子项（C2:97）销项注记

### Phase 7 - L4.11b gantt 选中态 schema 通道

Status: planned
Targets: `packages/flux-renderers-scheduling/src/gantt/`（gantt-store.ts、task 渲染面；schema 契约落点 Phase 1 定稿时列实际文件——gantt/ 目录现无独立 schemas 文件）

- Item Types: `Fix`、`Proof`

- [ ] 按 Phase 1 裁定的接口采纳（不硬套 optionRow 绑定模型；预期：task schema 增 `selectedClass` 通道或等效 schema 表达，内部 store 选中态驱动）
- [ ] focused 单测（缺省零回归 + 配置生效）+ 既有 gantt-selection-critical 防回归测试保持绿

Exit Criteria:

- [ ] schema 通道生效且有测试钉住；回写⑨ residual「selectedClass」子项销项注记

### Phase 8 - L4.10 docs-only（wizard footgun + refreshSource 姿势）

Status: planned
Targets: `flux-guide/examples/wizard-values-path.md`、`flux-guide/design-patterns/data-source.md`（或 form.md 相应节）

- Item Types: `Fix`（docs）

- [ ] wizard-values-path.md 增「未开 mountOnEnter 时离开步即丢已发布值」警示（引用 form-runtime external publication 清理语义，file:line 锚点）
- [ ] data-source 刷新姿势节：`refreshSource` scoped lookup 无父链回退的现状边界 + `component:refresh` + componentId 正解（引用 source-registry.ts:440-457 语义）
- [ ] 纯文档计划变体：pnpm test/build/lint/typecheck 不适用；`pnpm check:active-doc-code-anchors` 过（锚点有效性）

Exit Criteria:

- [ ] 两处 guide 增量落盘且与 live 代码语义一致（锚点检查通过）

### Phase 9 - 收口验证 + 登记回写

Status: planned
Targets: 全仓 + 登记面

- Item Types: `Proof`

- [ ] `pnpm typecheck` / `build` / `lint` / `test` 全绿；`pnpm check` 零新增红（oversized 以收口时 `check:oversized-code-files` 实际输出对照在册基线——最近在册 203w/2e/2exempt，512 Phase 6 拆分后 crud-renderer.tsx 691 行迁入 warn 档）；e2e 全量零新增红
- [ ] roadmap §13 L4 各行回写终态 + dev log
- [ ] L4.2/L4.6 successor plan 514 与 L4.9 plan 族在 roadmap §13 带去向注记

Exit Criteria:

- [ ] 全量验证记录于 Closure；roadmap/dev log 落盘

## Draft Review Record

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26，未参与起草；17 处 file:line 抽验全命中 + C2 回写链逐条核对）
- Verdict: `pass-with-minors`（r1：0 Blocker / 0 Major / 9 Minor，达成共识）
- Rounds: 1
- Findings addressed: 9 Minor 全部当轮落字——①Related「L3 先行完成」改时序表述；②L4.7 登记出处更正（C2 初版 G-K 行 + archetype B2，非回写⑨）；③Phase 6 销项锚点改回写③（C2:97）；④L4.3 Deferred 分类沿用回写⑮原档 optimization candidate；⑤Closure Gates 补 `pnpm check` 行；⑥Deferred 节「successor 已立项」改「登记于本 plan roadmap 回写」；⑦Phase 4/7 Targets 写实际文件路径；⑧Phase 9 oversized 口径改「实际输出对照在册基线」；⑨graph CSS 区间更正（:42/:46/:50 三规则、fill --card :23、gantt-store :25/:62）

## Closure Gates

- [ ] Phase 1 契约与裁决全部落地（无偏离裁决的实现）
- [ ] 各实现 Phase Exit Criteria 全勾
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（挂起项均有 Phase 1 正式裁决 + roadmap 注记）
- [ ] 受影响 owner docs 已同步（quick-reference / flux-guide / C2 观察面注记）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增红，oversized 实际输出对照在册基线）
- [ ] `pnpm test:e2e`（零新增红口径）

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

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待填>>
- Evidence: <<待填>>

Follow-up:

- <<收口时填写，或明确写 no remaining plan-owned work>>
