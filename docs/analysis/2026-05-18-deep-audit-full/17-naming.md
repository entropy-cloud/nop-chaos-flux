# 维度 17：命名与语义清晰度

## 第 1 轮（初审）

### [维度17-01] `strictMode` 把 schema 严格校验开关命名成更宽的运行时模式

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\renderer-core.ts:313-322`; `C:\can\nop\nop-chaos-flux\packages\flux-react\src\schema-renderer.tsx:148-156`; `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hooks.ts:239-241`
- **证据片段**:
  ```ts
  return createRendererRuntime({
    ...
    strictMode: isStrictValidationEnabled(props.strictValidation),
  });
  ```
- **严重程度**: P2
- **现状**: `RendererRuntime` 对外公开的是 `strictMode: boolean`，`useStrictMode()` 也直接暴露这个名字；但 live 赋值来源仅是 `SchemaRendererProps.strictValidation`，当前实际作用域也主要落在 schema compile/diagnostics strict validation 路径上。
- **风险**: 该命名会让调用方误以为这是更广义的运行时或 React-like strict mode，从而把不属于 schema strict validation 的行为、开关或调试语义错误地挂到同一个概念上。
- **建议**: 把公开命名收敛到真实语义，例如 `strictValidation` / `validationStrictMode`；若保留兼容名，也应在文档中明确其仅表示 schema strict validation baseline。
- **为什么值得现在做**: 这是公开 runtime contract 与 hook 名称，误导面广，而且本轮审计已看到它被 reference/tooling 当成更宽概念消费。
- **误报排除**: 不是主观觉得名字不好听；live code 已直接证明其值来自 `strictValidation`，并未承载更广的运行时严格模式语义。
- **复核状态**: 未复核

### [维度17-02] `createReadonlyScopeBinding` 名称承诺只读绑定，但返回的仍是可写 `ScopeRef`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\status-owner.ts:16-20`
- **证据片段**:
  ```ts
  export function createReadonlyScopeBinding<TSummary>(
    scope: ScopeRef,
    bindingKey: string,
    getSummary: () => TSummary,
  ): ScopeRef {
  ```
- **严重程度**: P2
- **现状**: 这个 helper 名称暗示返回的是不可写的只读 binding，但导出签名就是完整 `ScopeRef`，并未在类型层或运行时层禁用 `update` / `merge` / 其他写操作。
- **风险**: 调用方会自然把它当成“安全的只读投影 scope”，实际却仍可能把写入错误地落到这层绑定上，造成名字承诺与真实能力不一致。
- **建议**: 若确实返回可写 `ScopeRef`，改名为更真实的 `createScopeBindingProjection` 一类名称；若想保留当前名字，就应返回真正受限的 readonly scope contract。
- **为什么值得现在做**: 这是公开 helper 名，且服务 `$form` / `$crud` 这类常用 owner overlay；误名会持续制造错误心智模型。
- **误报排除**: 不是拿内部私有工具吹毛求疵。函数是导出的 runtime helper，且签名与命名承诺明显不一致。
- **复核状态**: 未复核

## 初审结论

- 保留 2 项命名误导问题，均位于公开 runtime/helper contract。

## 维度复核结论

- 结论: 保持零发现。
- 理由: 复核 live code 与审计文档后，`17-01` 和 `17-02` 都更像可讨论的命名取舍，不足以构成应在本轮保留的客观缺陷。`strictMode` 虽然来源于 `strictValidation`，但它在编译器、runtime、debugger 和计划文档里都已经是 strict validation mode 的稳定简称，现状更接近术语收敛而不是语义漂移。`createReadonlyScopeBinding` 的 readonly 更自然地修饰注入的 `$form` / `$crud` 绑定，而不是承诺返回一个整体不可写的新 `ScopeRef` 类型。按不要保留主观命名 nit 的标准，这两项都不建议继续保留。

## 子项复核结论

- `17-01`: 不保留。当前 live usage 仍全部指向 strict validation 语义，没有看到已落地的错误扩义或混用。
- `17-02`: 不保留。函数名描述的是创建只读 binding，而不是创建只读 scope，与 `$` 特殊只读绑定语义一致。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要 |
| ---- | -------- | ---- | ---------- |
