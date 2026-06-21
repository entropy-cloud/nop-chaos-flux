# E2f 表面族统一收口

> Plan Status: completed
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E2f 行 L111）、`docs/components/dialog/design.md`（§2 Flux 决策表 L27-32 标 `计划实现（E2f）`）、`docs/components/drawer/design.md`（§2 Flux 决策表 L28-34 标 `计划实现（E2f）`，含 closeOnOutside 不对称 bug）、live-repo audit（`DialogSchema`/`DrawerSchema`、`dialog-host.tsx`、`use-surface-renderer.ts`、ui `DialogContent`/`DrawerContent`）
> Related: X5 design.md Flux 决策表（done）、Q5 跨 roadmap 重叠归属（已裁定：与 roadmap.md surface Ongoing 合并归属归 E2f owner，本 plan 收口 surface family capability 扩展）

## Purpose

把 roadmap 工作项 **E2f 表面族统一收口** 从 `todo` 推进到 `done`：为 `dialog`/`drawer` 表面族补齐 **不对称 bug 修复（drawer `closeOnOutside`）**、**统一交互契约（`closeOnEsc`/`size`/`width`/`height`/`showCloseButton`/`header`/`footer` region）**、**confirm 语义**、**drawer 专属（`resizable`/`bodyClassName`/`headerClassName`/`footerClassName`）** 七组能力。design.md §2 决策表已为这些能力裁定 Flux 决策；drawer §2 显式标 `不对称 bug（E2f 修复）`。

**Q5 跨 roadmap 重叠说明**：roadmap.md（主 roadmap）的 surface Ongoing 工作经 Q5 裁定与 E2f 合并归属，由本 plan 统一收口 surface family 能力扩展；本 plan 完成后主 roadmap surface Ongoing 不再独立推进 capability 扩展（仅跟随 Flux 整体架构演进）。

## Current Baseline

经 live-repo audit（2026-06-21）：

- **Schema（不对称 bug）**：`DialogSchema`（`packages/flux-renderers-basic/src/schemas.ts:24-36`）含 `closeOnOutsideClick?: boolean`。`DrawerSchema`（L38-50）**缺** `closeOnOutside`（或任何同义字段）—— drawer §2 L20 显式标 `⚠️ 不对称 bug（E2f 修复）`。`dialog-host.tsx:135` 消费 dialog 的 `closeOnOutsideClick !== false`；`dialog-host.tsx` drawer 分支不消费任何 closeOnOutside 字段。
- **Schema（其他缺失）**：两者均**无** `closeOnEsc`、`size`、`width`/`height`、独立 `header`/`footer` region（当前 footer 折进 `actions`）、`confirm`、`showCloseButton`、`resizable`、`bodyClassName`/`headerClassName`/`footerClassName`。
- **Renderer**：`use-surface-renderer.ts`（413 行）管理 declarative surface open-state + scope + status publication。`SurfaceEntry`（经 `openSurface` open 进 surfaceRuntime）字段含 `surface` payload（含全部 resolvedProps）；`dialog-host.tsx` 的 `DialogView`/`DrawerView` 从 `surface.surface` 读取 prop 并消费。
- **UI 原语**：ui `DialogContent`（`packages/ui/src/components/ui/dialog.tsx:102-191`）已支持 `showCloseButton`（默认 true）+ `size: 'sm' | 'default' | 'lg'`（不是 `xs/sm/md/lg/xl/full` 六档）。ui `DrawerContent` 需 audit（已知支持 `direction`/`showMask`，未确认 `resizable`/`closeOnEsc`/`closeOnOutside`/`size`）。
- **Capability contracts**：design.md §8（dialog）L96 + §8（drawer）L86 均注明 `component:open`/`component:close`/`component:toggle` 仍属 future capability 方向，当前未注册 ComponentHandle。本 plan 不实施 capability 扩展（X1 范围）。
- **design.md**：dialog §2 L27-32 标 6 行 `计划实现（E2f）`（closeOnEsc/size/width-height/header-footer/confirm/showCloseButton）；drawer §2 L28-34 标 7 行 `计划实现（E2f）`（含 closeOnOutside 修不对称 + closeOnEsc/size/width-height/header-footer/resizable/bodyClassName 等）。
- **测试**：`dialog-host.test.tsx` 已 mock DialogContent/DrawerContent 测试 host 渲染。无 surface capability（closeOnEsc/size/confirm）契约测试。

## Goals

- `DialogSchema`/`DrawerSchema` 双向对齐字段：`closeOnEsc?: boolean`（缺省 `true`）、`size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`、`width?: number | string`、`height?: number | string`、`showCloseButton?: boolean`（缺省 `true`）、`header?: BaseSchema[]`（独立 region，与 `title` 并存）、`footer?: BaseSchema[]`（独立 region，与 `actions` 并存）、`confirm?: boolean | string`（actions 省略时自动生成 cancel/confirm 按钮）。
- `DialogSchema` 保留 `closeOnOutsideClick?: boolean`（命名已稳定，不改）；`DrawerSchema` 新增 `closeOnOutside?: boolean`（命名与 surface family 对齐，不复制 dialog 的 `Click` 后缀，但 `dialog-host.tsx` 内部读取时统一映射）。
- `DrawerSchema` 专属新增：`resizable?: boolean`、`bodyClassName?: string`、`headerClassName?: string`、`footerClassName?: string`（dialog 等同补齐以保持表面对称）。
- `use-surface-renderer.ts` + `dialog-host.tsx` 消费新字段：
  - `closeOnEsc`：透传给 ui `Dialog`/`Drawer` 的 `onKeyDown`（Esc 拦截）；缺省 true 时复用 ui 默认行为。
  - `size`/`width`/`height`：`size` 缺省走 ui 默认；`width`/`height` 显式覆盖（经 inline style）；`size: 'full'` 走 100vw/100vh。
  - `header`/`footer` region：`header` 与现有 `title` 并存（`title` 是 header 内的标题文本/region，`header` 是 header 区扩展 region）；`footer` 与 `actions` 并存（`actions` 是动作按钮区，`footer` 是更通用的 footer region，渲染顺序：footer content → actions buttons）。
  - `confirm`：truthy 且 `actions` 省略时，自动生成 `<Button variant="ghost">Cancel</Button><Button variant="default">Confirm</Button>`；confirm 文案来自 `confirm` 字段（boolean true 走 i18n 默认，string 是自定义 confirm button label）；cancel button 触发 `onClose`，confirm button 触发 `onConfirm` 事件（新增）+ `onClose`。
  - `showCloseButton`：透传给 ui `DialogContent`/`DrawerContent`（已支持）。
  - `resizable`（drawer 专属）：ui `DrawerContent` 支持 `resizable` prop（若未支持，本 plan 在 ui 包补齐）。
  - `bodyClassName`/`headerClassName`/`footerClassName`：透传到 ui `DialogBody`/`DialogHeader`/`DialogFooter`（或对应 Drawer 组件）。
- `onConfirm` 事件契约新增（仅 `confirm` 模式触发）；经 action schema 触发，payload `{ surfaceId, kind, open }`。
- dialog/drawer renderer definition `propContracts`/`eventContracts`/`fields` 补齐新字段。
- design.md §2 决策表 dialog 6 行 + drawer 7 行翻 `实现`；§4/§5/§7/§10 同步。
- focused 单测覆盖 closeOnEsc/size/width-height/header-footer/confirm/showCloseButton/resizable/className 全部新字段 + drawer closeOnOutside 不对称修复。

## Non-Goals

- 不实施 `component:open`/`component:close`/`component:toggle` capability contracts —— design.md §8 注明仍属 future，归 X1（doAction 命令族统一）；本 plan 不扩 ComponentHandle 注册。
- 不实施 `draggable` schema 暴露（dialog）—— design.md §2 L33 标 `暂不实现`，UI primitive 已支持但 schema 未暴露，非高频。
- 不实施 `allowFullscreen` + setFullScreen —— design.md §2 L34 标 `暂不实现`，dialog 场景低频。
- 不实施 `dialogType: 'confirm'` 判别类型 —— design.md §2 L35 已裁定用 `confirm` 布尔 + surface 语义，不引入判别树。
- 不实施 `lazyRender`/`lazySchema` —— design.md §2 L37 标 `暂不实现`，当前重新打开即新建 scope，按需再评估。
- 不实施动画/过渡钩子（entered/exited 驱动 lifecycle event）—— design.md §2 L38 标 `暂不实现`，低频。
- 不重构 `SurfaceRuntime` —— surface runtime 主闭环（declarative + openDialog/openDrawer 统一栈）已完成；本 plan 只扩 schema/capability surface，不动 runtime owner。
- 不修改 ui `DialogContent` 现有 `size: 'sm' | 'default' | 'lg'` API —— 在 ui 包内通过映射层把 Flux 6 档（xs/sm/md/lg/xl/full）映射到 ui 内部尺寸 token；或在 ui DialogContent/DrawerContent 补 `width`/`height` override 支持。
- 不重命名 `DialogSchema.closeOnOutsideClick` —— 命名已稳定且 ui `Dialog` primitive 也用此命名；新 drawer 字段用 `closeOnOutside`（与 surface family 风格一致），host 内部统一映射。

## Scope

### In Scope

- `DialogSchema`/`DrawerSchema` 双向对齐新增 8+ 字段（closeOnEsc/size/width/height/showCloseButton/header/footer/confirm）+ drawer closeOnOutside 不对称修复 + drawer resizable + 两者 className 三字段
- `use-surface-renderer.ts` 消费新字段（surfacePayload 已 spread resolvedProps，主要补 onConfirm event wiring + region 注册）
- `dialog-host.tsx` `DialogView`/`DrawerView` 消费新字段并透传到 ui primitives
- ui primitives 若需补 `resizable`/`width`/`height`，在 `packages/ui/src/components/ui/drawer.tsx` 或 `dialog.tsx` 补齐
- 新增 `onConfirm` 事件契约（仅 confirm 模式触发）
- dialog/drawer renderer definition `propContracts`/`eventContracts`/`fields` 补齐
- design.md §2/§4/§5/§7/§10 同步
- focused 单测

### Out Of Scope

- `component:open`/`component:close`/`component:toggle` capability（归 X1）
- `draggable` schema 暴露 / `allowFullscreen` / `dialogType: 'confirm'` / `lazyRender` / 动画钩子（design.md 已裁 `暂不实现`）
- `SurfaceRuntime` owner 重构
- mobile-roadmap 的响应式 surface 改造（归 mobile-roadmap.md）

## Failure Paths

| 场景                        | 触发                                      | 行为                                                                             | 可重试 | 用户可见表现               |
| --------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- | ------ | -------------------------- |
| drawer-closeOnOutside       | drawer `closeOnOutside: true` + 点击 mask | drawer 关闭（与 dialog 对齐）                                                    | 是     | drawer 点击外部遮罩后关闭  |
| drawer-closeOnOutside-false | drawer `closeOnOutside: false`            | 点击 mask 不关闭；只能经 close button / Esc / action 关闭                        | 是     | drawer 必须显式关闭        |
| closeOnEsc-false            | `closeOnEsc: false` + 按 Esc              | 不关闭；其他关闭路径（close button / action）仍工作                              | 是     | Esc 无效                   |
| size-full                   | `size: 'full'`                            | dialog/drawer 占满 viewport（100vw/100vh）；忽略 width/height                    | 是     | 全屏弹层                   |
| width-override              | `size: 'md', width: 800`                  | width 800px 覆盖 md 默认宽度；size 仍决定其他 token（padding/max constraint）    | 是     | 弹层宽度 = 800px           |
| confirm-no-actions          | `confirm: true` 且 `actions` 省略         | 自动生成 [Cancel][Confirm] 按钮；cancel → onClose；confirm → onConfirm + onClose | 是     | 底部两个按钮               |
| confirm-with-actions        | `confirm: true` 且 `actions` 显式声明     | `actions` 优先（用户自定义覆盖 confirm 自动生成）；`confirm` 字段被忽略          | 是     | 底部显示用户声明的 actions |
| resizable-drawer            | drawer `resizable: true`                  | drawer 边缘 resize handle 可拖拽；resize 后尺寸 local state（刷新丢失）          | 是     | drawer 边缘可拖拽改变尺寸  |
| showCloseButton-false       | `showCloseButton: false`                  | 不渲染右上角 close button；依赖 closeOnEsc/closeOnOutside/footer close action    | 是     | 无 X 关闭按钮              |

## Test Strategy

档位选择：`必须自动化`

本档选择：`必须自动化`。E2f 修复一个显式 contract drift（drawer closeOnOutside 不对称），且新增多组 surface capability（closeOnEsc/size/confirm）。closeOnEsc 与 closeOnOutside 是交互关闭路径的契约性结果，size/width/height 影响视觉布局契约，confirm 涉及 event dispatch（onConfirm）。Proof-before-Fix 顺序锁定契约；capability surface 必须有测试。

## Execution Plan

### Phase 1 - Schema + Definition 契约（Proof-first RED）

Status: completed
Targets: `packages/flux-renderers-basic/src/schemas.ts`、`packages/flux-renderers-basic/src/basic-renderer-definitions.ts`、`packages/flux-react/src/__tests__/dialog-host.test.tsx`（扩用例）或新建 `packages/flux-renderers-basic/src/__tests__/surface-enhancements.test.tsx`

- Item Types: `Fix | Proof`

- [x] `DialogSchema`（`schemas.ts:24-36`）扩展：`closeOnEsc?: boolean`、`size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`、`width?: number | string`、`height?: number | string`、`showCloseButton?: boolean`、`header?: BaseSchema[]`、`footer?: BaseSchema[]`、`confirm?: boolean | string`、`onConfirm?: BaseSchema`、`bodyClassName?: string`、`headerClassName?: string`、`footerClassName?: string`
- [x] `DrawerSchema`（`schemas.ts:38-50`）扩展：先补 `closeOnOutside?: boolean`（修不对称 bug），再补 `closeOnEsc?`/`size?`/`width?`/`height?`/`showCloseButton?`/`header?`/`footer?`/`confirm?`/`onConfirm?`/`resizable?`/`bodyClassName?`/`headerClassName?`/`footerClassName?`（与 dialog 对齐 + drawer 专属 resizable）
- [x] dialog/drawer renderer definition `propContracts` 补齐新字段；`eventContracts` 补 `onConfirm`（payload `{ surfaceId, kind, open }`）；`fields` 补全部新 prop + onConfirm event
- [x] **Decision**：`size: 'full'` 在 host 层映射为 100vw/100vh（dialog）/ 100%（drawer side full）；不引入到 ui primitive，避免污染 ui DialogContent/DrawerContent 现有 `size: 'sm'|'default'|'lg'` API
- [x] **Proof RED**：新建/扩展测试文件，先写失败用例：
  - [x] drawer closeOnOutside 不对称修复：`closeOnOutside: true` → 点击 mask → drawer 关闭
  - [x] drawer closeOnOutside-false：`closeOnOutside: false` → 点击 mask → 不关闭
  - [x] closeOnEsc-false（dialog）：`closeOnEsc: false` + 按 Esc → 不关闭
  - [x] closeOnEsc-false（drawer）：同上
  - [x] size-full（dialog）：`size: 'full'` → DialogContent style width=100vw/height=100vh
  - [x] width-override（dialog）：`width: 800` → inline style width=800px
  - [x] confirm-no-actions：`confirm: true` + actions 省略 → 自动生成 Cancel/Confirm 按钮，cancel → onClose，confirm → onConfirm + onClose
  - [x] confirm-with-actions：`confirm: true` + actions 显式 → actions 优先，confirm 字段被忽略
  - [x] confirm-custom-label：`confirm: '保存'` → confirm 按钮文案为 '保存'
  - [x] showCloseButton-false：`showCloseButton: false` → 不渲染 close button
  - [x] header/footer region（dialog）：`header: [...]` + `footer: [...]` → 渲染独立 region（与 title/actions 并存）
  - [x] resizable（drawer）：`resizable: true` → DrawerContent 含 resize handle
  - [x] bodyClassName（drawer）：`bodyClassName: 'p-8'` → DrawerBody className 含 'p-8'

Exit Criteria:

- [x] RED 测试 13 用例全部 fail
- [x] `pnpm typecheck` 通过
- [x] `scripts/check-finite-prop-contracts.mjs` 通过（`size` 是 finite-union 6 档，需加入 curated list）
- [x] No owner-doc update required（design.md 更新在 Phase 4）

### Phase 2 - Asymmetric bug 修复 + closeOnEsc/showCloseButton/size/width/height

Status: completed
Targets: `packages/flux-react/src/dialog-host.tsx`、`packages/flux-renderers-basic/src/use-surface-renderer.ts`

- Item Types: `Fix`

- [x] `dialog-host.tsx` `DrawerView`：从 `surface.surface.closeOnOutside` 读取（缺省 `true`，对齐 dialog `closeOnOutsideClick !== false`），透传给 ui `Drawer` onOpenChange 或 mask click handler
- [x] `DialogView`/`DrawerView` 透传 `closeOnEsc`：若 `false`，拦截 Esc keydown（preventDefault + stopPropagation）；缺省 true 时复用 ui 默认 Esc 关闭行为
- [x] `DialogView`/`DrawerView` 透传 `showCloseButton` 到 ui `DialogContent`/`DrawerContent`（已支持）
- [x] `DialogView`/`DrawerView` 计算 `size` → ui primitive size token 映射：Flux 6 档（xs/sm/md/lg/xl/full）映射到 ui DialogContent 的 `sm/default/lg` 三档（xs→sm, sm/md→default, lg/xl→lg, full→inline style 100vw/100vh）；drawer 类似映射 + full 走 100%
- [x] `DialogView`/`DrawerView` 透传 `width`/`height`：作为 inline style 覆盖 ui primitive 默认 size；同时设置时 width 优先于 size width，height 优先于 size height
- [x] drawer `resizable`：透传给 ui `DrawerContent`；若 ui 不支持，本 phase 在 ui `drawer.tsx` 补 resize handle（边缘 sentinel + pointer events + local state）
- [x] `use-surface-renderer.ts` 在 surfacePayload 已经 spread resolvedProps，无需额外改；region 注册扩展 `header`/`footer` 在 Phase 3 处理

Exit Criteria:

- [x] Phase 1 RED 用例 1-6 + 10 + 12（closeOnOutside/closeOnEsc/size/width/showCloseButton/resizable）转 green
- [x] `pnpm --filter @nop-chaos/flux-react test` + `pnpm --filter @nop-chaos/flux-renderers-basic test` 全过
- [x] `pnpm typecheck` + `pnpm build` 通过
- [x] No owner-doc update required（design.md 更新在 Phase 4）

### Phase 3 - header/footer region + confirm + className

Status: completed
Targets: `packages/flux-renderers-basic/src/use-surface-renderer.ts`、`packages/flux-react/src/dialog-host.tsx`、dialog/drawer renderer definition

- Item Types: `Fix`

- [x] `use-surface-renderer.ts` regionHandles 已 spread regions；扩展从 `regions.header`/`regions.footer` 读取（若 region key 不存在，需在 dialog/drawer renderer definition `regions` 声明新增 `header`/`footer` region key）
- [x] `SurfaceEntry` payload 已携带 regionHandles；`DialogView`/`DrawerView` 渲染时从 `surface.regionHandles.header?.templateNode` / `surface.regionHandles.footer?.templateNode` 读取
- [x] `DialogView`/`DrawerView`：`header` region 渲染在 `DialogHeader` 内（与 `title` 并存，title 在前 header region 在后，或 header region 替换 title 视 region 配置）；`footer` region 渲染在 `DialogFooter` 内（footer content 在前，actions 按钮在后）
- [x] `confirm` 实现：`confirm` truthy 且 `actions` 省略时，自动生成 actions 数组（[Cancel, Confirm] 按钮）；confirm 文案：`confirm === true` 走 i18n（`flux.common.confirm`），`confirm === '保存'` 用自定义文案；cancel button → 触发 onClose；confirm button → 触发 `onConfirm` event 后 onClose
- [x] `onConfirm` event：经 `use-surface-renderer.ts` 注册到 `eventHandlers`；payload `{ surfaceId, kind, open }`；只在 confirm button click 时触发
- [x] `bodyClassName`/`headerClassName`/`footerClassName` 透传到 ui `DialogBody`/`DialogHeader`/`DialogFooter`（与 surface.meta.className 合并，cn() 处理冲突）
- [x] dialog/drawer renderer definition `regions` 字段新增 `header`/`footer`（若之前 region 定义在 definition 中）

Exit Criteria:

- [x] Phase 1 RED 用例 7-9 + 11 + 13（confirm/header-footer/className）转 green
- [x] 全部 13 用例 green
- [x] `pnpm --filter @nop-chaos/flux-react test` + `pnpm --filter @nop-chaos/flux-renderers-basic test` 全过
- [x] `pnpm typecheck` + `pnpm build` 通过
- [x] No owner-doc update required（design.md 更新在 Phase 4）

### Phase 4 - Owner-Doc Sync + Roadmap

Status: completed
Targets: `docs/components/dialog/design.md`、`docs/components/drawer/design.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/logs/2026/06-21.md`、`docs/components/amis-baseline-matrix.md`、`docs/architecture/surface-owner.md`

- Item Types: `Follow-up`

- [x] `dialog/design.md` §2 决策表 6 行 E2f 翻 `实现`（closeOnEsc/size/width-height/header-footer/confirm/showCloseButton）；§4 schema 设计补新字段；§5 字段分类补；§7 运行期状态归属补 confirm 自动生成 actions + onConfirm event；§10 样式与 DOM marker 补 size 映射 + width/height override 约定
- [x] `drawer/design.md` §2 决策表 7 行 E2f 翻 `实现`；§2 头部 `⚠️ 不对称 bug（E2f 修复）` warning 行删除（修复后保留决策表 closeOnOutside 行 `实现` 即可）；§4/§5/§7/§10 同步 dialog
- [x] `existing-components-improvement-roadmap.md` E2f `todo`→`done`（L52）；Last Updated 改 `2026-06-21 (E2f done)`
- [x] `amis-baseline-matrix.md` dialog/drawer 行 retained 决策无变化（No update required — 全部为新增能力 + 一个不对称 bug 修复）
- [x] `docs/architecture/surface-owner.md` 检查并按需补 size/confirm/resizable 章节说明；若无需更新，显式写 `No architecture doc update required` —— L283-288 已定义 confirm/commit 为 `Semantic Lifecycle Owner`（与 surface ownership 解耦），E2f 实现遵循此规则；size/resizable 是视觉/交互属性，非 ownership 概念
- [x] `docs/logs/2026/06-21.md` 新增 E2f 收口条目

Exit Criteria:

- [x] dialog/drawer design.md §2 无残留 `计划实现（E2f）` 行
- [x] drawer design.md §2 头部 `⚠️ 不对称 bug` warning 删除
- [x] roadmap E2f 标为 `done`
- [x] daily log 含 E2f 条目

## Draft Review Record

- Reviewer / Agent: REVIEW_PLANS step (fresh session, 2026-06-21)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major: Phase 2/Phase 3 Exit Criteria 的测试用例编号区间与各自 phase 实际实现的工作（及括号内标签）不一致 —— Phase 2 原写 `1-6 + 11-13`（误含 region #11、bodyClassName #13，漏 showCloseButton #10），Phase 3 原写 `7-10 + 13`（误含 showCloseButton #10，漏 region #11）。已修正为 Phase 2 `1-6 + 10 + 12`、Phase 3 `7-9 + 11 + 13`，两 phase 合计仍覆盖全部 13 用例。
  - Minor（未改，留给下游 closure/deep audit）：Phase 1-3 Exit Criteria 将 `docs/logs/` 更新集中到 Phase 4（已显式声明 `design.md 更新在 Phase 4`，非静默跳过，符合 Rule 17 的显式裁定要求）；Draft Review Record 占位符由本 review 填充。
- 引用准确性核对（live repo, 2026-06-21）：`schemas.ts:24-36`（DialogSchema）、`schemas.ts:38-50`（DrawerSchema，确认无 `closeOnOutside` —— 不对称 bug 成立）、`dialog-host.tsx:135`（`closeOnOutsideClick !== false`）、`use-surface-renderer.ts`（413 行）、ui `dialog.tsx:105/108/114/117`（`showCloseButton` 默认 true + `size: 'sm'|'default'|'lg'`）、ui `drawer.tsx:104`（`DrawerContent` 定义）、`scripts/check-finite-prop-contracts.mjs` 均与 Current Baseline 描述一致。

## Closure Gates

- [x] drawer `closeOnOutside` 不对称 bug 已修复（与 dialog closeOnOutsideClick 对齐行为）
- [x] `DialogSchema`/`DrawerSchema` 全部新字段（closeOnEsc/size/width/height/showCloseButton/header/footer/confirm/onConfirm/className 三字段 + drawer resizable）已定义且 propContracts/fields 接线
- [x] `dialog-host.tsx` `DialogView`/`DrawerView` 正确消费全部新字段
- [x] `confirm` 自动生成 Cancel/Confirm 按钮（onConfirm dispatch 正确）；actions 显式声明时 confirm 字段被忽略
- [x] `header`/`footer` region 渲染正确（与 title/actions 并存）
- [x] focused 单测覆盖全部 13 用例（surface-enhancements.test.tsx）+ 7 用例（dialog-host-close-behavior.test.tsx host-level reason inspection）
- [x] dialog/drawer design.md §2/§4/§5/§7/§10 同步到 live baseline；drawer §2 不对称 bug warning 已删除
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（含 architecture/surface-owner.md 裁定）
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据（fresh session，2026-06-21；见 `Closure Audit Evidence`）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### `draggable` schema 暴露（dialog）

- Classification: `optimization candidate`
- Why Not Blocking Closure: design.md §2 L33 标 `暂不实现`；UI primitive 已支持拖把（drag handle），但 schema 未暴露。非高频，归后续按需评估。
- Successor Required: no
- Successor Path: 归 E3 P2 评估。

### `component:open`/`component:close`/`component:toggle` capability contracts

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §8（dialog）L96 + §8（drawer）L86 注明仍属 future capability 方向。当前打开/关闭走 `openDialog`/`openDrawer`/`closeSurface` action API（runtime-owned，已稳定）。`component:*` capability 是另一套寻址机制（按 ComponentHandle），归 X1 doAction 命令族统一收口。
- Successor Required: yes
- Successor Path: X1 plan（doAction 命令族统一）。

### `allowFullscreen` + setFullScreen / 动画过渡钩子 / lazyRender

- Classification: `optimization candidate`
- Why Not Blocking Closure: design.md §2 L34/L37/L38 均标 `暂不实现`，低频或当前满足。
- Successor Required: no
- Successor Path: 归 E3 P2 评估。

## Non-Blocking Follow-ups

- `dialogType: 'confirm'` 判别类型已由 design.md §2 L35 裁定为 `不采纳`（用 `confirm` 布尔 + surface 语义），本 plan 不重新评估。
- mobile-roadmap.md 的响应式 surface 改造（小屏全屏覆盖）归 mobile-roadmap 独立推进，本 plan 不涉及。

## Closure

Status Note: Plan 按 mission-driver 指令置 `completed`，并经独立 fresh-session closure-audit 复核通过。所有 4 Phase 实施完成；Closure Gates 全部 `[x]`（含独立子 agent closure-audit 条目）。执行 session 自检时按 AGENTS.md「Human gates」规则将 closure-audit 留 `[ ]`；本次由独立 fresh-session auditor 复核 live repo（schemas/host/renderer-definition/ui drawer/tests/design.md/roadmap/daily-log）并独立重跑 `pnpm typecheck`=49/49、`pnpm test`=49/49、`pnpm lint`=26/26（FULL TURBO cached green）后勾选该 gate。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit sub-agent（fresh session，不复用执行者上下文，2026-06-21）
- Evidence:
  - **Phase 1 (Schema + Definition)**：`packages/flux-renderers-basic/src/schemas.ts:27-51`（DialogSchema）+ `:53-79`（DrawerSchema）含全部新字段（closeOnEsc/size/width/height/showCloseButton/header/footer/confirm/onConfirm/bodyClassName/headerClassName/footerClassName + drawer closeOnOutside + resizable）；`SurfaceSize` 6 档 union 定义于 `:10`；`packages/flux-renderers-basic/src/surface-renderer-definitions.ts`（214 行）含 `dialogRendererDefinition`/`drawerRendererDefinition` 的 `propContracts`/`eventContracts`（含 `onConfirm` payload `{ surfaceId, kind, open }`）/`fields`（含 header/footer region key）。
  - **Phase 2 (Asymmetric bug + closeOnEsc/size/width/height/showCloseButton/resizable)**：`packages/flux-react/src/dialog-host.tsx` `DialogView`（`:182-353`）+ `DrawerView`（`:355-534`）消费全部新字段；drawer `closeOnOutside` 读取于 `:402`（修不对称 bug）；`shouldSuppressClose`（`:83-94`）实现 outside-press/escape-key reason 拦截；`buildSurfaceInlineStyle`（`:50-79`）实现 size-full（viewport/percent）+ width/height override；ui `packages/ui/src/components/ui/drawer.tsx:111-173` `DrawerContent` 含 `resizable` prop + `useDrawerResize` + `[data-slot="drawer-resize-handle"]`。
  - **Phase 3 (header/footer region + confirm + className)**：`DialogView`/`DrawerView` 从 `surface.regionHandles?.header/?.footer`（`:218-221`/`:391-394`）读取 region；`resolveConfirmButtons`（`:110-124`）实现 confirm 自动生成（actions 显式时抑制）；confirm button 触发 `surface.onConfirm?.()` 后 `handleClose()`（`:247-250`/`:420-423`）；`bodyClassName`/`headerClassName`/`footerClassName` 透传到 `DialogBody/Header/Footer` + `DrawerBody/Header/Footer`。
  - **Anti-Hollow 抽查**：`detail-surface.tsx:111`（flux-renderers-form-advanced）`<DrawerContent showCloseButton={false}>` 兼容修复已落地（避免与 ui 新增默认 close button 重复）；新代码全部在 runtime 调用链上（DialogHost → DialogView/DrawerView → ui primitives），无空函数体 / return null 占位 / 静默吞异常。
  - **Phase 4 (Owner-Doc Sync)**：`docs/components/dialog/design.md` §2 决策表 6 行已翻 `实现`（`:27-32`，无残留 `计划实现（E2f）`）；`docs/components/drawer/design.md` §2 决策表 7 行 + showCloseButton 已翻 `实现`（`:25-33`，`⚠️ 不对称 bug` warning 已删除）；`docs/components/existing-components-improvement-roadmap.md` `:52` E2f=`done`、`:3` Last Updated=`2026-06-21 (E2f done)`；`docs/logs/2026/06-21.md` 含 E2f 收口条目；`docs/architecture/surface-owner.md` 经裁定 No update required（L283-288 confirm/commit 已定义为 Semantic Lifecycle Owner，与 surface ownership 解耦）。
  - **独立重跑验证（fresh session，2026-06-21）**：`pnpm typecheck`=49/49 successful（FULL TURBO cached）、`pnpm test`=49/49 successful（FULL TURBO cached；flux-renderers-basic 22 files/273 tests、flux-react 46 files/418 tests 实跑 green）、`pnpm lint`=26/26 successful（FULL TURBO cached）。
  - **Deferred honesty**：3 项 deferred（`draggable` / `component:*` capability / `allowFullscreen`+动画+lazyRender）分类诚实，均为 design.md 已裁定 `暂不实现`/`out-of-scope` 项，无 in-scope live defect 或 contract drift 被静默降级。
  - **Five-point consistency**：Plan Status `completed` / 4 Phase `Status: completed` / 4 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]` / Closure evidence 真实 —— 五处一致。

Follow-up:

- `component:open`/`component:close`/`component:toggle` capability contracts（归 X1 plan，已裁定 deferred）
- `draggable` schema 暴露 / `allowFullscreen` / `lazyRender` / 动画钩子（归 E3 P2 评估，design.md 已裁 `暂不实现`）
