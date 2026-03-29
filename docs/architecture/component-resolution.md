# 组件定位机制设计

## 问题背景

`component:<method>` 调用需要定位目标组件，涉及以下核心问题：

1. **定位方式**：如何通过 componentId/componentName 精确或模糊定位组件
2. **Scope边界**：组件查找的范围限制，避免跨页面污染
3. **性能优化**：编译期预解析，避免运行期逐个查找
4. **动态组件**：表格行、迭代器等动态生成的组件如何处理

## 设计目标

1. **精确定位**：关键操作（表单提交、验证）必须精确定位目标组件
2. **性能优化**：90%+ 的静态组件查找应该是 O(1)
3. **支持动态**：表格行等动态组件需要上下文感知的定位
4. **局部唯一**：大 JSON 分解存放时，只需保证 scope 内唯一

---

## 组件标识设计

### 三层标识体系

| 标识 | 用途 | 唯一性范围 | 示例 |
|------|------|-----------|------|
| `id` | 用户定义的组件ID | scope内唯一 | `userForm` |
| `name` | 用户定义的逻辑名（也是数据绑定路径） | scope内唯一 | `submitBtn` |
| `testid` | 测试定位锚点（输出为 `data-testid`） | 无强制唯一要求 | `login-form` |
| `_cid` | 编译期分配的内部索引 | 全局唯一 | `42` |
| `_templateId` | 动态组件的模板标识 | 全局唯一 | `table.row.form` |

### Scope边界

组件查找**不超过 Page 范围**，内部通过自然边界隔离：

```
PageScope (最大边界)
  └── FormScope / DialogScope / CRUDScope (自然隔离边界)
        └── 嵌套组件 (在父 scope 内唯一即可)
```

**自动创建 Scope 边界的组件**：
- `form` - 表单容器
- `dialog` / `drawer` - 弹窗容器
- `crud` - CRUD 容器
- `wizard` - 向导容器

---

## 编译期优化

### 静态组件

对于非动态生成的组件，编译期预解析引用：

```typescript
// 源 Schema
{
  "type": "button",
  "onClick": {
    "action": "component:submit",
    "componentName": "userForm"
  }
}

// 编译后
{
  "action": "component:submit",
  "_targetCid": 42,        // 直接引用目标组件的内部索引
  "_resolved": true        // 标记已解析
}
```

**运行期查找**：
```typescript
function resolveStaticComponent(cid: number): ComponentHandle {
  return registry.handles.get(cid);  // O(1)
}
```

### 动态组件

表格行、迭代器等动态生成的组件，编译期标记模板：

```typescript
// 表格行内的表单
{
  "type": "table",
  "columns": [{
    "body": {
      "type": "form",
      "name": "rowForm",
      "_templateId": "table.row.rowForm",  // 编译期生成
      "_isDynamic": true
    }
  }]
}

// 行内按钮动作
{
  "type": "button",
  "onClick": {
    "action": "component:submit",
    "_targetTemplateId": "table.row.rowForm",
    "_isDynamic": true
  }
}
```

**运行期查找**（需要上下文）：
```typescript
function resolveDynamicComponent(
  templateId: string, 
  context: ActionContext
): ComponentHandle | undefined {
  const instanceKey = context.getInstanceKey();  // "row:0", "row:1", ...
  return registry.dynamicHandles.get(templateId)?.get(instanceKey);
}
```

---

## 注册表设计

### 数据结构

```typescript
interface ComponentHandleRegistry {
  id: string;
  parent?: ComponentHandleRegistry;
  
  // 静态组件：cid -> handle
  handles: Map<number, ComponentHandle>;
  
  // 动态组件：templateId -> (instanceKey -> handle)
  dynamicHandles: Map<string, Map<string, ComponentHandle>>;
  
  // name -> cid（仅调试模式）
  nameIndex?: Map<string, Set<number>>;
}
```

### 注册流程

```typescript
function registerComponent(
  handle: ComponentHandle,
  scope: ComponentHandleRegistry,
  options: { isDynamic?: boolean; instanceKey?: string }
): number {
  
  if (options.isDynamic) {
    // 动态组件：注册到 dynamicHandles
    const { templateId, instanceKey } = handle;
    if (!scope.dynamicHandles.has(templateId)) {
      scope.dynamicHandles.set(templateId, new Map());
    }
    scope.dynamicHandles.get(templateId)!.set(instanceKey, handle);
    return -1;  // 动态组件无全局 cid
  }
  
  // 静态组件：分配 cid
  const cid = allocateCid();
  handle._cid = cid;
  scope.handles.set(cid, handle);
  
  // 调试模式：检查重复
  if (DEBUG_MODE && handle.name) {
    checkDuplicateName(scope, handle.name, cid);
  }
  
  return cid;
}
```

### 解析流程

```typescript
function resolveComponent(
  target: ResolvedTarget,
  context?: ActionContext
): ComponentHandle | undefined {
  
  // 优先：编译期已解析的静态组件
  if (target._cid !== undefined) {
    return registry.handles.get(target._cid);
  }
  
  // 动态组件：需要上下文
  if (target._templateId && context) {
    const instanceKey = context.getInstanceKey();
    return registry.dynamicHandles.get(target._templateId)?.get(instanceKey);
  }
  
  // Fallback：运行时动态解析（兼容旧模式）
  if (target.componentId || target.componentName) {
    return resolveByNameOrId(target, context?.scope);
  }
  
  return undefined;
}
```

---

## 上下文传递

动态组件的定位依赖于执行上下文：

```typescript
interface ActionContext {
  scope: Scope;                    // 当前 scope
  node: RenderContextNode;         // 当前渲染节点
  data: Record<string, unknown>;   // 当前数据
  
  // 动态组件实例信息
  getInstanceKey(): string | undefined;  // "row:0", "item:1", ...
}
```

### 实例键生成规则

| 容器类型 | instanceKey 格式 | 示例 |
|---------|-----------------|------|
| Table 行 | `row:{index}` | `row:0`, `row:15` |
| 迭代器 | `item:{index}` | `item:0`, `item:5` |
| Combo | `combo:{index}` | `combo:0`, `combo:2` |
| Tabs | `tab:{index}` | `tab:0`, `tab:2` |

---

## 调试模式检查

仅在调试模式下检查同名组件：

```typescript
function checkDuplicateName(
  scope: ComponentHandleRegistry,
  name: string,
  cid: number
): void {
  if (!scope.nameIndex) {
    scope.nameIndex = new Map();
  }
  
  const existing = scope.nameIndex.get(name);
  if (existing && existing.size > 0) {
    console.warn(
      `[ComponentRegistry] Duplicate component name "${name}" in scope "${scope.id}". ` +
      `Existing cids: [${Array.from(existing).join(', ')}], new cid: ${cid}`
    );
  }
  
  if (!existing) {
    scope.nameIndex.set(name, new Set([cid]));
  } else {
    existing.add(cid);
  }
}
```

---

## 性能对比

| 场景 | 传统方式 | 优化后 |
|------|---------|--------|
| 静态组件查找 | O(n) 遍历 scope 链 | O(1) Map 查找 |
| 动态组件查找 | O(n) 遍历 + 过滤 | O(1) 双层 Map |
| 编译期解析 | 无 | 一次性解析，运行期直接使用 |

---

## 兼容性

### 向后兼容

1. **保留 componentId/componentName**：未编译或无法解析的场景仍支持运行时查找
2. **渐进增强**：已编译的 Schema 包含 `_cid`/`_templateId`，旧版运行时忽略并 fallback

### Schema 版本标识

```typescript
interface SchemaMeta {
  _compiled?: boolean;      // 是否经过编译
  _compilerVersion?: string; // 编译器版本
}
```

---

## 实现路径

1. **Phase 1**：实现 ComponentHandleRegistry 的基础结构
2. **Phase 2**：编译期分配 `_cid`，静态组件直接索引
3. **Phase 3**：动态组件的 templateId + instanceKey 机制
4. **Phase 4**：调试模式的重复检查

---

## 边缘场景处理

### 跨 Scope 调用

子 scope 内的组件调用父 scope 组件时，沿 scope 链向上查找：

```typescript
function resolveAcrossScope(target: string, startScope: Scope): ComponentHandle | undefined {
  let current = startScope;
  while (current) {
    const handle = current.registry.resolveByName(target);
    if (handle) return handle;
    current = current.parent;
  }
  return undefined;
}
```

**示例**：Dialog 内按钮提交 Page 级表单
```json
{
  "type": "page",
  "body": [
    { "type": "form", "name": "pageForm" },
    { "type": "dialog", "body": [
      { "type": "button", "onClick": { 
        "action": "component:submit", 
        "componentName": "pageForm"  // 沿 scope 链向上找到 page 级表单
      }}
    ]}
  ]
}
```

### 嵌套动态组件

嵌套表格、表格内迭代器等场景，使用复合 instanceKey：

```typescript
interface InstanceKeyContext {
  chain: Array<{ kind: 'row' | 'item' | 'combo' | 'tab'; index: number }>;
}

function formatInstanceKey(ctx: InstanceKeyContext): string {
  return ctx.chain.map(c => `${c.kind}:${c.index}`).join('.');
}
```

**示例**：
| 场景 | instanceKey |
|------|-------------|
| 表格第3行 | `row:2` |
| 嵌套表格：主表第2行的子表第4行 | `row:1.nested:3` |
| 表格行内迭代器第5项 | `row:2.item:4` |
| Combo 第1项内的表格第3行 | `combo:0.row:2` |

### 条件渲染组件

`visibleOn`/`hiddenOn` 控制的组件，handle 增加挂载状态：

```typescript
interface ComponentHandle {
  _cid: number;
  _templateId?: string;
  _mounted: boolean;  // 运行时挂载状态
}

// 查找时检查有效性
function resolveComponent(target: ResolvedTarget): ComponentHandle | undefined {
  const handle = registry.handles.get(target._cid);
  if (handle && !handle._mounted) {
    return undefined;  // 组件存在但未挂载
  }
  return handle;
}
```

### 动态加载组件

远程加载的 schema 片段，使用负数 cid 区间避免冲突：

```typescript
const CID_RANGES = {
  STATIC: { min: 1, max: 2 ** 31 - 1 },      // 静态组件：正数
  DYNAMIC_LOADED: { min: -1, max: -2 ** 31 } // 动态加载：负数
};

function allocateCid(isDynamicLoaded: boolean): number {
  const range = isDynamicLoaded ? CID_RANGES.DYNAMIC_LOADED : CID_RANGES.STATIC;
  // 使用原子计数器分配
}
```

### InstanceKey 稳定性

表格排序/过滤后，`row:0` 对应的数据可能变化，引入 epoch 机制：

```typescript
interface DynamicHandleKey {
  templateId: string;
  instanceKey: string;
  epoch: number;  // 每次数据重排递增
}

// 表格数据变化时
function onDataChanged(table: TableComponent) {
  table._epoch = (table._epoch || 0) + 1;
  // 清理旧 epoch 的 handles
  cleanupOldEpochs(table._templateId, table._epoch);
}
```

**替代方案**：使用数据 ID 而非行索引
```typescript
// 优先使用数据主键
function getInstanceKey(row: TableRow, index: number): string {
  const dataId = row.data?.id;
  if (dataId !== undefined) {
    return `row:id:${dataId}`;
  }
  return `row:idx:${index}`;
}
```

---

## 生命周期管理

### 注册/注销流程

```typescript
interface ComponentHandleRegistry {
  // 注册组件
  register(handle: ComponentHandle): void;
  
  // 注销组件（组件卸载时调用）
  unregister(handle: ComponentHandle): void;
  
  // 清理动态组件（表格销毁、数据刷新时调用）
  cleanupDynamic(templateId: string): void;
}

// 组件卸载时自动清理
function onComponentUnmount(handle: ComponentHandle) {
  if (handle._templateId) {
    // 动态组件：从 dynamicHandles 移除
    registry.dynamicHandles.get(handle._templateId)?.delete(handle._instanceKey);
  } else {
    // 静态组件：从 handles 移除，标记未挂载
    handle._mounted = false;
    registry.handles.delete(handle._cid);
  }
}
```

### 内存清理策略

大量动态组件场景下的清理策略：

```typescript
interface CleanupPolicy {
  // 最大缓存的动态组件数量
  maxDynamicHandles: number;  // 默认 1000
  
  // LRU 清理阈值
  lruThreshold: number;  // 默认 0.8 (80%)
}

// 惰性清理
function checkAndCleanup(registry: ComponentHandleRegistry, policy: CleanupPolicy) {
  let totalDynamic = 0;
  registry.dynamicHandles.forEach(map => totalDynamic += map.size);
  
  if (totalDynamic > policy.maxDynamicHandles * policy.lruThreshold) {
    // 按最近使用时间清理最旧的 20%
    cleanupLRU(registry, Math.floor(totalDynamic * 0.2));
  }
}
```

---

## 多页面实例隔离

多标签页、SPA 场景下的 cid 冲突防护：

```typescript
interface PageInstanceRegistry {
  pageId: string;  // 页面实例唯一标识
  cidCounter: number;
  
  allocateCid(): number {
    // 格式：pageId 局部唯一，全局通过 pageId 隔离
    return ++this.cidCounter;
  }
}

// 全局查找时需要 pageId
function resolveGlobal(pageId: string, cid: number): ComponentHandle | undefined {
  return pageRegistries.get(pageId)?.handles.get(cid);
}
```

---

## 相关文档

- [Form Validation](./form-validation.md) - 表单验证中的组件定位
- [Renderer Runtime](./renderer-runtime.md) - 渲染器与运行时的交互
- [Flux Core Architecture](./flux-core.md) - 整体架构概览
