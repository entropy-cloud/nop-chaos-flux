# Flux Form Validation 设计方案

> 类型: 设计分析文档
> 状态: 可执行方案
> 日期: 2026-04-11
> 取代: `form-validation-expression-rules-design.md`（旧版，已废弃）
> 关联: `docs/architecture/form-validation.md`, `docs/analysis/form-validation-owner-redesign-draft.md`

---

## 1. 问题的真实根源

在讨论如何设计之前，必须先澄清两个经常被混淆的问题：

### 1.1 Field 状态模型与 Validation 模型是两件事

这是目前所有文档（包括旧版分析和 owner-redesign-draft）都没有明确区分的问题。

**FormFieldRegistry（字段状态）** 回答：这个字段当前是否存在？是否可见？是否被用户触碰过？

```ts
interface FieldRegistration {
  path: string;
  visible: boolean;       // 来自 schema visible/hidden 表达式的求值结果
  disabled: boolean;
  touched: boolean;
  dirty: boolean;
  visited: boolean;
}
```

**ValidationModel（规则定义）** 回答：对于这个路径，有哪些规则需要执行？

```ts
interface CompiledFieldValidation {
  path: string;
  ruleTemplates: CompiledRuleTemplate[];   // 编译期产物
  behavior: ValidationBehavior;
  hiddenFieldPolicy: HiddenFieldPolicy;
}
```

**ValidationState（验证结果）** 回答：这个路径当前的验证状态是什么？

```ts
interface FieldValidationState {
  path: string;
  errors: ValidationError[];
  validating: boolean;
}
```

三者独立维护，在 FormRuntime 中协作。**AMIS 的 `FormItemStore` 将这三者混在一起**，导致字段的 mount/unmount 生命周期与验证逻辑死死耦合，这正是 AMIS 方案的根本局限。

### 1.2 "哪些字段当前参与验证"的两个来源

`owner-redesign-draft.md` 提出了 Active Validation Instance Graph 的概念，并设计了 `refreshActiveInstanceGraph()` 这个入口，让 owner 自行计算当前激活的字段集合。这在 phase 1 引入会带来不必要的复杂度：需要在 owner 内部追踪 if-branch 状态、variant 激活状态、array item 数量。

**对于 leaf field renderer（input-text、select 等），当前实例的参与状态来自 FormFieldRegistry。**

每个 field renderer 在 mount 时向 registry 注册自己，unmount 时注销。这意味着：

- `if` 分支切换 → React 卸载失活分支的 renderer → 自动从 registry 消失
- array item 新增 → React 挂载新 item 的 renderer → 自动进入 registry
- array item 删除 → React 卸载该 item 的 renderer → 自动从 registry 消失
- `variant-field` 切换 → 旧 branch 卸载，新 branch 挂载 → registry 自动更新

React reconciler 已经在维护"当前挂载了什么"这个信息，对 leaf field 不需要 owner 再独立计算一次。

**但 registry 不是 validation 参与信息的唯一来源。** 以下节点没有对应 renderer，不会出现在 registry 中，但仍然需要参与 validation：

- `object`/`array` aggregate node（如 `contacts` 的 `uniqueBy` 规则）
- `variant-root` / `branch` 等结构节点
- repeated item template 的模板级边界

因此更准确的表述是：

- **compiled field tree** 定义"哪些 validation 结构可能存在"
- **FormFieldRegistry** 报告"当前哪些 leaf field instance 已 mount/participate"
- 两者协作，不是替代关系：`validateForm()` 以 compiled traversal order 为主序，再与 registry 交叉过滤 leaf 参与状态

这是对 AMIS 动态注册模式的正确借鉴：借鉴它让 React mount/unmount 驱动 leaf field 参与状态这个正确直觉，但**把字段状态注册和验证规则严格分开**，不重蹈 FormItemStore 大杂烩的覆辙，也不把 registry 升级为 aggregate/variant/template 结构的唯一来源。

---

## 2. 当前实现的实际缺口

通过对代码的直接审查（不是设计文档自述），当前实现的真实问题是：

### 缺口 A：规则参数是静态字面量

`rules.ts:collectSchemaValidationRules()` 只处理字面量：

```ts
if (typeof ruleSource.minLength === 'number') {
  rules.push({ kind: 'minLength', value: ruleSource.minLength });
}
```

无法处理 `"minLength": "${policy.minLen}"` 这类低代码常见写法。

`required` 同样只支持静态 boolean，无法表达 `"required": "${role === 'admin'}"` 。

### 缺口 B：`isFieldEffectivelyRequired()` 与验证器逻辑重复且不同步

`form-state.ts:isFieldEffectivelyRequired()` 独立实现了对 `required`/`requiredWhen`/`requiredUnless` 的判断，使用 `getIn(values, rule.path)` 直接读值。

这与 validator 执行时通过 `scope.get(rule.path)` 读值是两套逻辑。当规则变成表达式化之后，这两处会更加难以同步。

### 缺口 C：`notifyFieldHidden` 已实现但依赖手工调用

`form-runtime.ts:notifyFieldHidden()` 实现是完整的，但需要 renderer 主动调用。实际上，**hidden 状态的来源已经是 scope 表达式求值结果**（`visible`/`hidden` 字段），只是没有把这个信息统一路由到 registry。

### 缺口 D：`validateForm()` 遍历的是 compiled graph 全集

`form-runtime.ts:validateForm()` 调用 `getCompiledValidationTraversalOrder()` 遍历编译期所有节点。这意味着：

- `if` 分支中的字段无论当前是否激活都会被验证（依赖 `notifyFieldHidden` 来跳过，而不是从来源上排除）
- array item 的路径在 compiled graph 中不存在（因为是模板，不是具体 indexed path），只能走 `runtimeFieldRegistrations`

也就是说：当前 `validateForm()` 实际上已经在依赖 registry（`runtimeFieldRegistrations`）来处理动态字段，只是这个依赖不透明、不统一。

---

## 3. 推荐的分层架构

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 0: Rule Engine（纯函数层）                             │
│  输入: value + EffectiveRule[]                                │
│  输出: ValidationError[]                                      │
│  完全无状态，零副作用，独立可测试                              │
│  现有代码: validators.ts 中的 builtInValidators              │
└──────────────────────────────────────────────────────────────┘
         ↑ 调用
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: ValidationEngine（规则物化与执行）                  │
│  输入: CompiledRuleTemplate + ScopeRef                        │
│  职责: materialize template → EffectiveRule → 调用 Layer 0   │
│  持有: errors map, validating map, async run registry        │
│  不持有: 字段状态（touched/dirty 等），不持有值              │
└──────────────────────────────────────────────────────────────┘
         ↑ 查询"哪些字段存在"
┌──────────────────────────────────────────────────────────────┐
│  Layer 2: FormFieldRegistry（字段状态注册表）                 │
│  由 React renderer mount/unmount 驱动                         │
│  持有: path → { visible, disabled, touched, dirty, visited } │
│  "活跃字段集合" = 当前已注册的 paths                         │
└──────────────────────────────────────────────────────────────┘
         ↑ 编排
┌──────────────────────────────────────────────────────────────┐
│  Layer 3: FormRuntime（UX 编排层）                            │
│  持有: ValidationEngine + FormFieldRegistry + store          │
│  职责: trigger policy, showErrorOn, submit gate              │
│  API: validateField / validateSubtree / validateForm         │
└──────────────────────────────────────────────────────────────┘
```

### 当前实现的映射

| 当前代码 | 新分层归属 | 需要变化 |
|---------|-----------|---------|
| `validators.ts builtInValidators` | Layer 0 | 无 |
| `form-runtime-validation.ts validateCompiledField` | Layer 1 | 增加 materialize 步骤 |
| `form-runtime.ts hiddenFields: Set<string>` | Layer 2 的一部分 | 扩展为完整 registry |
| `form-runtime.ts runtimeFieldRegistrations` | Layer 2 + Layer 1 overlap | 分职责 |
| `form-runtime.ts FormRuntime` | Layer 3 | 无大结构变化 |

---

## 4. 表达式化规则模板（核心新增）

### 4.1 `CompiledRuleTemplate` 类型

现有 `CompiledValidationRule` 将被扩展（向下兼容，不替换）：

```ts
// 现有类型保持不变，作为静态规则的快速路径
interface CompiledValidationRule {
  id: string;
  rule: ValidationRule;           // 静态字面量
  dependencyPaths: string[];
  precompiled?: { regex?: RegExp };
}

// 新增：支持表达式化参数的规则模板
interface CompiledRuleTemplate {
  id: string;
  kind: ValidationRuleKind;

  // 规则开关：undefined = 始终激活；static true = 始终激活（优化路径）
  // static false = 编译期剪枝（不产出此 template）
  when?: CompiledRuntimeValue<boolean>;

  // 规则参数：每个参数可以是静态值或已编译的表达式
  args: RuleTemplateArgs;

  // 错误消息：可以是静态字符串或表达式
  message?: CompiledRuntimeValue<string> | string;

  // 所有依赖路径（静态 relational deps + 表达式中提取的 deps）
  dependencyPaths: string[];

  precompiled?: { regex?: RegExp };
}

// 各规则的参数类型
type RuleTemplateArgs =
  | { kind: 'required' }
  | { kind: 'minLength'; value: CompiledRuntimeValue<number> | number }
  | { kind: 'maxLength'; value: CompiledRuntimeValue<number> | number }
  | { kind: 'minItems';  value: CompiledRuntimeValue<number> | number }
  | { kind: 'maxItems';  value: CompiledRuntimeValue<number> | number }
  | { kind: 'pattern';   value: CompiledRuntimeValue<string> | string }
  | { kind: 'email' }
  | { kind: 'equalsField';    path: string }
  | { kind: 'notEqualsField'; path: string }
  | { kind: 'requiredWhen';   path: string; equals: CompiledRuntimeValue<unknown> | unknown }
  | { kind: 'requiredUnless'; path: string; equals: CompiledRuntimeValue<unknown> | unknown }
  // ... 其余 aggregate rules 同理
  ;
```

### 4.2 物化（Materialization）

验证执行前将 template 转换为本次执行的 effective rule：

```ts
interface EffectiveValidationRule {
  id: string;
  kind: ValidationRuleKind;
  args: Record<string, unknown>;   // 已对所有表达式求值
  message?: string;                // 已对消息表达式求值
}

function materializeRuleTemplate(
  template: CompiledRuleTemplate,
  scope: ScopeRef,
  env: RendererEnv
): EffectiveValidationRule | null {
  // 1. 求值 when（如果是表达式）
  if (template.when != null) {
    const active = isCompiledRuntimeValue(template.when)
      ? evaluateCompiledValue(template.when, scope, env)
      : template.when;
    if (!active) return null;   // 规则当前未激活，跳过
  }

  // 2. 求值 args 中的表达式参数
  const args: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(template.args)) {
    args[key] = isCompiledRuntimeValue(val)
      ? evaluateCompiledValue(val, scope, env)
      : val;
  }

  // 3. 求值 message
  const message = template.message == null
    ? undefined
    : isCompiledRuntimeValue(template.message)
      ? String(evaluateCompiledValue(template.message, scope, env))
      : template.message;

  return { id: template.id, kind: template.kind, args, message };
}
```

### 4.3 编译期处理（`collectSchemaValidationRules` 的变更）

```ts
// 现在（静态）
if (typeof ruleSource.minLength === 'number') {
  rules.push({ kind: 'minLength', value: ruleSource.minLength });
}

// 改为（支持表达式）
if (ruleSource.minLength != null) {
  const compiled = compiler.compileValue(ruleSource.minLength);
  // 静态 false → 编译期剪枝
  if (compiled.kind === 'static' && compiled.value === false) return;
  // 静态 true/number → 内联，无运行时 evaluate 开销
  if (compiled.kind === 'static') {
    templates.push({ kind: 'minLength', args: { value: compiled.value },
                     when: undefined, dependencyPaths: [], ... });
  } else {
    templates.push({ kind: 'minLength', args: { value: compiled },
                     when: undefined, dependencyPaths: extractDeps(compiled), ... });
  }
}

// required 特殊：值可以是 boolean 或条件表达式
if (ruleSource.required != null) {
  const compiled = compiler.compileValue(ruleSource.required);
  if (compiled.kind === 'static') {
    if (!compiled.value) return;                        // false → 剪枝
    templates.push({ kind: 'required', when: undefined, ... }); // true → 无条件
  } else {
    // "${role === 'admin'}" → when 字段持有该表达式
    templates.push({ kind: 'required', when: compiled,
                     dependencyPaths: extractDeps(compiled), ... });
  }
}
```

**关键优化**：纯静态规则（当前所有规则）完全走快速路径，`dependencyPaths: []`，`when: undefined`，执行时无表达式求值开销，与现在等价。只有真正含表达式的规则才走 materialize 路径。

### 4.4 依赖图扩展

依赖图需要合并三类来源：

```
全量 dependencyPaths =
  (1) 显式 relational 路径（equalsField / requiredWhen 等，现有逻辑）
+ (2) 规则 when/args/message 中表达式提取的变量名（新增）
+ (3) 聚合节点的 child→parent 自动关系（新增，编译器建立）
```

第三类的例子：`contacts.0.email` 变化 → `contacts` 的 `uniqueBy` 规则需要重验 → 依赖图中 `contacts.0.email` → `contacts`。这个关系由编译器在分析 array/object node 时自动建立，不需要 schema 作者声明。

---

## 5. FormFieldRegistry：统一字段状态管理

### 5.1 接口定义

```ts
interface FieldRegistration {
  path: string;
  visible: boolean;      // 当前 visible 表达式求值结果
  disabled: boolean;
  // UX 状态由 FormRuntime 管理，不在此处
}

interface FormFieldRegistry {
  // 字段 mount 时调用
  register(path: string, info: FieldRegistration): () => void;  // 返回 unregister

  // 查询当前已注册（即当前挂载）的字段路径
  getRegisteredPaths(): string[];

  // 查询某路径是否当前已注册
  isRegistered(path: string): boolean;

  // 查询某路径是否 visible（注册了 && visible === true）
  isVisible(path: string): boolean;
}
```

### 5.2 与现有代码的关系

当前 `form-runtime.ts` 有两个相关结构：

- `hiddenFields: Set<string>` — 记录当前 hidden 的路径，由 `notifyFieldHidden()` 维护
- `runtimeFieldRegistrations: Map<string, RuntimeFieldRegistration>` — 记录复杂控件的验证回调

`FormFieldRegistry` 统一这两个职责中的"字段存在性"部分：

```
FormFieldRegistry 新职责:
  register(path, { visible })  ←  原 notifyFieldHidden 反向等价
  isVisible(path)              ←  原 !hiddenFields.has(path) 等价

runtimeFieldRegistrations 保留职责（复杂控件验证回调）:
  validate?: () => ValidationError[]
  validateChild?: (path) => ValidationError[]
  childPaths?: string[]
```

### 5.3 Renderer 使用模式

```tsx
// 每个 field renderer 在 useEffect 中注册
function InputTextRenderer(props: RendererComponentProps<InputTextSchema>) {
  const form = useCurrentForm();
  const resolvedVisible = props.meta.visible;

  useEffect(() => {
    if (!form || !props.props.name) return;
    const unregister = form.registry.register(props.props.name, {
      path: props.props.name,
      visible: resolvedVisible !== false,
      disabled: props.meta.disabled === true,
    });
    return unregister;
  }, [props.props.name, resolvedVisible, props.meta.disabled]);

  // ...
}
```

**这与当前 `notifyFieldHidden` 的调用模式基本等价**，只是把"通知 hidden"改成了"注册 visible 状态"，语义更清晰，且不需要两个分开的调用（mount 注册 + unmount 清除）。

### 5.4 `validateForm()` 的简化

有了 registry，`validateForm()` 变成：

```ts
async validateForm() {
  // 1. 遍历顺序：compiled graph 的拓扑顺序 ∩ 当前已注册（可见）字段
  const compiledOrder = getCompiledValidationTraversalOrder(validation);
  const registered = new Set(registry.getRegisteredPaths());

  const errors: ValidationError[] = [];
  const fieldErrors: Record<string, ValidationError[]> = {};

  for (const path of compiledOrder) {
    if (!registered.has(path)) continue;   // 未挂载的字段跳过（if-branch 等）
    const result = await thisForm.validateField(path);
    if (!result.ok) { /* collect */ }
  }

  // 2. registry 中有但 compiled graph 中没有的路径（复杂控件动态注册）
  for (const path of registered) {
    if (compiledModel.nodes[path]) continue;   // 已在上面处理
    const registration = runtimeFieldRegistrations.get(path);
    if (!registration?.validate) continue;
    // ... 执行 registration.validate()
  }

  return { ok, errors, fieldErrors };
}
```

**对比现有实现**：现有 `validateForm()` 分两段遍历（compiled order + registrations），且需要复杂的错误合并逻辑（`preservedErrors` + `mergedErrors`）来避免 `setErrors` 覆盖 registration validate 的副作用。新方案因为遍历基于 registry（已知哪些字段当前存在），这个合并复杂度消失了。

---

## 6. `isFieldEffectivelyRequired` 的单一来源

当前 `form-state.ts` 的 `isFieldEffectivelyRequired()` 独立实现了 required 判断，直接读 compiled rule 的静态值。这在规则表达式化之后会与 validator 逻辑不同步。

**解决方案**：ValidationEngine 暴露 `materializeField()` 接口，`isFieldEffectivelyRequired` 改为从 materialize 结果读取。

```ts
// ValidationEngine 新增接口
interface ValidationEngine {
  materializeField(path: string, scope: ScopeRef, env: RendererEnv): {
    activeRules: EffectiveValidationRule[];
    effectiveRequired: boolean;
  };
}

// form-state.ts isFieldEffectivelyRequired 改为：
function isFieldEffectivelyRequired(
  engine: ValidationEngine,
  path: string,
  scope: ScopeRef,
  env: RendererEnv
): boolean {
  return engine.materializeField(path, scope, env).effectiveRequired;
}
```

这样 field chrome 的星号、validator 的 required 检查、`showError` 逻辑都读同一份数据，不会出现"validator 认为必填但星号不亮"的问题。

---

## 7. Draft Owner（诚实评估）

`owner-redesign-draft.md` 的 Draft Owner 设计在概念上是正确的，但在优先级上应该放低。

**为什么放低优先级**：

- Draft Owner 解决的是 "dialog 内编辑不污染外层错误" 这个问题
- 这个问题可以用更简单的方式暂时解决：dialog 内的 `form` renderer 天然创建独立 FormRuntime（现有行为），commit 后通知外层 revalidate 受影响路径
- 真正需要 "subtree draft owner 而非嵌套 form" 的场景是 `detail-field`（对象字段的 inline 编辑弹窗），这是一个具体但次要的特性

**phase 1 的实现策略：直接复用 FormRuntime，不新增独立 public owner API**：

```ts
// phase 1：draft owner 就是一个 FormRuntime，rootPath 指向被编辑的子树
// 不需要在 phase 1 里抽出独立的 ValidationOwner 接口
function createDraftOwner(parentForm: FormRuntime, rootPath: string): DraftOwner {
  const draftValue = getIn(parentForm.scope.value, rootPath);
  const draftRuntime = createManagedFormRuntime({
    initialValues: draftValue,
    validation: extractSubtreeValidation(parentForm.validation, rootPath),
    // ...
  });

  return {
    runtime: draftRuntime,
    commit() {
      const result = await draftRuntime.validateForm();
      if (!result.ok) return result;
      const committed = draftRuntime.scope.value;
      parentForm.setValue(rootPath, committed);
      // 通知 parent 重验 rootPath 相关的所有 dependents
      await parentForm.revalidateSubtree(rootPath);
      return result;
    },
    cancel() {
      // 直接丢弃 draftRuntime，不写回 parent
    }
  };
}
```

这个实现能用现有 FormRuntime 直接完成，不引入新抽象层。

**长期方向保留**：`detail-field` / `detail-view` / dialog draft editing 的语义，本质上是 owner boundary 问题。phase 1 的"复用 FormRuntime"是实现策略，不否定 owner 抽象本身的演进方向。phase 3 引入独立 draft owner 时，可以在此基础上提取公共接口，而不是推翻现有实现。

---

## 8. AMIS 动态注册的正确借鉴边界

AMIS 的动态注册有一个本质优势：**"当前哪些字段参与验证"由 React mount 自动维护，不需要额外逻辑**。

这个优势是真实的，应该借鉴。但 AMIS 走过了头：它让字段 mount 成为 **唯一** 的规则发现机制，导致：
1. 无法表达式化规则参数（规则在 mount 时已固化）
2. 无法在 React 外部测试验证逻辑
3. 跨字段依赖变化时没有自动重验机制（需要每个控件手工处理）

**正确的借鉴方式**是本文 Section 5 的 FormFieldRegistry 方案：

| | AMIS | 本方案 | 说明 |
|---|---|---|---|
| 活跃字段集合维护 | FormItemStore mount/unmount | FormFieldRegistry mount/unmount | 借鉴 |
| 规则定义 | mount 时传入 config | 编译期 CompiledRuleTemplate | 不借鉴 |
| 规则执行 | doValidate(values, value, rules) | materialize → Layer 0 | 纯化 |
| 表达式化规则 | 不支持 | CompiledRuntimeValue | 新增 |
| 跨字段依赖 | 无自动机制 | dependents 图自动重验 | 保留优势 |

---

## 9. 实施路径（分阶段）

### Phase 1: 表达式化规则（独立可交付，不破坏现有代码）

**目标**：让 `required`、`minLength`、`maxLength`、`pattern`、`message` 支持表达式字符串。

**变更范围**：

1. `flux-core/src/types/validation.ts`：新增 `CompiledRuleTemplate` 类型，`CompiledValidationRule` 保持不变
2. `flux-runtime/src/validation/rules.ts`：`collectSchemaValidationRules()` 新增重载，接受 `ExpressionCompiler`，对非纯字面量调用 `compiler.compileValue()`
3. `flux-runtime/src/form-runtime-validation.ts`：`validateCompiledField()` 在执行前先调用 `materializeRuleTemplate()`
4. `flux-core/src/validation-model.ts`：`buildCompiledValidationDependentMap()` 合并 `expressionDependencyPaths`
5. `flux-react/src/form-state.ts`：`isFieldEffectivelyRequired()` 改为调用统一 materialize 结果

**向下兼容**：所有现有静态规则走快速路径（`when: undefined`，静态 args），不调用 `evaluateCompiledValue()`，与现有行为完全等价。

**验收**：
- `required: "${role === 'admin'}"` — role 变化时 required 状态随之更新并触发重验
- `minLength: "${policy.min}"` — policy 变化时规则阈值自动更新
- 所有现有静态规则测试通过

### Phase 2: FormFieldRegistry（统一活跃字段管理）

**目标**：`validateForm()` 遍历基于 registry，消除 compiled order 与 dynamic registration 的双重遍历逻辑。

**变更范围**：

1. `flux-runtime/src/form-runtime.ts`：将 `hiddenFields: Set<string>` 扩展为 `FormFieldRegistry`
2. `notifyFieldHidden()` 改为 `registry.register(path, { visible })`（行为等价）
3. `validateForm()` 改为 Section 5.4 的简化版本
4. 各 field renderer 的 `useEffect` 从 `notifyFieldHidden` 切换到 `registry.register`

**这个阶段解决的核心问题**：`if`/`variant` 中的字段在当前版本可能被验证（即使 hidden），需要手工 `notifyFieldHidden` 来跳过。Phase 2 后，未挂载的字段天然不在 registry 中，`validateForm()` 不会遍历它们。

### Phase 3: Draft Owner（按需实现）

使用 Section 7 描述的方案：直接复用 `createManagedFormRuntime()`，phase 1 不新增独立 `ValidationOwner` public API。如果后续出现多种 owner 类型，再在此基础上提取公共接口。

---

## 10. 不做什么（同样重要）

**phase 1 不引入独立 `ValidationOwner` public API**：`FormRuntime` 在 phase 1 中承担 owner 的角色已经足够。引入新的 `ValidationOwner` 接口并让 `FormRuntime` 实现它，在第一版里只是增加间接层，没有实质收益。但设计上保留 owner 抽象的演进方向——如果未来出现多种 owner 类型（如独立 draft owner、nested form owner），那时再提取公共接口，而不是现在预防性地建出来。

**phase 1 不单独实现完整 Active Instance Graph**：`if`/`loop`/`array-field` 的 leaf field 参与状态由 React mount 驱动的 registry 隐式维护；aggregate/variant-root 等结构节点的参与状态来自 compiled field tree。phase 1 以两者协作代替独立 active instance graph 计算，phase 3 引入完整 owner 编排时再按需评估。

**不引入 `OwnerPathMapper`（local/absolute 双路径）**：draft owner 内部可以用 `rootPath` 做路径前缀计算，不需要显式 mapper 对象。

**不把 loop 和 array-field 的 template 展开做成编译期图**：array item 的 indexed 路径（`items.0.name`）是运行时才知道的，让 renderer mount 时向 registry 注册即可。编译期只保存 item template 的结构描述，不展开具体 indexed paths。

**不删除 `runtimeFieldRegistrations` 的 validate 回调**：复杂控件（如富文本、文件上传、自定义 UI）无法用 rule template 表达的验证逻辑，仍需黑盒 validate 回调。这是必要的 escape hatch，不是设计缺陷。

---

## 12. Field Tree 模型

这是在上一轮讨论中明确需要补充的内容。**当前设计文档（包括 owner-redesign-draft）和代码库里都没有一份清晰的 field tree 模型定义。**

### 12.1 为什么需要 Field Tree

如果只有 "flat path → rules" 映射，就很难稳定表达：

- `object-field` / `array-field` 的父子结构边界
- subtree validation 遍历时的拓扑顺序
- aggregate ancestor 自动传播（`contacts.0.email` 变化 → `contacts` aggregate 需重验）
- `if`/`variant-field` 的分支结构归属
- `loop`/`array-field` 的 repeated item template 边界
- 编译期组件注册钩子的挂接点（第 13 节）

因此，**对外查询仍然可以是 flat absolute path，但编译产物内部必须有一份 field tree 结构**。

### 12.2 三层模型的明确分工

这是本文 Section 1.1 结论的结构化展开：

```ts
// Layer A：编译期结构模型（来自 schema 编译，immutable 运行时）
interface CompiledFieldTreeNode {
  path: string;
  kind: 'field' | 'object' | 'array' | 'variant-root' | 'branch' | 'form';
  parent?: string;
  children: string[];                    // 直接子节点 paths
  ruleTemplates: CompiledRuleTemplate[]; // 本节点的规则模板
}

// Layer B：运行时实例状态（由 React mount/unmount 驱动）
interface FieldRegistrationState {
  path: string;
  mounted: boolean;   // 是否当前已挂载
  visible: boolean;   // 当前 visible 表达式求值结果
  disabled: boolean;
}

// Layer C：验证结果状态（由 ValidationEngine 维护）
interface FieldValidationState {
  path: string;
  errors: ValidationError[];
  validating: boolean;
}
```

三层都用 flat absolute path 作为 key，但语义上 Layer A 形成一棵树。

### 12.3 Field Tree 与 Flat Path 的关系

这不是回到嵌套 runtime graph。推荐实现：

- `nodes: Record<string, CompiledFieldTreeNode>` — flat map，O(1) 查询
- `parent` / `children` 字段保留树关系，按需遍历
- `validationOrder: string[]` — 已拓扑排序的遍历顺序，leaf-before-ancestor

```ts
// 编译产物结构
interface CompiledValidationModel {
  rootPath: string;
  nodes: Record<string, CompiledFieldTreeNode>;
  validationOrder: string[];              // leaf first, aggregate last
  dependents: Record<string, string[]>;   // path → 哪些路径依赖它
}
```

与 `owner-redesign-draft.md` 中的 `CompiledValidationPath` 相比，关键差异是增加了 `kind` 枚举中的 `variant-root` / `branch`，以及把 `ruleTemplates`（表达式化版本）直接内联在节点中。

### 12.4 当前实现的映射

| 当前代码 | 新模型归属 | 需要变化 |
|---------|-----------|---------|
| `CompiledValidationNode` in `validation-model.ts` | `CompiledFieldTreeNode` | 增加 `kind`（variant-root/branch），`ruleTemplates` 替代现有 rules |
| `hiddenFields: Set<string>` | `FieldRegistrationState.visible` | 扩展为完整 registry（Phase 2） |
| `runtimeFieldRegistrations` | 与 `FieldRegistrationState` 共存 | 保留 validate 回调，分离存在性职责 |
| `ValidationError[]` per path | `FieldValidationState` | 现有结构基本对应，无大变化 |

### 12.5 Variant-Root 与 Branch 节点的特殊语义

`variant-root` 和 `branch` 节点不直接持有 field value，但在 field tree 中必须存在，原因：

- subtree validation 遍历时需要知道"哪些 children 属于当前 active branch"
- 分支切换时需要知道"哪个 branch-root 下的子树需要清除 errors/validating"
- 编译期依赖图中 `if`/`variant` guard expression 的依赖需要绑定到 branch-root 节点

```ts
// variant-root 示例
{
  path: 'contactMethod',
  kind: 'variant-root',
  parent: undefined,
  children: ['contactMethod::email', 'contactMethod::phone'],
  ruleTemplates: []   // variant-root 本身通常无直接规则
}

// branch 示例
{
  path: 'contactMethod::email',
  kind: 'branch',
  parent: 'contactMethod',
  children: ['contactMethod.email', 'contactMethod.emailConfirm'],
  ruleTemplates: []
}
```

Branch path 使用 `::` 分隔符（非 value path），因为 branch 不对应 value tree 中的一个 key，只是结构分组。这个表示法仅存在于编译产物的 field tree 中，不暴露到 ValidationError 或 owner API。

---

## 13. Compiler-Integrated Registration Hooks

这是用户明确提出但所有文档都未落地的第二个关键点。

### 13.1 为什么需要编译期钩子

如果只有运行时 registration（mount 时注册），就存在以下问题：

- aggregate shape（`uniqueBy` 的 key 路径、`allOrNone` 的 field 列表）在 mount 前无法建立
- subtree validation 拓扑顺序依赖 mount 时机，无法稳定预测
- `if`/`variant` 的 guard expression 依赖无法提前进入依赖图
- `loop`/`array-field` 的 item template 结构只有 mount 后才能反推

Flux 已经有 compiler 和 renderer definition 体系，因此更自然的方向是：**让 renderer 声明编译期 collector hook，compiler 在遇到某个 `type` 时调用它，向 field tree / validation graph 注册结构和规则**。

### 13.2 推荐接口形状

```ts
// 每个 renderer definition 可以选择性地声明这个 contribution
interface ValidationCompileContribution<S extends BaseSchema = BaseSchema> {
  // 这个组件在 field tree 中的节点类型
  kind: 'field' | 'object' | 'array' | 'variant-root' | 'branch' | 'none';

  // 收集本节点的 tree node 信息（路径、结构角色）
  collectNode?(
    schema: S,
    ctx: ValidationCompileContext<S>
  ): CompiledFieldTreeNodeInput | undefined;

  // 收集本节点的子节点描述
  // 用于 object-field 显式声明子字段、array-field 声明 item template
  collectChildren?(
    schema: S,
    ctx: ValidationCompileContext<S>
  ): ValidationChildDescriptor[];

  // 收集本节点的 rule templates（支持表达式）
  collectRules?(
    schema: S,
    ctx: ValidationCompileContext<S>
  ): CompiledRuleTemplate[];

  // 收集本节点引入的额外依赖路径
  // 例如：variant guard expression 依赖，aggregate key-by 路径
  collectDependencies?(
    schema: S,
    ctx: ValidationCompileContext<S>
  ): string[];
}

// 编译上下文，提供 compiler 能力
interface ValidationCompileContext<S extends BaseSchema = BaseSchema> {
  schema: S;
  path: string;           // 当前节点的绝对路径
  parentPath?: string;
  compiler: ExpressionCompiler;
  compileValue<T>(raw: unknown): CompiledRuntimeValue<T>;
  extractDependencies(compiled: CompiledRuntimeValue<unknown>): string[];
}
```

### 13.3 Compiler 调用时序

```
schema compiler 遍历 schema tree
  ↓
遇到 type: "input-text"
  ↓
查找 rendererRegistry.getValidationContribution('input-text')
  ↓
调用 contribution.collectNode(schema, ctx)   → 生成 CompiledFieldTreeNode
调用 contribution.collectRules(schema, ctx)  → 生成 CompiledRuleTemplate[]
调用 contribution.collectDependencies(...)   → 补充 dependents
  ↓
挂入 CompiledValidationModel.nodes
```

对于 `array-field`：

```
遇到 type: "array-field"
  ↓
contribution.collectNode(schema, ctx)
  → kind: 'array'
  → path: 'contacts'
  → children 暂留空，由 collectChildren 填

contribution.collectChildren(schema, ctx)
  → 返回 item template descriptor（相对路径，不展开具体 indexed path）
  → 例如：{ templatePath: 'contacts[]', children: ['contacts[].email', ...] }

contribution.collectRules(schema, ctx)
  → 收集 minItems / maxItems / uniqueBy（支持表达式）
```

### 13.4 运行时 Hook 仍然保留

编译期 hook 并不取代运行时 registration：

| 职责 | 编译期 hook | 运行时 hook |
|------|------------|------------|
| 结构定义（parent/children/kind） | ✓ | 不适合（未 mount） |
| 静态规则模板 | ✓ | 不适合（未知路径） |
| 依赖图（guard/aggregate） | ✓ | 补充（动态覆盖） |
| indexed item 实例化 | 不适合（运行时才知道数量） | ✓ |
| visible/disabled 状态 | 不适合（表达式运行时求值） | ✓ |
| 黑盒 validate 回调 | 不适合 | ✓（escape hatch） |
| dynamic rule overlay | 不适合 | ✓ |

**两者协作**：编译期 hook 建立静态 field tree 和 rule templates；运行时 hook 用 `FormFieldRegistry.register()` 补充当前 mounted 状态和 indexed child paths。

### 13.5 与 Section 5（FormFieldRegistry）的关系

编译期 hook 负责"哪些路径**可能**存在"（CompiledFieldTreeNode），运行时 registry 负责"哪些路径**当前**存在"（FieldRegistrationState）。两者形成互补：

- validateForm 遍历：`compiledOrder ∩ registry.getRegisteredPaths()`（Section 5.4）
- 编译期钩子未注册的 path（如黑盒控件）：只通过 runtime registry 参与验证
- registry 中出现但编译期未知的 path（极端动态控件）：走 `runtimeFieldRegistrations.validate()` escape hatch

---

## 15. `validateField` 的 Closure 扩展语义

> 补充自 `owner-redesign-draft.md` §Local Validation Trigger Rules，ERD §5.4 仅定义了全量遍历，此处补充局部触发的扩展规则。

### 15.1 问题

`validateField(path)` 不能只验证 `path` 本身。以下场景要求自动扩展验证范围：

- `contacts.0.email` 变化 → `contacts` 的 `uniqueBy` aggregate rule 依赖该值，必须同步重验
- `startDate` 变化 → `endDate` 有表达式化规则 `min: "${startDate}"`，`endDate` 的 required/min 状态已失效
- `role` 变化 → `permissions` 有 `required: "${role === 'admin'}"` → 必须同步重验

如果只验证直接触发的 path，上述场景会产生错误显示滞后或不触发的问题。

### 15.2 Closure 计算规则

`FormRuntime.validateField(path, reason)` 在执行前必须先计算 **impacted closure**：

```ts
function computeImpactedClosure(
  changedPaths: string[],
  dependents: Record<string, string[]>,      // 来自 CompiledValidationModel
  aggregateAncestors: (path: string) => string[],  // 向上找 object/array aggregate node
  overlayDependents: (path: string) => string[]    // 来自 runtimeFieldRegistrations
): Set<string>
```

closure 包含：

1. **direct paths**：`changedPaths` 本身
2. **aggregate ancestors**：沿 field tree 向上，直到遇到 `form` root 或 owner boundary 为止的所有 `object` / `array` 类型 ancestor node
3. **expression dependents**：`dependents[path]` 中所有因表达式依赖此 path 的字段（递归展开一层，不无限递归）
4. **dynamic overlay dependents**：通过 `runtimeFieldRegistrations` 声明了依赖此 path 的复杂控件

计算完成后，closure 内所有 **当前已注册（`registry.isRegistered(path) === true`）** 的 path 才进入实际验证。未挂载的 path 不参与，即使在 closure 中。

### 15.3 `validateField` 伪代码

```ts
async function validateField(
  path: string,
  reason: ValidationReason = 'change'
): Promise<ValidationResult> {
  const closure = computeImpactedClosure(
    [path],
    compiledModel.dependents,
    (p) => getAggregateAncestors(p, compiledModel),
    (p) => getOverlayDependents(p, runtimeFieldRegistrations)
  );

  const activeClosure = [...closure].filter((p) => registry.isRegistered(p));
  const ordered = orderByValidationPriority(activeClosure, compiledModel.validationOrder);

  for (const targetPath of ordered) {
    const effectiveRules = materializeRulesForPath(targetPath, scope, env);
    const syncErrors = runSyncRules(targetPath, effectiveRules);
    publishSyncErrors(targetPath, syncErrors);
    startAsyncRules(targetPath, effectiveRules, reason);
  }

  return summarizeResult(path);
}
```

关键点：

- `validateField` 对外仍以 `path` 为参数，返回该 path 的结果
- 但内部扩展到 closure，保证 aggregate 和 expression dependent 不滞后
- `reason` 影响 async debounce 策略（`change` 可 debounce，`submit` 不可）

### 15.4 `validateSubtree` 与 closure 的关系

`validateSubtree(path)` 已经是"遍历 path 下所有 active descendants"，不需要额外 closure 扩展，但仍需要把 subtree 外的 aggregate ancestor 和 expression dependent 纳入。

推荐：`validateSubtree(path)` 在遍历完 subtree 后，对 `path` 本身再执行一次 closure 扩展，把 subtree 外的依赖方也纳入本轮验证。

---

## 16. Async Validation Run Ownership 模型

> 补充自 `owner-redesign-draft.md` §Async Validation Semantics，ERD §9 Phase 1 仅提到 debounce，此处补充 stale run 失效和 run ownership 的完整规则。

### 16.1 问题

异步验证（如远程唯一性校验）存在以下竞态问题：

- 用户快速输入触发多次 async run，旧 run 的结果不应覆盖新 run
- 字段被隐藏或 variant 切换后，in-flight run 的结果不应写回
- `submit` 触发时，正在 debounce 等待的 change run 应立即取消并重新以 `submit` reason 运行

### 16.2 Run 记录结构

`ValidationEngine` 内部为每个 in-flight async run 维护：

```ts
interface AsyncValidationRun {
  path: string;
  ruleId: string;
  reason: ValidationReason;
  runId: string;           // 每次启动生成新 UUID
  ownerEpoch: number;      // owner 结构变化时递增，用于批量失效
  abort(): void;           // 取消 in-flight 请求
}
```

### 16.3 Run 启动规则

启动新 async run 时：

1. 生成新 `runId`
2. 查找同 `path + ruleId` 的现有 run，若存在则调用 `abort()` 并从记录中移除
3. 注册新 run，设置该 path 的 `validating: true`
4. 等待异步结果

结果返回时，写回前必须验证：

```ts
if (
  currentRun.runId !== latestRunIdFor(path, ruleId) ||
  !registry.isRegistered(path) ||
  currentRun.ownerEpoch !== owner.currentEpoch
) {
  return;  // stale run，丢弃结果
}
```

只有三个条件全部满足，才将错误写回并设置 `validating: false`。

### 16.4 Submit 对 Debounce 的覆盖

`validateForm()` 在 `reason === 'submit'` 时：

1. 取消所有仍在 debounce 等待的 change/blur run
2. 对所有 active path 重新以 `reason: 'submit'` 启动 async run（不 debounce）
3. `await` 所有 submit-required async run 完成后才返回结果

这保证 submit 时看到的是最新输入触发的验证结果，而不是被 debounce 延迟的旧结果。

### 16.5 Path 失活时的 Run 失效

以下情况必须立即失效（abort + 丢弃结果）相关 path 的所有 in-flight async run：

| 事件 | 受影响范围 |
|------|----------|
| `registry.unregister(path)` | 该 path 的所有 run |
| `if` 分支切换（失活分支 renderer unmount） | 失活分支下所有 path 的 run |
| `variant-field` 切换 | 旧 branch 下所有 path 的 run |
| array row 删除 | 该 row indexed path 下所有 path 的 run |
| draft owner cancel/dispose | draft owner 内所有 path 的 run |

实现上，`owner.currentEpoch` 在发生 array remove / variant switch / owner dispose 等结构变化时递增，所有 pre-epoch run 在结果返回时因 epoch 不匹配而被丢弃，无需逐一 abort。

Phase 1 不做 run 的 path remap（如 array reorder 后把 `items.1` 的 run 重映射到 `items.0`），直接 abort 并在新 path 上重新触发验证。

---

## 17. 结构变化的副作用清理语义

> 补充自 `owner-redesign-draft.md` §variant-field 执行模型 和 §array-field 执行模型，ERD 对这类场景的状态清理描述不足。

### 17.1 问题

当字段结构发生变化时（variant 切换、array row 增删、`if` 分支切换），必须同步清理相关状态，否则会出现：

- 旧 variant branch 的错误信息残留在新 branch 的显示位置
- array row 删除后 indexed path 的 `validating: true` 残留
- `if` 分支切换后旧分支字段的错误影响 submit gate

### 17.2 Variant Switch 清理序列

当 `variant-field` 的激活 branch 切换时，`FormRuntime` 必须按以下顺序执行：

1. **失活旧 branch**：从 active path set 中移除旧 branch 下所有 path（通过 renderer unmount 驱动 registry unregister 完成）
2. **清理旧 branch 状态**：
   - 清除旧 branch 所有 path 的 `errors`
   - 清除旧 branch 所有 path 的 `validating` 状态
   - abort 旧 branch 所有 in-flight async run（§16.5）
   - 清除旧 branch 所有 path 的 materialization cache
3. **激活新 branch**：新 branch renderer mount → registry register（自动完成）
4. **触发新 branch 初始验证**：`validateSubtree(variantRoot, 'change')` 或至少验证新 branch 的 required/aggregate

默认策略：
- 旧 branch 的 **值** 可以保留（不强制 clear），但旧 branch 字段不参与 submit gate
- submit 时只验证当前 active branch

### 17.3 Array Row 删除/插入/重排的状态 Remap

Array row 删除后，indexed path 发生偏移（如删除 `items.0` 后，`items.1` 变为 `items.0`）。此时必须对以下状态执行 index remap：

| 状态 | Remap 方式 |
|------|-----------|
| `errors` per path | 按新 index 重新映射 key |
| `validating` per path | 按新 index 重新映射 key |
| `touched` / `dirty` / `visited` | 按新 index 重新映射 key |
| `materialization cache` | 失效受影响 index 及以后的所有 cache |
| in-flight async run | **不 remap**，直接 abort（§16.5） |

Phase 1 的 remap 策略：

- delete row `i`：将 `i+1..n-1` 的状态全部向前移一位，`n-1` 的状态清空
- insert row at `i`：将 `i..n-1` 的状态全部向后移一位，`i` 初始化为空状态
- reorder（swap i/j）：交换对应 index 的所有状态 key

Remap 完成后，执行：

```ts
applyChangesAndRevalidate({
  writes: { [arrayPath]: newArrayValue },
  changedPaths: [arrayPath],
  reason: 'system'
});
```

触发 array aggregate rule（`minItems` / `maxItems` / `uniqueBy`）重验。

### 17.4 `if` 分支切换

`if` 分支切换由 React reconciler 自动处理：失活分支的 renderer unmount → `registry.unregister` → 从活跃字段集合消失。

`FormRuntime` 需要监听 registry 的 unregister 事件，在 path unregister 时：

1. 清除该 path 的 `errors` / `validating`
2. abort 该 path 的 in-flight async run
3. 清除该 path 的 materialization cache
4. 若该 path 有 aggregate ancestor，将 ancestor 加入下次 closure 扩展（触发 aggregate 重验）

注意：`if` 分支的值 clear 策略（`clearValueWhenHidden`）属于 FormRuntime UX 层决策，不在本节讨论范围。

---

## 14. 文档关联

| 文档 | 关系 |
|------|------|
| `docs/architecture/form-validation.md` | 当前规范基线；Phase 1-2 完成后需更新 |
| `docs/analysis/form-validation-owner-redesign-draft.md` | 概念参考；Field Tree Model（§12）和 Compiler Hooks（§13）方向本文采纳；closure 扩展（§15）、async run ownership（§16）、结构变化清理（§17）从该文档吸收；ValidationOwner 抽象和 active instance graph 方向本文不采纳 |
| `docs/analysis/form-validation-comparison.md` | Yup/AMIS 对比摘要；本文的借鉴判断与之一致 |
| `packages/flux-formula/src/index.ts` | `ExpressionCompiler` — Phase 1 的 `compileValue()` 来源；Section 13 `ValidationCompileContext` 中引用 |
| `packages/flux-core/src/types/validation.ts` | `CompiledValidationRule` — Section 4 中扩展为 `CompiledRuleTemplate` |
| `packages/flux-core/src/validation-model.ts` | `CompiledValidationNode` — Section 12 中扩展为 `CompiledFieldTreeNode` |
| `packages/flux-runtime/src/validation/rules.ts` | Phase 1 主要改动点；Section 4.3 |
| `packages/flux-runtime/src/form-runtime.ts` | Phase 2 主要改动点；Section 5；Section 15–17 的 closure/async/remap 逻辑归属此文件 |
| `packages/flux-react/src/form-state.ts` | Phase 1 的 `isFieldEffectivelyRequired` 改动；Section 6 |
