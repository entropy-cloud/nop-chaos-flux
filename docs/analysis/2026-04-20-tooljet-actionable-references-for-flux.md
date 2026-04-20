# ToolJet 核心组件设计对 nop-chaos-flux 的可实施参考

> 日期: 2026-04-20
> 前置分析: `docs/analysis/2026-04-20-tooljet-vs-nop-chaos-flux-deep-comparison.md`
> 焦点: 从 ToolJet 提取**具体可落地**的代码级改进项，逐项对照 nop-chaos-flux 当前实现

---

## 目录

1. [Widget Config 元数据体系 → 充实 RendererDefinition](#1-widget-config-元数据体系--充实-rendererdefinition)
2. [Exposed Variables 声明式契约](#2-exposed-variables-声明式契约)
3. [Imperative Actions 声明式参数](#3-imperative-actions-声明式参数)
4. [条件属性渲染 (conditionallyRender)](#4-条件属性渲染-conditionallyrender)
5. [Universal Props 自动继承](#5-universal-props-自动继承)
6. [属性编辑器类型系统 (Inspector 类型分发)](#6-属性编辑器类型系统-inspector-类型分发)
7. [Component Handle 工厂化](#7-component-handle-工厂化)
8. [StatusPath 声明式契约](#8-statuspath-声明式契约)
9. [复合字段 Controller 抽象](#9-复合字段-controller-抽象)
10. [Immer Patch 撤销/重做](#10-immer-patch-撤销重做)
11. [组件依赖图](#11-组件依赖图)
12. [实施优先级排序](#12-实施优先级排序)

---

## 1. Widget Config 元数据体系 → 充实 RendererDefinition

### 问题

nop-chaos-flux 的 `RendererDefinition` 接口已经预留了 `propSchema`、`icon` 等字段，但**没有任何生产渲染器实际填充它们**。

**当前状态** (`packages/flux-core/src/types/renderer-core.ts:97-122`):

```typescript
export interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  type: S['type'];
  component: ComponentType<RendererComponentProps<any>>;
  displayName?: string;       // ⚠️ 部分渲染器未设
  icon?: string;              // ❌ 未使用
  category?: string;          // ⚠️ 不一致
  defaultSchema?: Partial<S>; // ⚠️ 部分缺失
  propSchema?: Record<string, unknown>; // ❌ 仅测试用
  // ...
}
```

`propSchema` 目前仅用于 `shape-validation.ts` 的诊断检查（检测未知属性），且所有渲染器都未 opt-in，导致诊断形同虚设。

### ToolJet 参考实现

ToolJet 每个 Widget 有完整的 9 键配置对象：

```javascript
// c:/can/ai/tooljet/frontend/src/AppBuilder/WidgetManager/widgets/button.js
export const buttonConfig = {
  name: 'Button',
  displayName: 'Button',
  description: 'Trigger actions: queries, alerts, set variables etc.',
  component: 'Button',
  defaultSize: { width: 4, height: 40 },
  properties: {
    text: {
      type: 'code',           // 编辑器类型
      displayName: 'Label',   // Inspector 标签
      validation: { schema: { type: 'string' } },
      section: 'additionalActions', // Inspector 分组
    },
    loadingState: {
      type: 'toggle',
      displayName: 'Loading state',
      validation: { schema: { type: 'boolean' } },
    },
  },
  events: {
    onClick: { displayName: 'On click' },
    onHover: { displayName: 'On hover' },
  },
  styles: {
    backgroundColor: {
      type: 'colorSwatches',
      displayName: 'Background',
      accordian: 'button',    // 手风琴分组
    },
  },
  exposedVariables: { buttonText: 'Button', isVisible: true, isDisabled: false, isLoading: false },
  actions: [
    { handle: 'click', displayName: 'Click' },
    { handle: 'setText', displayName: 'Set text', params: [{ handle: 'text', displayName: 'Text', defaultValue: 'New Text' }] },
    { handle: 'setVisibility', displayName: 'Set visibility', params: [{ handle: 'disable', displayName: 'Value', defaultValue: '{{false}}', type: 'toggle' }] },
  ],
  definition: { /* 所有属性的默认值镜像 */ },
};
```

### 可实施改进

**Step 1: 扩展 RendererDefinition 类型**

在 `packages/flux-core/src/types/renderer-core.ts` 中：

```typescript
export interface PropMeta {
  type: 'string' | 'number' | 'boolean' | 'toggle' | 'select' | 'code' | 'color' | 'icon' | 'boxShadow' | 'numberInput';
  displayName: string;
  description?: string;
  defaultValue?: unknown;
  validation?: { schema: PropTypeDescriptor };
  section?: string;                // Inspector 分组
  accordian?: string;              // 手风琴分组
  conditionallyRender?: ConditionallyRenderSpec | ConditionallyRenderSpec[];
  options?: { label: string; value: unknown }[];  // select 类型的选项
  editorComponent?: string;        // 自定义编辑器组件 ID
}

export interface EventMeta {
  displayName: string;
  description?: string;
}

export interface ExposedVariableMeta {
  type: string;
  description?: string;
  defaultValue: unknown;
}

export interface ActionMeta {
  handle: string;
  displayName: string;
  description?: string;
  params: ActionParamMeta[];
}

export interface ActionParamMeta {
  handle: string;
  displayName: string;
  type?: string;
  defaultValue?: unknown;
  options?: { label: string; value: unknown }[];
}

export interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  // ...现有字段保持不变...
  
  // 新增元数据
  description?: string;
  tags?: string[];
  propMeta?: Record<string, PropMeta>;       // 替代空的 propSchema
  eventMeta?: Record<string, EventMeta>;
  exposedVariables?: Record<string, ExposedVariableMeta>;
  actions?: readonly ActionMeta[];
  layoutHints?: {
    defaultWidth?: number;
    defaultHeight?: number;
    resizePolicy?: 'fixed' | 'flex' | 'fill';
    allowedParents?: string[];
    disallowedChildren?: string[];
  };
}
```

**Step 2: 为每个现有渲染器补充元数据**

以 Button 为例 (`packages/flux-renderers-basic/src/button.tsx`):

```typescript
export const buttonRendererDefinition: RendererDefinition<ButtonSchema> = {
  type: 'button',
  component: ButtonRenderer,
  displayName: 'Button',
  icon: 'MousePointerClick',
  category: 'basic',
  description: 'Triggers actions: submit form, run query, navigate, etc.',
  tags: ['action', 'trigger'],
  defaultSchema: {
    label: 'Button',
    variant: 'default',
    size: 'default',
  },
  propMeta: {
    label: { type: 'string', displayName: 'Label', defaultValue: 'Button' },
    variant: {
      type: 'select',
      displayName: 'Variant',
      defaultValue: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Destructive', value: 'destructive' },
        { label: 'Outline', value: 'outline' },
        { label: 'Ghost', value: 'ghost' },
        { label: 'Link', value: 'link' },
      ],
    },
    size: {
      type: 'select',
      displayName: 'Size',
      defaultValue: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Small', value: 'sm' },
        { label: 'Large', value: 'lg' },
        { label: 'Icon', value: 'icon' },
      ],
    },
    icon: { type: 'icon', displayName: 'Icon' },
    iconPosition: {
      type: 'select',
      displayName: 'Icon position',
      defaultValue: 'left',
      options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }],
    },
    loading: { type: 'toggle', displayName: 'Loading', defaultValue: false },
  },
  eventMeta: {
    onClick: { displayName: 'On click', description: 'Fires when the button is clicked' },
  },
  exposedVariables: {
    label: { type: 'string', defaultValue: 'Button' },
    loading: { type: 'boolean', defaultValue: false },
  },
  actions: [
    { handle: 'click', displayName: 'Click', params: [] },
    { handle: 'setLabel', displayName: 'Set label', params: [{ handle: 'label', displayName: 'Label', type: 'string', defaultValue: '' }] },
    { handle: 'setLoading', displayName: 'Set loading', params: [{ handle: 'loading', displayName: 'Loading', type: 'toggle', defaultValue: false }] },
  ],
  layoutHints: {
    defaultWidth: 4,
    defaultHeight: 40,
    resizePolicy: 'flex',
  },
};
```

**收益:**
- 属性编辑器（Inspector）可以从 `propMeta` 自动生成配置表单
- 组件面板可以从 `icon` + `category` + `tags` 渲染
- "控制组件"动作可以从 `actions` 动态发现目标组件的方法和参数
- 嵌套规则可以从 `layoutHints.allowedParents` 验证

---

## 2. Exposed Variables 声明式契约

### 问题

nop-chaos-flux 当前的"组件状态暴露"是**纯命令式**的：

- Form: 手动构建 `FormStatusSummary` 写入 `scope.update(statusPath, ...)`
- CRUD: 自定义 `useCrudStatusPublisher` hook 写入 scope
- Table: **完全没有** statusPath
- Tree: 使用 `publishOwnerStatus()` 工具函数

没有声明式契约将 `RendererDefinition` 与其暴露的状态形状关联起来。

### ToolJet 参考实现

```javascript
// 声明式：配置定义了暴露变量的初始形状
exposedVariables: {
  selectedRow: {},
  changeSet: {},
  dataUpdates: [],
  pageIndex: 1,
  searchText: '',
  selectedRows: [],
  filters: [],
},

// 运行时：组件主动更新暴露变量
function handleRowClick(rowData) {
  setExposedVariables({ selectedRow: rowData });
}
```

其他组件通过 `{{components.table1.selectedRow}}` 直接引用暴露变量。

### 可实施改进

**Step 1: 在 RendererDefinition 增加 `exposes` 声明**

```typescript
export interface ExposesSpec {
  summaryPath?: string;      // 写入 scope 的路径 (替代 statusPath 在 schema 上)
  variables: Record<string, ExposedVariableMeta>;
}

export interface ExposedVariableMeta {
  type: string;
  description?: string;
  defaultValue: unknown;
}
```

**Step 2: 统一 `useExposedVariables` hook**

```typescript
// packages/flux-react/src/use-exposed-variables.ts
export function useExposedVariables(
  props: RendererComponentProps,
  updates: Record<string, unknown>,
) {
  const scope = useRenderScope();
  const definition = /* 从 registry 拿 */ ;
  const exposes = definition.exposes;
  const summaryPath = exposes?.summaryPath ?? props.props.statusPath;

  useEffect(() => {
    if (!scope || !summaryPath) return;
    const summary: Record<string, unknown> = {};
    for (const [key, meta] of Object.entries(exposes?.variables ?? {})) {
      summary[key] = updates[key] ?? meta.defaultValue;
    }
    publishOwnerStatus(scope, summaryPath, summary);
  }, [scope, summaryPath, updates]);
}
```

**Step 3: 用声明式替代手动 CRUD status publisher**

Before (`crud-renderer.tsx:23-45`, 自定义 hook + 手动相等比较):
```typescript
function useCrudStatusPublisher(scope, statusPath, summary) {
  const prevSummaryRef = useRef<CrudStatusSummary | undefined>(undefined);
  useEffect(() => {
    // ... 手动比较每个 key ...
    scope.update(statusPath, summary);
  }, [scope, statusPath, summary]);
}
```

After (声明式):
```typescript
// 在 CRUD RendererDefinition 中:
exposes: {
  summaryPath: '$crud',   // 或从 schema.statusPath 读取
  variables: {
    loading: { type: 'boolean', defaultValue: false },
    refreshing: { type: 'boolean', defaultValue: false },
    itemCount: { type: 'number', defaultValue: 0 },
    total: { type: 'number', defaultValue: 0 },
    hasSelection: { type: 'boolean', defaultValue: false },
    selectionCount: { type: 'number', defaultValue: 0 },
    selectedRowKeys: { type: 'array', defaultValue: [] },
  },
},

// 在 CRUD 组件中:
useExposedVariables(props, {
  loading,
  refreshing,
  itemCount: data?.length ?? 0,
  total: pagination?.total ?? 0,
  hasSelection: selectedRowKeys.length > 0,
  selectionCount: selectedRowKeys.length,
  selectedRowKeys: Array.from(selectedRowKeys),
});
```

**收益:**
- 统一的暴露变量模式（替代每个渲染器手写 publisher）
- Table 也能轻松暴露状态（当前完全缺失）
- `exposes.variables` 的 key 自动成为 scope 中可引用的路径

---

## 3. Imperative Actions 声明式参数

### 问题

nop-chaos-flux 的 ComponentHandle 系统工作良好（Form、CRUD、Table 都注册了 handle），但 handle 的方法声明是**纯命令式**的——在 `capabilities.invoke` 的 switch 中硬编码：

```typescript
// crud-renderer.tsx:47-93
capabilities: {
  hasMethod(method) {
    return ['refresh', 'getSelection', 'clearSelection'].includes(method);
  },
  listMethods() {
    return ['refresh', 'getSelection', 'clearSelection'];
  },
  async invoke(method, _payload) {
    switch (method) {
      case 'refresh': handleRefresh(); return { ok: true };
      case 'getSelection': return { ok: true, data: ... };
      case 'clearSelection': ...; return { ok: true };
      default: return { ok: false, error: new Error(`Unknown method: ${method}`) };
    }
  },
}
```

三个方法（`hasMethod`、`listMethods`、`invoke`）分散维护，容易不一致。且没有参数元数据，构建器无法自动生成"控制组件"动作的参数编辑器。

### ToolJet 参考实现

```javascript
actions: [
  { handle: 'click', displayName: 'Click', params: [] },
  {
    handle: 'setText',
    displayName: 'Set text',
    params: [{ handle: 'text', displayName: 'Text', defaultValue: 'New Text' }],
  },
  {
    handle: 'setVisibility',
    displayName: 'Set visibility',
    params: [{ handle: 'disable', displayName: 'Value', defaultValue: '{{false}}', type: 'toggle' }],
  },
  {
    handle: 'setDisable',
    displayName: 'Set disable',
    params: [{ handle: 'disable', displayName: 'Value', defaultValue: '{{false}}', type: 'toggle' }],
  },
],
```

EventManager 读取 `actions` 数组，自动渲染三步选择器：
1. 选择目标组件（下拉过滤有 actions 的组件）
2. 选择动作（从 actions 列表）
3. 动态渲染参数编辑器（根据 `param.type` 决定 UI 控件）

### 可实施改进

**Step 1: 定义声明式 action 元数据**（已在第 1 节 `ActionMeta` 类型中定义）

**Step 2: ComponentHandle 从 RendererDefinition 自动生成**

```typescript
// packages/flux-runtime/src/handle-factory.ts
export function createDeclarativeHandle(
  input: {
    id?: string;
    name?: string;
    type: string;
    actions: readonly ActionMeta[];
  },
  handlers: Record<string, (payload: Record<string, unknown>) => Promise<ActionResult> | ActionResult>,
): ComponentHandle {
  const methodSet = new Set(input.actions.map((a) => a.handle));
  
  // 校验：handlers 覆盖所有声明的 action
  for (const action of input.actions) {
    if (!handlers[action.handle]) {
      console.warn(`[handle-factory] No handler for declared action "${action.handle}" on ${input.type}`);
    }
  }

  return {
    id: input.id,
    name: input.name,
    type: input.type,
    capabilities: {
      hasMethod(method) { return methodSet.has(method); },
      listMethods() { return input.actions.map((a) => a.handle); },
      async invoke(method, payload) {
        const handler = handlers[method];
        if (!handler) return { ok: false, error: new Error(`Unknown method: ${method}`) };
        return handler(payload ?? {});
      },
    },
  };
}
```

**Step 3: 用声明式重构 CRUD handle**

Before (47 行手写):
```typescript
const handle: ComponentHandle = {
  id, name, type: 'crud',
  capabilities: {
    hasMethod(m) { return ['refresh','getSelection','clearSelection'].includes(m); },
    listMethods() { return ['refresh','getSelection','clearSelection']; },
    async invoke(method, _payload) {
      switch(method) { /* ... */ }
    },
  },
};
```

After (~10 行声明式):
```typescript
const handle = useMemo(() =>
  createDeclarativeHandle(
    { id, name, type: 'crud', actions: crudRendererDefinition.actions! },
    {
      refresh: () => { handleRefresh(); return { ok: true }; },
      getSelection: () => ({ ok: true, data: internalTableRef.current?.getSelection?.() ?? [] }),
      clearSelection: () => { internalTableRef.current?.clearSelection?.(); return { ok: true }; },
    },
  ),
[id, name, handleRefresh, internalTableRef]);
```

**Step 4: 构建器 Inspector 动作面板可自动发现**

有了 `RendererDefinition.actions` 元数据，"控制组件"动作类型可以：
- 从 `componentRegistry.list()` 过滤出有 `actions` 的组件
- 渲染目标选择 → 方法选择 → 参数编辑器
- 参数编辑器类型由 `ActionParamMeta.type` 决定

**收益:**
- 减少 handle 注册样板代码 ~60%
- `hasMethod`/`listMethods`/`invoke` 自动一致
- 参数元数据使构建器能动态生成 UI

---

## 4. 条件属性渲染 (conditionallyRender)

### 问题

nop-chaos-flux 的 `SchemaFieldRule` 是静态的——字段分类在编译期一次完成，不根据运行时值改变。无法表达"当 variant 为 'primary' 时才显示 backgroundColor 属性"。

### ToolJet 参考实现

```javascript
// button.js - 单条件
backgroundColor: {
  type: 'colorSwatches',
  displayName: 'Background',
  conditionallyRender: { key: 'type', value: 'primary' },
},

// table.js - 多条件 (AND 逻辑)
maxRowHeightValue: {
  type: 'tableRowHeightInput',
  conditionallyRender: [
    { key: 'maxRowHeight', value: 'custom' },
    { key: 'contentWrap', value: true },
  ],
},
```

Inspector 渲染时检查当前组件的已解析属性值，决定是否显示该属性编辑器。

### 可实施改进

**Step 1: 在 PropMeta 中增加条件渲染声明**

```typescript
export interface ConditionalRenderSpec {
  key: string;       // 依赖的属性名
  value: unknown;    // 期望值 (=== 比较)
}

export interface PropMeta {
  // ...现有字段
  conditionallyRender?: ConditionalRenderSpec | ConditionalRenderSpec[];
}
```

**Step 2: Inspector 过滤逻辑**

```typescript
function shouldRenderProperty(
  propMeta: PropMeta,
  currentValues: Record<string, unknown>,
): boolean {
  const cond = propMeta.conditionallyRender;
  if (!cond) return true;
  
  const specs = Array.isArray(cond) ? cond : [cond];
  return specs.every(({ key, value }) => currentValues[key] === value);
}
```

**收益:**
- Inspector 根据 `propMeta.conditionallyRender` 过滤属性
- 编译期可根据条件裁剪不需要编译的字段（轻微性能优化）
- 避免在 Inspector 中硬编码组件特定的条件逻辑

---

## 5. Universal Props 自动继承

### 问题

nop-chaos-flux 的渲染器各自定义其属性，没有"所有渲染器都应继承"的通用属性。如果要让所有渲染器都支持 `tooltip`，需要逐个修改。

### ToolJet 参考实现

```javascript
// c:/can/ai/tooljet/frontend/src/Editor/WidgetManager/components.js
const universalProps = {
  general: {
    tooltip: { type: 'code', displayName: 'Tooltip', validation: { schema: { type: 'string' } } },
  },
  generalStyles: {
    boxShadow: { type: 'boxShadow', displayName: 'Box Shadow' },
  },
};

const combineProperties = (widget, universal, isArray = false) => ({
  ...universal,
  ...widget,
  properties: { ...universal.properties, ...widget.properties },
  general: { ...universal.general, ...widget.general },
  styles: { ...universal.styles, ...widget.styles },
});
```

### 可实施改进

**Step 1: 定义 Universal PropMeta**

```typescript
// packages/flux-core/src/universal-prop-meta.ts
export const UNIVERSAL_PROP_META: Record<string, PropMeta> = {
  tooltip: { type: 'string', displayName: 'Tooltip', description: 'Show tooltip on hover' },
};

export const UNIVERSAL_LAYOUT_PROP_META: Record<string, PropMeta> = {
  className: { type: 'string', displayName: 'Class name' },
  visible: { type: 'toggle', displayName: 'Visible', defaultValue: true },
  hidden: { type: 'toggle', displayName: 'Hidden', defaultValue: false },
  disabled: { type: 'toggle', displayName: 'Disabled', defaultValue: false },
};
```

**Step 2: Registry 注册时自动合并**

```typescript
// packages/flux-runtime/src/registry.ts
register(definition: RendererDefinition, options?: RegisterOptions) {
  const merged: RendererDefinition = {
    ...definition,
    propMeta: {
      ...UNIVERSAL_PROP_META,
      ...definition.propMeta,
    },
  };
  map.set(merged.type, merged);
}
```

**收益:**
- 新增全局属性（tooltip、ariaLabel 等）只需改一处
- 渲染器定义只关心自己的特定属性
- Inspector 自动展示通用属性区

---

## 6. 属性编辑器类型系统 (Inspector 类型分发)

### 问题

nop-chaos-flux 没有属性编辑器（Inspector），`propSchema`/`propMeta` 未填充是根本原因。但即使填充了，也需要一个编辑器类型分发系统。

### ToolJet 参考实现

ToolJet 的 Inspector 通过 `type` 字段分发到不同的编辑器控件：

| type 值 | 渲染的编辑器 |
|---------|-------------|
| `code` | 代码编辑器 (带 fx 开关) |
| `toggle` | 开关 |
| `select` | 下拉选择 |
| `colorSwatches` | 颜色选择器 |
| `numberInput` | 数字输入 |
| `boxShadow` | 阴影编辑器 |
| `icon` | 图标选择器 |
| `tableRowHeightInput` | 专用表格行高编辑 |

每个属性还带一个 **fx 按钮**（`fxActive` 状态），切换静态值和动态表达式编辑模式。

### 可实施改进

**Step 1: 定义 PropEditor 类型映射**

```typescript
// packages/flux-core/src/types/prop-editor.ts
export type PropEditorType =
  | 'string'    // <Input>
  | 'number'    // <Input type="number">
  | 'boolean'   // <Switch>
  | 'toggle'    // <Switch> (alias for boolean)
  | 'select'    // <Select> with options
  | 'code'      // <CodeEditor> with expression support
  | 'color'     // <ColorPicker>
  | 'icon'      // <IconPicker>
  | 'date'      // <DatePicker>
  | 'slider'    // <Slider>
  | 'custom';   // 自定义编辑器组件
```

**Step 2: Inspector 根据 propMeta.type 渲染**

```tsx
function PropertyEditor({ propMeta, value, onChange }) {
  const [fxActive, setFxActive] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Label>{propMeta.displayName}</Label>
      <div className="flex-1">
        {fxActive ? (
          <CodeEditor value={value} onChange={onChange} />
        ) : (
          <StaticValueEditor type={propMeta.type} options={propMeta.options} value={value} onChange={onChange} />
        )}
      </div>
      <Button variant="ghost" size="icon" onClick={() => setFxActive(!fxActive)}>
        <Code2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function StaticValueEditor({ type, options, value, onChange }) {
  switch (type) {
    case 'string': return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
    case 'toggle': case 'boolean': return <Switch checked={value} onCheckedChange={onChange} />;
    case 'select': return <Select options={options} value={value} onChange={onChange} />;
    case 'number': return <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />;
    case 'color': return <ColorPicker value={value} onChange={onChange} />;
    // ...
  }
}
```

**收益:**
- Inspector 100% 从 `propMeta` 元数据驱动，无需硬编码组件知识
- fx 按钮提供静态值 ↔ 表达式切换
- 新增属性只需在 `propMeta` 中声明类型

---

## 7. Component Handle 工厂化

### 问题

每个渲染器的 handle 注册逻辑都是手写的 ~50 行样板代码，且存在不一致：
- Form: 有 `name` 字段
- Table: **缺少** `name` 字段
- ArrayEditor/ArrayField: **完全没有**注册 handle
- 每个 handle 手动维护 `hasMethod`/`listMethods`/`invoke` 的一致性

### 可实施改进

见第 3 节的 `createDeclarativeHandle` 工厂。额外需要：

**Step 1: 统一注册 hook**

```typescript
// packages/flux-react/src/use-component-handle.ts
export function useComponentHandle(
  props: RendererComponentProps,
  handlers: Record<string, (payload: Record<string, unknown>) => Promise<ActionResult> | ActionResult>,
) {
  const registry = useCurrentComponentRegistry();
  const definition = useRendererDefinition(props.schema.type);
  
  const handle = useMemo(
    () => createDeclarativeHandle(
      { id: props.id, name: props.schema.name, type: props.schema.type, actions: definition?.actions ?? [] },
      handlers,
    ),
    [props.id, props.schema.name, props.schema.type, definition, handlers],
  );

  useEffect(() => {
    if (!registry) return;
    return registry.register(handle, { cid: props.meta.cid });
  }, [registry, handle, props.meta.cid]);
}
```

**Step 2: 各渲染器使用**

```typescript
// crud-renderer.tsx
useComponentHandle(props, {
  refresh: () => { handleRefresh(); return { ok: true }; },
  getSelection: () => ({ ok: true, data: internalTableRef.current?.getSelection?.() ?? [] }),
  clearSelection: () => { internalTableRef.current?.clearSelection?.(); return { ok: true }; },
});

// form.tsx
useComponentHandle(props, {
  submit: (p) => form.submit(p.api as never, { interactionId: p.interactionId }),
  validate: () => form.validateForm().then((r) => ({ ok: r.ok, data: r, error: r.ok ? undefined : r.errors })),
  reset: (p) => { form.reset(p.values as object | undefined); return { ok: true }; },
  setValue: (p) => { form.setValue(String(p.name ?? ''), p.value); return { ok: true, data: p.value }; },
  setValues: (p) => { form.setValues((p.values as Record<string, unknown>) ?? {}); return { ok: true, data: p.values ?? {} }; },
});
```

**收益:**
- 每个 handle 注册从 ~50 行降到 ~10 行
- `hasMethod`/`listMethods` 自动从 `actions` 元数据生成
- `name` 字段自动从 `props.schema.name` 获取，不再遗漏

---

## 8. StatusPath 声明式契约

### 问题

当前 `statusPath` 的使用完全 ad-hoc：
- Form: 手动构建 `FormStatusSummary` (~60 行内联代码)
- CRUD: 自定义 `useCrudStatusPublisher` hook (~20 行)
- Table: **完全没有**
- Tree: 调用 `publishOwnerStatus()` (~10 行)

没有类型契约将 `RendererDefinition` 与暴露的状态形状关联。

### 可实施改进

结合第 2 节的 `exposes` 声明：

```typescript
// 在 RendererDefinition 中:
exposes: {
  summaryPath: '$crud',
  variables: {
    loading: { type: 'boolean', defaultValue: false },
    itemCount: { type: 'number', defaultValue: 0 },
    selectedRowKeys: { type: 'array', defaultValue: [] },
  },
},
```

**统一 hook:**

```typescript
// packages/flux-react/src/use-exposed-state.ts
export function useExposedState(
  props: RendererComponentProps,
  values: Record<string, unknown>,
) {
  const scope = useRenderScope();
  const definition = /* registry lookup */;
  const spec = definition?.exposes;
  const path = spec?.summaryPath ?? (props.props as any).statusPath;

  const prevRef = useRef<Record<string, unknown>>();
  
  useEffect(() => {
    if (!scope || !path) return;
    
    // 构建完整 summary (填充默认值)
    const summary: Record<string, unknown> = {};
    for (const [key, meta] of Object.entries(spec?.variables ?? {})) {
      summary[key] = values[key] ?? meta.defaultValue;
    }
    
    // 相等比较
    if (prevRef.current && shallowEqual(summary, prevRef.current)) return;
    prevRef.current = summary;
    
    scope.update(path, summary);
  }, [scope, path, values, spec]);
}
```

**收益:**
- 统一 `useExposedState` 替代所有手写 publisher
- `exposes.variables` 提供类型信息，构建器可自动展示可用引用路径
- Table 只需加声明 + 调用 hook 即可获得 statusPath

---

## 9. 复合字段 Controller 抽象

### 问题

`array-editor.tsx`、`array-field.tsx`、`key-value.tsx`、`tag-list.tsx` 都重复了几乎相同的模式：
1. `useFormFieldController(name, options)` 获取绑定
2. `useCurrentFormState` + `useScopeSelector` 双模式订阅
3. `useRef` 跟踪可变值
4. `currentForm.registerField({ path, childPaths, getValue, validateChild })` 手动注册
5. 手动同步子路径

### 可实施改进

**抽象 `useCompositeFieldController` hook:**

```typescript
// packages/flux-renderers-form/src/use-composite-field-controller.ts
export interface CompositeFieldController<T = unknown> {
  value: T;
  setValue: (value: T) => void;
  presentation: {
    effectiveDisabled: boolean;
    showError: boolean;
    errorMessages: string[];
  };
  scope: ScopeRef;
  currentForm: FormRuntime | null;
  formMode: boolean;
  registerChildPaths: (paths: string[]) => void;
}

export function useCompositeFieldController<T = unknown>(
  name: string,
  options: {
    disabled?: boolean;
    required?: boolean;
    defaultValue: T;
    valueAdapter?: (raw: unknown) => T;
    validateChild?: (childPath: string, value: unknown) => string | undefined;
  },
): CompositeFieldController<T> {
  const base = useFormFieldController(name, options);
  const currentForm = useCurrentForm();
  const scope = useRenderScope();
  const formMode = currentForm !== null;
  const childPathsRef = useRef<string[]>([]);

  const registerChildPaths = useCallback((paths: string[]) => {
    if (!currentForm || !name) return;
    childPathsRef.current = paths;
    // 自动 (re-)register field with updated childPaths
    currentForm.registerField({
      path: name,
      childPaths: paths,
      getValue: () => base.value,
      validateChild: options.validateChild,
    });
  }, [currentForm, name, base.value, options.validateChild]);

  return {
    value: base.value as T ?? options.defaultValue,
    setValue: base.handlers.onChange,
    presentation: base.presentation,
    scope,
    currentForm,
    formMode,
    registerChildPaths,
  };
}
```

**ArrayEditor 使用示例:**

Before (~30 行绑定逻辑):
```typescript
const { value: formValue, handlers, presentation } = useFormFieldController(name, { disabled, required });
const currentForm = useCurrentForm();
const scope = useRenderScope();
const itemsRef = useRef(formValue ?? []);
// + 20 行 registerField + childPaths 同步
```

After (~5 行):
```typescript
const controller = useCompositeFieldController<ArrayItem[]>(name, {
  disabled,
  required,
  defaultValue: [],
});
// controller.value, controller.setValue, controller.registerChildPaths
```

**收益:**
- 复合字段样板代码减少 ~70%
- 子路径注册自动化
- 统一 form/scope 双模式处理

---

## 10. Immer Patch 撤销/重做

### 问题

nop-chaos-flux 的运行时编译产出不可变 `CompiledTemplate`，但**没有 Schema 级别的撤销/重做**。Flow Designer 和 Spreadsheet Designer 各自实现了命令式 undo/redo，但通用 Schema 层面缺失。

### ToolJet 参考实现

ToolJet 使用 Immer 的 `produceWithPatches` 实现极简的 patch-based undo/redo：

```javascript
import { produceWithPatches, enablePatches, applyPatches } from 'immer';
enablePatches();

const undoStack = [];  // [inversePatches, forwardPatches]
const redoStack = [];
const MAX_HISTORY = 100;

// 包装每个状态变更操作
withUndoRedo: (fn, skipUndoRedo = false) => {
  if (skipUndoRedo) return fn;
  return (state) => {
    const [newState, patches, inversePatches] = produceWithPatches(fn)(state);
    redoStack.length = 0;
    undoStack.push([inversePatches, patches]);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    return newState;
  };
},

handleUndo: () => {
  const [inversePatches] = undoStack.pop();
  redoStack.push(/* ... */);
  get().processPatches(inversePatches);
},
```

关键设计：
- Immer patches 是低级路径操作
- ToolJet 将 patches 翻译为**语义操作**（delete/add/layoutUpdate/propertyUpdate）
- 语义操作调用 store 的标准 mutation 方法（而非 applyPatches 直接应用）
- 远程多人协作更新通过 `skipUndoRedo: true` 排除在 undo 栈之外

### 可实施改进

nop-chaos-flux 是渲染引擎，不是编辑器，因此 Schema 变更的 undo/redo **不是引擎职责**，而是上层编辑器/构建器的职责。

但如果未来要构建 Schema 编辑器（builder），ToolJet 的模式可以直接参考：

**建议在 `flux-runtime` 中预留 undo/redo 接口：**

```typescript
// packages/flux-core/src/types/schema-editor.ts
export interface SchemaEditHistory {
  push(entry: SchemaEditEntry): void;
  undo(): SchemaEditEntry | undefined;
  redo(): SchemaEditEntry | undefined;
  canUndo: boolean;
  canRedo: boolean;
  clear(): void;
}

export interface SchemaEditEntry {
  patches: SchemaPatch[];
  inversePatches: SchemaPatch[];
  description: string;
  timestamp: number;
}

export interface SchemaPatch {
  op: 'add' | 'remove' | 'replace';
  path: string[];
  value?: unknown;
}
```

**注意:** 这应该是一个独立的 `@nop-chaos/flux-editor` 包的职责，不应放入 `flux-runtime`。

---

## 11. 组件依赖图

### 问题

nop-chaos-flux 没有构建"哪个组件依赖哪个 scope 路径"的全局视图。当数据源返回新值时，无法精确知道哪些组件需要重求值。

当前机制是通过 scope 的 `ScopeChange.paths` 进行依赖匹配（每个 NodeRenderer 订阅特定路径），但这只解决了**渲染层**的精确更新，没有解决**编译期**的依赖分析。

### ToolJet 参考实现

ToolJet 使用 `dependency-graph` 库构建全局依赖图：

```javascript
// c:/can/ai/tooljet/frontend/src/AppBuilder/_stores/slices/DependencyClass.js
class DependencyGraph {
  addDependency(fromPath, toPath) {
    // e.g., addDependency('components.table1.data', 'components.text1.text')
    this.graph.addDependency(fromPath, toPath);
  }
  
  getOverallOrder() {
    return this.graph.overallOrder(); // 拓扑排序
  }
}
```

当 `query1` 返回数据时，依赖图确定哪些组件的属性引用了 `queries.query1.data`，只重新解析这些组件。

### 可实施改进

**这更多是一个调试/分析工具的需求而非核心运行时需求。** nop-chaos-flux 的 `ScopeChange.paths` + 每节点依赖匹配已经解决了运行时精确更新。

但如果要构建：
- Schema 诊断工具（检测循环依赖）
- 性能分析器（识别重渲染热点）
- 编辑器智能提示（知道修改某属性会影响哪些组件）

可以在编译期收集依赖图：

```typescript
// packages/flux-runtime/src/schema-compiler/dependency-collector.ts
export interface CompiledDependencyGraph {
  // 哪些 scope 路径被哪些节点引用
  nodeDeps: Map<string, Set<string>>;     // nodeId -> scopePaths
  // 哪些节点被哪些其他节点的事件目标引用
  actionDeps: Map<string, Set<string>>;   // nodeId -> targetNodeIds
  // 拓扑排序结果
  evaluationOrder: string[];
}
```

**建议优先级低。** 当前的运行时依赖匹配已足够高效，编译期依赖图主要用于构建器/调试器。

---

## 12. 实施优先级排序

### P0: 基础设施（阻塞构建器开发）

| # | 改进项 | 工作量 | 依赖 |
|---|--------|--------|------|
| 1 | 充实 `RendererDefinition` 元数据（propMeta, eventMeta, actions, layoutHints） | 中 (每个渲染器 ~30 行) | 无 |
| 5 | Universal Props 自动继承 | 小 (registry.ts 改动) | #1 |
| 8 | StatusPath 声明式契约 + `useExposedState` | 中 (统一 hook + 迁移现有渲染器) | #1 |

### P1: 减少样板代码

| # | 改进项 | 工作量 | 依赖 |
|---|--------|--------|------|
| 7 | Component Handle 工厂化 | 小 (工厂 + hook) | #1 |
| 3 | Imperative Actions 声明式参数 | 小 (ActionMeta 类型) | #1, #7 |
| 9 | 复合字段 Controller 抽象 | 中 (抽象 + 迁移 4 个组件) | 无 |

### P2: Inspector/构建器支撑

| # | 改进项 | 工作量 | 依赖 |
|---|--------|--------|------|
| 6 | 属性编辑器类型系统 | 大 (需要新组件库) | #1 |
| 4 | 条件属性渲染 | 小 (类型 + 过滤函数) | #1 |

### P3: 未来需求

| # | 改进项 | 工作量 | 依赖 |
|---|--------|--------|------|
| 10 | Schema 编辑器 undo/redo | 大 (需要 editor 包) | 无 |
| 11 | 编译期依赖图 | 中 (编译器扩展) | 无 |

### 建议实施路径

```
Phase 1: 定义类型 + 充实元数据
  ├── 在 flux-core 中定义 PropMeta, EventMeta, ActionMeta, ExposesSpec 等类型
  ├── 扩展 RendererDefinition 接口
  └── 为所有渲染器补充 propMeta + eventMeta + actions + exposedVariables

Phase 2: 工厂化 + 统一 hooks
  ├── 实现 createDeclarativeHandle 工厂
  ├── 实现 useComponentHandle hook
  ├── 实现 useExposedState hook
  ├── 实现 useCompositeFieldController hook
  └── 迁移现有渲染器使用新 hooks

Phase 3: Registry 增强
  ├── Registry 注册时自动合并 Universal Props
  ├── shape-validation 使用 propMeta 替代空的 propSchema
  └── 为 Inspector 提供元数据查询 API

Phase 4: Inspector 组件（如需要）
  ├── PropEditor 类型分发系统
  ├── fx 开关 (静态值 ↔ 表达式)
  └── 条件属性过滤
```

### 预估总工作量

| Phase | 新增代码 | 修改代码 | 涉及包 |
|-------|---------|---------|--------|
| Phase 1 | ~800 行 (16 渲染器 × 50 行元数据) | ~200 行 (类型定义) | flux-core, flux-renderers-* |
| Phase 2 | ~300 行 (3 hooks + 工厂) | ~400 行 (迁移 6+ 渲染器) | flux-runtime, flux-react, flux-renderers-* |
| Phase 3 | ~100 行 | ~50 行 | flux-runtime |
| Phase 4 | ~600 行 (Inspector 组件) | ~100 行 | 新包或 flux-react |
| **合计** | **~1,800 行** | **~750 行** | |

---

## 附录: 当前代码中可直接参考的 ToolJet 文件

| 功能 | ToolJet 文件 | nop-chaos-flux 对应位置 |
|------|-------------|----------------------|
| Widget Config 定义 | `frontend/src/AppBuilder/WidgetManager/widgets/button.js` | `packages/flux-renderers-basic/src/button.tsx` |
| Widget Config 注册 | `frontend/src/AppBuilder/WidgetManager/configs/widgetConfig.js` | `packages/flux-runtime/src/registry.ts` |
| Universal Props 合并 | `frontend/src/Editor/WidgetManager/components.js` | `packages/flux-runtime/src/registry.ts` |
| Inspector 动态渲染 | `frontend/src/Editor/Inspector/Utils.js` | 无对应（缺失） |
| Inspector 分组 | `frontend/src/Editor/Inspector/Inspector.jsx` | 无对应（缺失） |
| Event Manager | `frontend/src/Editor/Inspector/EventManager.jsx` | `packages/flux-runtime/src/action-runtime.ts` |
| Action Types 注册 | `frontend/src/Editor/ActionTypes.js` | `packages/flux-core/src/types/actions.ts` |
| 控制组件动作 | `EventManager.jsx:846-936` | `packages/flux-runtime/src/action-runtime-core.ts` (component action) |
| Undo/Redo (Immer Patches) | `AppBuilder/_stores/slices/undoRedoSlice.js` | 无对应（缺失） |
| 组件依赖图 | `AppBuilder/_stores/slices/DependencyClass.js` | 无对应（缺失） |
| 表达式解析 | `frontend/src/Editor/CodeEditor/utils.js` | `packages/flux-formula/src/compile.ts` |
| Yjs 多人协作 | `frontend/src/Editor/RealtimeEditor.jsx` | 无对应（缺失） |
