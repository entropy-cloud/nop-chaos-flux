# 维度 12：字段元数据与 Slot 建模

## 第 1 轮（初审）

### [维度12-01] `array-field` 的参数化 item region 在显式 `scope` 路径下丢失 `$slot.index` / `$slot.value`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx:147-154,575`; `C:\can\nop\nop-chaos-flux\packages\flux-react\src\render-nodes.tsx:251-276,311-327,414`
- **证据片段**:
  ```ts
  const itemContent = React.useMemo(
    () =>
      asReactNode(
        itemRegion?.render({
          scope: itemScope,
          bindings: { index, value: item },
          instancePath: itemInstancePath,
        }),
      ) ?? null,
  ```
- **严重程度**: P1
- **现状**: `array-field` 明确把 `item` region 声明为参数化 slot：`params: ['index', 'value']`。但真正渲染时同时传入了显式 `scope: itemScope` 与 `bindings: { index, value }`。`RenderNodes` 的 live 合同是 `shouldUseFragmentScope = !explicitScope && !!fragmentBindings`，也就是说一旦给了 `scope`，fragment bindings 就不会再被发布成 `$slot.*`。
- **风险**: schema 作者会按参数化 slot 文档和 renderer metadata 合同编写 `${$slot.index}` / `${$slot.value}`，但在 `array-field` item region 内实际永远读不到；这不是文档用法差异，而是 live runtime 主路径直接吞掉了参数化 slot 绑定。
- **建议**: 保证参数化 region 的两条路径一致：要么不要向 `itemRegion.render(...)` 传显式 `scope`，让 `bindings` 走标准 fragment scope；要么在 `itemScope` 上显式注入 `$slot` frame，而不是同时传 `scope` 和 `bindings`。
- **为什么值得现在做**: 这是 field owner 的基础 slot contract。`array-field` 是高频 composite field，当前行为会让参数化 item 模板在最常见场景里“看起来支持、实际失效”。
- **误报排除**: 这不是把裸 `index`/`value` 与 `$slot.index`/`$slot.value` 的 authoring 风格混为一谈。仓库现有 slot 文档和已修复的 table/tabs 合同都明确参数化 region 应通过 `$slot.*` 暴露，且 `RenderNodes` 代码已直接证明显式 `scope` 会禁用这条发布路径。
- **历史模式对应**: parameterized region 宣称支持 `$slot.*`，但 owner 渲染路径因为额外包装 scope 把 slot frame 丢掉。
- **参考文档**: `docs/architecture/renderer-runtime.md:759`; `docs/architecture/scoped-render-slots.md`
- **复核状态**: 未复核

## 初审结论

- 保留 1 项高优先级发现。
- 其余候选如 `detail-field` / `tree-controls` 的 label region 消费不完全，更接近局部 UI 文案或可访问性问题，本轮不作为主项保留。

## 维度复核结论

- 结论: 保留新增发现。
- 理由: `array-field` 仍把 `item` region 声明为参数化 region，`params: ['index', 'value']` 仍在 `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:575`。但实际渲染时，`ArrayItem` 继续同时传入 `scope: itemScope` 与 `bindings: { index, value: item }`；而 `RenderNodes` 的 live 合同明确只有无显式 `scope` 时才会使用 fragment bindings。因此参数化 region 的 `$slot.index` / `$slot.value` 在这条路径上仍不会被发布，属于真实 slot contract 断裂，不是 authoring 风格差异。

## 子项复核结论

- `12-01`: 保留。参数化声明存在，但 live 渲染路径把 `$slot` 绑定吞掉。
- 排除项 `detail-field` / `tree-controls` 的 label region 消费不完全: 继续排除。`label` 仍由 `formFieldRules + wrap: true + NodeFrameWrapper` 主路径正常消费，未见 live 缺口。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                                                                                    | 一句话摘要                                                                     |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 12-01 | P1       | `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:147-154,575`; `packages/flux-react/src/render-nodes.tsx:251-276,311-327,414` | `array-field` 参数化 item region 因显式 `scope` 丢失 `$slot.index/$slot.value` |
