# 717 Arc G3I — 声明式 context-menu 落地（`contextMenu` meta 能力）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/arc-component-gap-roadmap.md` §7 G3I（依赖 G3D done，plan 716）
> Related: 协议权威 `docs/components/context-menu/design.md`（plan 716 裁决）

## Purpose

按 G3D 协议实现 `contextMenu` meta 能力：META_FIELDS 增列 + 编译通道路由、wrap 层附着、菜单 surface（shell + action 派发，渲染方式经 G3I 勘误为 inline fixed，见 Deferred）、focused 单测、交付铁律 3/5/6/8。

## Current Baseline（live 核对 2026-10-24）

- 协议已定稿（`docs/components/context-menu/design.md`）：meta 属性、wrap:true 帧根附着、item `{ key?, label, icon?, disabled?, destructive?, visible?, action }`（onClick 兼容 fallback）+ separator、contextmenu/Shift+F10/Menu 键触发、Escape/外点关闭、原生 disabled menuitem、`data-slot="context-menu-surface"` portal。
- 附着机制（live 核对）：`FieldFrameProps.rootProps`（field-frame.tsx:62，`:258` `{...rootProps}` 扩散至帧根）——扩展为 `Record<string, unknown>` 即可以零 DOM 变更挂 `onContextMenu`/`onKeyDown`；`NodeFrameWrapper`（node-frame-wrapper.tsx）在 `frameWrapMode==='none'` 时提前返回 fragment（:24-26）——wrap:false 无附着点（ctx-wrap-none）。
- 配置读取：`TemplateNode.schema`（node-identity.ts:139）保留原始 schema，`contextMenu` 为静态 authoring 配置（首版不做表达式求值——design.md §3 显式条款），flux-react 直读，不经 flux-runtime metaProgram 求值管线。
- action 派发：`useActionDispatcher()`（hooks.ts:172）= `useRendererRuntime().dispatch(action, ctx?)`（renderer-core.ts:81）。
- shell：ui `useContextMenuShell`（自由定位/钳制/外点/Escape/roving）。
- META_FIELDS（flux-core/src/constants.ts:1-11）现无 `contextMenu`。

## Goals

- 任意 wrap:true 节点声明 `contextMenu: { items }` 后：右键/Shift+F10/Menu 键打开菜单，item 点击派发 action 并关闭，Escape/外点关闭，键盘 roving，destructive/separator/disabled 渲染正确。
- wrap:false 声明无操作 + dev warn 一次；disabled 节点不打开；嵌套最内层优先（打开后 stopPropagation，审查 m5）。
- focused 单测（判别性）+ 全量 full-green + 铁律登记链。

## Non-Goals

- 表达式求值（items 静态）、子菜单、wrap:false 附着、设计器画布右键迁移。

## Scope

### In Scope

- `packages/flux-core/src/constants.ts`：META_FIELDS 增 `contextMenu`。
- `packages/flux-react/src`：新 `context-menu-surface.tsx`（surface + hook）、`node-frame-wrapper.tsx` 附着、`field-frame.tsx` rootProps 类型放宽。
- 新测试 `packages/flux-react/src/__tests__/context-menu-capability.test.tsx`。

### Out Of Scope

- flux-runtime metaProgram 管线；各 renderer 包；design.md 变更（协议已定稿）。

## Failure Paths

（design.md §9 五条即测试断言面。）

## Test Strategy

本档选择：**必须自动化**（公共 schema 能力、交互契约）。

## Execution Plan

### Phase 1 — 实现 + focused 单测

Status: completed
Targets: `packages/flux-core/src/constants.ts`、`packages/flux-react/src`

- Item Types: `Fix | Proof`

- [x] META_FIELDS 增 `contextMenu`（constants.ts；constants.test.ts 快照——constants.test.ts:54 `size===9` 必改）。
- [x] `context-menu-surface.tsx`：`ContextMenuSurface`（createPortal 至 body；`useContextMenuShell`；`role="menu"` + `data-slot="context-menu-surface"`；item 原生 `<button role="menuitem" disabled?>`（`visible:false` 过滤、icon 渲染为 lucide 图标名，审查 m2），separator `<hr>`；destructive `text-destructive`；样式 token 对齐 dropdown menu：bg-popover/border/shadow）；`useNodeContextMenu(config, disabled)` hook：open state + position + `onContextMenu`（preventDefault、disabled 不开）、`onKeyDown`（Shift+F10/ContextMenu 键，取 currentTarget rect 定位）、item 点击 `dispatch(item.action ?? item.onClick).catch(→env.notify)` 后关闭、Escape/外点由 shell 关闭。
- [x] `node-frame-wrapper.tsx`：FieldFrame 分支读 `props.templateNode.schema.contextMenu`，有配置则经 `rootProps` 附着 handlers 并渲染 surface；`none` 分支如有配置 → dev-only console.warn 一次（模块级 Set 防重复）。
- [x] `field-frame.tsx`：`rootProps` 类型放宽 `Record<string, unknown>`（仅类型 widening，运行时行为不变）。
- [x] focused 单测（Proof，先写；11 case——closure audit R1 后补 Menu 键/ctx-empty-items/真实嵌套/icon svg 断言）：**判别性（正向）**——声明 contextMenu 的 wrap:true 节点右键后 `[data-slot="context-menu-surface"]` 出现、items label 渲染；item 点击后 action 生效（探针/notify 断言）且菜单关闭；**回归防护**——未声明无 surface；Escape 关闭；外点关闭；disabled 项渲染 `disabled` 且不派发；separator 渲染；destructive 类；Shift+F10 打开；disabled 节点不打开；wrap:false 声明无 surface；嵌套最内层优先（打开后 stopPropagation，审查 m5）。

Exit Criteria:

- [x] focused 套件 9 case 全绿（判别性：surface 出现断言在无实现时必挂）；实现中途按草案审查与 scanner 约束升级为编译通道路由（见 Deferred/勘误）。
- [x] flux-core/flux-compiler/flux-runtime/flux-react 四包 typecheck 通过。

### Phase 2 — 交付铁律核对

Status: completed
Targets: 登记/文档面

- Item Types: `Proof`

- [x] 铁律 1/5：improvement-analysis CX16+G3 行已在案（plan 716 落地）；examples.manifest/index 无新 type 无需增量（记录核对结论）。
- [x] 铁律 3：lab 页增 context-menu 演示场景（任一 wrap:true 组件 + contextMenu 声明）。
- [x] 铁律 6：i18n 零新增键（协议无文案）——记录结论。

Exit Criteria:

- [x] lab 场景落地；铁律处置逐项落定无悬空。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-24）
- Verdict: `pass`（零 Blocker / 零 Major / 5 Minor，全部当场采纳）
- Rounds: 1
- Findings addressed: m1 行号/路径微偏（执行按符号定位）；m2 icon 渲染（lucide icons map）+ visible:false 过滤显式化（closure audit R1 指出 icon 未落地，已实现并加 svg 断言）；m3 Menu 键与 ctx-empty-items 测试补齐（closure audit R1 指出初版缺失，已补：ContextMenu 键用例 + 空 items 用例）；m4 constants.test size===9 必改写死；m5 嵌套 stopPropagation 机制词

## Closure Gates

- [x] 所有 in-scope 行为已落地且 focused 单测证明（判别性断言存在）
- [x] 无被静默降级的 in-scope 项
- [x] owner docs 已同步（协议在 plan 716 落稿；实现偏离需就地勘误）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（82/82 task 全绿）
- [x] `pnpm check`（零新增未登记红项：scanner-baselines within baseline——runtime-raw-schema-read 嫌疑经编译通道路由消除、notify 结构化失败通道对齐 scanner 启发式；knip 仅剩 2 条 HEAD 既有漂移）

## Deferred But Adjudicated

### contextMenu 编译通道路由（G3I 实现升级，非降级）

- Classification: `optimization candidate`（已当场落地，此处记账）
- Why Not Blocking Closure: 初版直读 `templateNode.schema` 触发 scanner `runtime-raw-schema-read` 高危嫌疑（违 compile-once 原则）；改为 META_FIELDS→buildMetaProgram→resolveNodeMeta→ResolvedNodeMeta 编译管线（flux-core/flux-compiler/flux-runtime 三处镜像），flux-react 读 `resolvedMeta.contextMenu`。v1 仍为静态求值（compileValue 对 plain object 静态透传），与 design.md §3 条款一致。
- Successor Required: `no`
- Successor Path: —

### surface 渲染方式：inline fixed 替代 portal（G3I 实现勘误）

- Classification: `watch-only residual`
- Why Not Blocking Closure: flux-react 分层无 react-dom 依赖（deliberate），portal 需新增 ui 公共导出（ask-first 保护区域，无人工确认通道）；inline `position:fixed` 在常规表单帧场景等价，仅祖先含 transform/filter 时定位退化。design.md §6 已就地勘误。
- Successor Required: `no`
- Successor Path: —（若出现 transform 祖先场景的实证 demand，随 ui Portal primitive 立项一并迁移）

## Non-Blocking Follow-ups

- items 表达式求值、子菜单、wrap:false 附着（demand 出现再立项）。

## Closure

Status Note: G3I 全部交付面落地；closure audit R1 `issues`（0B/3M/2m：Menu 键/ctx-empty-items 测试缺失、嵌套测试非判别、icon 未落地）→ 三项以判别性测试/真实实现收敛 + 2m 修复 → R2 `approved`（0B/0M，残留 2 文本勘误已随手改：portal 措辞同步、用例计数 12→11）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-10-24，R1 与 R2 同一 auditor 会话）
- Evidence: R2 approved：三项 Major 逐条复核（test.tsx:254-261/:263-269/:213-252、surface.tsx:110-126/:148/:165）；646/646 复验；scanner within baseline、knip 2 条 HEAD 既有（前轮复验）。
