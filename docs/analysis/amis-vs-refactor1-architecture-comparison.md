# AMIS æž¶æž„å¯¹æ¯”åˆ†æžæŠ¥å‘Š

## ä¸€ã€æ¦‚è¿°

æœ¬æ–‡æ¡£å¯¹æ¯”åˆ†æžå½“å‰é‡æž„é¡¹ç›® (`refactor-1`) ä¸ŽåŽŸå§‹ amis æ¨¡æ¿é¡¹ç›®çš„æ ¸å¿ƒæž¶æž„è®¾è®¡ã€‚

### 1.1 é¡¹ç›®ä¿¡æ¯

| é¡¹ç›® | è·¯å¾„ | æŠ€æœ¯æ ˆ |
|------|------|--------|
| å½“å‰é¡¹ç›® | `C:\can\nop\nop-amis-wt\refactor-1` | React 19, Zustand, Vite 8, Vitest |
| amis æ¨¡æ¿ | `c:/can/nop/templates/amis` | React 18, MobX MST, fis3/rollup, Jest |

---

## äºŒã€æ ¸å¿ƒæž¶æž„å·®å¼‚

### 2.1 æ•´ä½“æž¶æž„æ¨¡å¼

| ç»´åº¦ | å½“å‰é¡¹ç›® | amis æ¨¡æ¿ |
|------|----------|-----------|
| **æž¶æž„é£Žæ ¼** | ç¼–è¯‘æ—¶ + è¿è¡Œæ—¶åˆ†ç¦» | è¿è¡Œæ—¶ä¼˜å…ˆ |
| **Schema å¤„ç†** | é¢„ç¼–è¯‘ä¸º `CompiledSchemaNode` | è¿è¡Œæ—¶åŠ¨æ€è§£æž |
| **çŠ¶æ€ç®¡ç†** | Zustand (Vanilla Store) | MobX State Tree |
| **æ•°æ®æµ** | å•å‘æ•°æ®æµ + å¤–éƒ¨è®¢é˜… | å“åº”å¼åŒå‘ç»‘å®š |
| **ç±»åž‹ç³»ç»Ÿ** | ä¸¥æ ¼ç±»åž‹å®šä¹‰ (`@nop-chaos/flux-core`) | æ¸è¿›å¼ç±»åž‹ |

### 2.2 åŒ…ç»“æž„å¯¹æ¯”

```
å½“å‰é¡¹ç›® (refactor-1)           amis æ¨¡æ¿
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
amis-schema (çº¯ç±»åž‹)             â† æ— å¯¹åº”
amis-formula                    amis-formula
amis-runtime (Zustand)          amis-core (MobX MST)
amis-react (æ¸²æŸ“å±‚)              â† é›†æˆåœ¨ amis-core
amis-renderers-basic            amis-ui + amis
amis-renderers-form             amis
amis-renderers-data             amis
â† æ— å¯¹åº”                        amis-editor-core/editor
â† æ— å¯¹åº”                        office-viewer
```

---

## ä¸‰ã€çŠ¶æ€ç®¡ç†æ·±åº¦å¯¹æ¯”

### 3.1 å½“å‰é¡¹ç›®: Zustand Vanilla Store

**å®žçŽ°ä½ç½®**: `packages/flux-runtime/src/form-store.ts`

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

**ä½œç”¨åŸŸç®¡ç†**: `packages/flux-runtime/src/scope.ts`

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

**è®¾è®¡ç‰¹ç‚¹**:
- çº¯æ•°æ®ç»“æž„ï¼Œæ—  React ä¾èµ–
- æƒ°æ€§è®¡ç®— + ç¼“å­˜ä¼˜åŒ– (é€šè¿‡ `lastMaterialized` ç¼“å­˜)
- æ˜Žç¡®çš„ä½œç”¨åŸŸé“¾ (`parent` å¼•ç”¨)

### 3.2 amis æ¨¡æ¿: MobX State Tree

**å®žçŽ°ä½ç½®**: `packages/amis-core/src/store/form.ts`

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

**ä½œç”¨åŸŸç®¡ç†**: `packages/amis-core/src/Scoped.tsx`

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

### 3.3 çŠ¶æ€ç®¡ç†å¯¹æ¯”æ€»ç»“

| ç‰¹æ€§ | å½“å‰é¡¹ç›® (Zustand) | amis (MobX MST) |
|------|-------------------|-----------------|
| åŒ…ä½“ç§¯ | ~3KB gzipped | ~50KB gzipped |
| æ¡†æž¶ä¾èµ– | æ—  | ä¸Ž React å¼ºç»‘å®š |
| ä¾èµ–è¿½è¸ª | æ‰‹åŠ¨å®žçŽ° | è‡ªåŠ¨è¿½è¸ª |
| æ—¶é—´æ—…è¡Œ | éœ€é¢å¤–å®žçŽ° | å†…ç½®æ”¯æŒ |
| å¼‚æ­¥ action | éœ€åŒ…è£… | å†…ç½® `flow` æ”¯æŒ |
| è°ƒè¯•å·¥å…· | éœ€è‡ªå»º | mobx-devtools |
| ä»£ç é£Žæ ¼ | å‡½æ•°å¼ | è£…é¥°å™¨è¯­æ³• |

---

## å››ã€Schema ç¼–è¯‘ä¸Žæ¸²æŸ“æµç¨‹

### 4.1 å½“å‰é¡¹ç›®: AOT ç¼–è¯‘

**ç¼–è¯‘æ—¶**:
```
Schema (JSON)
     â†“
SchemaCompiler.compile()
     â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ CompiledSchemaNode {                                        â”‚
â”‚   id, type, path, schema,                                  â”‚
â”‚   component: RendererDefinition,                             â”‚
â”‚   props: CompiledRuntimeValue<T>,      // ç¼–è¯‘åŽçš„å±žæ€§        â”‚
â”‚   validation: CompiledFormValidationModel,  // é¢„ç¼–è¯‘éªŒè¯     â”‚
â”‚   regions: Record<string, CompiledRegion>,                   â”‚
â”‚   eventActions: Record<string, ActionSchema>,               â”‚
â”‚   createRuntimeState(): CompiledNodeRuntimeState            â”‚
â”‚ }                                                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**è¿è¡Œæ—¶** (ä½ç½®: `packages/flux-react/src/index.tsx`):

```typescript
function NodeRenderer(props: {
  node: CompiledSchemaNode;
  scope: ScopeRef;
  form?: FormRuntime;
  page?: PageRuntime;
}) {
  const runtime = useRendererRuntime();
  
  // 1. åˆ›å»ºèŠ‚ç‚¹è¿è¡Œæ—¶çŠ¶æ€
  const nodeState = props.node.createRuntimeState();
  
  // 2. è§£æžå…ƒæ•°æ®å’Œå±žæ€§
  const meta = runtime.resolveNodeMeta(props.node, props.scope, nodeState);
  const resolvedProps = runtime.resolveNodeProps(props.node, props.scope, nodeState);
  
  // 3. æ¸²æŸ“ç»„ä»¶
  const Comp = props.node.component.component;
  return <Comp {...componentProps} />;
}
```

### 4.2 amis æ¨¡æ¿: JIT è§£æž

**è¿è¡Œæ—¶** (ä½ç½®: `packages/amis-core/src/SchemaRenderer.tsx`):

```typescript
export class SchemaRenderer extends React.Component<SchemaRendererProps> {
  resolveRenderer(props: SchemaRendererProps) {
    let schema = props.schema;
    
    // 1. å¤„ç† $ref å¼•ç”¨
    if (schema && schema.$ref) {
      schema = { ...props.resolveDefinitions(schema.$ref), ...schema };
    }
    
    // 2. æŸ¥æ‰¾æ¸²æŸ“å™¨
    this.renderer = resolveRenderer(path, schema, props);
    
    return { path, schema };
  }
  
  render() {
    let { schema } = this.resolveRenderer(this.props);
    
    // 3. å¤„ç† children/component
    if (schema.children) {
      return schema.children({ ...rest, render: this.renderChild });
    }
    
    // 4. æ¸²æŸ“ç»„ä»¶
    const Component = this.renderer.component!;
    return <Component {...props} ref={this.childRef} />;
  }
}
```

### 4.3 æ¸²æŸ“æµç¨‹å¯¹æ¯”

| é˜¶æ®µ | å½“å‰é¡¹ç›® | amis |
|------|---------|------|
| Schema è§£æž | ç¼–è¯‘æ—¶å®Œæˆ | è¿è¡Œæ—¶è§£æž |
| è¡¨è¾¾å¼å¤„ç† | é¢„ç¼–è¯‘ä¸ºæ‰§è¡Œå‡½æ•° | è¿è¡Œæ—¶ evaluate |
| éªŒè¯è§„åˆ™ | é¢„æž„å»ºä¾èµ–å›¾ | è¿è¡Œæ—¶åŠ¨æ€æž„å»º |
| æ¸²æŸ“å™¨æŸ¥æ‰¾ | æ³¨å†Œè¡¨ç›´æŽ¥æ˜ å°„ | æ³¨å†Œè¡¨ + æ­£åˆ™åŒ¹é… |

---

## äº”ã€è¡¨å•ç³»ç»Ÿå¯¹æ¯”

### 5.1 å½“å‰é¡¹ç›® FormRuntime

**å®žçŽ°ä½ç½®**: `packages/flux-runtime/src/form-runtime.ts`

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
  
  // æ•°ç»„æ“ä½œ
  appendValue(path: string, value: unknown): void;
  removeValue(path: string, index: number): void;
  moveValue(path: string, from: number, to: number): void;
  swapValue(path: string, a: number, b: number): void;
}
```

### 5.2 amis FormStore

**å®žçŽ°ä½ç½®**: `packages/amis-core/src/store/form.ts`

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

### 5.3 éªŒè¯ç³»ç»Ÿå¯¹æ¯”

| ç‰¹æ€§ | å½“å‰é¡¹ç›® | amis |
|------|---------|------|
| éªŒè¯æ—¶æœº | ç¼–è¯‘æ—¶ç¡®å®š traversal order | è¿è¡Œæ—¶åŠ¨æ€è§¦å‘ |
| ä¾èµ–è¿½è¸ª | æ˜¾å¼å£°æ˜Ž `dependsOn` | MobX è‡ªåŠ¨è¿½è¸ª |
| å¼‚æ­¥éªŒè¯ | å†…ç½®é˜²æŠ– + å–æ¶ˆæœºåˆ¶ | lodash debounce |
| éªŒè¯æ³¨å†Œ | ValidationRegistry | å„ FormItem è‡ªç®¡ç† |
| é”™è¯¯æ”¶é›† | æŒ‰è·¯å¾„èšåˆ | æŒ‰ç»„ä»¶å®žä¾‹èšåˆ |
| æ•°ç»„éªŒè¯ | è‡ªåŠ¨é‡æ˜ å°„çŠ¶æ€ | FormItemStore ç®¡ç† |

---

## å…­ã€äº‹ä»¶ä¸ŽåŠ¨ä½œç³»ç»Ÿ

### 6.1 å½“å‰é¡¹ç›®

**åŠ¨ä½œå®šä¹‰**: `packages/flux-core/src/types/actions.ts`

```typescript
export interface ActionSchema extends SchemaObject {
  action: string;            // åŠ¨ä½œç±»åž‹
  componentId?: string;    // ç›®æ ‡ç»„ä»¶ ID
  api?: ApiObject;          // API é…ç½®
  dialog?: Record<string, any>;
  then?: ActionSchema | ActionSchema[];  // åŽç»­åŠ¨ä½œ
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

**åŠ¨ä½œæ‰§è¡Œ**: `packages/flux-runtime/src/action-runtime.ts`

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

### 6.2 amis æ¨¡æ¿

**åŠ¨ä½œæ³¨å†Œ**: `packages/amis-core/src/actions/index.ts`

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

### 6.3 äº‹ä»¶ç³»ç»Ÿå¯¹æ¯”

| ç»´åº¦ | å½“å‰é¡¹ç›® | amis |
|------|---------|------|
| äº‹ä»¶ç»‘å®š | ç¼–è¯‘æ—¶æ”¶é›† | è¿è¡Œæ—¶ bindEvent |
| äº‹ä»¶åˆ†å‘ | é€šè¿‡ä½œç”¨åŸŸä¼ æ’­ | ScopedContext |
| å…¨å±€å¹¿æ’­ | é€šè¿‡ pageStore | BroadcastChannel |
| åŠ¨ä½œæ³¨å†Œ | å†…ç½® + å¯æ‰©å±• | å…¨å±€æ³¨å†Œè¡¨ |

---

## ä¸ƒã€æ¸²æŸ“å™¨æ³¨å†Œæœºåˆ¶

### 7.1 å½“å‰é¡¹ç›®

**å®šä¹‰**: `packages/flux-core/src/types/renderer.ts`

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

**æ³¨å†Œ**: `packages/flux-runtime/src/registry.ts`

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

### 7.2 amis æ¨¡æ¿

**é…ç½®**: `packages/amis-core/src/factory.tsx`

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

// è£…é¥°å™¨ç”¨æ³•
@Renderer({
  type: 'page',
  storeType: ServiceStore.name,
  isolateScope: true
})
export class PageRenderer extends PageRendererBase {}
```

### 7.3 æ¸²æŸ“å™¨æ³¨å†Œå¯¹æ¯”

| ç»´åº¦ | å½“å‰é¡¹ç›® | amis |
|------|---------|------|
| æ³¨å†Œæ–¹å¼ | å‡½æ•°å¼ API | è£…é¥°å™¨ |
| ç±»åž‹å®‰å…¨ | å¼ºç±»åž‹å®šä¹‰ | æ¸è¿›å¼ç±»åž‹ |
| Store å…³è” | `scopePolicy` ç­–ç•¥ | `storeType` + HOC |
| ä½œç”¨åŸŸæŽ§åˆ¶ | æ˜¾å¼ç­–ç•¥æžšä¸¾ | `isolateScope` å¸ƒå°”å€¼ |
| ä¼˜å…ˆçº§ | æ—  | `weight` å±žæ€§ |

---

## å…«ã€React æ¸²æŸ“å±‚

### 8.1 å½“å‰é¡¹ç›®

**å®žçŽ°ä½ç½®**: `packages/flux-react/src/index.tsx`

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

**Context ä½“ç³»**:
- `RuntimeContext`: æ¸²æŸ“å™¨è¿è¡Œæ—¶
- `ScopeContext`: ä½œç”¨åŸŸå¼•ç”¨
- `FormContext`: è¡¨å•è¿è¡Œæ—¶
- `PageContext`: é¡µé¢è¿è¡Œæ—¶
- `NodeMetaContext`: èŠ‚ç‚¹å…ƒæ•°æ®

### 8.2 amis æ¨¡æ¿

**å®žçŽ°ä½ç½®**: `packages/amis-core/src/index.tsx`

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

## ä¹ã€æ€§èƒ½ä¼˜åŒ–ç­–ç•¥

### 9.1 å½“å‰é¡¹ç›®

1. **ç¼–è¯‘æ—¶ä¼˜åŒ–**
   - Schema é¢„ç¼–è¯‘ï¼Œè¿è¡Œæ—¶é›¶è§£æž
   - éªŒè¯è§„åˆ™é¢„æž„å»ºä¾èµ–å›¾
   - è¡¨è¾¾å¼é¢„ç¼–è¯‘ä¸ºæ‰§è¡Œå‡½æ•°

2. **è¿è¡Œæ—¶ä¼˜åŒ–**
   - Zustand ç²¾ç¡®è®¢é˜… (`useSyncExternalStoreWithSelector`)
   - ä½œç”¨åŸŸæƒ°æ€§è®¡ç®— + ç¼“å­˜
   - `shallowEqual` æµ…æ¯”è¾ƒ

3. **React ä¼˜åŒ–**
   - èŠ‚ç‚¹çŠ¶æ€æŒ‰éœ€åˆ›å»º (`useRef`)
   - `useMemo` ç¼“å­˜ helpers/regions/events

### 9.2 amis æ¨¡æ¿

1. **MobX ä¼˜åŒ–**
   - è‡ªåŠ¨ä¾èµ–è¿½è¸ª
   - ç»†ç²’åº¦å“åº”å¼æ›´æ–°
   - `observer` è‡ªåŠ¨ä¼˜åŒ–æ¸²æŸ“

2. **ç¼“å­˜ç­–ç•¥**
   - `SimpleMap` ç»„ä»¶ç¼“å­˜
   - è¡¨è¾¾å¼è§£æžç¼“å­˜ (`memoParse`)

3. **å¼‚æ­¥åŠ è½½**
   - `LazyComponent` æŒ‰éœ€åŠ è½½æ¸²æŸ“å™¨

---

## åã€ä¼˜åŠ£åŠ¿æ€»ç»“

### 10.1 å½“å‰é¡¹ç›® (refactor-1)

**ä¼˜åŠ¿**:
- æ›´çŽ°ä»£çš„æŠ€æœ¯æ ˆ (React 19, Zustand, Vite 8)
- ç¼–è¯‘æ—¶ä¼˜åŒ–ï¼Œè¿è¡Œæ—¶æ€§èƒ½æ›´ä¼˜
- å¼ºç±»åž‹ç³»ç»Ÿï¼Œæ›´å¥½çš„ IDE æ”¯æŒ
- æ¡†æž¶æ— å…³çš„çŠ¶æ€ç®¡ç†
- æ›´æ¸…æ™°çš„æž¶æž„åˆ†å±‚
- ESM-firstï¼Œæ›´å¥½çš„ tree-shaking

**åŠ£åŠ¿**:
- åŠŸèƒ½ä¸å®Œæ•´ï¼ˆç¼ºå°‘ editor, office-viewerï¼‰
- ç”Ÿæ€è¾ƒå°ï¼Œç¤¾åŒºæ”¯æŒå°‘
- å­¦ä¹ æ›²çº¿ï¼ˆæ–°çš„æž¶æž„æ¨¡å¼ï¼‰
- æ— å†…ç½®æ—¶é—´æ—…è¡Œ/å¿«ç…§

### 10.2 amis æ¨¡æ¿

**ä¼˜åŠ¿**:
- åŠŸèƒ½å®Œæ•´ï¼Œç”Ÿæ€æˆç†Ÿ
- MobX MST æä¾›ä¸°å¯Œçš„çŠ¶æ€ç®¡ç†èƒ½åŠ›
- å¤§é‡å†…ç½®ç»„ä»¶å’Œæ¸²æŸ“å™¨
- æ´»è·ƒçš„ç¤¾åŒºå’Œæ–‡æ¡£
- å¯è§†åŒ–ç¼–è¾‘å™¨æ”¯æŒ

**åŠ£åŠ¿**:
- åŒ…ä½“ç§¯è¾ƒå¤§
- è£…é¥°å™¨è¯­æ³•ï¼ŒçŽ°ä»£åŒ–ä¸è¶³
- è¿è¡Œæ—¶è§£æžï¼Œæ€§èƒ½æœ‰ä¼˜åŒ–ç©ºé—´
- ä¸Ž React å¼ºç»‘å®š

---

## åä¸€ã€æ”¹è¿›å»ºè®®

### 11.1 å½“å‰é¡¹ç›®æ”¹è¿›æ–¹å‘

1. **è¡¥å……ç¼ºå¤±æ¨¡å—**
   - å®žçŽ° `amis-editor-core` å¯¹åº”çš„ç¼–è¾‘å™¨æ”¯æŒ
   - è€ƒè™‘æ˜¯å¦éœ€è¦ `office-viewer`

2. **å¢žå¼ºçŠ¶æ€ç®¡ç†**
   - æ·»åŠ å¿«ç…§/æ—¶é—´æ—…è¡Œæ”¯æŒ
   - å®žçŽ°çŠ¶æ€æŒä¹…åŒ–

3. **å®Œå–„æµ‹è¯•è¦†ç›–**
   - è¡¥å……å•å…ƒæµ‹è¯•
   - æ·»åŠ  E2E æµ‹è¯•

### 11.2 è¿ç§»ç­–ç•¥

å¦‚æžœéœ€è¦ä»Ž amis è¿ç§»åˆ°å½“å‰é¡¹ç›®ï¼š

1. **Schema å…¼å®¹å±‚**: å®žçŽ° Schema è½¬æ¢å™¨
2. **æ¸²æŸ“å™¨æ˜ å°„**: å»ºç«‹ç»„ä»¶å¯¹åº”å…³ç³»
3. **æ¸è¿›å¼è¿ç§»**: æŒ‰æ¨¡å—é€æ­¥è¿ç§»

---

## é™„å½•: æ–‡ä»¶ä½ç½®ç´¢å¼•

### å½“å‰é¡¹ç›®æ ¸å¿ƒæ–‡ä»¶

| æ–‡ä»¶ | ä½ç½® | æè¿° |
|------|------|------|
| FormStore | `packages/flux-runtime/src/form-store.ts` | è¡¨å•çŠ¶æ€å­˜å‚¨ |
| FormRuntime | `packages/flux-runtime/src/form-runtime.ts` | è¡¨å•è¿è¡Œæ—¶ |
| ScopeRef | `packages/flux-runtime/src/scope.ts` | ä½œç”¨åŸŸå¼•ç”¨ |
| React å±‚ | `packages/flux-react/src/index.tsx` | React æ¸²æŸ“å±‚ |
| Registry | `packages/flux-runtime/src/registry.ts` | æ¸²æŸ“å™¨æ³¨å†Œè¡¨ |

### amis æ¨¡æ¿æ ¸å¿ƒæ–‡ä»¶

| æ–‡ä»¶ | ä½ç½® | æè¿° |
|------|------|------|
| FormStore | `packages/amis-core/src/store/form.ts` | è¡¨å• Store |
| SchemaRenderer | `packages/amis-core/src/SchemaRenderer.tsx` | Schema æ¸²æŸ“å™¨ |
| Scoped | `packages/amis-core/src/Scoped.tsx` | ä½œç”¨åŸŸç³»ç»Ÿ |
| Actions | `packages/amis-core/src/actions/` | åŠ¨ä½œç³»ç»Ÿ |
| Factory | `packages/amis-core/src/factory.tsx` | æ¸²æŸ“å™¨å·¥åŽ‚ |

