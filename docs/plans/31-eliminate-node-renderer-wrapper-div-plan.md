# 消除 NodeRenderer 中间 wrapper div：data-cid 下沉到 renderer 组件

> Plan Status: completed
> Last Reviewed: 2026-04-04
> Source: NodeRenderer 对 `wrap=false` 且有 `_cid` 的节点插入 `<div data-cid={cid}>`，导致无意义 DOM 中间层。应将 `cid` 传入 `ResolvedNodeMeta`，让各 renderer 组件在根元素上直接输出 `data-cid`，与 `data-testid`、`className` 模式一致。

---

## Implementation Status

Completed on 2026-04-04.

Implemented in the current workspace:

- `ResolvedNodeMeta.cid` is available to renderer components
- `resolveNodeMeta()` resolves `_cid` into meta
- `NodeRenderer` no longer inserts the extra wrapper div for non-wrap nodes
- renderer roots emit `data-cid={props.meta.cid}` directly where they render DOM
- regression coverage exists in `packages/flux-react/src/index.test.tsx`

## 1. 问题分析

### 1.1 当前实现

```
NodeRenderer (node-renderer.tsx:237-268)
  ├── wrap=true (表单字段) → FieldFrame 根元素直接带 data-cid ✅
  └── wrap=false (普通组件) → 套 <div data-cid={cid}> 包裹 ❌
```

关键代码 (`node-renderer.tsx:262-267`):

```tsx
} else if (resolvedCid != null) {
  content = (
    <div data-cid={resolvedCid}>     // ← 多余的 DOM 中间层
      {element}
    </div>
  );
}
```

### 1.2 根因：契约缺口

`ResolvedNodeMeta`（`flux-core/src/types/renderer-compiler.ts:37-48`）不包含 `cid` 字段：

```typescript
export interface ResolvedNodeMeta {
  id?: string;
  name?: string;
  label?: string;
  title?: string;
  className?: string;
  visible: boolean;
  hidden: boolean;
  disabled: boolean;
  testid?: string;
  changed: boolean;
  // ❌ 没有 cid
}
```

NodeRenderer 在第 200-201 行自己从 schema 掏 `_cid`，但无法通过 `props.meta` 传递给 renderer 组件，只能在外面套 div。

### 1.3 设计文档的本意

`docs/analysis/framework-debugger-design.md:530-531`：

> 对于非 wrap 节点，由具体 renderer 组件通过 **props.meta.cid** 获取并自行应用

设计本意是让 renderer 直接输出 `data-cid`，只是 `ResolvedNodeMeta` 没加字段，wrapper div 是妥协实现。

### 1.4 wrapper div 的问题

1. **破坏 CSS 选择器** — 外部写 `> .nop-button` 的样式因中间 div 失效
2. **影响 flex/grid 布局** — 中间多一层 div 可能改变 gap、align 计算
3. **污染 DOM 结构** — 调试时看到无意义 div 嵌套
4. **不一致** — `wrap=true` 路径的 FieldFrame 直接在根元素输出 `data-cid`，`wrap=false` 路径却套 div

### 1.5 可行性确认

经全面审查，**所有 renderer 组件都是单根元素**，不存在 React.Fragment 或多根情况。每个 renderer 已在根元素上输出 `data-testid={props.meta.testid}`，加 `data-cid={props.meta.cid}` 是完全相同的模式。

---

## 2. 影响范围

### 2.1 需要修改的包和文件

#### Phase 1：契约层（flux-core + flux-runtime）

| 文件 | 改动 | 说明 |
|------|------|------|
| `packages/flux-core/src/types/renderer-compiler.ts` | `ResolvedNodeMeta` 加 `cid?: number` | 接口变更 |
| `packages/flux-runtime/src/node-runtime.ts` | `resolveNodeMeta` 加 `cid` 解析 | 从 schema 取 `_cid` 写入 meta |

#### Phase 2：渲染层（flux-react）

| 文件 | 改动 | 说明 |
|------|------|------|
| `packages/flux-react/src/node-renderer.tsx` | 删除 wrapper div 分支，`cid` 改走 `resolvedMeta` | 核心改动 |

#### Phase 3：renderer 组件（所有 renderer 包）

每个非 `wrap` 的 renderer 在根元素上添加 `data-cid={props.meta.cid || undefined}`。

**flux-renderers-basic**（8 个 renderer，全部 `wrap=false`）：

| 文件 | Renderer | 根元素 |
|------|----------|--------|
| `page.tsx` | PageRenderer | `<section>` |
| `container.tsx` | ContainerRenderer | `<div>` |
| `flex.tsx` | FlexRenderer | `<div>` |
| `text.tsx` | TextRenderer | `<Tag>` |
| `button.tsx` | ButtonRenderer | `<Button>` |
| `icon.tsx` | IconRenderer | `<span>` |
| `badge.tsx` | BadgeRenderer | `<Badge>` |
| `dynamic-renderer.tsx` | DynamicRenderer | `<div>`（3 处 return） |

**flux-renderers-form**（`wrap=true` 的 renderer 不需要改，它们的 `data-cid` 由 FieldFrame 输出）：

| 文件 | Renderer | wrap | 需改？ |
|------|----------|------|--------|
| `renderers/form.tsx` | FormRenderer | false | ✅ 根元素加 data-cid |
| `renderers/input.tsx` | input-text/email/password/select/textarea/checkbox/switch/radio-group/checkbox-group | true | ❌ FieldFrame 已处理 |
| `renderers/array-editor.tsx` | ArrayEditorRenderer | true | ❌ FieldFrame 已处理 |
| `renderers/key-value.tsx` | KeyValueRenderer | true | ❌ FieldFrame 已处理 |
| `renderers/tag-list.tsx` | TagListRenderer | true | ❌ FieldFrame 已处理 |
| `renderers/condition-builder/ConditionBuilder.tsx` | ConditionBuilderRenderer | true | ❌ FieldFrame 已处理 |

**flux-renderers-data**（3 个 renderer，全部 `wrap=false`）：

| 文件 | Renderer | 根元素 |
|------|----------|--------|
| `table-renderer.tsx` | TableRenderer | `<div>` |
| `data-source-renderer.tsx` | DataSourceRenderer | 需确认根元素 |
| `chart-renderer.tsx` | ChartRenderer | 需确认根元素 |

**flux-code-editor**（1 个 renderer，`wrap=true`，由 FieldFrame 处理，不需要改）：

| 文件 | Renderer | wrap | 需改？ |
|------|----------|------|--------|
| `code-editor-renderer.tsx` | CodeEditorRenderer | true | ❌ FieldFrame 已处理 |

#### Phase 4：调试器（nop-debugger）

无需改动。调试器通过 `document.querySelector('[data-cid="..."]')` 和 `.closest('[data-cid]')` 查找元素，只依赖 `data-cid` 属性的存在，不依赖 wrapper div 结构。

### 2.2 不需要修改的部分

- **CSS** — 无 CSS 选择器依赖 `[data-cid]` 或 wrapper div 结构
- **flow-designer-renderers** — 这些 renderer 不是通过 NodeRenderer 渲染的（走 xyflow 自定义节点），无 `_cid`
- **spreadsheet-renderers** — 同上，不走标准 NodeRenderer 管线
- **report-designer-renderers** — 同上
- **playground** — 纯消费方，不定义 renderer

---

## 3. 执行计划

### Step 1：ResolvedNodeMeta 加 cid 字段

**文件**: `packages/flux-core/src/types/renderer-compiler.ts`

```diff
 export interface ResolvedNodeMeta {
   id?: string;
   name?: string;
   label?: string;
   title?: string;
   className?: string;
   visible: boolean;
   hidden: boolean;
   disabled: boolean;
   testid?: string;
   changed: boolean;
+  cid?: number;
 }
```

**验证**: `pnpm --filter @nop-chaos/flux-core typecheck`

### Step 2：resolveNodeMeta 解析 cid

**文件**: `packages/flux-runtime/src/node-runtime.ts`

在 `resolveNodeMeta` 函数中，从 `node.schema` 提取 `_cid` 写入 resolved meta：

```diff
 function resolveNodeMeta(node: CompiledSchemaNode, scope: ScopeRef, state?: CompiledNodeRuntimeState): ResolvedNodeMeta {
+  const cidFromSchema = (node.schema as unknown as { _cid?: unknown })._cid;
   const env = input.getEnv();
   const resolved: ResolvedNodeMeta = {
     id: evaluateCompiledValue(input.expressionCompiler, node.meta.id, scope, env, state?.meta.id),
     name: evaluateCompiledValue(input.expressionCompiler, node.meta.name, scope, env, state?.meta.name),
     label: evaluateCompiledValue(input.expressionCompiler, node.meta.label, scope, env, state?.meta.label),
     title: evaluateCompiledValue(input.expressionCompiler, node.meta.title, scope, env, state?.meta.title),
     className: evaluateCompiledValue(input.expressionCompiler, node.meta.className, scope, env, state?.meta.className),
     visible: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.visible, scope, env, state?.meta.visible) ?? true),
     hidden: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.hidden, scope, env, state?.meta.hidden) ?? false),
     disabled: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.disabled, scope, env, state?.meta.disabled) ?? false),
     testid: evaluateCompiledValue(input.expressionCompiler, node.meta.testid, scope, env, state?.meta.testid),
-    changed: true
+    changed: true,
+    cid: typeof cidFromSchema === 'number' ? cidFromSchema : undefined,
   };
```

**注意**: `cid` 不是表达式驱动的（是编译时分配的数字 ID），不需要通过 `evaluateCompiledValue`。直接从 schema 读取即可。

**验证**: `pnpm --filter @nop-chaos/flux-runtime typecheck && pnpm --filter @nop-chaos/flux-runtime test`

### Step 3：NodeRenderer 删除 wrapper div，cid 走 meta

**文件**: `packages/flux-react/src/node-renderer.tsx`

1. 删除第 199-201 行的 `cidFromSchema` / `resolvedCid` 提取（已移入 `resolveNodeMeta`）
2. 删除第 262-267 行的 `else if (resolvedCid != null)` wrapper div 分支
3. FieldFrame 的 `cid` prop 改从 `resolvedMeta.cid` 读取（而非 `resolvedCid`）

```diff
   const Comp = props.node.component.component;
-  const cidFromSchema = (props.node.schema as unknown as { _cid?: unknown })._cid;
-  const resolvedCid = typeof cidFromSchema === 'number' ? cidFromSchema : undefined;

   // ... effects ...

   const element = <Comp {...componentProps} />;

   let content = element;

   if (props.node.component.wrap) {
     // ...
     content = (
       <FieldFrame
         name={fieldName}
         label={labelValue}
         required={props.node.schema.required === true}
         className={resolvedMeta.className}
         testid={resolvedMeta.testid}
-        cid={resolvedCid}
+        cid={resolvedMeta.cid}
       >
         {element}
       </FieldFrame>
     );
-  } else if (resolvedCid != null) {
-    content = (
-      <div data-cid={resolvedCid}>
-        {element}
-      </div>
-    );
   }
```

**验证**: `pnpm --filter @nop-chaos/flux-react typecheck && pnpm --filter @nop-chaos/flux-react test`

### Step 4：Renderer 组件加 data-cid

每个 `wrap=false` 的 renderer 在根元素上添加 `data-cid={props.meta.cid || undefined}`。

模式与现有 `data-testid` 一致：

```tsx
// 改动前
<div className={...} data-testid={props.meta.testid || undefined}>

// 改动后
<div className={...} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
```

**逐包改动清单**：

#### 4a. `flux-renderers-basic`（8 个 renderer）

| 文件 | 行号（return 语句） |
|------|------|
| `page.tsx` | 13 — `<section>` |
| `container.tsx` | 25 — `<div>` |
| `flex.tsx` | 29-51 — `<div>` |
| `text.tsx` | 23 — `<Tag>` |
| `button.tsx` | 14-24 — `<Button>` |
| `icon.tsx` | return 语句 |
| `badge.tsx` | return 语句 |
| `dynamic-renderer.tsx` | 61, 69, 76 — 3 处 `<div>`（error / schema / loading 三个分支） |

**验证**: `pnpm --filter @nop-chaos/flux-renderers-basic typecheck`

#### 4b. `flux-renderers-form`（1 个 renderer：FormRenderer）

| 文件 | 说明 |
|------|------|
| `renderers/form.tsx` | FormRenderer 根元素加 data-cid |

注意：所有 `input-text` 等 `wrap=true` 的 renderer 不需要改——它们的 `data-cid` 由 FieldFrame 根元素输出。

**验证**: `pnpm --filter @nop-chaos/flux-renderers-form typecheck && pnpm --filter @nop-chaos/flux-renderers-form test`

#### 4c. `flux-renderers-data`（3 个 renderer）

| 文件 | 说明 |
|------|------|
| `table-renderer.tsx` | 根 `<div>` 加 data-cid |
| `data-source-renderer.tsx` | 确认根元素后加 data-cid |
| `chart-renderer.tsx` | 确认根元素后加 data-cid |

**验证**: `pnpm --filter @nop-chaos/flux-renderers-data typecheck`

### Step 5：补充测试

**文件**: `packages/flux-react/src/index.test.tsx`

新增测试用例：

```typescript
describe('data-cid on renderer root element', () => {
  it('emits data-cid on component root element (no wrapper div)', () => {
    // 渲染一个有 _cid 的 button 节点
    // 断言: Button 根元素上有 data-cid
    // 断言: Button 根元素外没有额外的 div[data-cid] 包裹
  });

  it('does not emit data-cid when cid is undefined', () => {
    // 渲染一个没有 _cid 的节点
    // 断言: 根元素上没有 data-cid 属性
  });

  it('FieldFrame still emits data-cid for wrap=true nodes', () => {
    // 渲染一个 wrap=true 的 input-text
    // 断言: FieldFrame 根元素上有 data-cid
    // 断言: input 根元素上没有 data-cid（只有 FieldFrame 有）
  });

  it('debugger inspectByCid still works after refactoring', () => {
    // 注册 component handle，渲染节点
    // 调用 inspectByCid(cid)
    // 断言: 能找到对应的 DOM 元素
  });
});
```

**验证**: `pnpm --filter @nop-chaos/flux-react test`

### Step 6：全量验证

```bash
pnpm typecheck
pnpm build
pnpm lint
pnpm test
```

---

## 4. 风险与回退

### 4.1 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| Renderer 遗漏 data-cid | 低 | grep 搜索所有 renderer 的 return 语句，确认全覆盖 |
| FieldFrame 路径回退 | 无 | FieldFrame 已正确输出 data-cid，不受影响 |
| 调试器失效 | 低 | 调试器只依赖 `[data-cid]` 属性存在，不依赖 DOM 层级 |
| 第三方 renderer 未适配 | 中 | `cid` 字段是 optional，不输出 data-cid 只是调试器找不到，不影响功能 |

### 4.2 回退策略

如果出现问题，回退只需：
1. 恢复 `node-renderer.tsx` 的 wrapper div 分支
2. 其余改动（meta 加 cid、renderer 加 data-cid）可以保留——有 wrapper div 时 `data-cid` 出现两次不影响功能

---

## 5. 验收标准

- [ ] `ResolvedNodeMeta` 包含 `cid?: number` 字段
- [ ] `resolveNodeMeta` 正确解析 `_cid` 到 meta
- [ ] NodeRenderer 中不存在 wrapper div 代码
- [ ] 所有 `wrap=false` 的 renderer 根元素上有 `data-cid`
- [ ] FieldFrame 仍正确输出 `data-cid`（`wrap=true` 路径不受影响）
- [ ] `document.querySelector('[data-cid="N"]')` 能找到对应 DOM 元素
- [ ] 调试器 inspect 模式 hover/点击正常工作
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过
- [ ] 无新增 DOM 层级——renderer 根元素即为 `data-cid` 载体
