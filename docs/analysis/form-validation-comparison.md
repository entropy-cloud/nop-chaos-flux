# 表单验证框架深度分析报告

> 分析日期: 2026-03-17
> 对比项目: react-hook-form, yup, nop-amis

---

## 一、项目概览与目录结构

### 1. React Hook Form 模板项目

```
c:/can/nop/templates/react-hook-form/
├── src/
│   ├── logic/               # 核心逻辑层
│   │   ├── createFormControl.ts   # 表单控制器（1743行）
│   │   ├── validateField.ts       # 字段验证
│   │   ├── shouldRenderFormState.ts
│   │   ├── schemaErrorLookup.ts
│   │   └── ...
│   ├── types/               # TypeScript 类型定义
│   ├── utils/               # 工具函数
│   └── __typetest__/        # 类型测试
```

### 2. Yup 验证模板项目

```
c:/can/nop/templates/yup/
├── src/
│   ├── schema.ts            # 基础 Schema 类（1062行）
│   ├── object.ts            # 对象 Schema（561行）
│   ├── array.ts             # 数组 Schema
│   ├── mixed.ts             # 混合类型 Schema
│   ├── Condition.ts         # 条件验证
│   ├── Reference.ts         # 引用系统
│   ├── ValidationError.ts   # 错误处理
│   ├── standardSchema.ts    # 标准化输出
│   └── util/
│       ├── createValidation.ts  # 验证执行上下文
│       └── ...
```

### 3. NOP-AMIS 项目

```
c:/can/nop/nop-amis/
├── packages/
│   ├── amis-schema/         # 类型定义与编译模型（845行）
│   ├── amis-runtime/        # 运行时核心（2783行）
│   ├── amis-react/          # React 集成层（550行）
│   └── amis-renderers-basic/
├── docs/
│   ├── architecture/        # 架构设计文档
│   ├── plans/               # 执行计划
│   └── references/          # 参考笔记
```

---

## 二、React Hook Form 核心实现分析

### 2.1 表单状态管理机制

```typescript
// createFormControl.ts 核心状态结构
let _formState: FormState<TFieldValues> = {
  submitCount: 0,
  isDirty: false,
  isReady: false,
  isLoading: isFunction(_options.defaultValues),
  isValidating: false,
  isSubmitted: false,
  isSubmitting: false,
  isSubmitSuccessful: false,
  isValid: false,
  touchedFields: {},
  dirtyFields: {},
  validatingFields: {},
  errors: _options.errors || {},
  disabled: _options.disabled || false,
};

let _fields: FieldRefs = {};
let _defaultValues = cloneObject(_options.defaultValues || _options.values) || {};
let _formValues = _options.shouldUnregister ? {} : cloneObject(_defaultValues);

let _names: Names = {
  mount: new Set(),
  disabled: new Set(),
  unMount: new Set(),
  array: new Set(),
  watch: new Set(),
};
```

**关键设计特点：**

1. **分离的表单控制器**：`createFormControl` 返回独立于 React hooks 的控制对象
2. **Subject 模式的订阅系统**：通过 `_subjects` 实现细粒度状态订阅
3. **延迟错误显示**：支持 `delayError` 配置，优化用户体验

### 2.2 验证策略和性能优化

```typescript
// 验证触发时机控制
const validationModeBeforeSubmit = getValidationModes(_options.mode);
const validationModeAfterSubmit = getValidationModes(_options.reValidateMode);

const shouldSkipValidation =
  (!hasValidation(field._f) && !props.validate && !_options.resolver) ||
  skipValidation(
    isBlurEvent,
    get(_formState.touchedFields, name),
    _formState.isSubmitted,
    validationModeAfterSubmit,
    validationModeBeforeSubmit,
  );
```

**性能优化策略：**

1. **智能跳过验证**：根据验证模式智能判断是否需要执行验证
2. **验证状态追踪**：`validatingFields` 字段级追踪异步验证状态
3. **防抖机制**：内置 `debounce` 函数处理高频输入
4. **条件性错误显示**：只在必要时更新错误状态

### 2.3 Schema 驱动的验证

```typescript
const _runSchema = async (name?: InternalFieldName[]) => {
  _updateIsValidating(name, true);
  return await _options.resolver!(
    _formValues as TFieldValues,
    _options.context,
    getResolverOptions(
      name || _names.mount,
      _fields,
      _options.criteriaMode,
      _options.shouldUseNativeValidation,
    ),
  );
};
```

### 2.4 数组操作语义

RHF 提供了一流的数组操作 API（从 `useFieldArray` 导出的方法）：
- `append`, `prepend`, `insert`, `remove`, `swap`, `move`, `update`
- 维护稳定的 `key` 标识符用于 React 渲染优化

---

## 三、Yup 核心实现分析

### 3.1 Schema 定义方式

```typescript
// schema.ts - 基础 Schema 抽象类
export default abstract class Schema<TType, TContext, TDefault, TFlags> {
  readonly type: string;
  tests: Test[];
  transforms: TransformFunction[];
  private conditions: Condition[] = [];
  private internalTests: Record<string, Test | null> = {};
  protected _whitelist = new ReferenceSet();
  protected _blacklist = new ReferenceSet();
  protected exclusiveTests: Record<string, boolean> = Object.create(null);
  spec: SchemaSpec<any>;
}
```

**关键特性：**

1. **不可变设计**：所有方法返回新的 Schema 实例（通过 `clone()`）
2. **Transform 链**：支持在验证前进行值转换
3. **条件系统**：`when()` 方法支持动态 Schema 分支
4. **引用系统**：`Ref` 类支持跨字段引用

### 3.2 验证执行上下文

```typescript
// createValidation.ts - 统一的测试上下文
export type TestContext<TContext = {}> = {
  path: string;
  options: ValidateOptions<TContext>;
  originalValue: any;
  parent: any;
  from?: Array<{ schema: ISchema; value: any }>;
  schema: any;
  resolve: <T>(value: T | Reference<T>) => T;
  createError: (params?: CreateErrorOptions) => ValidationError;
};
```

**设计亮点：**

1. **丰富的上下文信息**：提供 `path`, `parent`, `originalValue`, `schema` 等
2. **统一的错误创建**：`createError()` 方法确保错误格式一致
3. **引用解析**：`resolve()` 方法支持动态解析引用值

### 3.3 对象验证的递归组合

```typescript
// object.ts - 递归验证子字段
protected _validate(_value, options, panic, next) {
  // 首先验证对象自身规则
  super._validate(_value, options, panic, (objectErrors, value) => {
    if (!recursive || !isObject(value)) {
      next(objectErrors, value);
      return;
    }

    // 然后递归验证所有子字段
    let tests = [] as Test[];
    for (let key of this._nodes) {
      tests.push(
        field.asNestedTest({
          options,
          key,
          parent: value,
          parentPath: options.path,
          originalParent: originalValue,
        }),
      );
    }

    this.runTests({ tests, value, originalValue, options }, panic, (fieldErrors) => {
      next(fieldErrors.sort(this._sortErrors).concat(objectErrors), value);
    });
  });
}
```

### 3.4 标准化输出

```typescript
// standardSchema.ts - 标准化验证结果
get ['~standard']() {
  return {
    version: 1,
    vendor: 'yup',
    async validate(value: unknown): Promise<StandardResult> {
      try {
        const result = await schema.validate(value, { abortEarly: false });
        return { value: result };
      } catch (err) {
        if (err instanceof ValidationError) {
          return { issues: issuesFromValidationError(err) };
        }
        throw err;
      }
    },
  };
}
```

---

## 四、NOP-AMIS 项目分析

### 4.1 架构设计

**三层架构设计：**

```
┌─────────────────────────────────────────────────────────────┐
│                    amis-react (React 层)                     │
│  - Context Providers                                         │
│  - Hooks (useCurrentForm, useCurrentFormFieldState, etc.)   │
│  - SchemaRenderer                                            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   amis-runtime (运行时层)                    │
│  - FormRuntime (表单运行时)                                  │
│  - PageRuntime (页面运行时)                                  │
│  - RendererRuntime (渲染器运行时)                            │
│  - 验证执行引擎                                              │
│  - 状态管理 (Zustand)                                        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   amis-schema (类型层)                       │
│  - 类型定义 (FormSchema, ValidationRule)                     │
│  - 编译模型 (CompiledFormValidationModel)                    │
│  - 验证规则模型 (CompiledValidationNode)                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 编译时验证模型

```typescript
// amis-schema/src/index.ts
export interface CompiledFormValidationModel {
  fields: Record<string, CompiledFormValidationField>;
  order: string[];
  behavior: CompiledValidationBehavior;
  dependents: Record<string, string[]>;
  nodes?: Record<string, CompiledValidationNode>;
  validationOrder?: string[];
  rootPath?: string;
}

export interface CompiledValidationNode {
  path: string;
  kind: CompiledValidationNodeKind;
  controlType?: string;
  label?: string;
  rules: CompiledValidationRule[];
  children: string[];
  parent?: string;
}
```

### 4.3 运行时验证实现

```typescript
// amis-runtime/src/index.ts - FormRuntime 核心方法
const thisForm: FormRuntime = {
  id: formId,
  store,
  scope,
  validation: inputValue.validation,
  
  async validateField(path) {
    // 1. 查找编译时字段定义
    const field = inputValue.validation?.fields[path];
    
    // 2. 检查运行时注册的字段
    const runtimeRegistration = findRuntimeRegistration(path);
    
    // 3. 执行同步验证规则
    for (const compiledRule of field.rules) {
      const syncError = validateRule(compiledRule, value, field, scope);
      if (syncError) errors.push(syncError);
    }
    
    // 4. 执行异步验证（带防抖）
    if (rule.kind === 'async') {
      const shouldRun = await waitForValidationDebounce(path, rule.debounce, runId);
      if (shouldRun) {
        const asyncError = await executeValidationRule(compiledRule, rule, field, scope);
        if (asyncError) errors.push(asyncError);
      }
    }
  },
  
  // 一流的数组操作 API
  appendValue(path, value) { ... },
  prependValue(path, value) { ... },
  insertValue(path, index, value) { ... },
  removeValue(path, index) { ... },
  moveValue(path, from, to) { ... },
  swapValue(path, a, b) { ... },
};
```

### 4.4 聚合错误所有权模型

```typescript
// amis-schema/src/index.ts
export interface ValidationError {
  path: string;
  message: string;
  rule: ValidationRule['kind'];
  ruleId?: string;
  ownerPath?: string;                    // 错误所有者路径
  sourceKind?: 'field' | 'object' | 'array' | 'form' | 'runtime-registration';
  relatedPaths?: string[];               // 相关字段路径
}

// amis-runtime/src/index.ts - 确定错误来源类型
function resolveValidationErrorSourceKind(field, rule): ValidationError['sourceKind'] {
  switch (rule.kind) {
    case 'minItems':
    case 'maxItems':
    case 'atLeastOneFilled':
    case 'uniqueBy':
      return 'array';
    case 'atLeastOneOf':
      return 'object';
    case 'allOrNone':
      // 根据控件类型判断
      return field.controlType?.includes('array') ? 'array' : 'object';
    default:
      return 'field';
  }
}
```

### 4.5 React 层订阅优化

```typescript
// amis-react/src/index.tsx - 细粒度状态订阅
export function useCurrentFormFieldState(path: string, query?: FormErrorQuery): FormFieldStateSnapshot {
  return useCurrentFormState(
    (state) => selectCurrentFormFieldState(state, path, query),
    (left, right) =>
      left.error === right.error &&
      left.validating === right.validating &&
      left.touched === right.touched &&
      left.dirty === right.dirty &&
      left.visited === right.visited &&
      left.submitting === right.submitting
  );
}

// 聚合错误专用 hook
export function useAggregateError(path: string): ValidationError | undefined {
  return useCurrentFormError({ 
    path, 
    ownerPath: path, 
    sourceKinds: ['array', 'object', 'form', 'runtime-registration'] 
  });
}
```

---

## 五、对比分析

### 5.1 值得参考的实现模式

| 模式 | React Hook Form | Yup | NOP-AMIS 采用情况 |
|------|-----------------|-----|------------------|
| **表单控制器分离** | ✅ `createFormControl` | N/A | ✅ `FormRuntime` |
| **细粒度订阅** | ✅ Subject + Proxy | N/A | ✅ Zustand selector |
| **数组操作语义** | ✅ `useFieldArray` | N/A | ✅ 已实现 |
| **规范化验证上下文** | N/A | ✅ `TestContext` | ⚠️ 部分 |
| **Transform/Cast 分离** | N/A | ✅ | ⚠️ 计划中 |
| **条件 Schema** | N/A | ✅ `when()` | ⚠️ 部分 |
| **标准化错误输出** | N/A | ✅ `~standard` | ⚠️ 计划中 |
| **Schema 描述/内省** | N/A | ✅ `describe()` | ⚠️ 计划中 |

### 5.2 AMIS 当前实现的优势

1. **编译时模型**：验证规则在编译时提取，运行时无需重新解析
2. **框架无关的运行时**：`amis-runtime` 不依赖 React
3. **完整的数组状态重映射**：`removeValue`, `moveValue`, `swapValue` 时自动重映射 errors/touched/dirty/visited 状态
4. **聚合错误所有权**：明确的 `sourceKind` 和 `ownerPath` 区分字段级和聚合级错误
5. **验证时机配置**：支持 `validateOn` 和 `showErrorOn` 独立配置

### 5.3 AMIS 当前实现的不足

1. **缺少规范化阶段**：没有独立的值规范化/转换阶段
2. **自定义验证器上下文不够丰富**：缺少 Yup 风格的完整执行上下文
3. **缺少内省/调试 API**：没有 `describeValidation()` 类似功能
4. **节点驱动遍历不完整**：子树验证仍基于路径前缀匹配而非节点树遍历
5. **缺少标准化输出格式**：没有类似 `~standard` 的互操作接口

---

## 六、性能优化策略对比

### 6.1 React Hook Form 策略

```typescript
// 延迟错误显示
if (_options.delayError && error) {
  delayErrorCallback = debounce(() => updateErrors(name, error));
  delayErrorCallback(_options.delayError);
}

// 验证状态追踪
if (isPromiseFunction && _proxyFormState.validatingFields) {
  _updateIsValidating([_f.name], true);
}
// ... 执行验证 ...
if (isPromiseFunction && _proxyFormState.validatingFields) {
  _updateIsValidating([_f.name]);
}
```

### 6.2 AMIS 策略

```typescript
// 异步验证防抖
function waitForValidationDebounce(path: string, debounce: number | undefined, runId: number): Promise<boolean> {
  if (!debounce || debounce <= 0) {
    return Promise.resolve(validationRuns.get(path) === runId);
  }

  cancelValidationDebounce(path);

  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      pendingValidationDebounces.delete(path);
      resolve(validationRuns.get(path) === runId);
    }, debounce);

    pendingValidationDebounces.set(path, { timer, resolve });
  });
}

// 验证运行追踪（取消过期验证）
validationRuns.set(path, runId);
// ... 执行验证 ...
if (validationRuns.get(path) !== runId) {
  return { ok: true, errors: [] }; // 被后续验证取消
}
```

---

## 七、建议改进方向

### 7.1 短期（基于现有架构）

1. **增强验证执行上下文**
```typescript
interface ValidationExecutionContext {
  path: string;
  value: unknown;
  parent?: unknown;
  values: Record<string, unknown>;
  scope: ScopeRef;
  createError(input?: { message?: string; rule?: string; params?: Record<string, unknown> }): ValidationError;
  resolve(path: string): unknown;
}
```

2. **添加规范化阶段**
```typescript
interface CompiledNormalizationRule {
  path: string;
  kind: 'trim' | 'compact' | 'coerce' | 'custom';
  args?: Record<string, unknown>;
}

// 在验证前执行
function normalizeBeforeValidate(path: string, value: unknown): unknown {
  // 应用规范化规则
}
```

### 7.2 中期

1. **节点驱动子树遍历**
```typescript
async function validateSubtree(path: string): Promise<FormValidationResult> {
  const node = this.validation?.nodes?.[path];
  if (!node) return { ok: true, errors: [], fieldErrors: {} };

  // 1. 验证节点自身规则
  const nodeErrors = await validateNodeRules(node);
  
  // 2. 递归验证子节点
  for (const childPath of node.children) {
    const childResult = await validateSubtree(childPath);
    // 合并结果
  }
}
```

2. **添加调试/内省 API**
```typescript
function describeValidation(path?: string): CompiledValidationDescription {
  return {
    path,
    kind: node.kind,
    controlType: node.controlType,
    label: node.label,
    rules: node.rules.map(describeRule),
    children: node.children,
    dependencies: collectDependencies(node)
  };
}
```

### 7.3 长期

1. **标准化输出接口**
```typescript
function toStandardValidationIssues(result: FormValidationResult): StandardIssue[] {
  return result.errors.map(error => ({
    path: parsePath(error.path),
    message: error.message,
    code: error.rule
  }));
}
```

2. **自定义验证器注册表**
```typescript
interface CustomValidatorRegistry {
  register(name: string, validator: CustomValidatorFunction): void;
  get(name: string): CustomValidatorFunction | undefined;
}

type CustomValidatorFunction = (ctx: ValidationExecutionContext) => boolean | string | ValidationError | Promise<boolean | string | ValidationError>;
```

---

## 八、总结

### 8.1 核心发现

1. **AMIS 的编译时模型是正确的架构选择**：比 RHF 的 JSX 注册模型更适合低代码场景
2. **Yup 的规范化执行上下文值得借鉴**：统一的自定义验证器接口能提高扩展性
3. **RHF 的细粒度订阅模式是性能关键**：AMIS 已经通过 Zustand selector 实现了类似效果
4. **数组操作语义是复杂表单的必需品**：AMIS 已实现，但可能需要更稳定的项标识符

### 8.2 架构决策验证

根据文档和源码分析，AMIS 项目的以下决策是正确的：

1. ✅ **不硬连线 RHF/Yup**：保持框架独立性
2. ✅ **编译时提取验证规则**：优于运行时解析
3. ✅ **运行时驱动验证执行**：保持 React 层薄化
4. ✅ **显式的聚合错误所有权**：比隐式推断更可维护
5. ✅ **独立的 validateOn/showErrorOn 配置**：比 RHF 的单一模式更灵活

### 8.3 实现模式对比总表

| 来源 | 参考价值 | AMIS 状态 | 优先级 |
|------|---------|----------|-------|
| RHF - `createFormControl` | ✅ 高 | ✅ 已采用 | - |
| RHF - Subject 订阅模式 | ✅ 高 | ✅ 已采用 (Zustand) | - |
| RHF - 数组操作语义 | ✅ 高 | ✅ 已采用 | - |
| RHF - 延迟错误显示 | ⚠️ 中 | ✅ 已采用 | - |
| Yup - `TestContext` | ✅ 高 | ⚠️ 部分 | 高 |
| Yup - Transform 链 | ✅ 高 | ❌ 未实现 | 高 |
| Yup - `when()` 条件 Schema | ⚠️ 中 | ⚠️ 部分 | 中 |
| Yup - `~standard` 接口 | ⚠️ 中 | ❌ 未实现 | 中 |
| Yup - `describe()` 内省 | ⚠️ 中 | ❌ 未实现 | 低 |
