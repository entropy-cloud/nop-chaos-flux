# NOP Debugger 完整实现计划

> Plan Status: in-progress
> Last Reviewed: 2026-04-02


> **Implementation Status: ✅ COMPLETED (Phases 1–3) / Phase 4 Not Started**
> **Done (Phases 1–3):** JsonViewer with collapsible tree, render throttling, search/filter, localStorage persistence, error badge with count, error aggregation (pinned/latest/earliest buffers), API chain merging, `data-cid` injection on all rendered nodes, `inspectByCid()` global API, Node Tab with scope/form data display, and global `__NOP_DEBUGGER_API__` for automation.
> **Phase 4 progress:** enhanced Timeline search now supports `path:` queries and `/regex/flags` matching, and the event model now includes `state:snapshot` entries for attach-time `ActionScope.getDebugSnapshot()` payloads. Remaining follow-ups are virtualized tree rendering and final performance hardening.
>
> This status was re-verified against the codebase on 2026-04-04.

> 制定日期: 2026-03-29
> 基于: `docs/analysis/framework-debugger-design.md` 设计草案
> 状态: 部分完成，Phase 4 待实施

---

## 0. 现状盘点

### 已实现 ✅

| 模块 | 文件 | 状态 |
|------|------|------|
| **类型定义** | `types.ts` | ✅ 完整（含全部事件、查询、诊断、导出、脱敏类型） |
| **Store** | `store.ts` | ✅ 完整（append/clear/pause/resume/filters/pinnedErrors） |
| **Controller** | `controller.ts` | ✅ 完整（createNopDebugger、全部 controller API） |
| **事件适配器** | `adapters.ts` | ✅ 完整（monitor、plugin、fetcher、notify、onActionError） |
| **诊断引擎** | `diagnostics.ts` | ✅ 完整（query/overview/nodeDiagnostics/interactionTrace/sessionExport/diagnosticReport） |
| **Automation API** | `automation.ts` | ✅ 完整（window hub、单/多实例注册） |
| **脱敏** | `redaction.ts` | ✅ 完整（默认关键字、递归脱敏、自定义回调） |
| **Controller Helpers** | `controller-helpers.ts` | ✅ 完整（windowConfig/sessionId/errorFormat/apiFormat/networkSummary） |
| **全局开关** | `controller-helpers.ts` → `readWindowConfig` | ✅ 完整 |
| **单元测试** | 8 个 `.test.ts/.test.tsx` 文件 | ✅ 核心逻辑已覆盖 |
| **Playground 接入** | `apps/playground/src/App.tsx` | ✅ 已接入 |
| **UI 面板 - Overview Tab** | `panel.tsx` | ✅ 基础版已实现（6 个指标卡片） |
| **UI 面板 - Timeline Tab** | `panel.tsx` | ✅ 基础版已实现（筛选 + 事件列表） |
| **UI 面板 - Network Tab** | `panel.tsx` | ✅ 基础版已实现（网络事件列表） |
| **漂浮面板拖拽** | `panel.tsx` → `useDraggablePosition` | ✅ 已实现 |
| **Launcher** | `panel.tsx` | ✅ 基础版已实现（按钮 + 错误计数 + 拖拽） |
| **CSS 主题** | `panel.tsx` → `DEBUGGER_STYLES` | ✅ 已实现（暗色玻璃态 + badge 配色） |

### 未实现或待增强 ❌

| 功能 | 设计文档位置 | 优先级 | 说明 |
|------|-------------|--------|------|
| **事件详情展开/JSON 查看器** | §10.3 底部详情区 | P0 | 当前 detail 仅以 `<code>` 展示，无 JSON 结构化查看 |
| **Timeline 文本搜索** | §12.2 第一阶段增强 | P1 | 当前无搜索框 |
| **面板位置持久化** | §12.2 第一阶段增强 | P1 | 刷新后位置丢失 |
| **最近错误角标** | §12.2 第一阶段增强 | P1 | Launcher 仅显示文字，无角标高亮 |
| **Node Tab** | §10.4 Node | P2 | 完全未实现 |
| **错误聚合视图** | §12.2 第一阶段增强 | P1 | 无独立错误分组/聚合 |
| **API 去重与链路归并 UI** | §12.2 第一阶段增强 | P1 | 后端去重逻辑已有（requestState Map），UI 无归并展示 |
| **data-cid / inspectByCid** | §12.5 新增设计 | P1 | 设计已确定，代码完全未实现 |
| **state:snapshot 事件** | §9.2 统一事件模型 | P3 | 类型定义中缺失，未在事件种类中 |
| **事件列表虚拟化** | §13.2 UI 性能策略 | P3 | 大量事件时可能卡顿 |
| **render 高频事件合并/节流** | §13.2 UI 性能策略 | P2 | 高频 render 事件可能淹没其他事件 |
| **Node Tab - DOM inspect** | §12.3 / §12.4 | P3 | 不在第一版范围，但 data-cid 已做轻量版 |

---

## 1. 实施阶段总览

```
Phase 1 (P0) ─────────────────────────────────────────────
  1.1 事件详情展开与 JSON 查看器
  1.2 render 事件节流
  1.3 Timeline 文本搜索

Phase 2 (P1) ─────────────────────────────────────────────
  2.1 面板位置持久化（localStorage）
  2.2 最近错误角标高亮
  2.3 错误聚合视图
  2.4 API 链路归并 UI 展示
  2.5 data-cid DOM 注入与 inspectByCid

Phase 3 (P2) ─────────────────────────────────────────────
  3.1 Node Tab 实现
  3.2 Network Tab 增强（请求详情展开）

Phase 4 (P3) ─────────────────────────────────────────────
  4.1 事件列表虚拟化
  4.2 state:snapshot 事件类型
  4.3 搜索增强（正则、高亮）
```

---

## 2. Phase 1 — P0 核心体验补全

### 2.1 事件详情展开与 JSON 查看器

**目标**: 将当前 `<code>` 纯文本展示升级为结构化 JSON 查看器。

**变更范围**:

| 文件 | 变更内容 |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | 新增 `JsonViewer` 内联组件；为 Timeline / Network 事件条目增加"展开详情"交互 |

**实现细节**:

1. **JsonViewer 组件**:
   - 接收 `data: unknown` 和 `maxDepth?: number`（默认 3）
   - 递归渲染 JSON 树，每层可折叠
   - 字符串值用引号包裹，数字/布尔用不同颜色
   - null/undefined 显示为 italic 灰色
   - 超过 `maxDepth` 时显示 `...` 占位
   - 大数组（>50 项）只展示前 10 项 + 折叠提示

2. **事件条目交互**:
   - 每个事件条目增加点击展开/收起逻辑（`useState` 控制）
   - 展开后显示：
     - `detail` 字段（如有）
     - `exportedData` 字段 → 通过 `JsonViewer` 展示
     - `network` 字段 → 通过 `JsonViewer` 展示（Network Tab 专用）
   - 展开区域使用 `.nop-debugger__entry-expanded` 容器

3. **CSS 新增**:
   ```css
   .nop-debugger__entry-expanded {
     display: grid;
     gap: 8px;
     padding: 10px 12px;
     border-radius: 12px;
     background: var(--nop-debugger-detail-bg);
     max-height: 320px;
     overflow: auto;
   }
   .nop-debugger__json-key { color: #9bd9ff; }
   .nop-debugger__json-string { color: #9df3ca; }
   .nop-debugger__json-number { color: #ffd18a; }
   .nop-debugger__json-boolean { color: #dcc0ff; }
   .nop-debugger__json-null { color: var(--nop-debugger-muted-text); font-style: italic; }
   ```

4. **数据来源映射**:
   - 事件条目增加 `onClick` handler → `setExpandedId(prev => prev === event.id ? null : event.id)`
   - 当 `expandedId === event.id` 时渲染详情区域

**验证标准**:
- [ ] 点击事件条目可展开详情
- [ ] JSON 展开后可折叠子节点
- [ ] Network 事件可查看 request/response 结构化数据
- [ ] 大对象不会导致面板卡顿（惰性渲染）

---

### 2.2 render 事件节流

**目标**: 防止高频 render 事件淹没 Timeline。

**变更范围**:

| 文件 | 变更内容 |
|------|----------|
| `packages/nop-debugger/src/store.ts` | 新增节流逻辑 |
| `packages/nop-debugger/src/adapters.ts` | 可选：render 事件标记 source 以支持节流 |

**实现细节**:

1. **Store 层节流**:
   - 在 `append()` 方法内增加 render 事件节流判断
   - 规则：同一个 `nodeId` 的 `render:start` / `render:end` 事件，如果距离上次同类事件不足 100ms，则跳过
   - 保留最后一次 render 事件的引用，确保不丢失最终状态
   - 新增内部状态 `lastRenderByNode: Map<string, number>` 记录每个 nodeId 最后 render 事件时间戳

2. **实现方案**:
   ```ts
   // store.ts 内部
   const lastRenderByNode = new Map<string, number>();
   const RENDER_THROTTLE_MS = 100;

   // 在 append 内部
   if (event.group === 'render' && event.nodeId) {
     const lastTime = lastRenderByNode.get(event.nodeId) ?? 0;
     const now = Date.now();
     if (now - lastTime < RENDER_THROTTLE_MS) {
       return; // 跳过本次
     }
     lastRenderByNode.set(event.nodeId, now);
   }
   ```

3. **保留所有 render:end 事件**: 因为 render:end 携带 durationMs，诊断价值高。只节流 render:start。

**验证标准**:
- [ ] 高频 render 不再淹没 Timeline
- [ ] 仍然保留每次完整 render 的 end 事件（含 durationMs）
- [ ] 节流不影响其他事件类型

---

### 2.3 Timeline 文本搜索

**目标**: 在 Timeline Tab 中增加文本搜索框，支持按关键字过滤事件。

**变更范围**:

| 文件 | 变更内容 |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | 新增搜索输入框 + 过滤逻辑 |

**实现细节**:

1. **搜索输入框**:
   - 位于 filter chips 上方或左侧
   - 使用 `<input type="search">` 元素
   - placeholder: "Search events..."
   - 样式与现有 chip 风格统一

2. **过滤逻辑**:
   - 新增 `searchText` state
   - 在 `filteredEvents` 基础上再做文本过滤
   - 匹配字段：`summary`、`detail`、`source`、`nodeId`、`path`、`requestKey`
   - 大小写不敏感
   - 复用 `diagnostics.ts` 中的 `includesText` 逻辑

3. **CSS 新增**:
   ```css
   .nop-debugger__search {
     width: 100%;
     padding: 8px 12px;
     border-radius: 999px;
     border: 1px solid var(--nop-debugger-chip-border);
     background: var(--nop-debugger-chip-bg);
     color: var(--nop-debugger-text);
     font-size: 12px;
     outline: none;
   }
   .nop-debugger__search:focus {
     border-color: var(--nop-debugger-chip-active-border);
   }
   .nop-debugger__search::placeholder {
     color: var(--nop-debugger-muted-text);
   }
   ```

**验证标准**:
- [ ] 输入文本可实时过滤 Timeline 事件
- [ ] 搜索与 filter chips 组合使用
- [ ] 清空搜索恢复完整列表
- [ ] 搜索不影响其他 Tab

---

## 3. Phase 2 — P1 功能增强

### 3.1 面板位置持久化

**目标**: 面板和 launcher 位置在刷新后保持。

**变更范围**:

| 文件 | 变更内容 |
|------|----------|
| `packages/nop-debugger/src/controller-helpers.ts` | 新增 localStorage 读写函数 |
| `packages/nop-debugger/src/store.ts` | position 变更时持久化 |
| `packages/nop-debugger/src/panel.tsx` | 读取持久化位置作为初始值 |

**实现细节**:

1. **持久化 Key**: `nop-debugger:${id}:position`（使用 controller id 区分多实例）

2. **读写函数**:
   ```ts
   export function loadPersistedPosition(id: string): { x: number; y: number } | undefined {
     try {
       const raw = localStorage.getItem(`nop-debugger:${id}:position`);
       return raw ? JSON.parse(raw) : undefined;
     } catch { return undefined; }
   }

   export function persistPosition(id: string, position: { x: number; y: number }) {
     try {
       localStorage.setItem(`nop-debugger:${id}:position`, JSON.stringify(position));
     } catch { /* quota exceeded, ignore */ }
   }
   ```

3. **写入时机**: `setPosition()` 被调用时，debounce 300ms 后写入 localStorage

4. **读取时机**: `readWindowConfig()` 中优先使用持久化位置，其次使用 window config，最后 fallback 到默认值

5. **同时持久化**: `panelOpen` 状态也一并持久化，key 为 `nop-debugger:${id}:panelOpen`

**验证标准**:
- [ ] 刷新页面后面板/launcher 位置保持
- [ ] 多实例场景位置互不干扰
- [ ] localStorage 不可用时降级到内存（无报错）

---

### 3.2 最近错误角标高亮

**目标**: Launcher 上显示醒目的错误角标。

**变更范围**:

| 文件 | 变更内容 |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | Launcher 增加错误角标 UI |

**实现细节**:

1. **角标设计**:
   - 当 `errorCount > 0` 时，在 launcher 右上角显示红色圆点 + 数字
   - 使用 `position: absolute` 定位
   - 数字上限 99，超过显示 `99+`
   - 打开面板后角标不清除（因为错误仍存在），但样式从"醒目"变为"已读"

2. **CSS 新增**:
   ```css
   .nop-debugger-launcher__badge {
     position: absolute;
     top: -4px;
     right: -4px;
     min-width: 16px;
     height: 16px;
     padding: 0 4px;
     border-radius: 999px;
     background: #ff6b6b;
     color: white;
     font-size: 10px;
     font-weight: 700;
     display: flex;
     align-items: center;
     justify-content: center;
     animation: nop-debugger-pulse 2s ease-in-out infinite;
   }
   @keyframes nop-debugger-pulse {
     0%, 100% { transform: scale(1); }
     50% { transform: scale(1.1); }
   }
   ```

3. **launcher 容器需要 `position: relative`**（已有 fixed，改为 `position: fixed` + 内部 wrapper 用 relative）

**验证标准**:
- [ ] 有错误时 launcher 显示红色角标
- [ ] 无错误时角标消失
- [ ] 角标数字准确反映 `errorCount`
- [ ] 角标动画不干扰点击/拖拽

---

### 3.3 错误聚合视图

**目标**: 在 Timeline Tab 中增加"只看错误"快速切换，以及错误分组展示。

**变更范围**:

| 文件 | 变更内容 |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | 新增错误快速过滤按钮 + 错误分组展示 |

**实现细节**:

1. **快速过滤**: 在 filter chips 之前增加一个 "Errors Only" toggle 按钮
   - 激活时自动设置 filters 为 `['error']`
   - 再次点击恢复之前的 filters

2. **错误分组**: 在 Errors Only 模式下，将相同 `source` + 相似 `detail` 的错误聚合显示
   - 每个"错误组"显示：
     - 错误类型（source）
     - 出现次数
     - 最近一次时间
     - 展开：列出所有该组错误
   - 分组逻辑：按 `source` 分组，同组内按 `summary` 相似度合并

3. **实现方式**: 纯前端计算，使用 `useMemo` 缓存分组结果

**验证标准**:
- [ ] "Errors Only" 按钮可快速切换到错误视图
- [ ] 错误按来源分组展示
- [ ] 可展开查看每个错误组的具体条目

---

### 3.4 API 链路归并 UI 展示

**目标**: 将同一请求的 `api:start` / `api:end` / `api:abort` 归并展示。

**变更范围**:

| 文件 | 变更内容 |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | Network Tab 改为请求归并视图 |

**实现细节**:

1. **归并逻辑**:
   - 按 `requestKey` 将同一请求的 start/end/abort 事件合并为一个条目
   - 使用 `useMemo` 预计算：
     ```ts
     type MergedRequest = {
       requestKey: string;
       startEvent?: NopDebugEvent;
       endEvent?: NopDebugEvent;
       status: 'pending' | 'completed' | 'failed' | 'aborted';
       durationMs?: number;
     };
     ```
   - 状态判断：有 end + ok → completed，有 end + !ok → failed，有 abort → aborted，只有 start → pending

2. **展示设计**:
   - 每个 merged request 显示：
     - 方法 + URL（summary）
     - 状态 badge（pending=黄、completed=绿、failed=红、aborted=灰）
     - 耗时（如有）
     - 展开：查看 request params / response summary
   - pending 请求排在最前面

**验证标准**:
- [ ] 同一请求在 Network Tab 只显示一个条目
- [ ] 请求状态实时更新（pending → completed/failed）
- [ ] 展开可查看请求参数和响应摘要

---

### 3.5 data-cid DOM 注入与 inspectByCid

**目标**: 实现设计文档 §12.5 中定义的 DOM → 组件 → Store 反查链路。

**变更范围**:

| 文件 | 变更内容 |
|------|----------|
| `packages/nop-debugger/src/types.ts` | 新增 `NopComponentInspectResult`、`NopDebuggerAutomationApi` 增加 inspectByCid/inspectByElement |
| `packages/nop-debugger/src/controller.ts` | 新增 `setComponentRegistry()` 方法、实现 inspectByCid |
| `packages/flux-react/src/node-renderer.tsx` | 渲染时注入 `data-cid` 到 DOM |
| `packages/flux-react/src/field-frame.tsx` | wrap 节点的 data-cid 注入到 FieldFrame 根元素 |
| `packages/flux-core/src/types.ts` | `ComponentHandle` 增加 `_cid` 字段 |

**实现细节**:

#### 3.5.1 类型定义扩展

在 `types.ts` 中新增：

```ts
export interface NopComponentInspectResult {
  cid: number;
  handleId?: string;
  handleName?: string;
  handleType?: string;
  mounted: boolean;
  formState?: {
    values: Record<string, any>;
    errors: Record<string, any>;
    touched: Record<string, boolean>;
    dirty: Record<string, boolean>;
    visited: Record<string, boolean>;
    submitting: boolean;
  };
  scopeData?: Record<string, any>;
}
```

在 `NopDebuggerAutomationApi` 和 `NopDebuggerController` 接口中新增：
```ts
inspectByCid(cid: number): NopComponentInspectResult | undefined;
inspectByElement(element: HTMLElement): NopComponentInspectResult | undefined;
```

#### 3.5.2 Controller 扩展

```ts
// controller.ts
let componentRegistry: ComponentHandleRegistry | undefined;

// 新增方法
setComponentRegistry(registry: ComponentHandleRegistry) {
  componentRegistry = registry;
}

inspectByCid(cid: number): NopComponentInspectResult | undefined {
  if (!componentRegistry) return undefined;
  // 遍历 registry 中的 handles，找到 _cid 匹配的
  // 如果是 form 类型 handle，读取 form store state
  // 读取 scope chain 数据
}
```

#### 3.5.3 DOM 注入

在 `NodeRenderer` 中：
- 当节点有已注册的 ComponentHandle 时，获取其 `_cid`
- 将 `_cid` 作为 `data-cid` 属性注入到渲染的根元素

在 `FieldFrame` 中：
- 接收 `cid` prop
- 将其作为 `data-cid` 写入根 DOM 元素

#### 3.5.4 Playground 接入

在 `App.tsx` 中，创建 debugger controller 后，将 SchemaRenderer 的 ComponentRegistry 传递给 controller：
```ts
// 需要从 SchemaRenderer 获取 registry ref
debuggerController.setComponentRegistry(registryRef.current);
```

**验证标准**:
- [ ] `document.querySelector('[data-cid="123"]')` 可找到对应 DOM 元素
- [ ] `window.__NOP_DEBUGGER_API__.inspectByCid(123)` 返回组件状态
- [ ] form 类型组件可查看 form store state（values/errors/touched 等）
- [ ] scope 数据可查看（当前 scope + parent scope 合并快照）

---

## 4. Phase 3 — P2 功能

### 4.1 Node Tab 实现

**目标**: 实现设计文档 §10.4 中定义的 Node Tab。

**变更范围**:

| 文件 | 变更内容 |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | 新增 Node Tab 内容区 |
| `packages/nop-debugger/src/types.ts` | `NopDebuggerTab` 增加 `'node'` |

**实现细节**:

1. **Tab 定义更新**: `NopDebuggerTab = 'overview' | 'timeline' | 'node' | 'network'`

2. **Node Tab 内容**:
   - 顶部：节点选择器（输入 nodeId 或通过 inspectByCid 选择）
   - 中部：节点信息面板
     - `nodeId`、`path`、`rendererType`
     - 最近 render 次数和耗时（从 `getNodeDiagnostics` 获取）
     - 最近 action 触发记录
   - 底部：该节点的事件时间线（过滤后）

3. **节点选择方式**:
   - 输入框直接输入 nodeId
   - 或者通过 inspectByCid 从 DOM 选择（后续可做点击选择器）

4. **数据来源**: 复用已有的 `controller.getNodeDiagnostics()` API

**验证标准**:
- [ ] Node Tab 可输入 nodeId 查看节点信息
- [ ] 显示节点的 render 统计、action 记录、错误
- [ ] 事件列表只显示该节点相关事件

---

### 4.2 Network Tab 增强

**目标**: 增强 Network Tab 的请求详情展示。

**变更范围**:

| 文件 | 变更内容 |
|------|----------|
| `packages/nop-debugger/src/panel.tsx` | Network Tab 增加详情展开 |

**实现细节**:

1. **请求详情展开**:
   - 每个 merged request 条目可展开
   - 展开后显示：
     - 请求参数（JSON Viewer）
     - 响应数据（JSON Viewer）
     - 请求/响应 header 摘要
     - action 触发链路（关联的 action:start/end 事件）

2. **关联 action 展示**:
   - 通过 `requestKey` 和 `nodeId` 查找关联的 action 事件
   - 显示 action 触发顺序

**验证标准**:
- [ ] 点击请求条目展开详情
- [ ] 可查看请求参数和响应数据
- [ ] 可查看关联的 action 链路

---

## 5. Phase 4 — P3 长期优化

### 5.1 事件列表虚拟化

**目标**: 大量事件时保持 UI 流畅。

**方案**: 引入轻量虚拟化方案（自定义实现或引入 `@tanstack/react-virtual`）。

**实现要点**:
- 只渲染可视区域内的事件条目
- 保持滚动位置
- 搜索/筛选后仍然虚拟化
- 预留 50px 固定行高或动态测量

### 5.2 state:snapshot 事件类型

**目标**: 记录作用域数据快照事件。

**实现要点**:
- `NopDebugEventKind` 新增 `'state:snapshot'`
- 在关键时机（form submit、page load、scope change）触发
- 快照数据存储在 `exportedData`，通过 JSON Viewer 查看

### 5.3 搜索增强

**目标**: 支持正则搜索、高亮匹配。

**实现要点**:
- 搜索框支持正则语法
- 匹配文本高亮显示
- 搜索历史记录（localStorage）

---

## 6. 文件变更清单

### Phase 1

| 文件 | 操作 | 预估行数 |
|------|------|----------|
| `packages/nop-debugger/src/panel.tsx` | 修改 | +120 行（JSON Viewer + 详情展开 + 搜索框） |
| `packages/nop-debugger/src/store.ts` | 修改 | +20 行（render 节流） |

### Phase 2

| 文件 | 操作 | 预估行数 |
|------|------|----------|
| `packages/nop-debugger/src/controller-helpers.ts` | 修改 | +30 行（localStorage 持久化） |
| `packages/nop-debugger/src/store.ts` | 修改 | +15 行（持久化写入） |
| `packages/nop-debugger/src/panel.tsx` | 修改 | +100 行（角标 + 错误聚合 + API 归并 UI） |
| `packages/nop-debugger/src/types.ts` | 修改 | +20 行（NopComponentInspectResult） |
| `packages/nop-debugger/src/controller.ts` | 修改 | +40 行（setComponentRegistry + inspectByCid） |
| `packages/flux-react/src/node-renderer.tsx` | 修改 | +10 行（data-cid 注入） |
| `packages/flux-react/src/field-frame.tsx` | 修改 | +5 行（cid prop + data-cid） |
| `packages/flux-core/src/types.ts` | 修改 | +2 行（ComponentHandle._cid） |
| `apps/playground/src/App.tsx` | 修改 | +3 行（registry 传递） |

### Phase 3

| 文件 | 操作 | 预估行数 |
|------|------|----------|
| `packages/nop-debugger/src/types.ts` | 修改 | +1 行（Tab 类型） |
| `packages/nop-debugger/src/panel.tsx` | 修改 | +120 行（Node Tab + Network 增强） |

---

## 7. 测试策略

### 每个 Phase 完成后必须通过：

```bash
pnpm --filter @nop-chaos/nop-debugger typecheck
pnpm --filter @nop-chaos/nop-debugger build
pnpm --filter @nop-chaos/nop-debugger test
pnpm --filter @nop-chaos/nop-debugger lint
```

### 全 workspace 验证：

```bash
pnpm typecheck
pnpm build
pnpm test
```

### 新增测试覆盖要求：

| Phase | 新增测试 |
|-------|----------|
| Phase 1 | `panel.test.tsx`: JSON Viewer 渲染测试、搜索过滤测试；`store.test.ts`: render 节流测试 |
| Phase 2 | `controller-helpers.test.ts`: localStorage 持久化测试；`controller.test.ts`: inspectByCid 测试；`panel.test.tsx`: 角标/错误聚合测试 |
| Phase 3 | `panel.test.tsx`: Node Tab 渲染测试 |

---

## 8. 风险与注意事项

### 8.1 依赖边界

- `nop-debugger` 只依赖 `@nop-chaos/flux-core` 和 `react`/`react-dom`
- **不直接依赖** `flux-runtime`、`flux-react`、`flux-renderers-*`
- `data-cid` 注入代码在 `flux-react` 中（这是合理的，因为是渲染层行为）
- `inspectByCid` 的 `ComponentHandleRegistry` 类型来自 `flux-core`（契约层），运行时实例通过 controller 注入

### 8.2 性能

- JSON Viewer 不应在初始渲染时递归展开大对象
- render 节流阈值（100ms）需要根据实际场景调整
- 事件存储上限默认 400 条，可根据内存压力调整
- 面板拖拽不应触发多余 re-render

### 8.3 安全

- `inspectByCid` 暴露的 form store state 可能包含敏感数据
- 应考虑在非开发环境禁用 inspectByCid
- `exportSession` 已有脱敏机制，`inspectByCid` 也应尊重相同配置

### 8.4 Playground 兼容

- 所有变更必须保持 playground `App.tsx` 的接入方式不变
- 新增功能应向后兼容（新的 Tab、新的 API 不影响现有用法）

---

## 9. 实施顺序与依赖关系

```
Phase 1.1 (JSON Viewer) ─────────────────────┐
Phase 1.2 (render 节流) ─────────────────────┤  可并行
Phase 1.3 (Timeline 搜索) ───────────────────┘
                                              │
Phase 2.1 (位置持久化) ──────────────────────┐
Phase 2.2 (错误角标) ────────────────────────┤
Phase 2.3 (错误聚合) ────────────────────────┤  可并行（依赖 Phase 1.1 的 UI 模式）
Phase 2.4 (API 归并 UI) ────────────────────┤
Phase 2.5 (data-cid / inspectByCid) ─────────┘  独立于其他 Phase 2
                                              │
Phase 3.1 (Node Tab) ─────────────────────────── 依赖 Phase 2.5
Phase 3.2 (Network 增强) ─────────────────────── 依赖 Phase 2.4
                                              │
Phase 4.1 (虚拟化) ───────────────────────────── 依赖 Phase 1
Phase 4.2 (state:snapshot) ───────────────────── 独立
Phase 4.3 (搜索增强) ─────────────────────────── 依赖 Phase 1.3
```

---

## 10. 关键代码锚点

| 锚点 | 路径 | 说明 |
|------|------|------|
| 设计草案 | `docs/analysis/framework-debugger-design.md` | 全部设计目标 |
| Playground 体验 | `docs/architecture/playground-experience.md` | UI 交互模型 |
| 类型定义 | `packages/nop-debugger/src/types.ts` | 所有接口契约 |
| Store | `packages/nop-debugger/src/store.ts` | 事件存储 |
| Controller | `packages/nop-debugger/src/controller.ts` | 控制器 |
| 事件适配 | `packages/nop-debugger/src/adapters.ts` | monitor/plugin/fetcher 包装 |
| 诊断引擎 | `packages/nop-debugger/src/diagnostics.ts` | 查询/聚合/报告 |
| Automation API | `packages/nop-debugger/src/automation.ts` | window hub |
| UI 面板 | `packages/nop-debugger/src/panel.tsx` | 全部 UI |
| 脱敏 | `packages/nop-debugger/src/redaction.ts` | 数据脱敏 |
| ComponentHandle | `packages/flux-core/src/types.ts` | 组件句柄接口 |
| NodeRenderer | `packages/flux-react/src/node-renderer.tsx` | data-cid 注入点 |
| FieldFrame | `packages/flux-react/src/field-frame.tsx` | wrap 节点 data-cid |
| Playground 接入 | `apps/playground/src/App.tsx` | 宿主集成 |


