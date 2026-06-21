# E3 布局族能力补齐（flex 枚举扩展 + page aside + tabs per-tab badge/icon/mountOnEnter）

> Plan Status: completed
> Mission: components-improvement
> Work Item: E3 layout family（flex/page/tabs 子项）
> Last Reviewed: 2026-06-22
> Source: `docs/components/existing-components-improvement-roadmap.md`（E3 P2 行「flex 枚举扩展」「page aside」「tabs per-tab badge/icon」）、`docs/components/existing-components-improvement-detail.md` §E（flex L424-432 / page L436-454 / tabs L458-470）、`docs/components/{flex,page,tabs}/design.md`
> Related: `docs/plans/2026-06-21-0255-x5-flux-decision-tables-plan.md`（X5 未覆盖 flex/page/tabs，本 plan 需扩展）、`docs/plans/2026-06-22-0149-3-e3-basic-display-visual-fields-plan.md`（前序 E3 范本）

## Purpose

把 `flex` / `page` / `tabs` 三个布局族组件（同属 `flux-renderers-basic`）从**最小可用**补齐为**覆盖常见 P2 布局场景**：

- **flex**：补齐 `direction` 反向枚举（`row-reverse`/`column-reverse`）、`justify: space-evenly`、`align: baseline`、`alignContent`（多行交叉轴分布）—— 纯枚举扩展，解锁 amis flex schema 直接迁移。
- **page**：补齐 `aside` region（侧边栏布局）+ `subTitle` / `remark`（标题副文案与 info 弹层）—— 单点最大缺口，阻塞 amis page 管理布局迁移。
- **tabs**：补齐 per-tab `badge`（数值角标）、per-tab `icon`、per-tab `mountOnEnter`/`unmountOnExit`（覆盖全局 `keepMounted` 硬编码）—— 管理 UI 极常见能力。

三者同包、同结果面（布局/结构渲染增强）、同 X5 backfill 需求，合并为单 owner plan（遵循 plan guide Rule 24/26，避免 one-capability-per-plan 碎片）。

## Current Baseline

- **flex**：`packages/flux-renderers-basic/src/flex.tsx:8-57`（FlexRenderer）；`packages/flux-renderers-basic/src/schemas.ts:205-214`（FlexSchema）字段仅 `direction?: 'row' | 'column'`、`wrap?`、`align?: 'start' | 'center' | 'end' | 'stretch'`、`justify?: 'start' | 'center' | 'end' | 'between' | 'around'`、`gap?`、`className?`。**缺 `row-reverse`/`column-reverse`、`space-evenly`、`baseline`、`alignContent`**（detail §E L428）。`docs/components/flex/design.md` §2 标题为「与 AMIS 或既有产品的能力对照」，**无 Flux 决策表（X5 未覆盖）**。
- **page**：`packages/flux-renderers-basic/src/page.tsx:14-63`（PageRenderer）；`schemas.ts:12-25`（PageSchema）字段 `title/data/statusPath/body/header/footer/modalContainer` + 各 className。**完全无 `aside` region**（renderer 仅 resolve title/header/body/footer）；`page/design.md` L83 移动响应表 _提及_ aside 列但**仅文档、未实现**。**无 `subTitle`/`remark`**。`page/design.md` §2 为 AMIS 对照，**无 Flux 决策表（X5 未覆盖）**。
- **tabs**：`packages/flux-renderers-basic/src/tabs.tsx:76-240`（TabsRenderer）；`schemas.ts:81-90`（TabsItemSchema）字段 `key/value/title/label/disabled` + 3 region key；`schemas.ts:104-119`（TabsSchema）。**TabsItemSchema 无 `badge`/`icon`/`mountOnEnter`/`unmountOnExit`**；`keepMounted={true}` 在 `tabs.tsx:192` **硬编码**（非 schema 可配）。`tabs/design.md` §2 标题为「设计目标」，**无 Flux 决策表（X5 未覆盖）**。
- 三者 design.md §2 标题不一致（flex/page 用「能力对照」，tabs 用「设计目标」），X5 backfill 时统一为 Flux 决策表节。
- ui 层可用：`@nop-chaos/ui` Badge（角标）、Tooltip（remark 弹层）、Tailwind `flex-row-reverse`/`content-*`/`items-baseline`/`justify-evenly`（枚举映射）。

## Goals

- **flex**：`direction` 扩展 `'row-reverse' | 'column-reverse'`；`justify` 扩展 `'evenly'`；`align` 扩展 `'baseline'`；新增 `alignContent?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' | 'stretch'`。全部映射到 Tailwind class，缺省无回归。
- **page**：新增 `aside?: BaseSchema[]` region + `asidePosition?: 'left' | 'right'`（缺省 left）+ `asideClassName?`；新增 `subTitle?: string` + `remark?: string`（标题旁 Tooltip info）。
- **tabs**：`TabsItemSchema` 新增 `badge?: string | number`、`icon?: string`、`mountOnEnter?: boolean`、`unmountOnExit?: boolean`；后两者覆盖全局 `keepMounted`（per-tab 优先）。
- flex/page/tabs 三个 design.md 补齐 Flux 决策表节（§2，X5 扩展）。
- focused 单测覆盖：flex 枚举 class 映射、page aside region 渲染 + subTitle/remark、tabs badge/icon 渲染 + mountOnEnter 懒挂载行为。
- playground 示例 + e2e + `examples.manifest.json` 登记。

## Non-Goals

- 不实现 flex `flex-item` per-child 子类型（per-child flex/basis/grow）—— 需独立子 schema，归后续增强（Deferred）。
- 不引入 flex/page 自由 `style` 内联样式 prop —— 按 styling contract 仅 className（`docs/architecture/styling-system.md`）。
- 不实现 page `initApi`/`initFetch`/`interval`/`silentPolling` —— BY-DESIGN 请求下沉 data-source（detail §E L444）。
- 不实现 page `pullRefresh` —— 归 `mobile-roadmap.md`。
- 不实现 page `toolbar` 独立 region（amis 同时有 header 和 toolbar）—— 当前 header region 已 subsume，design.md 决策表裁定。
- 不实现 tabs `addable`/`closable`/`draggable`/`editable`/`hash`/`source`/`swipeable` —— `tabs/design.md` §3/§17/§19 已显式列举延后。
- 不实现 per-tab `reload`/`mode`/`subFormMode` —— 归后续。
- 不覆盖 input-number/tree/array-editor 等其它 E3 组件（归 Plan 2/3）。

## Scope

### In Scope

- `FlexSchema` 扩展 direction/justify/align 枚举 + 新增 `alignContent`。
- `PageSchema` 新增 `aside`/`asidePosition`/`asideClassName`/`subTitle`/`remark`；PageRenderer resolve aside region + 布局（main + aside）。
- `TabsItemSchema` 新增 `badge`/`icon`/`mountOnEnter`/`unmountOnExit`；TabsRenderer per-tab 渲染 badge/icon + mountOnEnter/unmountOnExit 覆盖 keepMounted。
- flex/page/tabs design.md 新建 Flux 决策表节（§2）。
- focused 单测（RED→GREEN）。
- playground 示例 + `examples.manifest.json` 登记 + e2e。

### Out Of Scope

- flex `flex-item` per-child 子类型（Deferred）。
- page 请求/轮询/toolbar 独立 region/pullRefresh（BY-DESIGN 或归 mobile-roadmap）。
- tabs addable/closable/draggable/editable/hash/source（design.md 已延后）。
- 自由 `style` prop（styling contract 禁止）。

## Failure Paths

| 场景编号                   | 触发                                                       | 行为                                                                | 可重试 | 用户可见表现        |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- | ------ | ------------------- |
| page-aside-empty           | `aside` region 配了但渲染为空                              | aside 列仍占位（或 design.md 裁定空时折叠）                         | 否     | 侧边栏空白或折叠    |
| tabs-badge-invalid         | `badge` 非数字非字符串（如对象）                           | `String(badge)` 兜底渲染，不抛错                                    | 否     | 角标显示字符串化值  |
| tabs-mountOnEnter-conflict | 同一 tab 同时配 `mountOnEnter:true` + `unmountOnExit:true` | design.md 裁定优先级（mountOnEnter 优先：首次进入才挂载，离开卸载） | 否     | tab 切换时挂载/卸载 |
| flex-enum-unknown          | align/justify 传入未知值                                   | 缺省回退（不应用 class），不抛错                                    | 否     | 布局回退默认        |

## Test Strategy

本档选择：`建议有测`

理由：flex 枚举是纯 class 映射（断言 class 应用即可观测）；page aside 是 region 渲染（断言 DOM 结构）；tabs badge/icon 是渲染产物（断言 marker 存在）；mountOnEnter/unmountOnExit 是挂载行为（断言 inactive tab content 是否在 DOM）。均可在 jsdom 中观测，不需像素级视觉回归。选「建议有测」：focused 单测覆盖可断言逻辑，e2e 覆盖关键交互路径。

## Execution Plan

### Phase 1 - X5 决策表扩展 + 关键裁定

Status: completed
Targets: `docs/components/flex/design.md`、`docs/components/page/design.md`、`docs/components/tabs/design.md`

- Item Types: `Decision`、`Fix`

- [x] **Fix**：`flex/design.md` 新建 §2 Flux 决策表节（统一标题，替换原「能力对照」），列：`direction` reverse（实现）、`justify: evenly`（实现）、`align: baseline`（实现）、`alignContent`（实现）、`flex-item` per-child（不采纳/后续 + 理由）、自由 `style`（不采纳 + styling contract 理由）、amis `draggable`（不采纳 + 理由）。
- [x] **Fix**：`page/design.md` 新建 §2 Flux 决策表节，列：`aside` region（实现）、`asidePosition`（实现）、`subTitle`/`remark`（实现）、`initApi`/`interval`/polling（不采纳 + 请求下沉 data-source 理由）、`toolbar` 独立 region（不采纳 + header subsume 理由）、`pullRefresh`（归 mobile-roadmap）、`css`/`cssVars`（不采纳 + 理由）。
- [x] **Fix**：`tabs/design.md` 新建 §2 Flux 决策表节，列：per-tab `badge`（实现）、per-tab `icon`（实现）、per-tab `mountOnEnter`/`unmountOnExit`（实现）、`addable`/`closable`/`draggable`/`editable`/`hash`/`source`（不采纳/后续 + 理由，引用 §3/§17/§19 已有裁定）。
- [x] **Decision**：裁定 `alignContent` 与 `align` 的语义边界 —— `align` 单行交叉轴、`alignContent` 多行交叉轴（与 CSS flex 一致）。结论写入 `flex/design.md`。
- [x] **Decision**：裁定 page aside 布局 —— aside 与 body 用 CSS grid/flex 双列；`asidePosition: right` 时 aside 在主内容右侧。空 aside 是否折叠（裁定：region 配了但渲染为空时折叠，避免空白列）。结论写入 `page/design.md`。
- [x] **Decision**：裁定 `mountOnEnter`/`unmountOnExit` 优先级 —— 同时配时 mountOnEnter 优先（首次进入才挂载）；全局 keepMounted=true 作为缺省，per-tab 字段覆盖。结论写入 `tabs/design.md`。

Exit Criteria:

- [x] 三个 design.md 各含 §2 Flux 决策表节（live repo 可读，列含采纳/不采纳/理由）。
- [x] alignContent/aside 布局/mountOnEnter 优先级三条 Decision 结论明确，无歧义。

### Phase 2 - Focused Proof（RED 基线）

Status: completed
Targets: `packages/flux-renderers-basic/src/__tests__/layout-family-enhancements.test.tsx`（新建）

- Item Types: `Proof`

- [x] 新建测试文件，先写失败用例（RED）：
  - flex `direction: 'row-reverse'` → 根节点应用 `flex-row-reverse` class。
  - flex `justify: 'evenly'` → `justify-evenly`；`align: 'baseline'` → `items-baseline`；`alignContent: 'center'` → `content-center`。
  - flex 缺省 → 无 reverse/evenly/baseline/content class（无回归）。
  - page `aside` 配 region → DOM 含 aside 列（marker `data-slot="page-aside"`）；`asidePosition: 'right'` → aside 在 body 之后。
  - page `subTitle` → 标题区含副文案（marker `data-slot="page-subtitle"`）；`remark` → 含 Tooltip 触发（marker `data-slot="page-remark"`）。
  - page 无 aside → 不渲染 aside 列（无回归）。
  - tabs item `badge: 5` → tab trigger 含角标（marker `data-slot="tab-badge"`）。
  - tabs item `icon: 'user'` → tab trigger 含图标（marker `data-slot="tab-icon"`）。
  - tabs item `mountOnEnter: true` → inactive tab content 不在 DOM（首次切到才挂载）。
  - tabs item `unmountOnExit: true` → 切走后 content 卸载。
  - tabs 缺省 → keepMounted=true 行为不变（inactive content 在 DOM，无回归）。

Exit Criteria:

- [x] 测试文件存在，运行全部 RED（断言未实现行为）。
- [x] 用例覆盖 Goals 中三组件所有可观测行为 + Failure Path。

### Phase 3 - schema + runtime 实现（GREEN）

Status: completed
Targets: `packages/flux-renderers-basic/src/schemas.ts`、`packages/flux-renderers-basic/src/flex.tsx`、`packages/flux-renderers-basic/src/page.tsx`、`packages/flux-renderers-basic/src/tabs.tsx`、`packages/flux-renderers-basic/src/basic-renderer-definitions.ts`

- Item Types: `Fix`

- [x] `schemas.ts`：`FlexSchema` direction 加 `'row-reverse' | 'column-reverse'`、justify 加 `'evenly'`、align 加 `'baseline'`、新增 `alignContent?`；`PageSchema` 新增 `aside?`/`asidePosition?`/`asideClassName?`/`subTitle?`/`remark?`；`TabsItemSchema` 新增 `badge?`/`icon?`/`mountOnEnter?`/`unmountOnExit?`。
- [x] `flex.tsx`：FlexRenderer 读新枚举，映射到 Tailwind class（`flex-row-reverse`/`flex-col-reverse`/`justify-evenly`/`items-baseline`/`content-*`），缺省回退。
- [x] `page.tsx`：PageRenderer resolve `aside` region + 双列布局（asidePosition left/right）；渲染 subTitle + remark（Tooltip）；空 aside 折叠（按 Phase 1 Decision）。
- [x] `tabs.tsx`：TabsRenderer per-tab 渲染 badge（Badge 组件）+ icon（resolveLucideIcon）；mountOnEnter/unmountOnExit 覆盖全局 keepMounted（按 Phase 1 Decision 优先级）。
- [x] `basic-renderer-definitions.ts`：page renderer definition 的 fields 注册 `aside` region；tabs items.nestedRegions 无需改（badge/icon 是 prop 非 region）。
- [x] Phase 2 RED 用例全部转 GREEN。

Exit Criteria:

- [x] Phase 2 全部用例 GREEN；既有 flux-renderers-basic 测试套件无回归。
- [x] live repo 核对：FlexRenderer/PageRenderer/TabsRenderer 真实读新字段（grep 非空），runtime 路径调用渲染逻辑（非空壳）。
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-basic typecheck`）。

### Phase 4 - owner-doc 同步与 playground 示例

Status: completed
Targets: `docs/components/{flex,page,tabs}/design.md`、`apps/playground/src/`、`docs/components/examples.manifest.json`

- Item Types: `Fix`

- [x] flex/page/tabs design.md §4（schema）/§5（字段分类）/§10（DOM marker）同步落地内容，与 runtime 一致。
- [x] playground 新增「布局族能力补齐」示例页（演示 flex 反向/evenly/baseline/alignContent、page aside + subTitle/remark、tabs badge/icon + mountOnEnter），注册路由。
- [x] `examples.manifest.json` 登记新示例。（flex/page/tabs 已在 runtime 列表；playground 路由经 route-model.ts DOMAIN_RENDERER_ROUTES 登记 `layout-family-enhancements`。）
- [x] **e2e**：新增 `tests/e2e/layout-family-enhancements.spec.ts`，覆盖 flex 枚举 class 应用、page aside region 渲染 + subTitle/remark、tabs badge/icon + mountOnEnter 懒挂载的关键交互路径（满足 roadmap Cross-Cutting「每个工作项必须有 e2e」硬约束）。

Exit Criteria:

- [x] 三个 design.md §4/§5/§10 与 runtime 一致（live repo 可读）。
- [x] playground 示例页存在且路由可访问；`examples.manifest.json` 含新条目。
- [x] `tests/e2e/layout-family-enhancements.spec.ts` 存在并覆盖关键交互路径。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，ses_114528789ffe5ziS6HyedfubsI）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor（Phase 4 Exit Criteria 漏 e2e 勾选项）→ 已在 Phase 4 Exit Criteria 补 `tests/e2e/layout-family-enhancements.spec.ts` 条目（Closure Gates 原已覆盖，此处补 Phase 内对称）。
  - Minor（Non-Goals「归 Plan 2/3」前向引用）→ 保留：successor plan 已与本 plan 同批创建（Plan 2 input-number/array-editor、Plan 3 tree），引用成立。
  - Minor（page design.md §2 标题简写）→ 无语义影响，保留。
  - 引用准确性：flex.tsx:8-57、schemas.ts:205-214/12-25/81-90/104-119、page.tsx:14-63、tabs.tsx:76-240/192、三 design.md §2 标题与缺 Flux 决策表、flux-renderers-layout 包不存在（组件在 flux-renderers-basic）全部经 live repo 核对属实。
- 共识：零 Blocker、零 Major，Plan Status 升级为 `active`。

## Closure Gates

- [x] flex 枚举扩展（direction/justify/align/alignContent）已落地且 focused 测试 GREEN
- [x] page aside region + subTitle/remark 已落地且 focused 测试 GREEN
- [x] tabs per-tab badge/icon/mountOnEnter/unmountOnExit 已落地且 focused 测试 GREEN
- [x] flex/page/tabs 三个 design.md 含 Flux 决策表（X5 扩展完成）
- [x] 缺省回退无回归（既有 flux-renderers-basic 测试套件全过）
- [x] playground 示例 + `examples.manifest.json` 登记
- [x] `tests/e2e/layout-family-enhancements.spec.ts` 存在并覆盖关键交互路径
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs（design.md §2/§4/§5/§10）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### flex `flex-item` per-child 子类型

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: per-child flex/basis/grow 需独立子 schema（子节点声明弹性参数），与当前 region-only body 模型不同架构；当前可用嵌套 flex + className 组合绕过。归后续独立增强。
- Successor Required: no

### page `toolbar` 独立 region

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 当前 `header` region 已 subsume toolbar 用途（amis 同时有 header 和 toolbar 是历史包袱）；design.md 决策表裁定 header subsume。
- Successor Required: no

## Non-Blocking Follow-ups

- tabs `addable`/`closable`/`draggable`/`editable`/`hash`/`source` 归后续评估（`tabs/design.md` §3/§17/§19 已显式列举延后理由）。
- page `pullRefresh` 归 `mobile-roadmap.md`。
- flex/page 自由 `style` prop 显式拒绝（styling contract）。

## Closure

Status Note: All 4 Phases completed. flex enum extensions (direction reverse/justify evenly/align baseline/alignContent) + page aside region + subTitle/remark + tabs per-tab badge/icon/mountOnEnter/unmountOnExit landed in `flux-renderers-basic` with focused unit tests (22 GREEN), e2e (9 specs), design.md §2/§4/§5/§10 synced. Full workspace typecheck/build/lint/test pass (49/49 tasks).

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit 子 agent（fresh session，未复用执行者上下文）
- Evidence: 独立核对 live repo（非信任 `[x]` 标记）——
  - `schemas.ts`: FlexSchema direction 含 `row-reverse`/`column-reverse`、justify 含 `evenly`、align 含 `baseline`、新增 `alignContent`（L214-224）；PageSchema 含 `aside`/`asidePosition`/`asideClassName`/`subTitle`/`remark`（L12-30）；TabsItemSchema 含 `badge`/`icon`/`mountOnEnter`/`unmountOnExit`（L86-99）。
  - `flex.tsx`: 真实 `FLEX_ALIGN_CONTENT_CLASS_MAP` + `cn()` 应用，非空壳（L25-33/48-51）。
  - `page.tsx`: 真实 aside region 渲染（`data-slot="page-aside"`）、subTitle（`data-slot="page-subtitle"`）、remark（`Tooltip`+`data-slot="page-remark"`）、空 aside 折叠（`hasAside` 判定），均 runtime 可达（L46-104）。
  - `tabs.tsx`: `resolveTabBadge`（Badge + String 兜底）、`resolveTabIcon`（resolveLucideIcon）、`resolveTabKeepMounted`（mountOnEnter 优先 + activated-set 追踪），非空壳（L84-119/223-237/257-262）。
  - `basic-renderer-definitions.ts`: page fields 注册 `aside` region + `asidePosition`/`subTitle`/`remark` prop（L37/40）。
  - 测试：`__tests__/layout-family-enhancements.test.tsx`（22 用例，覆盖三组件可观测行为 + Failure Path + 无回归）；`tests/e2e/layout-family-enhancements.spec.ts`（9 specs，DOM class/data-slot/懒挂载断言）。
  - owner-doc：flex/page/tabs 三 design.md §2 含 Flux 决策表 + Decision；§4/§5/§10 与 runtime 一致。
  - Five-point consistency：Plan Status `completed` / 4 Phase 全 `completed` / 全 Exit Criteria `[x]` / Closure Gates 全 `[x]`（本 audit 勾选后）/ `docs/logs/2026/06-22.md` 收口记录一致。
  - Deferred honesty：flex `flex-item` per-child、page `toolbar` 独立 region 均为 `out-of-scope improvement` 且附 `Why Not Blocking Closure`；Non-Blocking Follow-ups（tabs addable/closable/draggable/editable/hash/source、page pullRefresh 归 mobile-roadmap、flex/page 自由 style 拒绝）无 in-scope live defect 静默降级。
  - daily log: `docs/logs/2026/06-22.md` L3-25 已记录全 4 Phase 落地 + 验证输出（typecheck 49/49、build 26/26、lint 26/26、test 49/49；flux-renderers-basic 26 files/317 tests 全绿）。

Follow-up:

- 无剩余 plan-owned work。Non-Blocking Follow-ups（tabs addable/closable/draggable/editable/hash/source 归后续评估、page pullRefresh 归 mobile-roadmap、flex/page 自由 style 显式拒绝）已在对应章节记录，无 confirmed live defect 残留。
