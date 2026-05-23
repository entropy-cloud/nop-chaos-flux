# 开放式对抗性审查 — 2026-05-08 — 第三轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：前两轮已覆盖结构 DSL、dynamic schema、detail/composite projection、named action payload 等问题；本轮避开这些已记录点。
> 本轮切入点：component-targeted action、built-in action lowering、component handle registry 这三条 runtime invocation 边界。

---

## 发现 1：`setValues.args.path` 被 action-core 解析后丢弃，文档承诺的相对批量写入不会发生

**在哪里**

- 文档矩阵定义 `setValues` 使用 `args: { path?, values }`：`docs/references/action-payload-matrix.md:63-64,105-111`
- `resolveSetValuesPayload()` 正确读取 `args.path`：`packages/flux-action-core/src/action-core.ts:343-356`
- built-in lowering 丢掉 `payload.path`，改读 `action.targeting.targetId`：`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:67-78`
- runtime adapter 已支持 `invocation.args.path` 作为 base path：`packages/flux-runtime/src/action-adapter.ts:96-127`
- 现有测试只覆盖无 `args.path` happy path：`packages/flux-runtime/src/__tests__/runtime-actions-setvalues.test.ts:27-57,117-142`、`packages/flux-runtime/src/__tests__/runtime-scope-actions.test.ts:87-122`

**是什么**

`setValues` 的 payload parser 已经把 `args.path` 读出来：

```ts
return {
  path: typeof args.path === 'string' ? args.path : undefined,
  values: args.values as Record<string, unknown>,
};
```

但随后 built-in invocation 构造时没有使用这个 `payload.path`：

```ts
const payload = resolveSetValuesPayload(action, ctx, internals.evaluator);
invocation = {
  action: 'setValues',
  args: {
    path: action.targeting.targetId,
    values: payload.values,
  },
  ...
};
```

所以作者按当前文档写：

```json
{
  "action": "setValues",
  "args": {
    "path": "profile",
    "values": {
      "name": "Alice",
      "role": "admin"
    }
  }
}
```

runtime 收到的 invocation 里 `args.path` 是 `undefined`，最终写的是根路径 `name` / `role`，不是 `profile.name` / `profile.role`。

**为什么值得关心**

这是 action args 统一化路径上的直接断裂：文档、parser、runtime adapter 三层都支持 `args.path`，只有中间 lowering 层把它替换成旧的 `targetId` carrier。最坏结果不是报错，而是批量写到错误位置；在 form/page scope 中会静默污染 sibling 字段。

**信心水平**：确定

---

## 发现 2：targeted `submitForm` / `component:submit` 通过 form handle 时丢失 abort signal，跨表单提交不可取消

**在哪里**

- built-in `submitForm` lowering 带着 `signal`：`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:211-225`
- 直接 `ctx.form.submit()` 路径传递 signal：`packages/flux-runtime/src/action-adapter.ts:200-207`
- `formId` 定向路径把 signal 放进 component handle payload：`packages/flux-runtime/src/action-adapter.ts:158-197`
- `component:<method>` 路径把 `ActionContext` 传给 handle：`packages/flux-runtime/src/action-adapter.ts:361-397`
- form component handle 的 `submit` 方法只读取 `interactionId`，忽略 payload.signal 和 ctx.signal：`packages/flux-runtime/src/form-component-handle.ts:22-32`
- 既有 direct submit signal 测试覆盖直接路径，但没有覆盖 remote handle path：`packages/flux-runtime/src/__tests__/runtime-actions-submit.test.ts:354-456`、`packages/flux-runtime/src/__tests__/action-adapter.unit.test.ts:482-576`

**是什么**

`submitForm` 直接提交当前 form 时，runtime adapter 调用：

```ts
ctx.form.submit({
  interactionId: ctx.interactionId,
  signal: invocation.signal,
});
```

但一旦使用 `formId` 定向到另一个 form，adapter 改为走 component handle：

```ts
return handle.capabilities.invoke(
  'submit',
  {
    interactionId: ctx.interactionId,
    signal: invocation.signal,
  },
  ctx,
);
```

最终 form handle 实现是：

```ts
case 'submit':
  return form.submit({
    interactionId:
      payload && 'interactionId' in payload
        ? String(payload.interactionId ?? '') || undefined
        : undefined,
  });
```

`signal` 被丢弃。`component:submit` 也同样受影响：component action adapter 会把 `ctx` 传给 handle，但 form handle 完全不读取 `ctx.signal`。

**为什么值得关心**

项目历史上已经多次修补 `submitForm` cancellation / timeout signal 传递；当前 direct path 看起来已修好，但跨表单 targeting 和显式 component-targeted submit 仍然不可取消。超时、reaction/page dispose、用户取消等上游 abort 只能取消当前 form 提交，不能取消被 `formId` 或 `component:submit` 触发的远程 form 提交。

这类问题尤其隐蔽，因为 remote submit 是官方推荐的实例定向能力之一，调用结果仍会正常 resolve/reject；只有取消、timeout、页面卸载等异常路径才暴露。

**信心水平**：确定

---

## 发现 3：重复 `componentId` 在 runtime registry 中静默覆盖旧 handle，违背“ambiguous not pick first”的组件解析合同

**在哪里**

- component resolution 文档要求重复/歧义显式失败：`docs/architecture/component-resolution.md:207-221`
- compiler 当前遇到 duplicate ids 只跳过 static lowering，仍保留 selector：`packages/flux-compiler/src/schema-compiler-registry-compilation.test.ts:253-279`
- registry by-name 歧义会 throw，但 by-id 不会：`packages/flux-runtime/src/component-handle-registry.ts:240-255`
- registry 注册同 id handle 时直接删除旧 handle 并重建 id index：`packages/flux-runtime/src/component-handle-registry.ts:286-304`
- 测试把同 id replacement 固化为当前行为：`packages/flux-runtime/src/__tests__/component-handle-registry.test.ts:17-42`

**是什么**

`component-resolution.md` 明确说：

1. duplicate `componentId` 应报告冲突并跳过 static lowering。
2. runtime selector lookup by `componentId` / `componentName` ambiguous 时必须显式 ambiguity，不能 pick first。

live code 对 `componentName` 做到了：多个同名 mounted handles 会抛 `Ambiguous component target`。但 `componentId` 分支是另一套语义：

```ts
if (handle.id) {
  const existingById = handlesById.get(handle.id);

  if (existingById && existingById !== handle) {
    handles.delete(existingById);
    unindexHandle(existingById);
  }
}

handles.add(handle);
indexHandle(handle);
```

第二个同 id handle 注册时，第一个 handle 仍在 UI 中 mounted，但从 registry 的 `handles` / `handlesById` / `handlesByCid` 中被移除。后续 `component:<method>` 按 `componentId` 定向时，不会得到 ambiguity，而是命中新注册的那个 handle。

**为什么值得关心**

重复 component id 在低代码 schema 中非常容易出现：复制粘贴表单、列表/loop 中复用同一片 schema、动态 schema 加载重复片段。当前行为的失败模式是静默路由到“最后注册者”，而不是明确告诉作者目标不唯一。

更糟的是，被覆盖的第一个 handle 没有走正常 unregister 路径；它在 UI 上仍存在，但 component registry 里不可见。调试器和 component-targeted action 会看到一个与实际 DOM/UI 不一致的能力图。

**信心水平**：确定

---

## 本轮小结

本轮集中暴露的是 action/capability 边界的“中间层语义蒸发”：

1. `setValues.args.path` 从 parser 到 adapter 都存在，但 lowering 层把它丢掉。
2. `submitForm` 的 signal 从 action-core 到 adapter 都存在，但 form handle 把它丢掉。
3. component resolution 文档定义了 ambiguity，但 registry by-id 注册路径把 ambiguity 变成 replacement。

这些问题共同说明：当前 action API 已经有多层合同，但缺少“端到端字段保留”测试。建议优先补齐跨层测试，而不是只在单层 unit test 中确认局部 parser/adapter 行为。

## 本轮盲区自评

- 本轮没有继续扫描全部 host renderer capability provider，只验证了 form/table/chart/crud/tabs 相关的代表性路径。
- 没有做浏览器交互复现；所有判断基于 live code 与现有测试合同。
- 下一轮若继续，最适合从 schema validator 与 authoring contract 的 closed-model 覆盖切入；component/action 主路径的高价值问题本轮已到递减收益点。
