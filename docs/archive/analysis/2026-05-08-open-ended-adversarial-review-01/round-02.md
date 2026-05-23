# 开放式对抗性审查 — 2026-05-08 — 第二轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：第一轮已覆盖 `when`、`loop.itemData`、data-source lifecycle、reaction cancellation；历史报告已覆盖 `dynamic-renderer` stale schema、detail action 字段作为 prop 的泛化问题、以及 plain named action 文档缺口。
> 本轮切入点：追踪 schema/action/scope 三类对象跨过 renderer 边界后，形状和语义是否仍被保留。

---

## 发现 1：`dynamic-renderer` 的运行时 schema 入口绕过了编译期诊断，远程坏 schema 会退化成 render-time 边界错误

**在哪里**

- `loadAction` 被建模为普通 prop：`packages/flux-renderers-basic/src/basic-renderer-definitions.ts:234-241`
- action 字段校验只覆盖 `kind: 'event'`：`packages/flux-compiler/src/schema-compiler/shape-validation.ts:205-209`
- `DynamicRenderer` 只检查返回值有 string `type`：`packages/flux-renderers-basic/src/dynamic-renderer.tsx:11-16,50-66`
- loaded schema 通过 `helpers.render()` 进入 render path：`packages/flux-renderers-basic/src/dynamic-renderer.tsx:94-102`
- `helpers.render()` 只是创建 `RenderNodes`：`packages/flux-react/src/helpers.tsx:145-154`
- `RenderNodes` 在 render/useMemo 中调用 `normalizeNodeInput()` 并 compile：`packages/flux-react/src/render-nodes.tsx:239-242`
- 非 strict 默认编译没有启用 `continueOnError`，unknown renderer 会 throw：`packages/flux-react/src/render-nodes.tsx:118-128`、`packages/flux-compiler/src/schema-compiler.ts:127-142`
- node error boundary 只能在渲染层兜底：`packages/flux-react/src/node-error-boundary.tsx:112-164`

**是什么**

`dynamic-renderer` 同时有两个运行时入口没有接上 schema compiler 的诊断合同：

1. `loadAction` 在 renderer definition 里是 `kind: 'prop'`，所以 `validateActionShape()` 不会检查它。静态 schema 里把 `loadAction` 写成字符串、缺少 `action` 字段、或写错 action shape，都不会在 schema validation 阶段暴露。
2. load 成功后的 `result.data` 只需满足 `{ type: string }` 就会被保存为 schema。后续 `props.helpers.render(visibleState.schema)` 进入 `RenderNodes`，由 render path 临时 compile。若远程返回 `{ "type": "missing-renderer" }`、region shape 错误、或其它 compiler-level 错误，错误不会成为 `DynamicRenderer` 自己的 `visibleState.error`，而是直接抛到 React error boundary。

这和已有的 `dynamic-renderer stale schema` 不是同一个问题。stale schema 关注 loadAction 切换时显示旧内容；本问题关注动态 schema 作为运行时输入没有被同一套 action/schema diagnostics 接管。

**为什么值得关心**

`dynamic-renderer` 是把远程或 action 结果提升为渲染树的入口。这个入口如果不做 validate/diagnostic lowering，就会让最应该被隔离为“远程 schema 无效”的错误变成渲染树异常。结果是：

1. 作者在静态 schema validation 中看不到 `loadAction` 写错。
2. 用户看到的是 node error boundary，而不是 `dynamic-renderer` 的本地错误状态。
3. monitor/diagnostics 无法按动态 schema 来源、加载 action、schema path 聚合这类错误。

**信心水平**：确定

---

## 发现 2：`detail-view` / `detail-field` 对嵌套路径的读取和写入不对称，首次编辑会丢失当前值

**在哪里**

- `detail-view` form 路径用 `getIn()`，但非 form scope 用浅层 key 读取：`packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:60-69`
- `detail-view` 非 form 写回使用 dot path：`packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:184-212`
- `detail-field` form 读取使用浅层 key：`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:58-62`
- `detail-field` scope 读取用 `getIn()`，form 写回使用 path：`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:63-68,191-193`
- 旧报告只把 nested path 读取作为复核备注，未落为确认发现：`docs/analysis/2026-05-03-deep-audit-full-4/12-field-slot.md:69-71`

**是什么**

两个 detail renderer 都有“读当前值”和“写回值”的 path 语义不一致。

`detail-view` 的非 form 分支：

```ts
const scopeProjectedValue = useScopeSelector(
  (data) => (scopePath ? (data as Record<string, unknown>)[scopePath] : undefined),
  Object.is,
);
```

但确认提交时却写：

```ts
parentScope.update(`${scopePath}.${key}`, val);
```

所以 page scope 中已有 `{ settings: { profile: { name: 'Alice' } } }`，schema 写 `scopePath: 'settings.profile'` 时，首次打开 detail dialog 读不到当前对象，只能得到空 draft；确认后又会写到 `settings.profile.*`。

`detail-field` 的 form 分支类似：

```ts
(state) => (hasName ? (state.values as Record<string, unknown>)[name] : undefined);
```

但提交时调用 `parentForm.setValue(name, writeback)`，`name` 在 form runtime 中是 path。于是 `name: 'settings.profile'` 的 field 首次打开也读不到当前 form 值。

**为什么值得关心**

这类 bug 对作者很隐蔽，因为提交后看起来“写回成功”，第二次打开也可能由于刚写入的路径开始存在而部分恢复。但第一次编辑会以空 draft 覆盖已有嵌套对象，`transformInAction` / `validateValueAction` 收到的 `originalValue` 也是 `undefined`。对于 detail 编辑器，这等价于把 patch/edit 流程变成“盲写”。

**信心水平**：确定

---

## 发现 3：`array-field` item scope 的 `merge()` / `replace()` 会写父 scope 根，而不是当前 item

**在哪里**

- item scope 构造：`packages/flux-renderers-form-advanced/src/composite-field/array-field-runtime.ts:6-41`
- `merge()` / `replace()` 直接转发到父 scope：`packages/flux-renderers-form-advanced/src/composite-field/array-field-runtime.ts:33-40`
- object-field 的投影 scope 对照实现会写回当前 object：`packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:57-96`
- data-source `mergeToScope` 使用当前 scope 的 `merge()`：`packages/flux-runtime/src/async-data/data-source-runtime-utils.ts:122-138`
- data-source renderer 注册时使用当前 render scope：`packages/flux-renderers-data/src/data-source-renderer.tsx:21-29`

**是什么**

`array-field` 为每个 item 创建了投影 scope，`get()` / `update()` / nested path 都指向 `arrayPath.index`：

```ts
getValue: () => parentScope.get(itemPrefix),
setValue: (value) => parentScope.update(itemPrefix, value),
setNestedValue: (path, value) => parentScope.update(`${itemPrefix}.${path}`, value),
```

但同一个 scope 的 bulk write 方法不是投影语义：

```ts
merge(data) {
  if (data && typeof data === 'object') {
    parentScope.merge(toRecord(data));
  }
},
replace(data) {
  parentScope.replace?.(data as Record<string, unknown>);
},
```

这意味着 item 内部任何使用当前 scope bulk-write 的机制都会跳出 item，把数据写到父 scope 根。最直接的 live 路径是把 `data-source` 放在 array item region 中并开启 `mergeToScope: true`：`DataSourceRenderer` 会拿 item scope 注册 source，source publication 会调用 `scope.merge(data)`，最后数据被 merge 到页面/父 scope，而不是当前数组项。

`object-field` 的投影 scope 没有这个问题：它的 `merge()` 会把 data 合并到当前 object value，再通过 `writeValue('', nextObject)` 写回 owner path。

**为什么值得关心**

`array-field` item scope 的读取和单点更新都像“当前 item scope”，但 bulk write 偷偷变成“父 scope 根写入”。这会造成两个方向的破坏：

1. item-local data-source、helper action 或自定义 renderer 认为自己只更新当前 item，实际污染页面根数据。
2. 当前 item 没有收到预期数据，后续字段仍为空或读旧值，导致作者误判为 data-source/表达式问题。

这是投影 scope 合同不闭合，不是单个 renderer 的使用错误。

**信心水平**：确定

---

## 发现 4：本地 `xui:actions` named action 会丢弃调用方 `args` payload

**在哪里**

- 文档矩阵把 plain named action 标为 `args` already aligned：`docs/references/action-payload-matrix.md:66-73`
- action compiler 只把 `args` 编译进 caller 的 payload：`packages/flux-compiler/src/action-compiler.ts:13-24,66-73`
- dispatcher 对 plain named action 求值 payload：`packages/flux-action-core/src/action-dispatcher/action-runners.ts:144-169`
- runtime adapter 把 payload 传给 provider：`packages/flux-runtime/src/action-adapter.ts:410-428`
- 本地 named action provider 忽略 payload，直接用原 ctx 执行 program：`packages/flux-core/src/named-action-provider.ts:16-20`

**是什么**

plain named action 的调用路径看起来已经把 payload 一路传到了 namespace provider：

```ts
const payload = evaluateActionArgs(action, ctx, internals.evaluator);
const invocation = { actionName, namespace, method, payload };
await internals.adapter.invokeNamespacedAction(invocation, ctx);
```

adapter 也确实调用：

```ts
resolved.provider.invoke(resolved.method, invocation.payload, ctx);
```

但如果 provider 来自当前节点的 `xui:actions`，最终实现是：

```ts
async invoke(method, payload, ctx) {
  const program = plans[method];
  if (program) {
    return executeProgram(program, ctx);
  }
  ...
}
```

`payload` 没有被合入 `ctx.evaluationBindings`，也没有变成 `prevResult`、event、scope patch 或其它可读位置。因此：

```json
{
  "xui:actions": {
    "saveRow": {
      "action": "ajax",
      "args": { "url": "/api/rows/${rowId}" }
    }
  },
  "onClick": {
    "action": "saveRow",
    "args": { "rowId": "${id}" }
  }
}
```

调用方的 `rowId` payload 会被求值，但本地 `saveRow` program 根本读不到它。

**为什么值得关心**

这破坏的是 named action 抽象的核心用途：把一段 action graph 参数化后复用。更危险的是，跨 namespace imported provider 和 component action 都会收到 payload，只有本地 `xui:actions` provider 丢弃 payload。作者会把问题误判为表达式作用域或 action args 编译问题，而不是 provider 边界吞参。

**信心水平**：确定

---

## 本轮小结

本轮最明显的模式是：几个“投影/间接执行”入口只保留了表层 API 形状，但没有完整传递底层语义。

最值得优先修的 3 条线：

1. `dynamic-renderer` 应把 load action 和 loaded schema 纳入明确的 runtime validation/error channel，而不是靠 render boundary 兜底。
2. 投影 scope 必须让 `get/update/merge/replace` 语义一致，否则数据会跨 owner 泄漏。
3. named action 的 payload contract 需要落到 `xui:actions` provider，否则 `args` 统一化在本地复用路径上是假的。

## 本轮盲区自评

- 本轮仍是静态代码审查，没有编写最小复现测试。
- 没有系统扫完所有 `createProjectedOwnerScope()` 调用点之外的自定义 scope 实现。
- 下一轮适合切换到 renderer capability registration、component targeting、surface/form/page boundary，而不是继续围绕同一批 detail/composite renderer 深挖。
