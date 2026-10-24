# 729 Arc G7I — `image-compare` 实现

> Plan Status: completed
> Last Reviewed: 2026-10-24（R1 revised：M1 pointer 拖拽裁决为单测 stub getBoundingClientRect + pointer 序列钉住换算与 clamp（选项 a）；M2 INV 补 Checklist E/F/G；minors——i18n 键点名 flux.common.noData/loading、object-fit contain 判别、vertical 键盘断言、lab 落点路径、design.md 728 'retained'→'runtime' 措辞勘误——全部采纳）
> Source: `docs/backlog/arc-component-gap-roadmap.md` §6 Wave 4 G7I（依赖 G7D `done`，plan 728）
> Related: 协议权威 `docs/components/image-compare/design.md`（plan 728 定稿；matrix 行已获人工批准 flip 为 `runtime`）
> Gate: CC2 人工门禁已解除（用户 2026-10-24 批准 flip）；CC3 前置 = 本 plan 内完成 new-renderer-introduction-audit 全量 INV 审计记录

## Purpose

按 G7D 协议实现 `image-compare` 新 type：双图叠加 + clip-path 裁切 + pointer/键盘分隔线交互 + focused 单测 + example/lab/e2e + INV 审计 + 登记收口。

## Current Baseline（live 实测 2026-10-24）

- 协议权威 `docs/components/image-compare/design.md`（十二节定稿）；matrix `image-compare | runtime`（人工 flip 已落）。
- `packages/flux-renderers-content/src/image.tsx`：加载/错误降级约定参照；`content-renderer-definitions.ts`（definition 注册点）、`schemas.ts`（schema 文件）。
- 测试先例：`image.test.tsx`；data/content lab 注册于 `apps/playground/src/component-lab/renderer-lab-registry.ts`。

## Goals

- `image-compare` renderer：双 img 叠加（after 为 base，before 为 overlay clip-path 裁切）+ divider/handle；pointer capture 拖拽（boundingRect 换算百分比 clamp [0,100]）；键盘 `role="slider"`（aria-label/valuemin/max/now；horizontal Left/Right、vertical Up/Down ±1，PageUp/Down ±10，Home/End 0/100）；`defaultPosition` 播种 clamp。
- 加载降级：双图独立 onError → 失败侧占位错误（`data-slot="image-compare-error"`），不阻断另一侧。
- 判别/回归单测 + example.json + lab 场景 + e2e + INV 审计 + 登记收口。

## Non-Goals

- RTL、`onPositionChange`、角标文案（design.md §12 后续候选）；零新依赖、零新 i18n key（错误文案复用既有 image 降级键或 `flux.common.*`）。

## Scope

### In Scope

- `packages/flux-renderers-content/src/image-compare.tsx`（新组件，自绘）
- `packages/flux-renderers-content/src/schemas.ts`（`ImageCompareSchema`）
- `packages/flux-renderers-content/src/content-renderer-definitions.ts`（definition 注册）
- `packages/flux-renderers-content/src/image-compare.test.tsx`（新 focused 单测）
- `docs/components/image-compare/example.json`（新——`runtime` 状态要求 owner doc + example）
- lab 场景 + e2e
- `docs/backlog/arc-component-gap-roadmap.md`（§2/§6 G7I 回写随 closure commit）

### Out Of Scope

- `packages/ui/`；其他 renderer；INV-2（无新 IO 类型）。

## INV 审计（CC3，new-renderer-introduction-audit 全量）

- INV-1 IO 边界：图片 URL 经 schema value 注入、由宿主环境 `<img src>` 展示——无组件级 fetch（设计约束）、无 env 通道新消费。PASS
- INV-2 新 IO 类型：无。PASS
- INV-3 复用：降级文案/骨架复用既有 image 约定；无重造 runtime 能力。PASS
- INV-4 内部 state：分隔线位置为组件 local UI state，不进 schema-visible scope。PASS
- INV-5 契约：标准 `RendererComponentProps<ImageCompareSchema>`，props.props 读值、meta.className/testid 消费。PASS
- Checklist E 扩展点边界：无 slots/regions 参数化（首版无 regions），无扩展点旁路。PASS
- Checklist F 样式边界：widget 自样式（media 控件），marker `nop-image-compare` + data-slot 锚；无 Tailwind 契约违例（对照 styling-system Renderer Styling Contract）。PASS
- Checklist G 包结构：落入既有 `flux-renderers-content` 包（单一 src 入口、workspace 依赖零新增、tests colocated）。PASS（不适用项：无）
- 登记面：definition fields（before/after/alt value、defaultPosition/orientation prop）、example.json、docs/components/index.md、quick-reference 核对。

## Failure Paths

- 双图各自加载失败：失败侧 error 占位，另一侧正常（§7 契约，测试钉住）。
- `defaultPosition` 越界：clamp [0,100]（测试钉住）。

## Test Strategy

本档选择：`必须自动化`（渲染契约 + 交互 + 降级）：

- 判别组：`image-compare` schema → 根 marker + root/after/before/divider/handle 五 slot；handle `role="slider"` + aria 三值 + aria-label；clip-path 内联样式随位置；**pointer 拖拽：stub 容器 getBoundingClientRect + fireEvent.pointerDown/Move 序列钉住百分比换算与 clamp（选项 a）**；键盘 horizontal（Left/Right）/vertical（Up/Down）两模式 + PageUp/End（aria-valuenow 断言）；`defaultPosition` 播种 + clamp；单侧加载失败降级（`alt || flux.common.noData` 键）；base 层 `object-fit: contain`。
- 回归钉：无。

## Execution Plan

### Phase 1 — 实现 + focused 单测

Status: planned

- Item Types: `Fix | Proof`

- [x] `schemas.ts`：`ImageCompareSchema`（design.md §4 形状）
- [x] `image-compare.tsx`：renderer 自绘（state/pointer/键盘/降级/clip-path）
- [x] `content-renderer-definitions.ts`：注册 + definition fields
- [x] focused 单测 `image-compare.test.tsx`（判别 6）

Exit Criteria:

- [x] content 包测试全绿；包 typecheck 通过

### Phase 2 — example / lab / e2e / 登记收口

Status: planned

- Item Types: `Proof`

- [x] `docs/components/image-compare/example.json`；`docs/components/index.md` content 族清单增 `image-compare`；quick-reference 无逐 type 条目先例（记录核对结论）
- [x] lab 场景（新增 `apps/playground/src/component-lab/renderers/image-compare-lab-page.tsx` + `renderer-lab-registry.ts` 增行 + **content-renderer-routes.ts 增 entry——执行发现：lab 路由侧图来自静态 route-model，漏配则 lab 页不可达**）；e2e complex-form image-compare 用例 1 passed（DOM 锚 + aria 三值 + 键盘位置变化）
- [x] roadmap §2/§6 G7I 回写随 closure commit

Exit Criteria:

- [x] e2e 全绿；登记面闭环

## Closure Gates

- [x] 所有 in-scope 行为结果已达成
- [x] 无被静默降级的 in-scope 项
- [x] owner docs 已同步（design.md retained→runtime 措辞勘误随本 commit）

Closure Evidence（执行 session 提供）:

- 实现面：`image-compare.tsx`（双 img 叠加 + clip-path 裁切 + pointer capture/换算/clamp + role=slider 全键盘 + 双侧独立降级 `alt || flux.common.noData` + object-contain）；`ImageCompareSchema` + definition 五字段；i18n 零新 key。
- 判别测试：`image-compare.test.tsx` 7 例全绿（五 slot + slider a11y、播种 clamp、clip-path、pointer stub rect 拖拽+clamp、键盘双模式+Page/Home/End、单/双侧降级、object-fit）。
- INV 审计：INV-1~5 + Checklist E/F/G 全 PASS（见上节）。
- 执行发现：playground lab 路由来自静态 `content-renderer-routes.ts`（route-model），漏配则 `#/lab/image-compare` 不可达——已补 entry（route-matrix 50 例全绿）。
- 门禁（待 closure commit 前全量复验）：包 typecheck 0 error；e2e 1 passed。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check`（零新增 red）

## Draft Review Record

- R1（fresh 子 agent `agent_438987dd`，2026-10-24）：**`revised`**（0 Blocker / 2 Major / 5 Minor 全采纳——M1 pointer 拖拽单测裁决选项 a（stub rect + pointer 序列）；M2 INV 补 Checklist E/F/G；minors：i18n 键点名、object-fit 判别、vertical 键盘、lab 路径、design.md retained→runtime 勘误）。

## Deferred But Adjudicated

（无）

## Closure

Status Note: 完成——`image-compare` 新 type 落地（CC2 门禁经人工批准解除），closure audit approved（0B/0M/4m）。roadmap 全表 done，arc-component-gap 线闭环。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_d6815737，2026-10-24）
- Evidence: **approved**（0 Blocker / 0 Major / 4 Minor）。协议逐条 PASS（§4 播种 clamp/local state/§7 降级与键盘/§10 锚与 clip-path/object-fit/§9 零 fetch）；TYPES 19→20 与 honesty renderers 20→21 基线更新合法（definitions.length 语义非弱化）；INV Checklist A–G 与实现一致；判别测试质量高（a11y 三值、双向 clamp、clip-path 精确值、pointer 换算、双模式键盘、单/双侧降级计数）。Minors 均随手消化：m1 design 字段分类注记 prop 先例、m2 before/after 可选宽松化注记、m3 aria-label 派生措辞对齐、m4 Phase 2 复选框补勾。附带观察：navigation.spec `#/lab/dialog` 1 failed 为 pre-existing（与改动零交集）。
