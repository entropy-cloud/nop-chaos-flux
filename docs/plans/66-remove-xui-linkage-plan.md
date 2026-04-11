# 66 Remove `xui:linkage`

> Plan Status: planned
> Last Reviewed: 2026-04-11
> Source: `docs/logs/2026/04-10.md` (entry 32), `docs/logs/2026/04-11.md`
> Related: Plan 64 (`64-node-identity-memory-optimization-and-compiledschemanode-cleanup-plan.md`)

## Purpose

从代码库中完整删除 `xui:linkage` 机制，消除其引入的约 375 行专用代码、双重求值开销、状态初始化重复，以及与已有表达式机制之间的功能重叠。

## Problem

`xui:linkage` 是从 AMIS 继承的"条件分支"快捷语法：当 `when` 表达式为真时应用 `fulfill` 效果，否则应用 `otherwise` 效果。可影响四个字段：`visible`、`disabled`、`required`（UI 星号）、`options`。

在当前系统里，**前三个效果完全可以用已有的直接表达式替代**；第四个（`required`）的替代方案更完整（`requiredWhen`/`requiredUnless` 既改 UI 又改验证，linkage 只改 UI）。

具体代价：

1. **双重求值**：`when` 表达式在每次渲染中被 `resolveNodeMeta` 和 `resolveNodeProps` 各求值一次，没有共享缓存。
2. **两侧状态同时追踪**：`collectMetaDependencies` 把 `fulfill` 和 `otherwise` 两侧的状态都加入订阅，非激活侧的依赖变化也会触发重渲染。
3. **状态初始化重复**：linkage 运行时状态的初始化在 `schema-compiler/fields.ts` 和 `node-instance.ts` 各写了一份，结构完全相同。
4. **`dependencies` 字段是死代码**：被收集存储，但运行时求值路径从未使用它（运行时从 expression state 自动推导依赖）。
5. **`isStatic` 强制覆盖**：任何含 `linkageProgram` 的节点都被强制排除出静态短路路径，即使 `when` 实际上是编译期常量。

## Current Baseline

- `xui:linkage` 已完整实现并通过测试（Plan 64 遗留 bug 已于 2026-04-11 修复）。
- 使用它的地方**只有** `packages/flux-renderers-form/src/index.test.tsx`，共 2 个测试用例（4 处 `xui:linkage` 字面量）。
- 代码库中没有 playground schema 文件使用 `xui:linkage`，没有外部 consumer 依赖。
- `visible`、`disabled` 已在 `META_FIELDS` 内支持表达式（`buildCompiledMeta` / `classifyField`），直接写 `visible: '${expr}'` 有效。
- `options` 在 select / radio-group / checkbox-group 中声明了 `kind: 'prop'`，可直接写表达式。
- `required` 的正确替代是 `requiredWhen` / `requiredUnless` 验证规则，同时影响 UI 星号和验证器；linkage 的 `required` 只改星号不改验证。

## Goals

- 从所有 `src/` 路径删除 linkage 相关的类型定义、编译逻辑、运行时求值、状态初始化。
- 将 2 个 `xui:linkage` 测试用例改写为等价的直接表达式形式。
- `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过，行为等价。

## Non-Goals

- 不修改 `requiredWhen` / `requiredUnless` 验证规则（保留，是正确机制）。
- 不修改 `reaction` 机制（职责不同，不竞争）。
- 不改变任何可见的渲染行为——测试改写后语义与原 linkage 测试完全等价。
- 不添加新功能作为 linkage 的"替代品"，已有表达式机制已经足够。

## Scope

### In Scope

- `packages/flux-core/src/types/schema.ts` — 删除 `FieldLinkageSchema`、`FieldLinkageEffect`、`BaseSchema['xui:linkage']`
- `packages/flux-core/src/types/renderer-compiler.ts` — 删除 `CompiledNodeLinkageEffect`、`CompiledNodeLinkage`、`CompiledSchemaNode.linkage`、`CompiledNodeRuntimeState.linkage`
- `packages/flux-core/src/types/node-identity.ts` — 删除 `TemplateNode.linkageProgram`、import of `CompiledNodeLinkage`
- `packages/flux-runtime/src/schema-compiler.ts` — 删除 `compileLinkageEffect`、`compileNodeLinkage`、调用点、`flags.hasVisibilityRule`/`hasDisabledRule` 中的 linkage 分支
- `packages/flux-runtime/src/schema-compiler/fields.ts` — 删除 `createEffectState`、`createNodeRuntimeState` 中的 `linkage` 分支
- `packages/flux-runtime/src/schema-compiler/diagnostics.ts` — 删除 `xui:linkage` 诊断分支（约 80 行）
- `packages/flux-runtime/src/node-runtime.ts` — 删除 `evaluateLinkageEffect`、`collectMetaDependencies` 中的 linkage 分支、`resolveNodeMeta` 和 `resolveNodeProps` 中的 linkage 求值块
- `packages/flux-react/src/node-instance.ts` — 删除 `createTemplateNodeRuntimeState` 中的 linkage 状态初始化块
- `packages/flux-react/src/node-renderer.tsx` — 删除 `isStatic` 中的 `!props.node.linkageProgram &&` 守卫
- `packages/flux-renderers-form/src/index.test.tsx` — 将 2 个 `xui:linkage` 测试改写为等价的直接表达式

### Out Of Scope

- `packages/flux-core/src/types/schema.ts` 中的 `xui:imports`、`xui:reaction` 等其他命名空间键
- 任何 `dist/` 文件（build 产物，由 `pnpm build` 重新生成）
- `docs/` 文件（如有引用 linkage，可在 Phase 3 补充清理，不阻塞主流程）

## Execution Plan

### Phase 1 - 删除类型层

Status: planned
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-core/src/types/node-identity.ts`

- [ ] `schema.ts`：删除 `FieldLinkageEffect` 接口、`FieldLinkageSchema` 接口、`BaseSchema['xui:linkage']` 字段
- [ ] `renderer-compiler.ts`：删除 `CompiledNodeLinkageEffect` 接口、`CompiledNodeLinkage` 接口、`CompiledSchemaNode.linkage` 字段、`CompiledNodeRuntimeState.linkage` 字段、import 中的 `FieldLinkageSchema`
- [ ] `node-identity.ts`：删除 `TemplateNode.linkageProgram` 字段、import 中的 `CompiledNodeLinkage`
- [ ] `pnpm typecheck` — 预期大量 type error（后续 phase 修复）

Exit Criteria:

- [ ] 三个文件中不再有任何 linkage 相关的类型定义

### Phase 2 - 删除编译层

Status: planned
Targets: `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/fields.ts`, `packages/flux-runtime/src/schema-compiler/diagnostics.ts`

- [ ] `schema-compiler.ts`：删除 `compileLinkageEffect` 函数、`compileNodeLinkage` 函数、调用点（line 190）、`CompiledNodeLinkage` import、`flags.hasVisibilityRule`/`hasDisabledRule` 中的 `linkage?.fulfill?.visible` 等分支、`buildTemplateNode` 中的 `linkageProgram` 赋值
- [ ] `fields.ts`：删除 `createEffectState` 内部函数、`createNodeRuntimeState` 中 `linkage:` 分支、`LinkageEffect` type alias
- [ ] `diagnostics.ts`：删除 `xui:linkage` 诊断分支（lines 118–202 中的 linkage block）、`FieldLinkageSchema` import

Exit Criteria:

- [ ] `schema-compiler.ts`、`fields.ts`、`diagnostics.ts` 中无 linkage 引用
- [ ] `pnpm --filter @nop-chaos/flux-runtime typecheck` 通过

### Phase 3 - 删除运行时求值层

Status: planned
Targets: `packages/flux-runtime/src/node-runtime.ts`, `packages/flux-react/src/node-instance.ts`, `packages/flux-react/src/node-renderer.tsx`

- [ ] `node-runtime.ts`：删除 `CompiledNodeLinkageEffect` import、`evaluateLinkageEffect` 函数、`collectMetaDependencies` 中的 linkage 状态遍历块、`resolveNodeMeta` 中的 linkage 求值块（`if (node.linkageProgram) {...}`）、`resolveNodeProps` 中的 linkage 覆盖块
- [ ] `node-instance.ts`：删除 linkage 状态初始化块（`if (linkage) {...}` 及相关变量）
- [ ] `node-renderer.tsx`：将 `!props.node.linkageProgram &&` 从 `isStatic` 条件中移除

Exit Criteria:

- [ ] 三个文件中无 linkage 引用
- [ ] `pnpm --filter @nop-chaos/flux-react typecheck` 通过
- [ ] `pnpm --filter @nop-chaos/flux-runtime typecheck` 通过

### Phase 4 - 改写测试

Status: planned
Targets: `packages/flux-renderers-form/src/index.test.tsx`

改写规则（保持语义等价）：

| 原 linkage 效果 | 改写为 |
|---|---|
| `visible: true/false` in fulfill/otherwise | `visible: '${expr}'` 直接在 schema 上 |
| `disabled: true/false` in fulfill/otherwise | `disabled: '${expr}'` 直接在 schema 上 |
| `required: true/false` in fulfill/otherwise | `requiredWhen`/`requiredUnless` 验证规则；如果只测 UI 星号则改为 `required: true` + schema-level condition |
| `options: [...]` in fulfill/otherwise | `options: '${expr}'`（ternary 表达式）直接在 schema 上 |

- [ ] 测试 "supports xui:linkage for disabled and required field presentation"（line 2149）：改用 `disabled: '${role !== "admin"}'` + `requiredWhen: { path: 'role', equals: 'admin' }`
- [ ] 测试 "supports xui:linkage for visible and options branches"（line 2209）：改用 `visible: '${role === "admin"}'` + `options: '${role === "admin" ? adminOptions : viewerOptions}'`（需内联 options 数组到 schema data 或使用 ternary 形式）
- [ ] 更新测试标题，去掉 `xui:linkage` 字样

Exit Criteria:

- [ ] `packages/flux-renderers-form/src/index.test.tsx` 中不再有 `xui:linkage` 字面量
- [ ] 两个改写后的测试覆盖与原测试等价的行为（disabled 切换、required 星号、visible 切换、options 切换）
- [ ] `pnpm --filter @nop-chaos/flux-renderers-form test` 通过

## Validation Checklist

- [ ] `packages/flux-core/src/` 中无任何 linkage 相关导出（`FieldLinkageSchema`、`CompiledNodeLinkage`、`CompiledNodeLinkageEffect`）
- [ ] `packages/flux-runtime/src/` 中无任何 linkage 相关函数或分支
- [ ] `packages/flux-react/src/` 中无任何 linkage 相关状态初始化或求值
- [ ] `packages/flux-renderers-form/src/index.test.tsx` 中无 `xui:linkage` 字面量
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `docs/logs/` 已更新

## Closure

Status Note: 待执行完成后填写。

Follow-up:

- no remaining plan-owned work anticipated after closure

## Optional Sections

### Migration Reference

执行 Phase 4 时，`options` ternary 写法参考：

```json
{
  "type": "radio-group",
  "name": "permission",
  "label": "Permission",
  "visible": "${role === 'admin'}",
  "options": "${role === 'admin' ? [{label:'Manage users',value:'manage-users'},{label:'Publish content',value:'publish-content'}] : [{label:'Read only',value:'read'}]}"
}
```

注意：options 表达式中的数组字面量需要在 scope 里或通过 schema `data` 提前定义，避免在表达式字符串中写大型字面量。推荐在 form 的 `data` 中定义 `adminOptions` 和 `viewerOptions`，然后在 `options` 字段中引用：

```json
{
  "type": "form",
  "data": {
    "role": "viewer",
    "permission": "read",
    "adminOptions": [
      { "label": "Manage users",    "value": "manage-users" },
      { "label": "Publish content", "value": "publish-content" }
    ],
    "viewerOptions": [
      { "label": "Read only", "value": "read" }
    ]
  }
}
```

```json
{
  "options": "${role === 'admin' ? adminOptions : viewerOptions}"
}
```
