# ERP 集成场景驱动的 Schema 缺口分析

> Status: design proposal (Round 2 review: pass-with-minors; amis alignment expansion added)
> Source: `nop-app-erp/docs/analysis/2026-07-11-flux-integration-strategy-analysis.md`、`nop-app-erp/docs/analysis/2026-07-11-flux-component-property-mapping.md`、`nop-app-erp/docs/analysis/2026-07-11-flux-amis-schema-gap-exhaustive-audit.md`
> Related: `docs/components/table/design.md`、`docs/components/form/design.md`、`docs/components/button/design.md`、`docs/components/crud/design.md`、`docs/components/page/design.md`
> Implementation reference: amis v6.13.1 (amis-react-19) source audit
> Note: 本文档是跨组件 gap 分析，非单组件设计文档，不遵循 `docs/components/index.md` 的 12 节结构。

## 背景

nop-app-erp（18 业务域 + 1 跨域子系统，337 实体）计划从 AMIS 迁移到 Flux。在对 view.xml 全量属性与 Flux 组件 schema 的逐项对照中（见来源文档），识别出一组 Flux 尚未覆盖的 UI 行为。

本文档按组件逐一分析这些缺口，对比 amis-react-19 (v6.13.1) 的实际实现方式，裁定每个缺口是：

- **建议新增** — Flux 应补充此能力，附具体 schema 和实现方案
- **确认不采纳** — Flux 已有设计理由拒绝，文档化 Flux 原生替代方案
- **已有替代** — Flux 已有能力覆盖，仅需文档化映射

---

## 1. Table / CRUD

### 1.1 `autoFillHeight` — 容器自适应高度

**当前状态**：`table/design.md` 决策表标记 **暂不实现**，理由"与上游 loading/ownership 耦合，后续按需"。

**ERP 场景**：337 个 `_gen/*.view.xml` 全部在 `<table autoFillHeight="true">` 中使用此属性。

**amis-react-19 实现分析**：

amis 使用**纯 JS DOM 测量**（非 CSS flex），通过 `ResizeObserver` 监听父容器变化，遍历祖先和兄弟元素累加高度，计算 `viewportHeight - tableTop - siblingsHeight - 1`。

两种实现存在：

- **Legacy Table**：注册两个 resizeSensor（parentElement + document.body），有 visibility retry（offsetHeight 为 0 时 setTimeout 重试），设置 CSS 变量 `--Table-content-height`
- **Table2（CRUD2 使用）**：仅注册一个 sensor，无 retry，不设 CSS 变量

**关键发现：autoFillHeight 与 affixHeader 互斥**。amis 源码中 `affixHeader && !autoFillHeight` 是渲染条件——当 autoFillHeight 开启时，affixHeader 被完全禁用，表头随内容滚动。原设计文档假设两者可协同工作，此假设错误。

amis 还处理了 `loading` 状态切换——`componentDidUpdate` 中当 loading 从 true 变 false 时重新测量高度（因为 loading spinner 消失后布局变化）。

**裁定：建议新增**

Flux 实现方案（改进 amis 的方案）：

Schema：

```typescript
// TableSchema
autoFillHeight?: boolean | { height?: number; maxHeight?: number };
// true = 自动填充视口剩余高度
// { height: N } = 填充至固定 N px
// { maxHeight: N } = 最大高度 N px，内容更少时不拉伸
```

选择 `boolean | object` 而非 `boolean | number`，与 amis 的对象形式对齐（`height` / `maxHeight` 语义不同）。

实现方式：

- `true` 时使用 `ResizeObserver` 监听父容器，JS 计算剩余高度（参照 amis Table2 算法）
- 设置容器 `style.height = "${computed}px"; style.overflow = "auto"`
- `componentDidUpdate`/`useEffect` 依赖：监听 `loading` 状态变化时重新测量
- **与 `affixHeader` 的交互**：当 `autoFillHeight` 为 true 时，`affixHeader` 自动降级为容器内 sticky（`position: sticky; top: 0`），而非禁用。这是对 amis 行为的改进——amis 直接禁用 affixHeader，Flux 可以做得更好因为容器已有 `overflow: auto`
- 卸载时 `disconnect()` ResizeObserver
- visibility retry：父容器 `offsetHeight === 0` 时（如 Dialog 动画中），用 `requestAnimationFrame` 延迟重试（比 amis 的 `setTimeout(100ms)` 更高效）

对"loading/ownership 耦合"顾虑的回应：Flux 不需要知道数据状态——只需在 `loading` prop 变化时重新测量。ResizeObserver 是浏览器原生 API，无性能问题。

### 1.2 `rowClassName` / `rowClassNameExpr` — 条件行样式

**当前状态**：`table/design.md` 决策表标记 **不采纳**，理由"用 Flux 样式系统 marker class 表达行视觉态（X3 §3 样式 amis 化）"。

**ERP 场景**：超期工单红色背景、库存预警黄色背景、审批拒绝行灰色。

**amis-react-19 实现分析**：amis 在 `<tr>` 上直接设置 `className` + `rowClassNameExpr` 表达式求值结果。简单粗暴。

**裁定：确认不采纳，文档化替代方案**

Flux 原生替代方案（cell 级 className 表达式）：

```json
{
  "type": "crud",
  "columns": [
    {
      "name": "status",
      "label": "状态",
      "cell": { "className": "${record.status === 'rejected' ? 'bg-destructive/10' : ''}" }
    }
  ]
}
```

ERP 迁移建议：flux-web.xlib 的 codegen 将 view.xml 的 `rowClassNameExpr` 自动展开为每列 cell 的 className 表达式。

### 1.3 `checkOnItemClick` — 点击行切换选中

**当前状态**：Flux 未提及。

**ERP 场景**：批量选择时点击行任意位置即可勾选。

**amis-react-19 实现分析**：

amis 的优先级链（TableRow.js `handleItemClick`）：

1. 检查 `isClickOnInput(e)` — 点击 input/textarea/button/a/checkbox/switch 时不触发
2. `e.preventDefault(); e.stopPropagation()`
3. 先执行自定义 `onRowClick(item)` — 如果 `event.preventDefault()` 则中止
4. 如果设置了 `itemAction` → 执行 itemAction 并返回（**阴影 checkOnItemClick**）
5. 否则如果 `checkOnItemClick && item.checkable` → `onCheck(item, !item.checked)`

行还会添加 CSS class `Table-table--checkOnItemClick`（`cursor: pointer`）。

**关键问题**：amis 的 `e.preventDefault()` 始终执行（步骤 2），这会阻止行内文本选择。Flux 应改进此行为——仅在选择实际被切换时才 preventDefault。

**裁定：建议新增**

Schema（遵循 Flux 命名约定，不照搬 amis 名称）：

```typescript
// CrudSelectionConfig
selection?: {
  type?: 'checkbox' | 'radio';
  toggleOnRowClick?: boolean;  // 点击行切换选中（amis: checkOnItemClick）
  // ...existing fields
};

// TableSchema.rowSelection
rowSelection?: {
  toggleOnRowClick?: boolean;
  // ...existing fields
};
```

实现要求：

- 点击 checkbox/button/link/input 时不触发（参照 amis `isClickOnInput` 检查）
- 用户自定义 `onRowClick` action 先执行；不阻止则追加 selection toggle（链式执行，非覆盖）
- 仅在实际执行了 toggle 时才 `preventDefault()`（改进 amis 的始终 preventDefault）
- 行 `<tr>` 添加 `cursor: pointer` CSS（通过 `data-slot` marker 或 className）

---

## 2. Form

### 2.1 `promptPageLeave` — 未保存数据离开提示

**当前状态**：`form/design.md` 决策表标记 **不采纳**，理由"宿主路由职责（X3 §3）"。

**amis-react-19 实现分析**：

amis 的实现是 **Form 级别**（非 Page 级别），使用两套机制并行：

1. `window.addEventListener('beforeunload', ...)` — 浏览器原生，但现代浏览器忽略自定义消息
2. `env.blockRouting(callback)` — SPA 路由拦截，返回消息字符串则显示 confirm 对话框

Form 的 `store.modified` 判断逻辑：有 `savedData` 快照且当前 data 不同 → modified；无快照且非 pristine → modified。提交成功后 `savedData = data`，自动解除阻止。

**裁定：确认不采纳**

amis 的实现验证了 Flux 的判断——`promptPageLeave` 涉及路由拦截（`env.blockRouting`），这是宿主职责。Flux 的 `statusPath` 已发布 `dirty` 字段，宿主可实现等价守卫。

替代方案：宿主层（nop-chaos-next）在 `RendererEnv` 中实现路由守卫，读取指定 `statusPath` 的 `dirty` 值。

### 2.2 `resetAfterSubmit` — 提交后重置表单

**amis 实现**：amis 有 `resetAfterSubmit: boolean` schema 属性，在 submit 成功后自动 `store.reset()`。

**裁定：不新增 schema 标志**

Flux 的 `onSubmitSuccess: [{ action: "component:reset", componentId: "myForm" }]` 是显式组合方式，符合 Flux 设计哲学。flux-web.xlib 在 codegen 时将 `resetAfterSubmit: true` 转换为此 action 链。

### 2.3 `persistData` — 表单数据跨页面持久化

**当前状态**：`form/design.md` 决策表标记 **不采纳**。

**amis-react-19 实现分析**：

amis 使用 `localStorage`，key 包含 `location.pathname` + form path + persistData 值（支持模板表达式）。在 `onInit` 时恢复数据（在用户 callback 之前），每次 `handleChange` 时保存。支持 `persistDataKeys` 限定保存字段。无过期机制、无版本控制、无 quota 处理。

**裁定：确认不采纳**

amis 的实现存在多个问题（无过期、无 quota 处理、key 碰撞风险），验证了 Flux 将持久化归于宿主/状态管理层的判断。Zustand `persist` 中间件是更成熟的方案。

---

## 3. Button

### 3.1 `tooltipPlacement` — tooltip 位置控制

**当前状态**：Flux `ButtonSchema` 有 `tooltip?: string` 和 `disabledTip?: string`，无位置控制。

**amis-react-19 实现分析**：

amis 使用 flat enum `tooltipPlacement: 'top' | 'right' | 'bottom' | 'left' | 'auto'`。Button 默认 `'bottom'`（TooltipWrapper 默认 `'top'`）。amis 的 TooltipWrapper 是独立组件（175 行），默认 trigger 为 `['hover', 'focus']`（内置无障碍）。

**裁定：建议新增**

Flux schema（使用对象形式，对齐 `@nop-chaos/ui` Tooltip 的 `side`/`align` 属性）：

```typescript
// ButtonSchema
tooltipPlacement?: {
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
};
```

Flux Button 默认 `tooltipPlacement.side: 'top'`（与 Flux 现有 Tooltip 行为一致，不照搬 amis Button 的 `'bottom'` 默认值）。

### 3.2 `hotKey` — 键盘快捷键

**amis 实现**：amis 使用 `hotkeys-js` 库注册全局热键，在 Action renderer 中通过 `bindEvent('hotKey')` 绑定。

**裁定：确认不采纳**

全局热键涉及焦点管理、多 tab 隔离、无障碍冲突，属宿主层职责。

### 3.3 `countDown` / `countDownTpl` — 按钮倒计时

**当前状态**：Flux `button/design.md` 决策表标记 **不采纳**，理由"低频，引入 localStorage 耦合"。本节推翻该裁定。

**推翻理由**：

1. "低频"不适用于 ERP 场景——HR 模块的考勤打卡、CS 模块的 SMS 通知、B2B 模块的验证码等均需要此功能。
2. "localStorage 耦合"已在本设计中解决——仅在组件有 `id` 或 `name` 时才持久化，且 key 包含路由上下文（见下文），不产生全局耦合。

**ERP 场景**：SMS 验证码发送按钮"60s 后重新获取"。

**amis-react-19 实现分析**：

amis 的实现有值得参考的细节：

- **localStorage 持久化**：key = `'amis-countdownend-' + name + schemaId`，刷新页面后恢复倒计时。需要 `name` 或 `id`，否则 key 为随机 uuid，刷新后失效。
- **基于 `Date.now()` 差值**，而非递减计数器——避免 `setTimeout` 多次累积漂移。
- 倒计时在 **action 成功完成后** 才开始（非点击时），适用于"发送验证码成功后才开始倒计时"。
- **timer handle 未存储**（fire-and-forget `setTimeout`）——组件卸载时存在 `setState` 告警风险。
- `countDownTpl` 默认是 i18n key `'Action.countDown'`，通过 `__()` + `filterContents()` 渲染，scope 中有 `{ timeLeft }`。

**裁定：建议新增（推翻此前不采纳裁定）**

Flux schema：

```typescript
// ButtonSchema
countDown?: number;        // 倒计时秒数；action 成功后开始
countDownTpl?: string;     // 显示模板，支持 ${timeLeft}，缺省 "${timeLeft}s"
```

Flux 实现改进（相比 amis）：

- **存储 timer handle 并在卸载时清理**（`useRef` + `useEffect` cleanup）
- **localStorage 持久化**：key = `flux-countdown-${location.pathname}-${id || name}`；包含路由路径以避免不同页面的同名按钮碰撞（amis 的 `schemaId` 部分解决了此问题，Flux 用 `pathname` 更直接）；**无 id/name 时不持久化**（更安全，避免随机 uuid 垃圾）
- **基于 `Date.now()` 差值**（与 amis 相同策略，避免漂移）
- **在 `onClick` action 的成功分支后触发**，而非点击时立即触发——与 amis 语义一致。Flux 实现方式：button renderer 在 `onClick` ActionSchema 外层包装一个 `then` 分支，在 action 成功后启动倒计时
- `countDownTpl` 直接作为模板字符串（不经过 i18n `__()` 前缀处理，Flux 的 i18n 在平台层通过 `@i18n:` 前缀解决）

---

## 4. Page

### 4.1 `asideResizor` — 可调整侧边栏宽度

**当前状态**：Flux `PageSchema` 有 `aside` region 和 `asidePosition`，无 resize 能力。

**ERP 场景**：宽筛选条件面板，用户拖拽调整宽度。

**amis-react-19 实现分析**：

amis 属性名为 `asideResizor`（注意拼写——非 `asideResizable`）。实现细节：

- Drag handle 为 `<div onMouseDown={handleResizeMouseDown}>`
- `mousedown` 时记录 `startX` 和 `startWidth`，注册 `document.mousemove/mouseup`
- `mousemove` 计算 `dx = clientX - startX`，根据 `asidePosition` 方向调整（left 加 dx，right 减 dx），clamp 到 `[asideMinWidth, asideMaxWidth]`
- amis 默认 `asideMinWidth: 160`、`asideMaxWidth: 350`
- 直接修改 `style.cssText`（非 React state）——imperative
- **无持久化**——刷新后宽度重置
- **仅鼠标事件**，无触摸支持
- 忽略右键（`which === 3`）

**裁定：建议新增**

Flux schema（遵循 Flux 命名约定，不照搬 amis 的 `Resizor` 拼写）：

```typescript
// PageSchema
asideResizable?: boolean;                          // amis: asideResizor
asideMinWidth?: number | string;                   // 缺省 200
asideMaxWidth?: number | string;                   // 缺省 600
asideSticky?: boolean;                             // 侧边栏粘性定位
```

Flux 实现方案：

- Drag handle：`data-slot="page-aside-resize-handle"`
- **使用 pointer events**（`pointerdown/move/up`）而非 `mousedown/mousemove/mouseup`——原生支持触摸和笔
- 宽度使用 local state（React state，非 imperative DOM 操作）
- clamp 到 `[asideMinWidth ?? 200, asideMaxWidth ?? 600]`（Flux 默认值比 amis 的 160/350 更宽，适合 ERP 筛选面板）
- `asideSticky: true` 时应用 `position: sticky; top: 0; max-height: 100vh; overflow-y: auto`
- 卸载时 `releasePointerCapture`（pointer capture 模式下无需 document-level listeners）

---

## 5. API / Ajax

### 5.1 `responseType: 'blob'` / `downloadFileName` — 二进制响应下载

**当前状态**：Flux `ApiSchema` 无 `responseType`。

**amis-react-19 实现分析**：

amis 的下载链路：

1. `responseType: 'blob'` 传递到底层 XHR/fetch（由宿主 fetcher 执行）
2. 宿主 fetcher 调用 `attachmentAdpator(response, __, api)`——**amis 不自动调用**，需宿主集成
3. `attachmentAdpator` 检查 `content-disposition` header，提取文件名（支持 RFC 5987 `filename*=UTF-8''` 中文编码），用 `file-saver` 库触发下载
4. 返回合成的成功响应 `{ data: { status: 0, msg: 'downloading' } }`
5. **JSON-in-blob 恢复**：如果 blob 的 content-type 是 JSON，用 `FileReader.readAsText` + `JSON.parse` 恢复错误信息

**Flux 架构约束**：

Flux runtime 通过 `env.fetcher(executableApi, ctx)` 将请求委托给宿主——runtime 自身不调用 `fetch()` 也不解析 `Response` 对象。因此 `responseType: 'blob'` 的处理分为三层：

1. **Schema 层**（flux-core）：`ApiSchema` 和 `ExecutableApiRequest` 新增 `responseType` 和 `downloadFileName`，使这些字段从 schema 传播到宿主 fetcher
2. **宿主层**（如 nop-chaos-next）：宿主 fetcher 检查 `api.responseType`，为 `'blob'` 时调用 `response.blob()` 而非 `response.json()`
3. **工具函数**（flux-runtime）：提供可选的 `normalizeBlobResponse(response, api)` 工具函数，宿主 fetcher 可调用它来处理 content-disposition 文件名提取 + 下载触发 + JSON-in-blob 恢复。宿主不是必须使用此工具——可以自行实现

nop-chaos-next 已有 blob 下载实现（`ajaxBlob.ts`），但存在 `revokeObjectURL` 100ms 竞态风险——该修复属于 nop-chaos-next 项目，不在本计划范围内。本计划仅确保 Flux schema 层正确暴露 `responseType` 和 `downloadFileName`，并传播到 `ExecutableApiRequest`。

**裁定：建议新增（schema 层 + 工具函数）**

Flux schema：

```typescript
// ApiSchema (flux-core/src/types/schema-base-types.ts)
responseType?: 'json' | 'blob' | 'text';  // 缺省 'json'
downloadFileName?: string;                  // 覆盖服务器提供的文件名

// ExecutableApiRequest 需传播这两个字段，使宿主 fetcher 可读取
```

工具函数（flux-runtime，可选）：

- `normalizeBlobResponse(response, api)` — 检查 `content-disposition`，提取文件名（支持 RFC 5987），`downloadFileName` 优先
- `downloadBlob(blob, filename)` — `URL.createObjectURL` + `<a download>` + click + **40 秒后** `revokeObjectURL`（不用 100ms）
- JSON-in-blob 恢复 — 如果 blob content-type 为 `application/json`，用 `.text()` + `JSON.parse` 恢复错误 JSON
- 返回合成成功响应 `{ status: 0, data: { msg: 'downloading' } }`

---

## 6. CRUD 补充

### 6.1 `stopAutoRefreshWhenModalIsOpen` — 弹窗打开时暂停轮询

**当前状态**：Flux `CrudPollingConfig` 有 `stopWhen?: string` 表达式。

**裁定：不新增专用标志**

用 `polling.stopWhen: "${$surface.hasOpenSurface}"` 表达式替代（前提：Flux SurfaceRuntime 发布 `$surface.hasOpenSurface` 布尔值——归为 Non-Blocking Follow-up）。

---

## 汇总：新增 Schema 属性清单（含 amis 对齐扩展）

### 已在 Phase 1-5 中的属性（10 项）

| 组件       | 属性                                                                 | 类型                                                 | 分类    | 优先级 | amis 对照                                |
| ---------- | -------------------------------------------------------------------- | ---------------------------------------------------- | ------- | ------ | ---------------------------------------- |
| Table      | `autoFillHeight`                                                     | `boolean \| { height?: number; maxHeight?: number }` | `value` | **高** | amis `autoFillHeight`                    |
| Table/CRUD | `selection.toggleOnRowClick`                                         | `boolean`                                            | `value` | 中     | amis `checkOnItemClick`                  |
| Button     | `tooltipPlacement`                                                   | `{ side?, align? }`                                  | `value` | 低     | amis `tooltipPlacement`                  |
| Button     | `countDown` / `countDownTpl`                                         | `number` / `string`                                  | `value` | 中     | amis `countDown` / `countDownTpl`        |
| Page       | `asideResizable` / `asideMinWidth` / `asideMaxWidth` / `asideSticky` | `boolean` / `number\|string`² / `boolean`            | `value` | 中     | amis `asideResizor` 等                   |
| ApiSchema  | `responseType` / `downloadFileName`                                  | `'json'\|'blob'\|'text'` / `string`                  | `value` | 中     | amis `responseType` / `downloadFileName` |

### amis 对齐扩展属性（Phase 6，~20 项简单配置）

以下属性可实现 1:1 amis→Flux 属性映射（`Simple Config: yes`），不涉及架构变动，用于最大化 ERP 迁移时的配置对应率。

#### CRUD 扩展

| amis 属性                    | Flux 属性                    | 类型      | amis→Flux 映射 |
| ---------------------------- | ---------------------------- | --------- | -------------- |
| `alwaysShowPagination`       | `pagination.alwaysShow`      | `boolean` | 直接映射       |
| `autoJumpToTopOnPagerChange` | `autoJumpToTopOnPagerChange` | `boolean` | 直接映射       |
| `combineFromIndex`           | `combineFromIndex`           | `number`  | 直接映射       |

#### Table 扩展

| amis 属性          | Flux 属性                   | 类型                        | amis→Flux 映射                    |
| ------------------ | --------------------------- | --------------------------- | --------------------------------- |
| `showHeader`       | `showHeader`                | `boolean`（缺省 `true`）    | 直接映射                          |
| 列 `headerAlign`   | column `headerAlign`        | `'left'\|'center'\|'right'` | 直接映射                          |
| 列 `classNameExpr` | column `classNameExpr`      | `string`                    | 直接映射（cell 级条件样式表达式） |
| `expandableOn`     | `expandable.expandableWhen` | `string`                    | 属性重命名                        |

#### FormItem 扩展

| amis 属性              | Flux BoundFieldSchemaBase 属性 | 类型     | amis→Flux 映射 |
| ---------------------- | ------------------------------ | -------- | -------------- |
| `labelClassName`       | `labelClassName`               | `string` | 直接映射       |
| `inputClassName`       | `inputClassName`               | `string` | 直接映射       |
| `descriptionClassName` | `descriptionClassName`         | `string` | 直接映射       |

#### Button 扩展

| amis 属性 | Flux 属性 | 类型     | amis→Flux 映射                           |
| --------- | --------- | -------- | ---------------------------------------- |
| `href`    | `href`    | `string` | 直接映射（渲染为 `<a>` 而非 `<button>`） |
| `target`  | `target`  | `string` | 直接映射（配合 `href`，`"_blank"` 等）   |

#### Tabs 扩展

| amis 属性           | Flux 属性                 | 类型      | amis→Flux 映射 |
| ------------------- | ------------------------- | --------- | -------------- |
| `closable`          | `closable`                | `boolean` | 直接映射       |
| `draggable`         | `draggable`               | `boolean` | 直接映射       |
| `addable`           | `addable`                 | `boolean` | 直接映射       |
| Tab item `closable` | TabsItemSchema `closable` | `boolean` | 直接映射       |

#### Dialog 扩展

| amis 属性         | Flux 属性         | 类型      | amis→Flux 映射 |
| ----------------- | ----------------- | --------- | -------------- |
| `draggable`       | `draggable`       | `boolean` | 直接映射       |
| `allowFullscreen` | `allowFullscreen` | `boolean` | 直接映射       |

#### Wizard 扩展

| amis 属性             | Flux 属性             | 类型                       | amis→Flux 映射 |
| --------------------- | --------------------- | -------------------------- | -------------- |
| `mode`                | `mode`                | `'vertical'\|'horizontal'` | 直接映射       |
| `actionFinishLabel`   | `actionFinishLabel`   | `string`                   | 直接映射       |
| `actionNextLabel`     | `actionNextLabel`     | `string`                   | 直接映射       |
| `actionPrevLabel`     | `actionPrevLabel`     | `string`                   | 直接映射       |
| `actionNextSaveLabel` | `actionNextSaveLabel` | `string`                   | 直接映射       |

#### ApiSchema 扩展

| amis 属性  | Flux 属性  | 类型                          | amis→Flux 映射 |
| ---------- | ---------- | ----------------------------- | -------------- |
| `dataType` | `dataType` | `'json'\|'form-data'\|'form'` | 直接映射       |

## 汇总：确认不采纳 + 替代方案清单

| 原 AMIS 属性                     | 不采纳理由                 | amis 验证                                  | Flux 替代方案                                        |
| -------------------------------- | -------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| `rowClassNameExpr`               | 样式系统 marker class 原则 | amis 直接在 `<tr>` 设 className            | cell 级 className 表达式；flux-web.xlib codegen 展开 |
| `promptPageLeave`                | 宿主路由职责               | amis 使用 `env.blockRouting`（宿主适配器） | `statusPath.dirty` + 宿主路由守卫                    |
| `persistData`                    | 状态管理职责               | amis 用 localStorage，无过期/quota 处理    | 宿主 `data` 注入 + Zustand persist                   |
| `hotKey`                         | 宿主/独立方案              | amis 用 hotkeys-js 全局注册                | 宿主键盘映射 → `componentId` 触发 onClick            |
| `resetAfterSubmit`               | 显式组合优于隐式标志       | amis 有 schema 标志                        | `onSubmitSuccess: [{ action: "component:reset" }]`   |
| `stopAutoRefreshWhenModalIsOpen` | 通用表达式已覆盖           | amis 有专用标志                            | `polling.stopWhen: "${$surface.hasOpenSurface}"`     |

---

## Flux 相比 amis 的改进点

在实现建议新增的 schema 属性时，Flux 有机会修复 amis 实现中的已知问题：

| 功能                             | amis 问题                                     | Flux 改进                               |
| -------------------------------- | --------------------------------------------- | --------------------------------------- |
| `autoFillHeight` + `affixHeader` | 互斥（affixHeader 被禁用）                    | 共存：autoFillHeight 容器内 sticky 表头 |
| `toggleOnRowClick`               | `e.preventDefault()` 始终执行（阻止文本选择） | 仅在实际 toggle 时 preventDefault       |
| `countDown` timer                | 未存储 handle，卸载时 setState 告警           | `useRef` 存储 + `useEffect` cleanup     |
| `countDown` localStorage         | 无 id/name 时产生随机 uuid 垃圾               | 无 id/name 时不持久化                   |
| `asideResizable`                 | 仅鼠标事件（无触摸）                          | pointer events（原生触摸+笔支持）       |
| `asideResizable`                 | imperative `style.cssText` 修改               | React state 驱动                        |
| `responseType: blob`             | `revokeObjectURL` 100ms 竞态风险              | 40 秒延迟（对齐 file-saver）            |

---

## 对 ERP 迁移的影响

1. **flux-web.xlib 需处理的转换**（codegen 层）：
   - `autoFillHeight="true"` → `autoFillHeight: true`（直接映射）
   - `checkOnItemClick="true"` → `selection: { toggleOnRowClick: true }`
   - `asideResizor="true"` → `asideResizable: true`（名称映射）
   - `rowClassNameExpr` → 逐列 cell className 表达式展开
   - `resetAfterSubmit="true"` → `onSubmitSuccess` 追加 `component:reset`
   - `stopAutoRefreshWhenModalIsOpen` → `polling.stopWhen` 表达式

2. **Flux 需新增的 schema 属性**（10 项，分布在 4 个组件 + ApiSchema）

3. **ERP 无需等待 Flux 即可启动迁移**：
   - 97.6% 的 CRUD 页面不使用任何缺口属性
   - `autoFillHeight` 初期降级为 `scrollHeight: 600` 可接受
   - 其他缺口属性在 ERP 手写 view.xml 中零使用
