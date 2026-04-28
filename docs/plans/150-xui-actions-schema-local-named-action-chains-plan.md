# 150 xui:actions — Schema-Local Named Action Chains Plan

> Plan Status: reviewed-approved
> Last Reviewed: 2026-04-28
> Source: `docs/architecture/action-scope-and-imports.md` (updated), `docs/analysis/2026-04-28-next-gen-lowcode-attractor-discovery-analysis.md`
> Related: `docs/architecture/action-algebra-formal-spec.md`, `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-compiler/src/action-compiler.ts`

## Purpose

实现 `xui:actions`：允许任何 schema 节点定义命名的 action chain，子节点通过词法查找继承父节点定义。解决 JSON schema 中多个按钮/事件复用同一 action chain 时必须内联重复的问题。

## Current Baseline

- action chain 只能内联写在每个交互入口（`onClick`、`onChange`、`submitAction` 等）
- 编译器通过 `compileActions()` 将 `ActionSchema` 编译为 `CompiledActionProgram`
- 运行时通过 resolution order 分发 action：built-in → component-targeted → ActionScope namespace lookup
- `xui:imports` 已经实现了类似的模式：schema 声明 → 编译期处理 → 运行时 ActionScope 注册
- `TemplateNode` 当前没有 `xui:actions` 相关字段
- 编译器中 `isNamespacedSchemaKey()` 已经将所有含 `:` 的 key（包括 `xui:*`）视为命名空间 key，在 `compileSingleNode()` 的字段循环中被跳过

## Goals

1. 任何 schema 节点可声明 `"xui:actions": { "name": ActionSchema, ... }`
2. 编译期收集并编译每个命名 action chain 为 `CompiledActionProgram`
3. 运行时在节点实例化时将编译后的 action 注册到 ActionScope
4. 子节点通过词法查找继承祖先节点的 `xui:actions` 定义
5. 编译期对命名冲突（与 built-in action 同名、名称含 `:`）产出诊断信息
6. 不引入新原语，不改变现有 action resolution 的 built-in 和 component-targeted 步骤

## Non-Goals

- 不实现 intent/goal/proof 等语义提升概念
- 不修改 built-in action 分发逻辑
- 不替换 `xui:imports` 机制
- 不改变 `ActionSchema` 的结构定义
- 不支持 `xui:actions` 的动态加载（与 `xui:imports` 不同，它是纯编译期静态定义）
- 不支持同一 `xui:actions` 块内互相引用（编译顺序无法保证，只支持跨层级引用在运行时解析）

## Scope

### In Scope

- `packages/flux-core/src/types/node-identity.ts` — `TemplateNode` 增加 `namedActionPlans` 字段
- `packages/flux-core/src/types/actions.ts` — 新增 `XuiActionDefinitions` 类型
- `packages/flux-compiler/src/schema-compiler.ts` — `compileSingleNode()` 中提取、编译 `xui:actions`
- `packages/flux-compiler/src/schema-compiler/shape-validation.ts` — `xui:actions` 诊断（类型校验、命名冲突）
- `packages/flux-compiler/src/schema-compiler/diagnostics.ts` — 新增 `xui:actions` 相关诊断码，注册 `xui` namespace validator
- `packages/flux-compiler/src/schema-compiler/symbol-helpers.ts` — 新增 `pushNamedActionSymbols()`
- `packages/flux-core` — `ActionScope` 接口增加合成 namespace provider 注册能力
- `packages/flux-action-core/src/` — resolution order 更新
- `packages/flux-react/src/` — NodeRenderer 中处理 `namedActionPlans` 的注册和清理
- 本计划文档及对应 log 条目

### Out Of Scope

- `xui:imports` 的修改
- `ActionSchema` 结构变更
- `action-algebra-formal-spec.md` 的大幅改写（resolution order 已在 `action-scope-and-imports.md` 中更新）
- 调试器/UI 层面的 `xui:actions` 可视化（后续计划）
- `fields.ts` 修改（`xui:actions` 已被 `isNamespacedSchemaKey` 跳过，无需额外处理）

## Design

### 1. Type Changes

#### `packages/flux-core/src/types/actions.ts`

```ts
export type XuiActionDefinitions = Record<string, ActionSchema>;
```

每个 value 必须是单个 `ActionSchema` 对象，不允许数组。如果需要多步链式调用，使用 `then` 字段。

#### `packages/flux-core/src/types/node-identity.ts`

在 `TemplateNode` 中增加：

```ts
namedActionPlans?: Readonly<Record<string, CompiledActionProgram>>;
```

`namedActionPlans` 存在意味着该节点声明了 `xui:actions`，运行时需要在 ActionScope 中注册这些命名 action。

### 2. Compiler Changes

#### 2.1 提取源：直接从 `schema` 读取

不从 `fieldInspection.extensions` 提取（依赖 `extensionPassthroughPolicy` 配置），直接从 `schema` 对象读取：

```ts
const rawXuiActions = typeof schema['xui:actions'] === 'object'
  && schema['xui:actions'] !== null
  && !Array.isArray(schema['xui:actions'])
  ? schema['xui:actions'] as XuiActionDefinitions
  : undefined;
```

这与 `xui:imports` 的设计意图一致，但实际代码中 `xui:imports` 仍通过 `fieldInspection.extensions` 提取（依赖 `extensionPassthroughPolicy` 配置）。`xui:actions` 直接从 schema 读取是更稳健的做法，未来 `xui:imports` 也应考虑迁移。

#### 2.2 两阶段编译：精确插入点

`compileSingleNode()` 的代码结构（`schema-compiler.ts`）：

```
line 142: fieldInspection = inspectSchemaNodeFields(...)
line 152: nodeImports = ... (提取 xui:imports)
line 156: symbolTable = pushInjectedLocalSymbols(...)
line 159: symbolTable = pushImportSymbols(...)
line 165: for (const key of Object.keys(schema)) { ... region 编译在这里 ... }
line 235: eventPlans 编译
line 244: lifecycleActions 编译
line 255+ : 构建 TemplateNode
```

`xui:actions` 的插入点：

```
line 163 之后（symbolTable 已包含 imports 符号）：
  [新增] 提取 rawXuiActions（从 schema 直接读取）
  [新增] xuiActionNames = Object.keys(rawXuiActions)
  [新增] symbolTable = pushNamedActionSymbols(symbolTable, xuiActionNames, ...)

line 165: for loop 开始（region 子节点编译时符号表已包含 xui:actions 名称）
  ...

line 244 之后（lifecycleActions 编译完成后）：
  [新增] namedActionPlans = 编译 rawXuiActions 的每个 action chain

line 303（TemplateNode 对象字面量）：
  在 eventPlans, lifecycleActions, importsPlan 等字段旁写入 namedActionPlans
```

关键点：`symbolTable` 在 region 编译前通过 `let` 重新赋值，region 的 `createTemplateRegion` 回调捕获的是更新后的 `symbolTable`，所以子节点能正确看到父节点的 `xui:actions` 名称。

#### 2.3 编译

```ts
const namedActionPlans: Record<string, CompiledActionProgram> | undefined = rawXuiActions
  ? Object.fromEntries(
      Object.entries(rawXuiActions).map(([name, actionSchema]) => {
        if (typeof actionSchema !== 'object' || actionSchema === null) {
          diagnostics.emit({
            code: 'invalid-xui-actions-entry',
            path: `${path}.xui:actions.${name}`,
            message: `xui:actions entry "${name}" must be an ActionSchema object.`,
            severity: 'error'
          });
          return [name, compileActions({ action: 'noop' }, expressionCompiler, compileOptions)];
        }
        return [
          name,
          compileActions(actionSchema, expressionCompiler, {
            ...compileOptions,
            basePath: `${path}.xui:actions.${name}`,
          })
        ];
      })
    )
  : undefined;
```

每个 value 传给 `compileActions()` 时是单个 `ActionSchema`（不是数组）。`compileActions()` 内部处理单值/数组的统一包装。

#### 2.4 诊断

在 `diagnostics.ts` 中注册 `xui` namespace validator，处理 `xui:actions`：

- `xui:actions` 必须是对象（非数组、非字符串、非 null）
- 每个 key 不能包含 `:`（否则与 namespaced action 混淆）
- 每个 key 不能与 built-in action 名称相同（`ajax`、`setValue`、`validate`、`submitForm`、`refreshSource`、`openDialog`、`closeSurface`、`openDrawer`、`showToast` 等） — 编译期警告
- 每个 value 必须是有效的 `ActionSchema` 对象（非数组、非原始类型）
- 自引用检测：如果 `xui:actions` 的名称 N 的 value 是 `{ "action": "N" }`，编译期警告（直接自引用，运行时会无限递归）

built-in action 名称列表提取为共享常量，供诊断和 dispatcher 共用。

#### 2.5 符号表

新增 `pushNamedActionSymbols()`：

```ts
export function pushNamedActionSymbols(
  table: CompileSymbolTable,
  names: string[],
  frameId: string
): CompileSymbolTable {
  if (names.length === 0) return table;
  return table.push({
    id: frameId,
    kind: 'xui-actions',
    symbols: Object.fromEntries(
      names.map(name => [name, { name, kind: 'xui-action-definition' as const }])
    )
  });
}
```

#### 2.6 同一块内的互引

`xui:actions` 块内的定义之间**不保证编译期引用解析**。例如：

```json
"xui:actions": {
  "a": { "action": "b" },
  "b": { "action": "ajax" }
}
```

编译 `a` 时 `b` 可能尚未编译，符号表中虽有 `b`（key 提取阶段已推入），但静态分析只能标记为"存在"，不能验证 `b` 的 action chain 是否正确。跨层级引用（子节点引用父节点的 `xui:actions`）在运行时通过 ActionScope lookup 自然解决。

### 3. Runtime Changes

#### 3.1 ActionScope 注册：合成 namespace provider

**不新增 `namedActions: Map` 字段**。改为注册一个内部合成 namespace provider `__xui_actions__`，复用现有 ActionScope 的 namespace 查找机制。

```ts
function createNamedActionProvider(
  plans: Record<string, CompiledActionProgram>,
  executeProgram: (program: CompiledActionProgram, args?: Record<string, unknown>) => Promise<ActionResult>
): ActionNamespaceProvider {
  return {
    async invoke(method, payload, ctx) {
      const program = plans[method];
      if (!program) return { ok: false, error: new Error(`Unknown named action: ${method}`) };
      return executeProgram(program, payload as Record<string, unknown>);
    }
  };
}
```

当节点有 `namedActionPlans` 时，NodeRenderer 在节点挂载时：
1. 创建合成 provider
2. 在当前 ActionScope 上注册为 `__xui_actions__` namespace
3. 节点卸载时注销

#### 3.2 Resolution Order 更新

Resolution order 必须与 `action-scope-and-imports.md` 中定义的 6 步顺序一致：

```
1. built-in platform action
2. component-targeted action (component:<method>)
3. xui:actions named action — 通过 ActionScope 查找 __xui_actions__ 合成 namespace
4. namespaced action through ActionScope — 其他 namespace provider（designer, demo 等）
5. parent ActionScope chain lookup
6. not-found error
```

步骤 3 的实现：dispatcher 在处理不含 `:` 的 action name 时，在查 built-in（步骤 1）和 component-targeted（步骤 2）之后，尝试在当前 ActionScope 的 `__xui_actions__` namespace 中查找。如果当前 scope 没有 `__xui_actions__` 或不包含该 name，继续沿 parent chain 查找父 scope 的 `__xui_actions__`。找到后执行对应的 `CompiledActionProgram`。

步骤 3 和步骤 4 共享 ActionScope 的 namespace lookup 机制，但 dispatcher 必须先查 `__xui_actions__`（步骤 3），再查其他 namespace（步骤 4），以保证 named action 优先于同名 namespace method。

**推荐方案：合并注册**。NodeRenderer 在注册 `__xui_actions__` provider 时，将祖先节点的 named actions 合并进来，子节点同名覆盖。这样 dispatcher 只需在当前 scope 查找 `__xui_actions__`，不需要沿 parent chain 做多次 lookup。但 ActionScope 的 `resolve()` 仍需支持 parent chain walk 作为 fallback（针对未定义 `xui:actions` 的中间节点，其子节点需要继承祖先的 named actions）。

**executeProgram 必须使用完整的 6 步 resolution pipeline**：named action chain 内部的 action dispatch（如 `{ "action": "refresh" }`）必须走完整的 resolution order，不能绕过 pipeline 直接执行。这保证了跨边界引用（named action 引用祖先的 named action、引用 built-in action、引用 namespace action）都能正确解析。

#### 3.3 与 `actionScopePolicy: 'new'` 的交互

当节点同时有 `actionScopePolicy: 'new'` 和 `xui:actions` 时：
- 新的 ActionScope 被创建
- named actions 注册在**新 scope** 上
- 子节点的 ActionScope 是新 scope 的 child，自然继承

这与其他 namespace provider 的行为一致，无需特殊处理。

#### 3.4 生命周期

- 注册时机：节点挂载时，与其他 provider（classAliases、imports）同步
- 清理时机：节点卸载时，ActionScope 注销 `__xui_actions__` provider
- 与 `xui:imports` 的注册/清理生命周期一致

### 4. Scope Considerations Summary

| 场景 | 编译期 | 运行期 |
|------|--------|--------|
| 子节点引用祖先的 `xui:actions` 名称 | 符号表中可见（key 提取阶段推入） | ActionScope parent chain lookup |
| 子节点同名定义遮蔽父节点 | 两个名称都推入符号表（shadow） | 子 scope 的 provider 覆盖，合并时子节点优先 |
| 同一块内互引 | 符号表中有 key（静态分析能检测存在性） | 运行时 resolve |
| `actionScopePolicy: 'new'` + `xui:actions` | 不影响编译 | 注册在新 scope 上，子 scope 通过 parent chain 继承 |

## Implementation Sequence

### Phase 1: Core Types & Compiler

- [ ] `packages/flux-core/src/types/actions.ts` — 新增 `XuiActionDefinitions` 类型
- [ ] `packages/flux-core/src/types/node-identity.ts` — `TemplateNode` 增加 `namedActionPlans` 字段
- [ ] `packages/flux-compiler/src/schema-compiler.ts` — `compileSingleNode()` 中提取 `xui:actions`（直接从 schema 读取），两阶段编译（key 提取 → 符号表推入 → region 编译 → action chain 编译）
- [ ] `packages/flux-compiler/src/schema-compiler/diagnostics.ts` — 注册 `xui` namespace validator，处理 `xui:actions` 诊断
- [ ] `packages/flux-compiler/src/schema-compiler/symbol-helpers.ts` — 新增 `pushNamedActionSymbols()`
- [ ] 单元测试：正常编译、嵌套继承符号表、命名冲突诊断、与 built-in 同名警告、value 类型校验、自引用警告

### Phase 2: Runtime & Action Resolution

- [ ] `packages/flux-core` — 新增 `createNamedActionProvider()` 工具函数
- [ ] `packages/flux-react/src/` — NodeRenderer 中处理 `namedActionPlans`：创建合成 namespace provider、合并祖先 named actions、注册到 ActionScope、卸载时清理
- [ ] `packages/flux-action-core/src/` — 确认 resolution order 不需要修改（`__xui_actions__` 走标准 namespace lookup）
- [ ] 单元测试：注册/查找/清理生命周期、遮蔽、嵌套继承、与 `actionScopePolicy: 'new'` 的交互

### Phase 3: Integration Testing

- [ ] 端到端测试：多按钮复用同一 action chain
- [ ] 端到端测试：子节点继承父节点定义
- [ ] 端到端测试：子节点定义遮蔽父节点
- [ ] 端到端测试：`xui:actions` 引用 `xui:imports` 的 namespace action
- [ ] 端到端测试：`xui:actions` 中引用祖先的其他 `xui:actions` 名称
- [ ] 回归测试：现有 action 分发行为不受影响

## Acceptance Criteria

1. 任何 schema 节点可声明 `"xui:actions": { "name": ActionSchema }`，编译通过且运行时正确执行
2. 多个按钮通过 `{ "action": "name" }` 复用同一 `xui:actions` 定义
3. 子节点的 `onClick` 等事件能解析到祖先节点的 `xui:actions` 定义
4. 子节点同名定义遮蔽父节点定义
5. `xui:actions` 名称含 `:` 时编译期产出错误诊断
6. `xui:actions` 名称与 built-in action 同名时编译期产出警告
7. `xui:actions` 的 action chain 中引用祖先的其他 `xui:actions` 名称时正确解析
8. 节点卸载时 `xui:actions` 注册从 ActionScope 清理
9. 现有 action 分发行为不受影响（回归测试通过）
10. 每个 `xui:actions` value 是单个 `ActionSchema` 对象，数组值产出诊断错误

## Risks

1. **编译期符号表时序**：region 子节点编译时需要父节点的 `xui:actions` 名称，但父节点尚未完全编译。通过分阶段处理（在 for loop 前提取 key 并推入符号表）缓解。
2. **合成 namespace 的遮蔽语义**：使用 `__xui_actions__` 合成 namespace 时，同名 namespace 在不同 scope 层级的遮蔽行为需要与 ActionScope 的 `resolve()` 语义对齐。通过合并注册方案（子节点注册时合并祖先 named actions）避免修改 dispatcher。
3. **性能**：每个节点检查 `namedActionPlans` 并注册到 ActionScope 的开销。对于不含 `xui:actions` 的节点（绝大多数），应为 no-op fast path。
4. **`__xui_actions__` 名称保留**：框架内部保留的 namespace 名称，作者不应使用 `__xui_actions__` 作为 `xui:imports` 的 `as` 名称。可在诊断中检测并警告。

## Open Questions

- `__xui_actions__` 合成 namespace 的名称是否需要更明确的保留机制（如注册表中的标记）？
- built-in action 名称列表的维护策略：硬编码常量 vs 从 dispatcher 动态读取？
