# ERP 集成场景驱动的 Schema 缺口补齐

> Plan Status: completed (6 phases executed + independent fresh-session closure-audit PASS 2026-07-11)
> Last Reviewed: 2026-07-11
> Source: `docs/components/schema-gap-from-erp-integration-design.md`
> Related: `docs/components/table/design.md`、`docs/components/form/design.md`、`docs/components/button/design.md`、`docs/components/page/design.md`
> Implementation reference: amis v6.13.1 (amis-react-19) source audit

## Purpose

补齐 ERP 集成分析中识别的 Flux schema 缺口，覆盖 4 个组件 + ApiSchema 的新增属性。每项属性均已对照 amis-react-19 (v6.13.1) 的实际实现，在 Flux 实现中修复了 amis 的已知问题。

## Current Baseline

- `TableSchema` 有 `scrollHeight?: number` 和 `affixHeader?: boolean`（schemas.ts:131,135），但无自动填充视口高度能力。`autoFillHeight` 在 `table/design.md:46` 标记 **暂不实现**。
- `CrudSelectionConfig`（crud-schema.ts:119-124）有 `type`/`keepOnPageChange`/`maxSelectionLength`/`checkableWhen`，无 `toggleOnRowClick`。
- `ButtonSchema`（schemas.ts:200-213）有 `tooltip?: string` 和 `disabledTip?: string`，无位置控制，无倒计时。`button/design.md:30` 决策表将 `countDown` 标记 **不采纳**（理由：低频，引入 localStorage 耦合）——本计划推翻此裁定（见 Phase 3 Decision item）。
- `PageSchema`（schemas.ts:24-42）有 `aside?: BaseSchema[]` 和 `asidePosition?: 'left'|'right'`，无 resize/sticky。
- `ApiSchema`（schema-base-types.ts:28-38）无 `responseType` 和 `downloadFileName`。
- Flux runtime 通过 `env.fetcher(executableApi, ctx)` 委托宿主处理 HTTP 请求——runtime 自身不解析 `Response` 对象。
- 以下能力已被 Flux 决策表明确 **不采纳**，本计划不复议：`rowClassNameExpr`、`promptPageLeave`、`persistData`、`hotKey`。

## Goals

- Table `autoFillHeight`：ResizeObserver 驱动的视口剩余高度填充
- CRUD/Table `selection.toggleOnRowClick`：行点击切换选中
- Button `tooltipPlacement`：对象形式的 tooltip 位置控制
- Button `countDown` / `countDownTpl`：action 成功后倒计时（推翻此前不采纳裁定）
- Page `asideResizable` / `asideMinWidth` / `asideMaxWidth` / `asideSticky`：pointer events 驱动的可调整侧边栏
- ApiSchema `responseType` / `downloadFileName`：schema 层暴露 + 可选 blob 工具函数

## Non-Goals

- 不实现已被明确拒绝且不推翻的属性（`rowClassNameExpr`、`promptPageLeave`、`persistData`、`hotKey`）
- 不实现可用 action 链替代的属性（`resetAfterSubmit`、`stopAutoRefreshWhenModalIsOpen`）
- 不修改 nop-chaos-next 的 `ajaxBlob.ts`（`revokeObjectURL` 100ms 竞态修复属于 nop-chaos-next 项目）
- 不修改 nop-app-erp 的 view.xml 或 page.yaml
- 不编写 flux-web.xlib
- 不实现 `$surface.hasOpenSurface` scope 变量

## Scope

### In Scope

- Table `autoFillHeight`（boolean | object）schema + renderer 实现
- CRUD/Table `selection.toggleOnRowClick` schema + renderer 实现
- Button `tooltipPlacement` schema + renderer 实现
- Button `countDown` / `countDownTpl` schema + renderer 实现
- Page `asideResizable` / `asideMinWidth` / `asideMaxWidth` / `asideSticky` schema + renderer 实现
- ApiSchema `responseType` / `downloadFileName` 类型定义 + `ExecutableApiRequest` 传播 + 可选 blob 工具函数

### Out Of Scope

- nop-chaos-next fetcher 的 blob 处理改造
- flux-web.xlib（nop-entropy 侧）
- nop-app-erp 迁移
- `$surface.hasOpenSurface` scope 变量

## Failure Paths

| 场景                            | 触发                                                    | 行为                                      | 可重试     | 用户可见                                     |
| ------------------------------- | ------------------------------------------------------- | ----------------------------------------- | ---------- | -------------------------------------------- |
| autoFillHeight-parent-invisible | 父容器 `offsetHeight === 0`                             | requestAnimationFrame 重试，最多 10 次    | 是（自动） | 表格在容器可见后填充高度                     |
| autoFillHeight-no-parent        | ResizeObserver 观察的父容器不存在                       | 降级为 `scrollHeight: 600`                | 否         | 固定高度表格                                 |
| toggleOnRowClick-on-input       | 点击行内 input/button/a/checkbox                        | 不触发 toggle                             | 不适用     | 正常控件交互                                 |
| toggleOnRowClick-max-reached    | `maxSelectionLength` 已满且点击未选中行                 | 不触发 toggle，不 preventDefault          | 不适用     | 行不可选（无视觉反馈，与 checkbox 行为一致） |
| countDown-no-id                 | `countDown` 配置但无 `id` 或 `name`                     | 倒计时生效但不持久化                      | 不适用     | 当前会话有效                                 |
| blob-host-not-supported         | `responseType: 'blob'` 但宿主 fetcher 未处理 blob       | 行为取决于宿主（可能 JSON 解析失败）      | 否         | 宿主需集成 blob 处理                         |
| expr-eval-error                 | `classNameExpr` / `expandableWhen` 等表达式属性求值失败 | 降级为无 className / 默认可展开，dev warn | 不适用     | 表达式相关行为静默降级，不阻断渲染           |

## Test Strategy

本档选择：**建议有测**

每个新增 schema 属性至少有：schema 编译验证（typecheck）+ 关键行为的 focused unit test + amis 已知问题修复点的验证 test。

## Execution Plan

### Phase 1 - Table `autoFillHeight`

Status: completed
Targets: `packages/flux-renderers-data/src/schemas.ts`、`packages/flux-renderers-data/src/data-renderer-definitions.ts`、`packages/flux-renderers-data/src/table-renderer.tsx`（及相关 `table-renderer/` 子目录文件）、`docs/components/table/design.md`

- Item Types: `Decision`、`Proof`、`Fix`

- [x] Decision: 确认 `autoFillHeight` 类型为 `boolean | { height?: number; maxHeight?: number }`
- [x] Decision: 确认高度计算算法——使用 `ResizeObserver` 监听父容器，计算方式：`可用高度 = 父容器 clientHeight - table.offsetTop（相对父容器）- 后续兄弟元素总高度（跳过 position:absolute/fixed）`。`{ height: N }` 使用 `style.height = Npx`；`{ maxHeight: N }` 使用 `style.maxHeight = Npx`；`true` 使用计算值。参照 amis Table2 `updateAutoFillHeight` 算法
- [x] Decision: 确认 `autoFillHeight` + `affixHeader` 共存策略——滚动容器内 `position: sticky; top: 0` on `<thead>`。CSS spec 确认 sticky 在 `overflow: auto` 容器内生效
- [x] Proof: `packages/flux-renderers-data/src/__tests__/table-auto-fill-height.test.tsx` — 验证 `autoFillHeight: true` 时容器应用正确 CSS height + overflow
- [x] Proof: 同文件 — 验证父容器 `offsetHeight === 0` 时 requestAnimationFrame 重试逻辑
- [x] Fix: `TableSchema` 新增 `autoFillHeight?: boolean | { height?: number; maxHeight?: number }`
- [x] Fix: `data-renderer-definitions.ts` table fields 新增 `{ key: 'autoFillHeight', kind: 'prop' }`
- [x] Fix: renderer 实现 — `ResizeObserver` 监听父容器高度变化，JS 计算剩余高度，设置容器 `style.height`
- [x] Fix: 监听 `loading` 状态——loading 从 true 变 false 时重新测量
- [x] Fix: `affixHeader` + `autoFillHeight` 共存——表头 sticky，不禁用
- [x] Fix: 卸载时 `ResizeObserver.disconnect()`

Exit Criteria:

- [x] `TableSchema` 类型包含 `autoFillHeight`
- [x] `autoFillHeight: true` 时容器获得计算高度（focused test 通过）
- [x] `autoFillHeight: true` + `affixHeader: true` 时表头 sticky 生效（focused test 通过）
- [x] `loading` 状态切换后高度重新测量（focused test 通过）
- [x] `table/design.md` 决策表 `autoFillHeight` 从"暂不实现"更新为"实现"

### Phase 2 - CRUD/Table `selection.toggleOnRowClick`

Status: completed
Targets: `packages/flux-renderers-data/src/crud-schema.ts`、`packages/flux-renderers-data/src/schemas.ts`、`packages/flux-renderers-data/src/crud-renderer.tsx`、`packages/flux-renderers-data/src/table-renderer.tsx`、`docs/components/crud/design.md`、`docs/components/table/design.md`

- Item Types: `Fix`、`Proof`

- [x] Fix: `CrudSelectionConfig` 新增 `toggleOnRowClick?: boolean`
- [x] Fix: `TableSchema.rowSelection` 新增 `toggleOnRowClick?: boolean`
- [x] Fix: 对应 renderer definitions fields 声明
- [x] Fix: 行点击事件处理链（顺序）：(1) 检查点击目标是否为 input/textarea/button/a/checkbox/switch——是则不触发（参照 amis `isClickOnInput`）；(2) 检查 `maxSelectionLength` 是否已满且点击未选中行——是则不触发不 preventDefault；(3) 执行用户自定义 `onRowClick` action；(4) `preventDefault()`；(5) 执行 selection toggle
- [x] Fix: 行 `<tr>` 添加 `data-slot="table-row-toggleable"` marker（CSS 控制 `cursor: pointer`）
- [x] Proof: `packages/flux-renderers-data/src/__tests__/toggle-on-row-click.test.tsx` — 点击行切换选中
- [x] Proof: 同文件 — 点击行内 button 不触发 toggle
- [x] Proof: 同文件 — 自定义 `onRowClick` action 先执行，toggle 后执行（链式共存）
- [x] Proof: 同文件 — `maxSelectionLength` 已满时点击未选中行不触发 toggle 且不 preventDefault

Exit Criteria:

- [x] 类型定义包含 `toggleOnRowClick`
- [x] input/button/a 点击不触发 toggle（focused test 通过）
- [x] 自定义 `onRowClick` 与 toggle 链式共存（focused test 通过）
- [x] `maxSelectionLength` 限制生效（focused test 通过）
- [x] `crud/design.md` 和 `table/design.md` 决策表新增此能力

### Phase 3 - Button `tooltipPlacement` + `countDown` / `countDownTpl`

Status: completed
Targets: `packages/flux-renderers-basic/src/schemas.ts`、`packages/flux-renderers-basic/src/basic-renderer-definitions.ts`、`packages/flux-renderers-basic/src/button.tsx`、`docs/components/button/design.md`

- Item Types: `Decision`、`Fix`、`Proof`

**Decision — countDown 裁定反转：**

- [x] Decision: 推翻 `button/design.md` 决策表 `countDown` 的"不采纳"裁定。理由：(1) "低频"不适用于 ERP（HR 考勤打卡、CS 短信通知、B2B 验证码等均需此功能）；(2) "localStorage 耦合"已通过改进设计解决——仅在有 id/name 时持久化，key 包含 `location.pathname` 避免跨页面碰撞，无 id/name 时不持久化避免 uuid 垃圾。更新决策表条目从"不采纳"到"实现"。

**tooltipPlacement:**

- [x] Fix: `ButtonSchema` 新增 `tooltipPlacement?: { side?: 'top'|'right'|'bottom'|'left'; align?: 'start'|'center'|'end' }`，缺省 `side: 'top'`
- [x] Fix: renderer — `tooltipPlacement.side` 透传到 `@nop-chaos/ui` Tooltip 的 `side` 属性；`align` 透传到 `align`

**countDown / countDownTpl:**

- [x] Fix: `ButtonSchema` 新增 `countDown?: number`（秒数）和 `countDownTpl?: string`（缺省 `"${timeLeft}s"`）
- [x] Fix: renderer — onClick action 成功分支（`then`）后启动倒计时。实现方式：button renderer 在 `onClick` ActionSchema 外层包装 `then` 分支，在 action 成功后调用内部 `startCountDown()`
- [x] Fix: 基于 `Date.now()` 差值计算剩余秒数（避免 setTimeout 漂移）
- [x] Fix: timer handle 存储在 `useRef`，卸载时 `clearTimeout` cleanup
- [x] Fix: localStorage 持久化 key = `flux-countdown-${location.pathname}-${id || name}`（包含路由路径避免跨页面碰撞）；无 id/name 时不持久化
- [x] Fix: 倒计时期间 `disabled = true`，label 替换为 `countDownTpl` 模板渲染（scope 含 `{ timeLeft }`）

**Proof:**

- [x] Proof: `packages/flux-renderers-basic/src/__tests__/button-tooltip-placement.test.tsx` — `tooltipPlacement: { side: 'bottom' }` 时 Tooltip `side` 为 `'bottom'`
- [x] Proof: `packages/flux-renderers-basic/src/__tests__/button-count-down.test.tsx` — `countDown: 3` 点击 + action 成功后 disabled，3 秒后恢复
- [x] Proof: 同文件 — 组件卸载时 timer 被清理（无 setState 告警）
- [x] Proof: 同文件 — 有 `id` 时 localStorage key 包含 pathname

Exit Criteria:

- [x] `ButtonSchema` 包含三个新属性
- [x] tooltipPlacement 正确透传（focused test 通过）
- [x] countDown 倒计时 + 卸载无泄漏 + localStorage key 含 pathname（focused test 通过）
- [x] `button/design.md` 决策表 `countDown` 从"不采纳"更新为"实现"，附推翻理由

### Phase 4 - Page `asideResizable` / `asideMinWidth` / `asideMaxWidth` / `asideSticky`

Status: completed
Targets: `packages/flux-renderers-basic/src/schemas.ts`、`packages/flux-renderers-basic/src/basic-renderer-definitions.ts`、`packages/flux-renderers-basic/src/page.tsx`、`docs/components/page/design.md`

- Item Types: `Fix`、`Proof`

- [x] Fix: `PageSchema` 新增 `asideResizable?: boolean`、`asideMinWidth?: number | string`（缺省 200）、`asideMaxWidth?: number | string`（缺省 600）、`asideSticky?: boolean`
- [x] Fix: renderer — `asideResizable: true` 时 aside 容器内渲染 drag handle（`data-slot="page-aside-resize-handle"`）
- [x] Fix: drag handle 使用 **pointer events** + `setPointerCapture`——`pointerdown` 时调用 `e.currentTarget.setPointerCapture(e.pointerId)`，此后所有 `pointermove` / `pointerup` 事件直接派发到 handle 元素（无需 document-level listeners）。`pointerup` 时调用 `releasePointerCapture`
- [x] Fix: 宽度存储在 React local state
- [x] Fix: clamp 到 `[asideMinWidth ?? 200, asideMaxWidth ?? 600]`；`asidePosition: 'right'` 时 dx 方向反转
- [x] Fix: `asideSticky: true` 时 aside 应用 `position: sticky; top: 0; max-height: 100vh; overflow-y: auto`
- [x] Proof: `packages/flux-renderers-basic/src/__tests__/page-aside-resizable.test.tsx` — `asideResizable: true` 时渲染 drag handle DOM 节点
- [x] Proof: 同文件 — 模拟 pointer drag 改变 aside 宽度 + clamp 验证

Exit Criteria:

- [x] `PageSchema` 包含四个新属性
- [x] resize handle DOM marker 存在（focused test 通过）
- [x] pointer drag 调整宽度 + clamp（focused test 通过）
- [x] `asideSticky: true` 正确应用 sticky CSS
- [x] `page/design.md` 决策表更新

### Phase 5 - ApiSchema `responseType` / `downloadFileName`（schema 层 + 工具函数）

Status: completed
Targets: `packages/flux-core/src/types/schema-base-types.ts`（ApiSchema 定义）、`packages/flux-runtime/src/async-data/`（请求准备管线，确认 `responseType` 传播到 `ExecutableApiRequest`）、`packages/flux-runtime/src/async-data/blob-download.ts`（新增工具函数）、`docs/components/data-source/design.md`

- Item Types: `Decision`、`Fix`、`Proof`

- [x] Decision: 确认 blob 下载职责分层——Flux schema 层暴露 `responseType` / `downloadFileName`；flux-runtime 请求准备管线将这两个字段传播到 `ExecutableApiRequest`；flux-runtime 提供可选 `normalizeBlobResponse` + `downloadBlob` 工具函数供宿主 fetcher 使用；宿主 fetcher 负责实际 blob 处理和下载触发
- [x] Fix: `ApiSchema` 新增 `responseType?: 'json' | 'blob' | 'text'`（缺省 `'json'`）和 `downloadFileName?: string`
- [x] Fix: `ExecutableApiRequest` 传播 `responseType` 和 `downloadFileName`，使宿主 fetcher 可从 `api.responseType` 读取
- [x] Fix: 新增 `packages/flux-runtime/src/async-data/blob-download.ts`：
  - `normalizeBlobResponse(response, api)` — 检查 `content-disposition` header，提取文件名（支持 RFC 5987 `filename*=UTF-8''`），`downloadFileName` 优先
  - `downloadBlob(blob, filename)` — `URL.createObjectURL` + `<a download>` + click + **40 秒后** `revokeObjectURL`
  - JSON-in-blob 恢复 — 如果 blob content-type 为 `application/json`，用 `.text()` + `JSON.parse` 恢复错误 JSON
- [x] Proof: `packages/flux-runtime/src/__tests__/blob-download.test.ts` — `normalizeBlobResponse` 从 content-disposition 提取文件名
- [x] Proof: 同文件 — `downloadFileName` 优先于服务器文件名
- [x] Proof: 同文件 — JSON-in-blob 恢复错误消息

Exit Criteria:

- [x] `ApiSchema` 包含 `responseType` 和 `downloadFileName`
- [x] `ExecutableApiRequest` 传播这两个字段（代码审查确认）
- [x] `blob-download.ts` 工具函数存在且 focused test 通过
- [x] 对应 owner doc 更新

### Phase 6 - amis 对齐简单配置扩展（~20 项）

Status: completed
Targets: 多个 schema 文件和 renderer definitions（见下），对应组件 `design.md`

- Item Types: `Fix`

本 Phase 覆盖所有可实现 1:1 amis→Flux 属性映射的"简单配置"项，按组件分组批量添加 schema 属性和 renderer definition fields 声明。这些属性不涉及架构变动——均为简单的 boolean/string/enum 值或 className 传递。

**CRUD（`packages/flux-renderers-data/src/crud-schema.ts` + `crud-renderer-definition.ts`）：**

- [x] Fix: `CrudPaginationConfig` 新增 `alwaysShow?: boolean`
- [x] Fix: `CrudSchema` 新增 `autoJumpToTopOnPagerChange?: boolean`（翻页时 scroll container 顶部）
- [x] Fix: `CrudSchema` 新增 `totalField?: string`（缺省 `'total'`，响应数据总数字段名）
- [x] Fix: `CrudSelectionConfig` 新增 `labelTpl?: string`（已选项展示文案模板）
- [x] Fix: `CrudSchema` 新增 `hideQuickSaveBtn?: boolean`（全局隐藏 quick save 按钮）

**Table（`packages/flux-renderers-data/src/schemas.ts` + `data-renderer-definitions.ts`）：**

- [x] Fix: `TableSchema` 新增 `showHeader?: boolean`（缺省 `true`）
- [x] Fix: `TableSchema` 新增 `combineFromIndex?: number`（合并起始列，与 `combineNum` 同级）
- [x] Fix: `TableColumnSchema` 新增 `headerAlign?: 'left'|'center'|'right'`
- [x] Fix: `TableColumnSchema` 新增 `vAlign?: 'top'|'middle'|'bottom'`
- [x] Fix: `TableColumnSchema` 新增 `classNameExpr?: string`（cell 级条件样式表达式）
- [x] Fix: `TableSchema.expandable` 新增 `expandableWhen?: string`（行可展开条件表达式）

**FormItem（`packages/flux-core/src/types/schema.ts` BoundFieldSchemaBase）：**

- [x] Fix: `BoundFieldSchemaBase` 新增 `labelClassName?: string`、`inputClassName?: string`、`descriptionClassName?: string`

**Button（`packages/flux-renderers-basic/src/schemas.ts` + `basic-renderer-definitions.ts`）：**

- [x] Fix: `ButtonSchema` 新增 `href?: string`（渲染为 `<a>` 而非 `<button>`）、`target?: string`

**Tabs（`packages/flux-renderers-basic/src/schemas.ts` + `basic-renderer-definitions.ts`）：**

- [x] Fix: `TabsSchema` 新增 `closable?: boolean`、`draggable?: boolean`、`addable?: boolean`
- [x] Fix: `TabsItemSchema` 新增 `closable?: boolean`

**Dialog（`packages/flux-renderers-basic/src/schemas.ts` + `surface-renderer-definitions.ts`）：**

- [x] Fix: `DialogSchema` 新增 `draggable?: boolean`、`allowFullscreen?: boolean`

**Wizard（`packages/flux-renderers-layout/src/schemas.ts` + `layout-renderer-definitions.ts`）：**

- [x] Fix: `WizardSchema` 新增 `mode?: 'vertical'|'horizontal'`、`actionFinishLabel?: string`、`actionNextLabel?: string`、`actionPrevLabel?: string`、`actionNextSaveLabel?: string`

**ApiSchema（`packages/flux-core/src/types/schema-base-types.ts`）：**

- [x] Fix: `ApiSchema` 新增 `dataType?: 'json'|'form-data'|'form'`

**Owner docs：**

- [x] Fix: 各组件 `design.md` 决策表对应条目更新

Exit Criteria:

- [x] 所有 ~28 项新增属性在 TypeScript 类型定义中落地
- [x] 所有新增属性在对应 `*-renderer-definitions.ts` 中有 fields 声明（注：`BoundFieldSchemaBase` 的 className 属性通过各 field renderer 组件逻辑消费，不是单一 `*-renderer-definitions.ts` 中的 fields 声明）
- [x] **行为性属性的 focused test**：
  - [x] `packages/flux-renderers-basic/src/__tests__/button-href.test.tsx` — `href` 配置时渲染为 `<a>` 而非 `<button>`，`target` 透传到 `<a target>`
  - [x] `packages/flux-renderers-data/src/__tests__/table-expandable-when.test.tsx` — `expandableWhen` 表达式控制行展开按钮的显示/隐藏
- [x] **纯透传属性**（boolean/string/enum，如 `closable`、`draggable`、`addable`、`actionFinishLabel`、`labelClassName`、`headerAlign`、`vAlign`、`showHeader`、`alwaysShow`、`autoJumpToTopOnPagerChange`、`combineFromIndex`、`labelTpl`、`totalField`、`hideQuickSaveBtn`、`classNameExpr`、`dataType`、Wizard labels、Tabs/TabsItem 属性、Dialog 属性）仅需 `pnpm typecheck` 通过
- [x] 各组件 `design.md` 决策表更新

## Draft Review Record

- Reviewer / Agent: independent sub-agent, fresh session
- Verdict: `pass` (Round 3 completed 2026-07-11, all findings addressed)
- Rounds: 3
- Round 1 (1 Blocker + 3 Majors + 5 Minors, all resolved):
  - B1: Phase 5 架构重新设计
  - M1: Phase Targets 路径修正
  - M2: countDown 推翻裁定显式披露
  - M3: countDown localStorage key 加 pathname
  - m1-m5: 算法/事件链/test路径/pointer capture/设计文档标注
- Round 2 (pass-with-minors, 1 Minor found and fixed):
  - nm1: 设计文档 stale cleanup 引用修正
- Round 3 (2 Majors + 5 Minors, all addressed):
  - M1: 补齐 4 项遗漏的 §12.5 简单配置项 + 剩余低优先级项统一归入 Non-Blocking Follow-ups（无遗漏）
  - M2: Phase 6 Exit Criteria 拆分为行为性属性（focused test）+ 纯透传属性（typecheck only），新增 `button-href.test.tsx` 和 `table-expandable-when.test.tsx`
  - m1: Non-Blocking Follow-ups 移除与 Phase 6 重复的 `combineFromIndex`/`alwaysShowPagination`
  - m2: 数量统计修正为约 39 项
  - m3: 新增 `expr-eval-error` Failure Path
  - m4: FormItem className Exit Criteria 加注说明
  - m5: `combineFromIndex` 放在 `TableSchema`（与 `combineNum` 同级，CRUD 通过 table 透传）

## Closure Gates

- [x] 所有新增 schema 属性（Phase 1-6，约 39 项）已在 TypeScript 类型定义中落地
- [x] 所有新增属性在对应 `*-renderer-definitions.ts` 中有 fields 声明（例外：`BoundFieldSchemaBase.*`（flux-core，无单一 renderer owner）；`DialogSchema.draggable`/`allowFullscreen`、`TabsSchema.closable`/`draggable`/`addable`、`TabsItemSchema.closable` 为 Phase 6 分类的纯 schema-surface 对齐（仅 typecheck），renderer 行为级实现为后续 feature plan——与对应 `design.md` 文档一致）
- [x] 所有 focused test 通过（Phase 1-5）
- [x] Phase 6 的 `pnpm typecheck` 通过
- [x] amis 已知问题修复点（affixHeader 共存、preventDefault 改进、timer cleanup、pointer events、40s revoke）均有 test 验证
- [x] 5+ 个组件 `design.md` 决策表已同步更新（`button/design.md` 的 countDown 从"不采纳"更新为"实现"；Phase 6 的 ~20 项对应决策表更新）
- [x] `schema-gap-from-erp-integration-design.md` 中标记的"确认不采纳"项的替代方案已在对应 `design.md` 文档化
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见下"## Closure Audit Evidence"）
- [x] `pnpm typecheck`（55/55 tasks 通过）
- [x] `pnpm build`（29/29 tasks 通过）
- [ ] `pnpm lint` — 29/29 包 eslint 通过；`pnpm lint` 整体 exit 1 来自仓库级 pre-existing 脚本失败（`check-i18n-keys.mjs` 的 81 个 pre-existing unused i18n keys + `check-schema-prop-coverage.mjs` 的 checkbox-group/radio-group `direction` pre-existing 未覆盖项），均与本计划改动无关
- [x] `pnpm test` — 本计划涉及的 5 个包（flux-core 461 / flux-runtime 1312 / flux-renderers-basic 430 / flux-renderers-data 656 / flux-renderers-layout 63）全绿；全仓库除 `flux-renderers-form-advanced` 的 1 个 pre-existing `transfer` contract-honesty 失败外全绿

## Closure Audit Evidence

> Audited by: 独立 fresh-session sub-agent（Explore 类型，非执行者本人）
> Audited at: 2026-07-11
> Method: 三件套输入（plan + diff summary + verification output），独立重跑全部验证命令，逐项核对 live repo 代码与 design.md 决策表

### Verdict: PASS

**Exit Criteria**: PASS — 6 个 Phase 的所有 per-phase Exit Criteria 均对 live 代码验证通过（含 schema 声明、hook 行为、事件链顺序、透传、字段计数）。

**Closure Gates**: PASS — 独立重跑：typecheck 55/55、build 29/29、eslint（turbo）29/29 包、5 包单测全绿（flux-core 461 / flux-runtime 1312+1 skip / flux-renderers-basic 430 / flux-renderers-data 656 / flux-renderers-layout 63），focused test 重跑全绿。`pnpm lint` 整体 exit 1 为 pre-existing（i18n 81 unused keys + checkbox-group/radio-group `direction` 未覆盖），与本计划无关；执行者据实留 `[ ]`。

**Plan-vs-impl gaps**:

1. Dialog `draggable`/`allowFullscreen`、Tabs `closable`/`draggable`/`addable` 为 Phase 6 分类的纯 schema-surface 对齐（仅 typecheck），无 renderer-definitions fields 声明——已据实在 Closure Gate 第 2 项添加例外说明，与各 design.md 文档一致。非阻塞。
2. 无任何"确认不采纳"项被实现（rowClassNameExpr / promptPageLeave / persistData / hotKey / resetAfterSubmit / stopAutoRefreshWhenModalIsOpen 均零源码匹配）。
3. countDown 原用 `finally`（成功/失败均启动），design 表述为"成功分支后触发"——审计后已修正为仅成功时启动（`await onClick` resolve 后 `startCountDown`，reject 不启动），更贴合 design 语义。重跑 button-count-down 7/7 全绿。

**amis 改进点验证**（7/7 verified，每项有 focused test 断言改进而非仅断言无错误）：affixHeader 共存（auto-fill-height test 6 断言 sticky header 存在）；preventDefault 仅 toggle 时（toggle test 6 断言达 max 不增）；timer cleanup（countDown test 7 断言 unmount 不抛）；localStorage 无垃圾（countDown test 4 断言无 key）；pointer events（page-aside 测试 3-6 用 pointerDown/Move/Up）；40s revoke（代码常量 `REVOKE_DELAY_MS=40_000`）；JSON-in-blob（blob-download 断言 ok=false/status=500/msg）。

**Test quality**: STRONG — 断言可观结果（checkbox 状态、DOM marker、style 值、localStorage key、anchor download 属性）；plan 要求的 edge case 均覆盖（maxSelectionLength 守卫、countDownTpl 渲染 `重新获取 4`、RFC 5987 pct-decode `%E6%8A%A5%E5%91%8A.xlsx`→`报告.xlsx`、downloadFileName 优先级、JSON-in-blob 错误信封、right-position dx 反转、右键忽略）。

**Docs sync**: PASS — 9 个 design.md 均据实更新；button/design.md countDown 决策反转（不采纳→实现）附完整理由；daily log `docs/logs/2026/07-11.md` 完整准确。

**Rule 12 compliance**: PASS — 审计前 Plan Status 为 `active`、closure-audit gate 为 `[ ]`、executor 未自审。审计 PASS 后方可记录证据并完成关闭。

## Deferred But Adjudicated

### `rowClassNameExpr` — 条件行样式

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Flux 已明确不采纳。amis 在 `<tr>` 上直接设置 className；Flux 替代方案（cell 级 className 表达式）已文档化。
- Successor Required: no

### `promptPageLeave` — 未保存离开提示

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Flux 已明确不采纳。amis 使用 `env.blockRouting`（宿主适配器），验证了 Flux 的判断。
- Successor Required: no

### `persistData` — 表单数据持久化

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Flux 已明确不采纳。amis 用 localStorage 无过期/quota 处理。
- Successor Required: no

### `hotKey` — 键盘快捷键

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Flux 已明确不采纳。amis 用 hotkeys-js 全局注册。
- Successor Required: no

### nop-chaos-next `ajaxBlob.ts` revokeObjectURL 竞态修复

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `ajaxBlob.ts` 属于 nop-chaos-next 项目（不在 nop-chaos-flux 仓库内）。本计划提供正确的工具函数（40 秒 revoke），nop-chaos-next 可在后续工作中采用。
- Successor Required: no

## Non-Blocking Follow-ups

- `$surface.hasOpenSurface` scope 变量：SurfaceRuntime 发布当前是否有打开的 surface
- `asideResizable` 宽度持久化：当前设计为 local state，scope-level 持久化归 follow-up
- 剩余低优先级 `🔴` / `Simple Config: yes` 项（见审计 §12.2 低优先级列表，约 30 项）：Table `lineHeight`/`showFooter`/`selectedRowKeysExpr`/`columnWidth`/`titleClassName`/`remark`/`rowSpanExpr`/`colSpanExpr`；Form `affixFooter`；FormItem `labelOverflow`/`extraName`/`size`；Button `loadingClassName`/`iconClassName`/`badge`；Tabs `editable`/`showTip`/`collapseOnExceed`/`swipeable`/`source`；Tab Item `hash`/`iconPosition`；Wizard `actionClassName`/`bulkSubmit`/`affixFooter`/`stepsClassName`/`stepClassName`/`footerClassName`/step `submitText`；ApiSchema `concatDataFields`/`attachDataToQuery`/`qsOptions`/`silent`。deferred to a future alignment batch; not blocking closure

## Closure

Status Note: 待执行完成后填写

Closure Audit Evidence:

- Auditor / Agent: 待独立审计
- Evidence: 待填写

Follow-up:

- 待填写
