# 716 Arc G3D — 声明式 context-menu 设计（`contextMenu` meta 能力扩展）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G3 / §7 G3D（roadmap item G3D，`todo`）
> Related: `packages/ui/src/hooks/use-context-menu-shell.ts`（CX-16 先例）、`docs/components/existing-components-improvement-analysis.md`、`docs/references/naming-conventions.md`

## Purpose

一票裁决声明式右键菜单的挂载契约（wrapper region / meta 属性 / 事件委托三选一），产出完整协议并落设计文档。纯设计 plan；实现归 G3I。

## Current Baseline（live 核对 2026-10-24）

- ui `useContextMenuShell` 已导出（`packages/ui/src/index.ts:68`；CX-16/plan 596 吸收三个设计器右键孪生）：自由定位（clientX/Y）、视口钳制、外点关闭、Escape 关闭、roving 方向键焦点；item 选择器 `[role="menuitem"]:not([disabled])` 刻意硬编码。**注释明确：它不是 Base UI ContextMenu/DropdownMenu primitive 的替代**（锚定触发 vs 自由定位）。
- `META_FIELDS` 冻结集（`packages/flux-core/src/constants.ts:1-11`）：`id/className/frameClassName/when/visible/hidden/disabled/testid/frameWrap` —— "进入 meta" 的通用词表，schema/contract 层（plan-first 保护，本 plan 即 plan 流程）。
- `node-frame-wrapper.tsx`（flux-react，:24-26）是 wrap 层出口，但 `frameWrapMode === 'none'`（definitionWrap=false）时**不产生帧根元素**——附着点仅存在于 wrap:true 节点（审查 M1 勘误）。
- `dropdown-button` items 协议：`compiled-items.ts`（静态 items 信封 `{ __nopPreserveLiteral, value }` + 表达式 items），item 形状含 label/icon/disabled/onClick action。
- 常规 renderer 树内仅 industrial 编辑器有私有右键（`flux-renderers-industrial/src/editor/context-menu.tsx`）；三个设计器画布右键为画布专属（roadmap §5.1 G3 既述）。
- flux 154 type 中无通用右键声明入口；AMIS 无对应能力（非标尺）。

## Goals

- **挂载契约裁决**：三选一一票裁决，被拒两方排除理由写入设计文档决策表（roadmap §9 Cross-Cutting 1）。
- 完整协议：schema 形状、items 协议（复用 dropdown-button）、打开/关闭/键盘/a11y、DOM marker、与画布专属右键的边界、命名 pass、失败路径。
- 设计文档落稿 `docs/components/context-menu/design.md`（能力文档，12 节先例）；roadmap G3 落点前提的就地勘误附注（不改写历史文本）。

## Non-Goals

- 不实现（G3I）；不改三个设计器画布私有右键（边界声明）；不做子菜单/分隔线之外的 item 形态扩展（首版：item + separator）；不动 Base UI primitives。

## Scope

### In Scope

- 新建 `docs/components/context-menu/design.md`（裁决表 + 协议）。
- `docs/components/existing-components-improvement-analysis.md` 登记条目。
- roadmap §5.1 G3 / §6 G3D 行的就地勘误附注（落点前提）。

### Out Of Scope

- G3I 实现面；matrix 增行（裁决不产新 type 则无需）；工业/设计器画布右键。

## Failure Paths

| 编号              | 触发                                | 行为                                                                 | 可重试 | 用户可见表现               |
| ----------------- | ----------------------------------- | -------------------------------------------------------------------- | ------ | -------------------------- |
| ctx-empty-items   | `contextMenu.items` 为空数组/未声明 | 不挂 handler，无菜单（纯无操作）                                     | —      | 无                         |
| ctx-disabled-node | 目标节点 `meta.disabled`            | 右键不打开菜单                                                       | —      | 无                         |
| ctx-action-fail   | item onSelect action 派发失败       | 菜单先关闭；错误走既有 action 错误通道（env.notify）                 | 是     | toast                      |
| ctx-nested        | 嵌套两层均声明 contextMenu          | 最内层目标优先（事件 stopPropagation 于打开后）                      | —      | 内层菜单                   |
| ctx-wrap-none     | wrap:false 节点声明 contextMenu     | 无帧根可附着：不挂监听、无菜单；开发态 console.warn 一次（dev-only） | —      | 无（覆盖范围限制，见协议） |

## Test Strategy

不适用：纯设计 plan。G3I 承担（必须自动化：右键打开/键盘/外点关闭/Escape 均可程序化断言）。

## Execution Plan

### Phase 1 — 挂载契约裁决与协议落稿

Status: completed
Targets: `docs/components/context-menu/design.md`、roadmap 勘误附注、improvement-analysis 登记

- Item Types: `Decision`

- [x] 裁决段（三选一，写明被拒方理由）：
  - **采纳：meta 属性 `contextMenu` 能力扩展**——`META_FIELDS` 增 `contextMenu`，任意节点可声明；`node-frame-wrapper`（通用 wrap 层）挂 `onContextMenu`/Shift+F10/Menu 键监听并经 portal 渲染菜单 surface（ui `useContextMenuShell`）。零新 retained type（无 matrix human gate）、零 DOM 结构变更（监听挂在既有帧根）、与任意 renderer 组合。
  - 拒绝 wrapper 新 type：新 retained type 需 matrix 增行（human gate）；包裹改变 DOM 结构，与既有 marker/classname 契约冲突面大；右键是"附着于目标"的横切能力，强制包一层违背组合习惯。
  - 拒绝纯事件委托（`COMMON_EVENT_FIELDS` 增 `onContextMenu`）：事件只解决触发，不解决 items 声明与菜单 surface；schema 作者仍需自拼 UI，缺口未闭合。
- [x] 协议章节：schema 形状（`contextMenu: { items: ContextMenuItemSchema[] }`；item = `{ key?, label, icon?, disabled?, destructive?, visible?, action }`——**动作规范字段为 `action`（ActionSchema），`onClick` 为兼容 fallback，与 dropdown-button `resolveItemAction` 口径一致**（审查 M2 勘误）；**形状复用、代码不复用**：compiled-items/静态信封解包归 flux-renderers-layout 包内 seam，flux-react 分层不可 import layout，G3I 在 flux-core/flux-react 可达层独立实现形状收窄（审查 M3 裁决）；meta 通道内嵌 ActionSchema 的编译/派发由 G3I 经 `useActionDispatcher`/node scope 补齐（现有 META_FIELDS 消费无 action 编译先例，此为实现显式条款）；触发（contextmenu 事件 / Shift+F10 / Menu 键）；打开定位（clientX/Y + shell 视口钳制）；关闭（item 点击执行 onSelect 后 / Escape / 外点 / 滚动？裁决：外点与 Escape 关闭，滚动不关闭首版）；键盘（shell roving 箭头 + Enter 执行）；a11y（`role="menu"`/`menuitem` 为原生 `<button disabled>`——shell 选择器命中原生 disabled 而非 aria-disabled，审查 m1）；**覆盖范围**：附着点为 wrap:true 帧根，wrap:false 声明无操作（ctx-wrap-none，「与任意 renderer 组合」声称据此限定，审查 M1）；DOM marker（`data-slot="context-menu-surface"`，portal 至 body）；disabled 节点不打开；嵌套最内层优先；item 形态首版仅 item 与 separator（`{ separator: true }`）两种，子菜单不做（审查 m2）。
- [x] 边界声明：三个设计器画布右键与 industrial 私有实现不在本能力范围（各保留私有实现，后续可自愿迁移 shell）。
- [x] 命名 pass：`contextMenu`（camelCase meta 字段）；拒绝 `contextmenu`（全小写违 camelCase）、`onContextMenu`（这是事件名不是配置名）、`menuItems`（丢失挂载语义）。
- [x] roadmap §5.1 G3"落点 `flux-renderers-layout`"前提就地勘误附注（实况：meta 通道归 flux-core 词表 + flux-react wrap 层 + ui shell；layout 不落代码——**此为勘误附注不改写原文**），并同步 §6 G3D 行 Owner doc 指向新 design.md；improvement-analysis 登记（能力扩展、跨切面 meta 通道）。

Exit Criteria:

- [x] design.md 含裁决表（两被拒方理由在案）与完整协议，无"待定"占位；引用的 live 符号（useContextMenuShell、META_FIELDS、node-frame-wrapper、compiled-items）逐一核对相符。
- [x] roadmap 勘误附注就位（原文未改写）；improvement-analysis 条目可检索；§11 共识审查证据行随 Rule 6 approved 同 commit 落地（R4 行）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-24）
- Verdict: `revised` → 共识达成（零 Blocker / 4 Major / 4 Minor，全部当场采纳）
- Rounds: 1
- Findings addressed: M1 覆盖范围限定（wrap:false 无帧根不附着 + ctx-wrap-none Failure Path）；M2 item 动作字段改 `action`（onClick 兼容 fallback）；M3 形状复用/代码不复用 + meta 通道 ActionSchema 编译显式条款；M4 roadmap 勘误按 Rule 10.6 增 §11 共识审查 gate；m1 menuitem 原生 button disabled；m2 Non-Goals 措辞；m3 gate 证据链；m4 Exit 引用同步

## Closure Gates

> 纯文档 plan，pnpm 四项按 guide 规则删除。

- [x] design.md 裁决与协议完整、与 live repo 事实核对相符
- [x] roadmap §2/§6 G3D `todo`→`done` 回写（与 closure 证据同 commit）
- [x] roadmap §5.1 G3/§6 勘误附注落地后，按 §10 Rule 6 追加一轮独立子 agent 共识审查至 approved，证据入 roadmap §11（审查 M4 合规链）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- G3I 实现面（META_FIELDS 词表增列、node-frame-wrapper 监听、surface 组件、focused 单测、铁律 3/5/6/8）。
- 三个设计器画布右键迁移 useContextMenuShell（CX-16 注释已预留方向）。

## Closure

Status Note: G3D 三要素（挂载契约裁决、协议、登记+勘误链）落地；closure audit R1 `issues`（1M：Exit"§11 证据行就位"声称先行）→ 与 roadmap 回写同 commit 使声称成真（§11 R4 行）后收敛；附带 Rule 6 勘误共识审查 `approved`（0B/0M/2m 随 commit 消化）。双审查由同一独立子 agent 会话出具。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-10-24）
- Evidence: 审查 A（Rule 6 勘误共识）approved：六维度 PASS、五项 live 事实核对全中；审查 B（closure audit）R1 issues 仅 1M 措辞级（同 commit 落地后成真）；design.md 协议完整性与 live 符号（META_FIELDS、node-frame-wrapper:24-26、resolveItemAction、use-context-menu-shell 选择器）逐条核对相符。
