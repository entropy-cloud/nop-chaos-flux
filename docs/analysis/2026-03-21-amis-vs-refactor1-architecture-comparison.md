# AMIS 架构对比分析报告

## 一、概述

本文档对比分析当前重构项目 (`refactor-1`) 与原始 amis 模板项目的核心架构设计。

### 1.1 项目信息

| 项目 | 路径 | 技术栈 |
|------|------|--------|
| 当前项目 | `C:\can\nop\nop-amis-wt\refactor-1` | React 19, Zustand, Vite 8, Vitest |
| amis 模板 | `c:/can/nop/templates/amis` | React 18, MobX MST, fis3/rollup, Jest |

---

## 二、核心架构差异

### 2.1 整体架构模式

| 维度 | 当前项目 | amis 模板 |
|------|----------|-----------|
| **架构风格** | 编译时 + 运行时分离 | 运行时优先 |
| **Schema 处理** | 预编译为 `CompiledSchemaNode` | 运行时动态解析 |
| **状态管理** | Zustand (Vanilla Store) | MobX State Tree |
| **数据流** | 单向数据流 + 外部订阅 | 响应式双向绑定 |
| **类型系统** | 严格类型定义 (`@nop-chaos/flux-core`) | 渐进式类型 |

### 2.2 包结构对比

```
当前项目 (refactor-1)           amis 模板
─────────────────────────────────────────────────────────────────────
amis-schema (纯类型)             ← 无对应
amis-formula                    amis-formula
amis-runtime (Zustand)          amis-core (MobX MST)
amis-react (渲染层)              ← 集成在 amis-core
amis-renderers-basic            amis-ui + amis
amis-renderers-form             amis
amis-renderers-data             amis
← 无对应                        amis-editor-core/editor
← 无对应                        office-viewer
```

---

## 三、状态管理深度对比

### 3.1 当前项目: Zustand Vanilla Store

**实现位置**: `packages/flux-runtime/src/form-store.ts`

```typescript
export function createFormStore(initialValues: Record<string, any>): FormStoreApi {
  const store = createStore<FormStoreState>(() => ({
    values: initialValues,
    errors: {},
    validating: {},
    touched: {},
    dirty: {},
    visited: {},
    submitting: false
  }));
  
  return {
    getState() { return store.getState(); },
    subscribe(listener) { return store.subscribe(listener); },
    setValue(path, value) { 
      store.setState({ values: setIn(store.getState().values, path, value) }); 
    }
  };
}
```

**作用域管理**: `packages/flux-runtime/src/scope.ts`

```typescript
export function createScopeRef(input: {
  id: string;
  path: string;
  parent?: ScopeRef;
  store?: ScopeStore<Record<string, any>>;
  isolate?: boolean;
}): ScopeRef {
  const store = input.store ?? createScopeStore(input.initialData ?? {});
  const read = createScopeReader(input.parent, store, input.isolate);
  
  return {
    id: input.id,
    path: input.path,
    parent: input.parent,
    store,
    get value() { return read(); },
    get(path) { return resolveScopePath(this, path); },
    update(path, value) {
      const snapshot = store.getSnapshot();
      store.setSnapshot(setIn(snapshot, path, value));
    }
  };
}
```

**设计特点**:
- 纯数据结构，无 React 依赖
- 惰性计算 + 缓存优化 (通过 `lastMaterialized` 缓存)
- 明确的作用域链 (`parent` 引用)

### 3.2 amis 模板: MobX State Tree

**实现位置**: `packages/amis-core/src/store/form.ts`

```typescript
export const FormStore = ServiceStore.named('FormStore')
  .props({
    inited: false,
    validated: false,
    submited: false,
    submiting: false,
    savedData: types.frozen(),
    canAccessSuperData: true
  })
  .views(self => ({
    get items() { return getItems(); },
    get errors() {
      let errors: { [propName: string]: Array<string> } = {};
      self.items.forEach(item => {
        if (!item.valid) {
          errors[item.name] = Array.isArray(errors[item.name])
            ? errors[item.name].concat(item.errors)
            : item.errors.concat();
        }
      });
      return errors;
    },
    get valid() {
      return self.items.every(item => item.valid) && 
             (!self.restError || !self.restError.length);
    }
  }))
  .actions(self => ({
    setValues(values: object, tag?: object, replace?: boolean) {
      self.updateData(values, tag, replace);
    }
  }));
```

**作用域管理**: `packages/amis-core/src/Scoped.tsx`

```typescript
export interface IScopedContext {
  rendererType?: string;
  component?: ScopedComponentType;
  parent?: IScopedContext;
  children?: IScopedContext[];
  registerComponent(component: ScopedComponentType): void;
  getComponentByName(name: string): ScopedComponentType;
  reload(target: string, ctx: RendererData): void;
}

export const ScopedContext = React.createContext(rootScopedContext);
```

### 3.3 状态管理对比总结

| 特性 | 当前项目 (Zustand) | amis (MobX MST) |
|------|-------------------|-----------------|
| 包体积 | ~3KB gzipped | ~50KB gzipped |
| 框架依赖 | 无 | 与 React 强绑定 |
| 依赖追踪 | 手动实现 | 自动追踪 |
| 时间旅行 | 需额外实现 | 内置支持 |
| 异步 action | 需包装 | 内置 `flow` 支持 |
| 调试工具 | 需自建 | mobx-devtools |
| 代码风格 | 函数式 | 装饰器语法 |

---

## 四、Schema 编译与渲染流程

### 4.1 当前项目: AOT 编译

**编译时**:
```
Schema (JSON)
     ↓
SchemaCompiler.compile()
     ↓
┌─────────────────────────────────────────────────────────────┐
│ CompiledSchemaNode {                                        │
│   id, type, path, schema,                                  │
│   component: RendererDefinition,                             │
│   props: CompiledRuntimeValue<T>,      // 编译后的属性        │
│   validation: CompiledFormValidationModel,  // 预编译验证     │
│   regions: Record<string, CompiledRegion>,                   │
│   eventActions: Record<string, ActionSchema>,               │
│   createRuntimeState(): CompiledNodeRuntimeState            │
│ }                                                          │
└─────────────────────────────────────────────────────────────┘
```

**运行时** (位置: `packages/flux-react/src/index.tsx`):

```typescript
function NodeRenderer(props: {
  node: CompiledSchemaNode;
  scope: ScopeRef;
  form?: FormRuntime;
  page?: PageRuntime;
}) {
  const runtime = useRendererRuntime();
  
  // 1. 创建节点运行时状态
  const nodeState = props.node.createRuntimeState();
  
  // 2. 解析元数据和属性
  const meta = runtime.resolveNodeMeta(props.node, props.scope, nodeState);
  const resolvedProps = runtime.resolveNodeProps(props.node, props.scope, nodeState);
  
  // 3. 渲染组件
  const Comp = props.node.component.component;
  return <Comp {...componentProps} />;
}
```

### 4.2 amis 模板: JIT 解析

**运行时** (位置: `packages/amis-core/src/SchemaRenderer.tsx`):

```typescript
export class SchemaRenderer extends React.Component<SchemaRendererProps> {
  resolveRenderer(props: SchemaRendererProps) {
    let schema = props.schema;
    
    // 1. 处理 $ref 引用
    if (schema && schema.$ref) {
      schema = { ...props.resolveDefinitions(schema.$ref), ...schema };
    }
    
    // 2. 查找渲染器
    this.renderer = resolveRenderer(path, schema, props);
    
    return { path, schema };
  }
  
  render() {
    let { schema } = this.resolveRenderer(this.props);
    
    // 3. 处理 children/component
    if (schema.children) {
      return schema.children({ ...rest, render: this.renderChild });
    }
    
    // 4. 渲染组件
    const Component = this.renderer.component!;
    return <Component {...props} ref={this.childRef} />;
  }
}
```

### 4.3 渲染流程对比

| 阶段 | 当前项目 | amis |
|------|---------|------|
| Schema 解析 | 编译时完成 | 运行时解析 |
| 表达式处理 | 预编译为执行函数 | 运行时 evaluate |
| 验证规则 | 预构建依赖图 | 运行时动态构建 |
| 渲染器查找 | 注册表直接映射 | 注册表 + 正则匹配 |

---

## 五、表单系统对比

### 5.1 当前项目 FormRuntime

**实现位置**: `packages/flux-runtime/src/form-runtime.ts`

```typescript
export interface FormRuntime {
  id: string;
  store: FormStoreApi;
  scope: ScopeRef;
  validation?: CompiledFormValidationModel;
  
  registerField(registration: RuntimeFieldRegistration): () => void;
  validateField(path: string): Promise<ValidationResult>;
  validateForm(): Promise<FormValidationResult>;
  validateSubtree(path: string): Promise<FormValidationResult>;
  
  getError(path: string): ValidationError[] | undefined;
  isValidating(path: string): boolean;
  isTouched(path: string): boolean;
  isDirty(path: string): boolean;
  
  submit(api?: ApiObject): Promise<ActionResult>;
  reset(values?: object): void;
  setValue(name: string, value: unknown): void;
  
  // 数组操作
  appendValue(path: string, value: unknown): void;
  removeValue(path: string, index: number): void;
  moveValue(path: string, from: number, to: number): void;
  swapValue(path: string, a: number, b: number): void;
}
```

### 5.2 amis FormStore

**实现位置**: `packages/amis-core/src/store/form.ts`

```typescript
export const FormStore = ServiceStore.named('FormStore')
  .props({
    inited: false,
    validated: false,
    submited: false,
    submiting: false
  })
  .views(self => ({
    get items() { return getItems(); },
    get valid() { return self.items.every(item => item.valid); },
    get validating() { return self.items.some(item => item.validating); }
  }))
  .actions(self => ({
    setValues(values, tag, replace, concatFields, changeReason) { /* ... */ },
    validate(): Promise<boolean> { /* ... */ }
  }));
```

### 5.3 验证系统对比

| 特性 | 当前项目 | amis |
|------|---------|------|
| 验证时机 | 编译时确定 traversal order | 运行时动态触发 |
| 依赖追踪 | 显式声明 `dependsOn` | MobX 自动追踪 |
| 异步验证 | 内置防抖 + 取消机制 | lodash debounce |
| 验证注册 | ValidationRegistry | 各 FormItem 自管理 |
| 错误收集 | 按路径聚合 | 按组件实例聚合 |
| 数组验证 | 自动重映射状态 | FormItemStore 管理 |

---

## 六、事件与动作系统

### 6.1 当前项目

**动作定义**: `packages/flux-core/src/types/actions.ts`

```typescript
export interface ActionSchema extends SchemaObject {
  action: string;            // 动作类型
  componentId?: string;    // 目标组件 ID
  api?: ApiObject;          // API 配置
  dialog?: Record<string, any>;
  then?: ActionSchema | ActionSchema[];  // 后续动作
}

export interface ActionContext {
  runtime: RendererRuntime;
  scope: ScopeRef;
  node?: CompiledSchemaNode;
  form?: FormRuntime;
  page?: PageRuntime;
  event?: unknown;
}
```

**动作执行**: `packages/flux-runtime/src/action-runtime.ts`

```typescript
switch (processedAction.action) {
  case 'setValue':
  case 'ajax':
  case 'dialog':
  case 'closeDialog':
  case 'submitForm':
  // ...
}
```

### 6.2 amis 模板

**动作注册**: `packages/amis-core/src/actions/index.ts`

```typescript
const ActionTypeMap: { [key: string]: RendererAction } = {};

export const registerAction = (type: string, action: RendererAction) => {
  ActionTypeMap[type] = action;
};

export const runActions = async (
  actions: ListenerAction | ListenerAction[],
  renderer: ListenerContext,
  event: any
) => {
  for (const actionConfig of actions) {
    let actionInstance = getActionByType(actionConfig.actionType);
    await runAction(actionInstance, actionConfig, renderer, event);
    if (event.stoped) break;
  }
};
```

### 6.3 事件系统对比

| 维度 | 当前项目 | amis |
|------|---------|------|
| 事件绑定 | 编译时收集 | 运行时 bindEvent |
| 事件分发 | 通过作用域传播 | ScopedContext |
| 全局广播 | 通过 pageStore | BroadcastChannel |
| 动作注册 | 内置 + 可扩展 | 全局注册表 |

---

## 七、渲染器注册机制

### 7.1 当前项目

**定义**: `packages/flux-core/src/types/renderer.ts`

```typescript
export interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  type: S['type'];
  component: ComponentType<RendererComponentProps>;
  regions?: readonly string[];
  fields?: readonly SchemaFieldRule[];
  scopePolicy?: ScopePolicy;
  resolveProps?: (args: ResolvePropsArgs<S>) => Record<string, unknown>;
  validation?: ValidationContributor<S>;
}

export type ScopePolicy = 'inherit' | 'isolate' | 'page' | 'form' | 'dialog' | 'row';
```

**注册**: `packages/flux-runtime/src/registry.ts`

```typescript
export function createRendererRegistry(
  initialDefinitions: RendererDefinition[] = []
): RendererRegistry {
  const map = new Map<string, RendererDefinition>();
  return {
    register(definition) { map.set(definition.type, definition); },
    get(type) { return map.get(type); },
    has(type) { return map.has(type); }
  };
}
```

### 7.2 amis 模板

**配置**: `packages/amis-core/src/factory.tsx`

```typescript
export interface RendererConfig extends RendererBasicConfig {
  component?: RendererComponent;
  test?: RegExp | TestFunc;
  type?: string;
  storeType?: string;
  isolateScope?: boolean;
  isFormItem?: boolean;
  weight?: number;
}

// 装饰器用法
@Renderer({
  type: 'page',
  storeType: ServiceStore.name,
  isolateScope: true
})
export class PageRenderer extends PageRendererBase {}
```

### 7.3 渲染器注册对比

| 维度 | 当前项目 | amis |
|------|---------|------|
| 注册方式 | 函数式 API | 装饰器 |
| 类型安全 | 强类型定义 | 渐进式类型 |
| Store 关联 | `scopePolicy` 策略 | `storeType` + HOC |
| 作用域控制 | 显式策略枚举 | `isolateScope` 布尔值 |
| 优先级 | 无 | `weight` 属性 |

---

## 八、React 渲染层

### 8.1 当前项目

**实现位置**: `packages/flux-react/src/index.tsx`

```typescript
export function createSchemaRenderer(registryDefinitions: RendererDefinition[] = []) {
  const registry = createRendererRegistry(registryDefinitions);

  return function SchemaRenderer(props: SchemaRendererProps) {
    const runtime = useMemo(() => createRendererRuntime({
      registry: props.registry ?? registry,
      env: props.env,
      expressionCompiler,
      plugins: props.plugins,
      pageStore: props.pageStore
    }), [deps]);

    const page = useMemo(() => runtime.createPageRuntime(props.data), [runtime]);

    return (
      <RuntimeContext.Provider value={runtime}>
        <ScopeContext.Provider value={page.scope}>
          <PageContext.Provider value={page}>
            <RenderNodes input={props.schema} />
            <DialogHost />
          </PageContext.Provider>
        </ScopeContext.Provider>
      </RuntimeContext.Provider>
    );
  };
}
```

**Context 体系**:
- `RuntimeContext`: 渲染器运行时
- `ScopeContext`: 作用域引用
- `FormContext`: 表单运行时
- `PageContext`: 页面运行时
- `NodeMetaContext`: 节点元数据

### 8.2 amis 模板

**实现位置**: `packages/amis-core/src/index.tsx`

```typescript
export function render(schema: Schema, props: RootRenderProps, options: RenderOptions) {
  return (
    <AMISSchema
      schema={schema}
      options={options}
      {...props}
    />
  );
}

function AMISSchema({ schema, options, ...props }) {
  const store = React.useMemo(() => {
    let store = stores[options.session || 'global'];
    if (!store) {
      store = RendererStore.create({}, options);
      stores[options.session || 'global'] = store;
    }
    return store;
  }, []);

  return (
    <EnvContext.Provider value={env}>
      <ScopedRootRenderer
        schema={schema}
        rootStore={store}
        env={env}
      />
    </EnvContext.Provider>
  );
}
```

---

## 九、性能优化策略

### 9.1 当前项目

1. **编译时优化**
   - Schema 预编译，运行时零解析
   - 验证规则预构建依赖图
   - 表达式预编译为执行函数

2. **运行时优化**
   - Zustand 精确订阅 (`useSyncExternalStoreWithSelector`)
   - 作用域惰性计算 + 缓存
   - `shallowEqual` 浅比较

3. **React 优化**
   - 节点状态按需创建 (`useRef`)
   - `useMemo` 缓存 helpers/regions/events

### 9.2 amis 模板

1. **MobX 优化**
   - 自动依赖追踪
   - 细粒度响应式更新
   - `observer` 自动优化渲染

2. **缓存策略**
   - `SimpleMap` 组件缓存
   - 表达式解析缓存 (`memoParse`)

3. **异步加载**
   - `LazyComponent` 按需加载渲染器

---

## 十、优劣势总结

### 10.1 当前项目 (refactor-1)

**优势**:
- 更现代的技术栈 (React 19, Zustand, Vite 8)
- 编译时优化，运行时性能更优
- 强类型系统，更好的 IDE 支持
- 框架无关的状态管理
- 更清晰的架构分层
- ESM-first，更好的 tree-shaking

**劣势**:
- 功能不完整（缺少 editor, office-viewer）
- 生态较小，社区支持少
- 学习曲线（新的架构模式）
- 无内置时间旅行/快照

### 10.2 amis 模板

**优势**:
- 功能完整，生态成熟
- MobX MST 提供丰富的状态管理能力
- 大量内置组件和渲染器
- 活跃的社区和文档
- 可视化编辑器支持

**劣势**:
- 包体积较大
- 装饰器语法，现代化不足
- 运行时解析，性能有优化空间
- 与 React 强绑定

---

## 十一、改进建议

### 11.1 当前项目改进方向

1. **补充缺失模块**
   - 实现 `amis-editor-core` 对应的编辑器支持
   - 考虑是否需要 `office-viewer`

2. **增强状态管理**
   - 添加快照/时间旅行支持
   - 实现状态持久化

3. **完善测试覆盖**
   - 补充单元测试
   - 添加 E2E 测试

### 11.2 迁移策略

如果需要从 amis 迁移到当前项目：

1. **Schema 兼容层**: 实现 Schema 转换器
2. **渲染器映射**: 建立组件对应关系
3. **渐进式迁移**: 按模块逐步迁移

---

## 附录: 文件位置索引

### 当前项目核心文件

| 文件 | 位置 | 描述 |
|------|------|------|
| FormStore | `packages/flux-runtime/src/form-store.ts` | 表单状态存储 |
| FormRuntime | `packages/flux-runtime/src/form-runtime.ts` | 表单运行时 |
| ScopeRef | `packages/flux-runtime/src/scope.ts` | 作用域引用 |
| React 层 | `packages/flux-react/src/index.tsx` | React 渲染层 |
| Registry | `packages/flux-runtime/src/registry.ts` | 渲染器注册表 |

### amis 模板核心文件

| 文件 | 位置 | 描述 |
|------|------|------|
| FormStore | `packages/amis-core/src/store/form.ts` | 表单 Store |
| SchemaRenderer | `packages/amis-core/src/SchemaRenderer.tsx` | Schema 渲染器 |
| Scoped | `packages/amis-core/src/Scoped.tsx` | 作用域系统 |
| Actions | `packages/amis-core/src/actions/` | 动作系统 |
| Factory | `packages/amis-core/src/factory.tsx` | 渲染器工厂 |

