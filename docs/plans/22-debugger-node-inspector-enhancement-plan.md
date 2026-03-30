# Plan 22: Node Tab 增强 — 元素检查与 Store/Scope 数据展示

> **Implementation Status: ✅ COMPLETED**
> All 5 phases implemented: `buildInspectResult()` now fills `formState`/`scopeData` from `handle.capabilities.store` and `tagName`/`className` from the DOM element. Node Tab shows a full Component Inspector panel with handle info, Form State tabs (Values/Errors/Meta), Scope Data viewer, and Expression Evaluator. Inspect mode shows hint text and supports Esc to cancel. New CSS styles for `ndbg-inspect-*` classes. 3 new tests in `controller-inspect.test.ts` verify formState filling and DOM info extraction.
>
> This status was verified against the codebase on 2026-03-31.

> 制定日期: 2026-03-30
> 基于: `docs/analysis/framework-debugger-design.md` §10.4 Node / §12.5 DOM cid 反查机制
> 参考: `~/sources/amis/packages/amis-core/src/utils/debug.tsx`
> 状态: 待实施

---

## 1. 现状

### 1.1 已有的基础设施

| 能力 | 状态 | 文件位置 |
|------|------|----------|
| `data-cid` DOM 注入 | ✅ | `flux-react/src/node-renderer.tsx` L312-318, `flux-react/src/field-frame.tsx` |
| `ComponentHandleRegistry.handlesByCid` | ✅ | `flux-runtime/src/component-handle-registry.ts` |
| `inspectByCid(cid)` API | ✅ | `nop-debugger/src/controller.ts` L106-112 |
| `inspectByElement(el)` API | ✅ | `nop-debugger/src/controller.ts` L114-121 |
| `NopComponentInspectResult` 类型 | ✅ | `nop-debugger/src/types.ts` L216-231 |
| `setComponentRegistry()` 注入 | ✅ | `nop-debugger/src/controller.ts` L298 |
| Inspect 模式开关 | ✅ | `panel.tsx` — `inspectMode` state |
| Hover overlay 创建 | ✅ | `panel.tsx` — `hoverOverlayRef`, CSS `.nop-debugger-overlay--hover` |
| Active overlay 创建 | ✅ | `panel.tsx` — `activeOverlayRef`, CSS `.nop-debugger-overlay--active` |
| mousemove 全局监听 | ✅ | `panel.tsx` L1119-1121 — 找最近 `[data-cid]` |
| click 全局监听 | ✅ | `panel.tsx` L1124-1134 — 选中元素, 关闭 inspect 模式 |
| Scan 按钮扫描组件树 | ✅ | `panel.tsx` L1144-1164 |
| 组件树列表 | ✅ | `panel.tsx` L1539-1558 — 树形展示 `[data-cid]` 元素 |
| Inspect 模式按钮 | ⚠️ | 头部有 inspect 图标按钮但功能不完整 |

### 1.2 缺失的关键功能

1. **选中元素后没有展示 store 数据** — `selectedElement` 只显示 `data-cid` 和 `tagName`，从未调用 `inspectByCid()` 获取 formState/scopeData
2. **没有 scope chain 可视化** — AMIS 用 Data Level-0/Level-1/... 展示数据域链，我们完全没有
3. **没有表达式求值输入框** — AMIS 底部有输入框可对选中组件的 data 上下文执行表达式
4. **Node tab 缺少 Inspect 入口提示** — 进入 inspect 模式后页面没有"Select an element"的提示文案
5. **inspectByCid 返回数据不完整** — `buildInspectResult()` 没有填充 `formState` 和 `scopeData`（类型定义有，但构建逻辑没有实现）

### 1.3 AMIS 对比参考

AMIS debugger (`debug.tsx`) 的核心流程:

```
1. enableDebug() → 挂载面板 + 注册全局 mousemove/click
2. handleMouseMove() → 找 [data-debug-id] → store.hoverId = id → autorun 更新蓝色 overlay
3. handleMouseclick() → 找 [data-debug-id] → store.activeId = id → autorun 更新绿色 overlay
4. AMISDebug 组件 → 读取 ComponentInfo[activeId]
   → component.props.data → 通过原型链向上遍历，构建 scope chain
   → 展示 Data Level-0 (自身数据), Level-1 (父级数据), ...
5. 底部输入框 → 对选中组件的 data 上下文执行表达式
```

AMIS 的数据域链获取方式:
```typescript
let start = activeComponentInspect?.component?.props?.data || {};
const stacks = [start];
while (Object.getPrototypeOf(start) !== Object.prototype) {
  const superData = Object.getPrototypeOf(start);
  stacks.push(superData);
  start = superData;
}
```

---

## 2. 目标

增强 Node tab，使其成为完整的组件检查器:

1. 点击页面元素 → 显示该组件的完整 store 数据
2. 可视化 scope chain（当前 scope + 所有父 scope 的数据）
3. 展示 form store 状态（values、errors、touched、dirty）
4. 支持对选中组件数据上下文的表达式求值

---

## 3. 实现计划

### Phase 1: 补全 inspectByCid 数据填充 (controller 层)

**文件**: `packages/nop-debugger/src/controller.ts`

**问题**: `buildInspectResult()` 只填充了 `cid/handleId/handleName/handleType/mounted`，没有填充 `formState` 和 `scopeData`。

**需要修改**: `buildInspectResult()` 函数

```
buildInspectResult(cid, handle, mounted) → NopComponentInspectResult {
  // 现有字段...

  // 新增: 从 handle.capabilities.store 读取 formState
  if (handle?.capabilities?.store) {
    const store = handle.capabilities.store;
    result.formState = {
      values: store.values ?? {},
      errors: store.errors ?? {},
      touched: store.touched ?? {},
      dirty: store.dirty ?? {},
      visited: store.visited ?? {},
      submitting: store.submitting ?? false,
    };
  }

  // 新增: 从 handle 获取 scope 数据
  // ComponentHandle 需要暴露 scope 引用
  if (handle?.scope) {
    result.scopeData = handle.scope.readOwn?.() ?? {};
  }
}
```

**依赖**: 需要确认 `InternalComponentHandle` 的实际接口:
- `capabilities.store` 是否有 `values/errors/touched/dirty/visited/submitting`
- `scope` 是否可通过 handle 访问
- 如果 handle 不直接暴露 scope，需要通过 `ComponentHandleRegistry` 的 parent chain 向上遍历

**验证**: 需要阅读 `packages/flux-runtime/src/component-handle-registry.ts` 和 `packages/flux-runtime/src/form-component-handle.ts` 确认接口。

### Phase 2: 增强 NopComponentInspectResult 类型 (类型层)

**文件**: `packages/nop-debugger/src/types.ts`

**修改**: 扩展 `NopComponentInspectResult` 增加 scope chain 信息:

```typescript
export interface NopScopeLevel {
  name: string;           // 来源标识，如 "page"、"form:user-form"
  data: Record<string, unknown>;
}

export interface NopComponentInspectResult {
  cid: number;
  handleId?: string;
  handleName?: string;
  handleType?: string;
  mounted: boolean;
  formState?: {
    values: Record<string, unknown>;
    errors: Record<string, unknown>;
    touched: Record<string, boolean>;
    dirty: Record<string, boolean>;
    visited: Record<string, boolean>;
    submitting: boolean;
  };
  scopeData?: Record<string, unknown>;
  // 新增: scope 链
  scopeChain?: NopScopeLevel[];
  // 新增: DOM 元素信息
  tagName?: string;
  className?: string;
  // 新增: props 摘要
  propsSummary?: Record<string, unknown>;
}
```

### Phase 3: Node Tab UI — 组件详情面板 (panel 层)

**文件**: `packages/nop-debugger/src/panel.tsx`

**修改**: 当 `selectedElement` 有值时，调用 `inspectByElement()` 获取完整数据并展示。

#### 3.1 选中元素后展示组件详情

替换现有的简单 cid/tagName 展示，改为结构化面板:

```
┌─────────────────────────────────────────┐
│ Component Inspector                     │
│ ┌─────────────────────────────────────┐ │
│ │ #42 input-text                       │ │
│ │ Name: username                        │ │
│ │ Type: form                            │ │
│ │ Tag: <div>                            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─ Form State ────────────────────────┐ │
│ │ Values  │ Errors │ Touched │ Dirty  │ │
│ │ { username: "Alice", ... }            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─ Scope Chain ───────────────────────┐ │
│ │ ▸ Level 0: form (current)            │ │
│ │   { username: "Alice", role: "admin"}│ │
│ │ ▸ Level 1: page                      │ │
│ │   { users: [...], searchQuery: "" }  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─ Events for this node ──────────────┐ │
│ │ render:end  2ms  10:30:01            │ │
│ │ action:submit  10:30:02              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ > Evaluate expression...               │
└─────────────────────────────────────────┘
```

#### 3.2 Inspect 模式提示文案

当 `inspectMode` 为 true 时，在 Node tab 顶部显示提示:

```
🔍 Click an element on the page to inspect it. (Press Esc to cancel)
```

#### 3.3 Form State 展示

使用 `JsonViewer` 组件展示 formState 的各字段。分为 tab 式子面板:
- **Values**: `formState.values`
- **Errors**: `formState.errors`（如有错误，标红）
- **Meta**: `touched`/`dirty`/`visited`/`submitting` 合并展示

#### 3.4 Scope Chain 展示

类似 AMIS 的 Data Level 展示:
- 每个 scope level 是一个可折叠的 JSON 区块
- Level 0 默认展开，其余默认折叠
- 每个 level 显示来源名称（scope name/path）

#### 3.5 表达式求值输入框

在 Node tab 底部添加输入框:
- placeholder: `Evaluate expression on selected component data...`
- Enter 键触发求值
- 结果以 Log 形式追加到 Timeline tab
- 使用 `scopeChain[0].data` 作为求值上下文

### Phase 4: Inspect 模式 UX 优化

**文件**: `packages/nop-debugger/src/panel.tsx`

#### 4.1 Esc 键退出 inspect 模式

```typescript
useEffect(() => {
  if (!inspectMode) return;
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setInspectMode(false);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [inspectMode]);
```

#### 4.2 Inspect 模式激活按钮优化

Node tab header 区域的 inspect 按钮需要更醒目:
- 激活时高亮（现有 `is-active` CSS）
- 增加 tooltip 文案

#### 4.3 选中元素后自动展示详情

在 click handler 中（L1124-1134），选中元素后自动调用 `inspectByElement`:

```typescript
const handleClick = (e: MouseEvent) => {
  // ...existing logic...
  setSelectedElement(target as HTMLElement);
  setInspectMode(false);
  props.controller.setActiveTab('node');
  setNodeIdInput(cid);

  // 新增: 自动获取 inspect 数据
  const inspectResult = props.controller.inspectByElement(target as HTMLElement);
  setInspectData(inspectResult ?? null);
};
```

### Phase 5: CSS 样式

**文件**: `packages/nop-debugger/src/panel.tsx` (DEBUGGER_STYLES)

新增样式:

```css
/* 组件详情面板 */
.ndbg-inspect-panel { ... }
.ndbg-inspect-header { ... }
.ndbg-inspect-section { ... }
.ndbg-inspect-section-title { ... }

/* Scope chain */
.ndbg-scope-level { ... }
.ndbg-scope-level-header { ... }

/* 表达式输入框 */
.ndbg-eval-input { ... }
.ndbg-eval-result { ... }

/* Inspect 模式提示 */
.ndbg-inspect-hint { ... }
```

---

## 4. 文件影响范围

| 文件 | 改动类型 | Phase |
|------|----------|-------|
| `packages/nop-debugger/src/types.ts` | 扩展 `NopComponentInspectResult` | 2 |
| `packages/nop-debugger/src/controller.ts` | `buildInspectResult` 补全数据填充 | 1 |
| `packages/nop-debugger/src/panel.tsx` | Node tab UI 增强 + Inspect UX + CSS | 3, 4, 5 |
| `packages/nop-debugger/src/panel.test.tsx` | 更新测试 | 3 |

**不需要修改的文件**: store.ts, automation.ts, adapters.ts, diagnostics.ts — 这些已完备。

---

## 5. 实施顺序

```
Phase 1 (controller) → Phase 2 (types) → Phase 3 (panel UI) → Phase 4 (UX) → Phase 5 (CSS)
    │                        │
    └── 可并行 ──────────────┘
```

### 前置调研 (在 Phase 1 之前)

1. 读取 `packages/flux-runtime/src/component-handle-registry.ts` — 确认 handle 暴露了哪些属性
2. 读取 `packages/flux-runtime/src/form-component-handle.ts` — 确认 store 接口
3. 读取 `packages/flux-react/src/contexts.tsx` — 确认 scope 如何传递给组件
4. 读取 `packages/flux-runtime/src/scope.ts` — 确认 scope.readOwn() 或类似 API

### 验证清单

- [ ] `inspectByCid(42)` 返回完整的 formState（对 form 类型组件）
- [ ] `inspectByCid(42)` 返回 scopeChain 数组
- [ ] 点击页面元素 → Node tab 展示组件详情面板
- [ ] Scope chain 可折叠展示各层数据
- [ ] 表达式输入框可对选中组件数据求值
- [ ] Esc 键退出 inspect 模式
- [ ] Inspect 模式下页面有提示文案
- [ ] 选中元素高亮 overlay 正常工作
- [ ] 现有测试全部通过

---

## 6. 不在本次范围

- 完整 DOM inspect 选择器（类似 Chrome DevTools 的树形 DOM 展示）
- 通过表达式执行器运行任意 JS 的安全沙箱
- 深度订阅 form/page store 私有状态的实时变更
- 远程上传日志
- Action replay
