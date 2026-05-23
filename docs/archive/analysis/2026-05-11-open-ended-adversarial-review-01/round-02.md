# 开放式对抗性审查 — 2026-05-11 — 第二轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：上一轮已记录 `setValue` / `setValues` 的作者合同把 scope write 与 form targeting 混写；本轮不再重复该问题，转而检查 live runtime 是否还保留危险 fallback，会把误写的 targeting 字段静默解释成路径。
> 本轮切入点：`setValue` 的 `componentId` 到底是组件 targeting，还是在 live code 里被退化成普通路径字符串。

---

## 发现 1：built-in `setValue` 仍把误写的 `componentId` 静默降格为路径 fallback，容易把“选错 action family”的作者错误变成“写错路径”的运行时错误

**在哪里**

- `action-payload` 矩阵曾把 `componentId` 列为 `setValue` 的 targeting 字段：`docs/references/action-payload-matrix.md`（本轮审查前基线）
- `ComponentTarget` 的正式语义就是组件选择器，而不是值路径：`packages/flux-core/src/types/renderer-component.ts:6-10`
- action precompile 历史也把 `componentId` 明确视为 targeting family，而不是 payload/path：`docs/plans/119-action-precompile-and-args-unification-plan.md:119-121`
- compile/runtime 最近还专门收口过“`componentId` 必须保持 selector-based resolution”的合同：`packages/flux-compiler/src/schema-compiler-registry-compilation.test.ts:240-259,313-339`、`docs/logs/2026/04-13.md:641-649`
- 但 built-in lowering 里 `setValue` 会把 `componentId` 作为 `targetPath` fallback：`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:52-60`
- runtime adapter 最终拿这个 path 去 `form.setValue(path, value)` 或 `ctx.scope.update(path, value)`：`packages/flux-runtime/src/action-adapter.ts:76-93`

**是什么**

当前 `setValue` 的 lowering 是：

```ts
const targetPath = payload.path ?? action.targeting.componentId ?? '';
```

也就是说，只要作者没有显式提供 `args.path`，但误写了 `componentId`，runtime 不会报“这个 built-in 不支持组件 targeting”，而是把这个字段静默退化成数据写入路径。

随后 runtime adapter 会执行：

```ts
target.form.setValue(path, value);
// or
ctx.scope.update(path, value);
```

因此像下面这种 schema：

```json
{
  "action": "setValue",
  "componentId": "user-form",
  "args": {
    "value": "Alice"
  }
}
```

不会“把值写到 id 为 `user-form` 的组件”，而是会把当前 owner 里的 `user-form` 当成字段路径去写。

**为什么值得关心**

这条问题比单纯的文档不准确更危险，因为它把“作者选错 action family”静默重解释成了另一种完全不同的运行时行为：

1. 按更合理的合同，`componentId` 应属于组件实例 targeting family，作者若想写具体实例应当改用 `component:setValue`。
2. 但 built-in `setValue` 的 live 执行没有拒绝这个误用，而是把同一个字段变成 path fallback。
3. 失败模式不是显式报错，而是“成功写错地方”。

这会制造一种非常难排查的错觉：作者本来只是把 `component:setValue` 错写成了 `setValue`，runtime 却不报 contract error，而是悄悄改成一次普通路径写入。结果调试时看到的是错误数据写入，而不是一个明确的“该 action 不支持 `componentId`”提示。

**信心水平**：确定

---

## 本轮小结

本轮确认的问题说明，即使把 built-in `setValue` 收口为 current-scope write，live code 里仍残留一个危险 fallback：同样叫 `componentId`，在 component action 家族里是实例选择器，在 built-in write action 里却会被静默退化成值路径兜底。

无论最终是否保留 `submitForm(formId)` 的兼容 targeting，都应单独收口这一条；否则 built-in `setValue` 仍会保留一套和其余 action family 不一致、且更危险的 fallback 解释规则。

## 本轮盲区自评

- 本轮聚焦 `setValue`，没有继续扩展到所有 built-in action 的 targeting 字段是否也存在类似“语义偷换”。
- `component:setValue` / form handle 仍然使用 `name` 风格 payload，这看起来更像另一条 capability 契约分叉，但本轮未把它升级为确认发现，因为当前文档示例也沿用了同一 payload 形状。
- 下一轮若继续，最适合从 form handle 的只读/快照出口和 action 结果可变性切入，或者做一次快速横切确认是否已到递减收益点。
