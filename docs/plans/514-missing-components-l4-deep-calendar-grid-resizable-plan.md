# 514 Missing Components L4 深化 — calendar 6 周格视图档（L4.2）+ Resizable schema 化（L4.6）

> Plan Status: completed
> Last Reviewed: 2026-09-26
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §7（L4.2/L4.6 行）；`docs/analysis/ui-review/C1-complex-page-conceptions.md:36`（G-J）/ C2 裁决表 :31-32；`docs/analysis/visual-quality/V11a-scheduling.md`（A3 否决先例）；`docs/analysis/ui-review/D2-closure.md:72`（Open candidates #12）
> Related: `docs/plans/513-missing-components-l4-substrate-and-quick-wins-plan.md`（同线快赢先行）；`docs/discussions/2026-09-26-l4-interaction-residual-substrate.md`（L4 底座文档——本计划两项不沿用其契约，各自独立立约）

## Purpose

收口 roadmap L4 线两个被 plan 513 显式移交的 M~L 项：L4.2（calendar Booker 式 6 周竖网格视图档 + date-cell 选中 API——需正面重裁 V11a A3 否决先例）与 L4.6（Resizable 面板 schema 化——需裁定新 type vs 布局语义字段路由 + 与三处 bespoke pointer-resize 的统一口径）。**design-first：Phase 1 裁决未过独立 review 前，不写任何实现代码**（roadmap Rule 3：若裁定走新 renderer type，matrix flip human gate 前置——用户 2026-09-26「执行 roadmap 直到彻底完成」指令为概括放行依据，先例 plan 510:80（human 签认 checklist 项））。

## Current Baseline

2026-09-26 live repo 核对（继承 plan 513 起草期两轮独立只读调研 + 本计划起草复核）：

- **L4.2 calendar 现状**：calendar renderer 在 `packages/flux-renderers-scheduling/src/calendar/`；视图三档 month/week/day（calendar.tsx:25-27,68）。月视图 = 资源行 × 当月日期列矩阵（calendar-month-view.tsx:66-67 `getMonthStartEnd`，calendar-date-utils.ts:5-41——28-31 列，无相邻月补位、无周行堆叠）。cell 点击只有事件块/溢出展开语义；日期变更唯一内建通道 = header 导航 `onDateChange`（calendar.tsx:112-118，`dateOwnership:'scope'` 写 scope，e2e 已锁）。长按拖拽创建（use-calendar-drag-create）与键盘创建入口在库。**empty 早退门**：calendar.tsx:432-445 在 events/resources 均空时于任何视图渲染前返回 empty placeholder——grid 档定位为纯日期选择面（零事件 schema 亦应渲染），与该门的裁定关系归 Phase 1 显式裁决（绕过或要求空资源）。
- **V11a A3 否决先例**：`V11a-scheduling.md:26,99,108` + calendar design.md §12 曾把 6 周网格判为「通用月历形态、与排班矩阵设计意图相悖」而显式否决。L4.2 若实现必须以「**新增视图档**（与资源矩阵并存、不改既有月视图语义）」重裁，不能沿用或推翻旧月视图。
- **Notion 复刻先例**：notion 复刻的自绘六周竖网格（container grid + loop）无 renderer 事件面（回写⑥）——形态参照物在库但非产品能力。
- **L4.6 现状**：`packages/ui/src/components/ui/resizable.tsx`（react-resizable-panels 薄包装：ResizablePanelGroup/Panel/Handle + `withHandle`），全仓唯一消费该库处；**任何 renderer 均未注册 resizable type**；playground 零使用。现存「可拖拽分栏」全部 bespoke：workbench-shell.tsx:112-180（left/rightResizable + pointer capture）、designer-page-body.tsx:507,523（palette/inspector）、dashboard-editor-renderer.tsx:366,373。
- **G-J 登记链**：C1:36（「ui 有原语且 AGENTS.md 已宣传，schema 层无 renderer type」）→ C2 裁决表 :31（L3、构想库存）→ D2 closure :72（#12「后续 roadmap 立项」）——本计划即该「后续立项」。
- **依赖底座**：flow-designer canvas-adapters 先例（docs/architecture/flow-designer/canvas-adapters.md）；renderer 注册面（definition + propContracts + defaultSchema 模式）；condition-builder 表单式属性面板先例（若 inspector 需求出现）。

## Goals

- Phase 1 一份双项裁决文档落盘 `docs/discussions/2026-09-26-l4-2-l4-6-calendar-grid-and-resizable-adjudication.md`：
  - **L4.2**：V11a A3 关系重裁（预期：新增 `monthShape: 'resource' | 'grid'` 视图档语义——resource 为缺省且语义不变；grid 档 = 6 周固定 42 格竖网格 + date-cell 选中事件 `onDateSelect` + `dateOwnership` 贯通 + 相邻月补位规则）；date-cell 键盘可达性口径。
  - **L4.6**：路由裁定（预期候选：①布局 renderer 新 type `resizable`（走 matrix flip）vs ②既有布局容器（flex/panel）增 `resizablePanes` 语义字段 vs ③page 级 slot 语义）+ 方向/默认尺寸/min-max/持久化字段面 + 三处 bespoke 实现的统一口径（迁移 or 保留声明豁免）+ inspector/属性面是否进 MVP。
  - 独立 review 共识（0B/0M）后才进实现 Phase。
- Phase 2（L4.2 实现）：grid 视图档 + date-cell 选中 + focused 单测 + e2e。
- Phase 3（L4.6 实现）：按 Phase 1 裁定路由落地 + focused 单测 + e2e。
- Phase 4：登记（quick-reference / flux-guide schema 节 / calendar design.md §12 与 V11a 注记回写）+ 收口全量验证 + roadmap §13 回写。

## Non-Goals

- 不改既有 calendar month（resource 矩阵）/week/day 视图语义与 e2e 钉住行为。
- 不迁移 workbench/flow-designer/dashboard bespoke pointer-resize 内部实现（除非 Phase 1 明确裁定迁移并给出窗口；缺省登记声明豁免）。
- 不做 drag-and-drop 式布局编辑器（canvas 编排归 L6 标准设计器线）。
- 不实现 calendar 事件块的 grid 档复用语义（grid 档是日期选择面，非排班面——事件渲染归 resource 档）。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/calendar/`（视图档 + 选中 API）、`packages/flux-renderers-layout` 或 `packages/flux-renderers-basic`（L4.6 路由落地包随 Phase 1 定）、`packages/ui`（必要时 resizable 包装增强）、theme-tokens、flux-guide、quick-reference、calendar/resizable design.md（若落 design.md 族）、roadmap §13。

### Out Of Scope

- flow-designer/report-designer 等设计器内部布局改造。
- 移动端 wheel/手势变体（calendar 移动形态归 mobile 包既有模式）。

## Failure Paths

| 可测场景编号                | 触发                          | 行为                                                                          | 可重试 | 用户可见表现        |
| --------------------------- | ----------------------------- | ----------------------------------------------------------------------------- | ------ | ------------------- |
| grid-month-boundary         | grid 档跨月补位日被点击       | 选中语义带完整日期值（含年月），跳转行为按 Phase 1 裁定（切换月份 or 仅高亮） | 是     | 高亮 + 事件派发正确 |
| resizable-schema-invalid    | min>max / sizes 不归一        | 归一化/钳制到合法域，不崩                                                     | 是     | 最近合法布局        |
| legacy-schema-no-monthShape | 既有 calendar schema 无新字段 | resource 档语义逐字节不变                                                     | —      | 无变化              |
| resizable-persist-conflict  | 持久化 layout 读取失败/损坏   | 回落 default sizes                                                            | 是     | 默认布局            |

## Test Strategy

档位选择：**必须自动化**（roadmap §10 预声明）。Phase 1 为纯文档裁决（不适用档）；实现 Phase 各带 focused 单测（先红后绿姿势）+ e2e 程序化断言。

## Execution Plan

### Phase 1 - 双项裁决文档 + 独立 review（design gate）

Status: completed
Targets: `docs/discussions/2026-09-26-l4-2-l4-6-calendar-grid-and-resizable-adjudication.md`、（若裁定新 type）`docs/components/amis-baseline-matrix.md` flip 预记录

- Item Types: `Decision`

- [x] L4.2 裁决：monthShape 双档语义、grid 档 42 格补位规则、onDateSelect 事件形状（payload `{date, inMonth}`；**显式不接 dateOwnership**——选中≠导航，裁决 1.4）、键盘可达性、与既有视图/e2e 的兼容红线（含 calendar.tsx:432-445 empty 门对 grid 档的处置——绕过或要求空资源）
- [x] L4.6 裁决：**新 flux-native 布局 type `resizable` 落 flux-renderers-layout**；schema 字段面（direction/panels/persistStatePath + schema↔底层 API 名映射）；bespoke 三处**保留声明豁免**；matrix flip **不需要**（非 AMIS 基线类型，keyboard/batch-bar 先例——514 plan 的 flip 条款落空并记录）
- [x] 独立 review 共识（fresh 子 agent，0B/0M）记录于文档 Review 头注（通过（有保留意见）+ 4 minor 当轮落字）

Exit Criteria:

- [x] 裁决文档含两项目录级决定（无「待定」残留）+ review 记录在案（Review 头注三轮记录齐）
- [x] matrix flip（如触发）落盘并有放行依据注记——裁定**不触发**（非 AMIS 基线类型，零先行例核验）

### Phase 2 - L4.2 calendar grid 视图档 + date-cell 选中

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/`（calendar.tsx、utils/calendar-date-utils.ts、新 grid-view 组件、calendar.types.ts——schemas.ts 为 re-export）

- Item Types: `Fix`、`Proof`

- [x] monthShape 双档落地（Phase 1 契约）：calendar-grid-view.tsx 新组件（42 格 + `data-outside-month` 补位 + `data-today`/`data-selected` 标记）+ getSixWeekGrid util + calendar.tsx month 分支分流 + empty 门 grid 绕过 + body region 优先级保持
- [x] onDateSelect 事件（payload {date, inMonth}，eventCtx 分发；显式不接 dateOwnership——Phase 1 裁决 1.4）+ 键盘可达（button gridcell 结构，focus + Enter/Space）
- [x] focused 单测（calendar-grid.test.tsx ×4：42 格数学/补位标记/选中派发/缺省零回归含 empty 门）+ e2e（calendar-grid-shape.spec.ts：42 cell + 补位 + 选中标记；lab 新增 grid 场景）

Exit Criteria:

- [x] 既有 calendar e2e 全绿（calendar-demo + cal-replica-interactions 22/22）+ grid 档新断言全绿
- [x] 重裁记录落盘（裁决文档 §1.1 V11a A3 关系；flux-guide monthShape 节引导——calendar/design.md 属历史 design doc 家族，快照不改）

### Phase 3 - L4.6 Resizable schema 化（按 Phase 1 路由）

Status: completed
Targets: 随 Phase 1 裁定（布局包 + ui 包装 + playground demo）

- Item Types: `Fix`、`Proof`

- [x] schema 面（direction/panels/persistStatePath——百分比尺寸语义，percent 字符串传参）+ 渲染面接线（resizable-renderer.tsx 消费 ui ResizablePanelGroup；meta 属性挂外层 div——panels 库覆写 group testid）+ `resizableRendererDefinition` 注册
- [x] playground 演示 entry：resizable-lab-page.tsx + renderer-lab-registry + layout-renderer-routes 路由项（L0 注册表自动露出）+ focused 单测 ×2 + e2e（resizable-layout.spec.ts：键盘方向键 resize 收缩断言——初始布局可能落在 max 钳制位，收缩方向确定性更高）
- [x] 交付铁律登记：docs/components/resizable/design.md（12 节）+ example.json + examples.manifest.json runtime 项 + quick-reference Layout Extensions 节 + flux-guide 07 resizable/monthShape 两节

Exit Criteria:

- [x] 落地路由与 Phase 1 裁定一致（新 type 落 flux-renderers-layout）；focused/e2e 全绿（layout 138/138）；AGENTS.md ui Resizable 宣传与 schema 面对齐（可声明）

### Phase 4 - 收口验证 + 登记

Status: completed
Targets: 全仓 + 登记面

- Item Types: `Proof`

- [x] `pnpm typecheck` / `build` / `lint` / `test` 全绿（40/40 ×3 + 74/74 task；途中三次门禁红均当场消解——calendar-grid-view index-key lint error、layout-renderer-definitions.ts 701 行越 700 阈值（resizable 定义拆独立文件 resizable-renderer-definition.ts，主文件 640 行）、未使用 import）；`pnpm check` 零新增红（205w/2e/2exempt 在册口径）；e2e 全量（44.9m）**1574 passed / 43 skipped / 3 failed / 3 flaky**——3 失败 = gantt flake 家族 ×2（bars-and-links:131、demo:69，隔离复跑全绿）+ kanban-perf:34（在册 watch-only），零新增红
- [x] 登记：quick-reference Layout Extensions 节（ResizableSchema + calendar monthShape 两行）+ flux-guide 07 structural-nodes 两节 + docs/components/resizable/design.md（12 节）+ example.json + examples.manifest.json + roadmap §13 L4.2/L4.6 done 回写 + dev log

Exit Criteria:

- [x] 全量验证记录于 Closure；登记面 grep 复核命中；roadmap/dev log 落盘

## Draft Review Record

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26，未参与起草；18 处引用抽查 16 精确命中）
- Verdict: `pass-with-minors`（r1：0 Blocker / 0 Major / 4 Minor，达成共识）
- Rounds: 1
- Findings addressed: 4 Minor 全部当轮落字——①calendar-month-view.tsx 指位 :68-69 → :66-67；②「plan 510 §6」→「plan 510:80」；③calendar.tsx:432-445 empty 早退门写入 Current Baseline 并列入 Phase 1 L4.2 裁决 checklist；④Phase 2 Targets schemas → calendar.types.ts（re-export 注记）

## Closure Gates

- [x] Phase 1 裁决全部落地（无偏离裁定的实现；matrix flip 裁定不触发——非 AMIS 基线类型；两处实施勘误——尺寸语义终裁百分比（flex-grow 误判已更正）、resizable 定义独立文件——已回写裁决文档/plan）
- [x] 各实现 Phase Exit Criteria 全勾
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（bespoke 迁移豁免为 Deferred 节登记项）
- [x] 受影响 owner docs 已同步（resizable design.md / quick-reference / flux-guide / 裁决文档）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（r1 `issues` 0B/3M/3m → 全部修复 → delta 复审 1M 修字销项后准予 completed，2026-09-26）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增红）
- [x] `pnpm test:e2e`（零新增红口径）

## Deferred But Adjudicated

### bespoke pointer-resize 迁移（workbench/flow-designer/dashboard 三处）

- Classification: `watch-only residual`（Phase 1 缺省裁定为声明豁免、不迁移）
- Why Not Blocking Closure: 三处为设计器/workbench 内部 UI（非 schema 面），迁移无消费者价值且回归面大
- Successor Required: `no`（若 Phase 1 裁定迁移则本条改写）

## Non-Blocking Follow-ups

- （收口时填写，或明确写无）

## Closure

Status Note: 四个 Phase 全部落地并经独立 closure audit 两轮通过（r1 issues 0B/3M/3m → 修复 → delta 复审 1M 修字销项后准予 completed）：L4.2 calendar `monthShape: 'grid'` 6 周选择网格（42 格、补位标记、onDateSelect 选中≠导航、empty 门绕过、V11a A3 重裁并存档）+ L4.6 `resizable` 新布局 type（flux-renderers-layout，百分比尺寸语义终裁，键盘/指针 resize、持久化种子与钳制纯函数单测、matrix flip 不触发裁定；bespoke 三处豁免登记）。全量验证：typecheck/build/lint 40/40、test 74/74、check exit 0（205w 在册口径）、e2e 1574/43/3/3 零新增红（gantt flake 家族 ×2 隔离复跑全绿 + watch-only ×1）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26，两轮）
- Evidence: r1 verdict `issues`（0B/3M/3m——尺寸单位 contract drift / roadmap done 与 dev log 未落盘 / 探针违规 + 三 minor）→ 全部修复（percent 终裁五处字面对齐、roadmap §13 L4.2/L4.6 done 回写、dev log 全量条目、normalizePersistedSizes 提取 + ×2 单测、e2e 标题更正、weekday role 结构）→ delta 复审确认 r1 五处关闭、余 1M 为 5 处字面残留 → 修字后销项，准予 completed（无需第三轮）。审计实核：Phase 2 全链 live 命中、注册链齐、matrix 零先行例实测、verify4 EXIT=0、e2e 台账一致。

Follow-up:

- no remaining plan-owned work（S3+ 归 L6 主线后续阶段）
