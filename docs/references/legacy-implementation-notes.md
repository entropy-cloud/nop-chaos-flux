# nop-chaos-amis 实现笔记

本文档记录原型项目 `nop-chaos-amis` 中值得参考的设计模式和实现思路，供 nop-amis 开发参考。

## 1. FormStore 的 submit Handler 模式

### 原型实现

```ts
// src/stores/formStore.ts
async submit(handler: (values: TValues) => Promise<unknown> | unknown) {
  const currentValues = get().values;

  // 若提供了同步校验函数，先执行校验
  if (validate) {
    const errors = validate(currentValues);
    if (Object.keys(errors).length > 0) {
      set({ errors });
      return Promise.reject(errors);
    }
  }

  set({ submitting: true });
  try {
    const result = await handler(currentValues);
    set({ submitting: false });
    return result;
  } catch (error) {
    set({ submitting: false });
    throw error;
  }
}
```

### 设计优点

- `submit` 接收一个 `handler` 函数，由调用方决定具体的提交逻辑
- 表单状态管理（`submitting`、`errors`）与业务逻辑解耦
- 校验失败时直接 `reject`，调用方可通过 try/catch 捕获

### 应用建议

nop-amis 的 `FormRuntime.submit(api)` 可以考虑支持类似的 handler 模式，让调用方可以自定义提交行为：

```ts
// 当前设计
form.submit(api);

// 可扩展为
form.submit(api); // 或
form.submit(async (values) => customHandler(values));
```

---

## 2. 编译时提取验证规则

### 原型实现

```ts
// src/runtime/runtime.ts
interface FieldRuleConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  email?: boolean;
  async?: ApiObject;
}

function extractRules(formNode: NormalizedNode): Map<string, FieldRuleConfig> {
  const rules = new Map<string, FieldRuleConfig>();

  const walk = (node: NormalizedNode): void => {
    const props = node.props as GenericRecord;
    const name = typeof props.name === "string" ? props.name : undefined;
    const validate = props.validate;

    if (name && isPlainObject(validate)) {
      rules.set(name, validate as FieldRuleConfig);
    }

    for (const child of node.children) {
      walk(child);
    }
  };

  walk(formNode);
  return rules;
}
```

### 设计优点

- 在 schema 编译阶段遍历 form 节点，收集所有字段的验证规则
- 运行时直接使用 `Map` 查找，无需重复解析 schema
- 支持同步规则（required、pattern 等）和异步规则（async API）

### 应用建议

nop-amis 可以在 `CompiledSchemaNode` 中增加验证规则元数据：

```ts
interface CompiledFormNode extends CompiledSchemaNode {
  validationRules?: Map<string, SchemaFieldRule>;
}
```

在 `SchemaCompiler` 阶段提取规则，`FormRuntime` 直接使用。

---

## 3. 内联 Dialog 提取机制

### 原型实现

```ts
// src/runtime/compileSchema.ts
function normalizeActionObject(rawAction, params, event, fieldPath) {
  const { nodeId, path, actions, dialogs, walkNode } = params;
  const actionType = rawAction.action;

  if (actionType === "dialog") {
    const dialogField = rawAction.dialog;
    if (dialogField && typeof dialogField === "object" && !Array.isArray(dialogField)) {
      const dialogPath = `${path}.${fieldPath}.dialog`;
      const dialogId = makeDialogIdFromPath(dialogPath);
      const dialogNode = typeof rawDialog.type === "string"
        ? rawDialog
        : { ...rawDialog, type: "dialog" };
      
      dialogs[dialogId] = walkNode(dialogNode, dialogPath);
      delete config.dialog;
      config.dialogId = dialogId;
    }
  }

  // ... 其他处理
}
```

### 设计优点

- 将 action 中内联定义的 dialog 提取到统一的 `dialogs` 集合
- 用 `dialogId` 替代内联定义，便于统一管理和复用
- 支持延迟加载和按需渲染

### 应用建议

nop-amis 的 `CompiledSchemaNode` 可以增加 `dialogs` 字段：

```ts
interface CompiledPageNode extends CompiledSchemaNode {
  dialogs: Record<string, CompiledSchemaNode>;
}
```

`RendererRuntime` 通过 `dialogId` 查找并渲染对话框。

---

## 4. 简洁的路径修改工具

### 原型实现

```ts
// src/stores/pageStore.ts
function setByPath(target: any, path: string, value: any): void {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return;

  let cur = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (cur[key] == null || typeof cur[key] !== "object") {
      cur[key] = {};
    }
    cur = cur[key];
  }
  cur[segments[segments.length - 1]] = value;
}
```

### 与 nop-amis setIn 的对比

| 特性 | setByPath (原型) | setIn (nop-amis) |
|------|-----------------|------------------|
| 返回值 | 无（原地修改） | 返回新对象 |
| 不可变性 | 可变 | 不可变 |
| 性能 | 更高（无拷贝） | 较低（需要拷贝） |
| 适用场景 | Store 内部使用 | 需要不可变更新的场景 |

### 应用建议

- 对于 Zustand store 内部的 `updateData` 操作，可以考虑使用原地修改版本
- 对外暴露的 API 保持不可变语义

---

## 5. Action 链的 prevResult 注入

### 原型实现

```ts
// src/runtime/runtime.ts
async function runThen(
  runtime: RuntimeContext,
  parentAction: ActionDef,
  context: Scope,
  prevResult: unknown
): Promise<void> {
  const thenConfig = parentAction.config.then;
  if (!thenConfig) return;

  const list = Array.isArray(thenConfig) ? thenConfig : [thenConfig];

  let nextPrev = prevResult;
  for (const item of list) {
    if (!isPlainObject(item)) continue;

    // 将上一个 action 的结果注入到子作用域
    const childScope = createChildScope(context, {
      prevResult: nextPrev,
    });
    nextPrev = await executeActionConfig(runtime, item, parentAction.nodeId, parentAction.event, childScope);
  }
}
```

### 设计优点

- `prevResult` 自动注入到子 action 的作用域中
- 链式调用的结果可以被后续 action 访问
- 支持单个 action 或数组形式的 then 链

### 应用建议

nop-amis 的 `dispatch` 已经支持 `prevResult`，可以在 `ActionContext` 中保持：

```ts
interface ActionContext {
  // ...
  prevResult?: ActionResult;
}
```

在表达式求值时，`prevResult` 作为作用域变量可用。

---

## 6. 异步校验的请求取消

### 原型实现

```ts
// src/runtime/runtime.ts
async function runAsyncValidator(
  apiConfig: ApiObject,
  scope: Scope,
  runtime: RuntimeContext,
  cacheKey: string
): Promise<string | null> {
  // 取消之前的相同请求
  const previous = runtime.abortControllers.get(cacheKey);
  if (previous) {
    previous.abort();
  }

  const controller = new AbortController();
  runtime.abortControllers.set(cacheKey, controller);

  try {
    const result = await request(apiConfig, {
      scope,
      env: runtime.pageStore.getState().env,
      signal: controller.signal,
    });
    // ...
  } finally {
    // 只清除自己创建的 controller
    if (runtime.abortControllers.get(cacheKey) === controller) {
      runtime.abortControllers.delete(cacheKey);
    }
  }
}
```

### 设计优点

- 基于 `cacheKey` 的请求取消机制
- 适合字段级异步校验的防抖场景
- 只清除自己创建的 controller，避免误删

### 应用建议

nop-amis 的 `activeRequests` Map 已经实现了类似机制：

```ts
// packages/amis-runtime/src/index.ts
const activeRequests = new Map<string, AbortController>();

async function executeApiRequest(actionType, api, scope, form) {
  const requestKey = createRequestKey(actionType, api, scope, form);
  const previous = activeRequests.get(requestKey);
  if (previous) previous.abort();
  // ...
}
```

可以增加字段级校验的专用 `cacheKey` 生成逻辑。

---

## 总结：可直接采用 vs 需要适配

| 模式 | 可直接采用 | 需要适配 |
|------|-----------|---------|
| FormStore submit handler | ✓ | - |
| 编译时提取验证规则 | ✓ | 需要适配 CompiledSchemaNode 结构 |
| 内联 Dialog 提取 | ✓ | 已有类似实现 |
| setByPath 原地修改 | - | 仅适用于 store 内部 |
| prevResult 注入 | ✓ | 已有实现 |
| 异步校验请求取消 | ✓ | 已有类似实现 |

## 来源

- 原型项目路径：`c:/can/nop/nop-chaos-amis/`
- 主要参考文件：
  - `src/stores/formStore.ts`
  - `src/stores/pageStore.ts`
  - `src/runtime/runtime.ts`
  - `src/runtime/compileSchema.ts`
