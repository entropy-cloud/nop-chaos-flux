# 维度 12：表单字段与 Slot 建模

## 范围与状态

- 审核范围：表单字段 chrome、slot/region metadata、deep region rule 所有权、projected form 能力建模。
- 来源限定：本文件仅基于同目录 `stage-1-full-findings-11-15.md`、`raw-findings-07-20.md`、`final-review-results-11-15.md`、`summary.md` 重写。
- 当前状态：最终归档维度文件。运行时代码未修改。

## 深挖轮次与收敛说明

- 第 1 轮初审重建发现 3 项：`12-01`、`12-02`、`12-03`。
- 第 2-5 轮追加深挖发现 1 项：`12-04`。
- `summary.md` 记录第 5 轮仍有新增，因此本次按“达到执行上限后进入最终复核”处理，不声称自然收敛。
- 最终复核修正了 `12-02`：deep parameterized region `$slot` propagation 的早期判断被驳回。

## 最终复核摘要

- 最终复核条目数：4。
- 最终保留：3。
- 最终驳回：1。
- 严重程度分布：P2 3 项；无严重程度 1 项。

## 最终保留项

### [12-01] FieldFrame chrome 部分输入从 raw schema 读取

- 文件：`packages/flux-react/src/node-frame-wrapper.tsx:25-49`, `60-69`
- 严重程度：P2
- 当前行为：`name`、`label`、`required` 使用 resolved props，但 `hint`、`description`、`remark`、`labelRemark`、`labelAlign`、`labelWidth` 从 `templateNode.schema` 读取。
- 风险：FieldFrame chrome 可与 runtime resolved values 不一致；表达式、imports、aliases 或 normalization 影响这些属性时 UI 可能不反映。
- 建议：FieldFrame chrome inputs 统一走 resolved props/meta/regions，raw schema 不作为运行时 UI 主数据源。
- 误报排除：这些是影响 visible runtime UI 的用户 schema 字段，不是 renderer definition metadata。
- 最终复核结论：保留，P2。
- 修订标题/理由：标题保持为 FieldFrame chrome 混合 resolved props 与 raw schema reads；最终复核确认上述字段仍从 raw schema 读。
- 证据片段：

```tsx
const schema = props.templateNode.schema as Record<string, unknown>;
const fieldName =
  typeof props.resolvedPropsValue.name === 'string' ? props.resolvedPropsValue.name : undefined;
const labelValue =
  typeof props.resolvedPropsValue.label !== 'undefined'
    ? (props.resolvedPropsValue.label as ReactNode)
    : (props.regions.label?.render() as ReactNode);
const requiredValue =
  typeof props.resolvedPropsValue.required === 'boolean'
    ? props.resolvedPropsValue.required
    : undefined;
const hintValue = typeof schema.hint === 'string' ? schema.hint : undefined;
```

### [12-03] Deep region rules 所有权仍在 compiler-global tables

- 文件：`packages/flux-compiler/src/schema-compiler/tables.ts:9-59`, `212-236`
- 严重程度：P2
- 当前行为：compiler 硬编码 `table`、`crud`、`tabs`、`variant-field` 等 renderer-specific deep normalization rules。
- 风险：renderer slot/field ownership 分裂：renderer definitions 声明部分 metadata，deep nested region behavior 却在 compiler tables；新增/修改 renderer slots 需要 compiler edits。
- 建议：将 deep region declarations 移入 `RendererDefinition` metadata 或 renderer-owned extension point，compiler 只消费 metadata。
- 误报排除：表内直接出现 renderer IDs 与 field names，不是普通 compiler helper。
- 最终复核结论：保留，P2。
- 修订标题/理由：标题保持为 deep region rules 仍在 compiler-global tables；最终复核确认其中包含 renderer IDs、nested field names、slot params。
- 证据片段：

```ts
export const DEEP_FIELD_NORMALIZERS: Record<string, Record<string, DeepFieldNormalizer>> = {
  table: {
    columns(input) {
      return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
    },
    expandable(input) {
      return normalizeTableExpandable(input.value, input.path, input.regions, input.compileSchema);
    },
  },
```

### [12-04] array-field projected item form 未启用 array mutation delegation

- 文件：`packages/flux-renderers-form-advanced/src/composite-field/array-field-runtime.ts:47-72`
- 严重程度：P2
- 当前行为：array-field item 子树获得 projected form，但没有传 `supportsArrayMutations: true`；variant-field projected form 已显式 opt-in。
- 风险：array item 内嵌 `array-editor`、`key-value`、`array-field` 等组件时，子组件通过 projected form 调用 `appendValue`/`removeValue` 可能不可用或跨 FormRuntime boundary 失败。
- 建议：在 `createItemFormProxy` 传入 `supportsArrayMutations: true`，并新增嵌套 array-field/array-editor 的回归测试。
- 误报排除：不是类型层面小问题；`FormRuntime` array mutation 是 runtime capability，variant-field-runtime 已显示 intended delegation pattern。
- 最终复核结论：保留，P2。
- 修订标题/理由：标题保持为 array-field item projected form 未传 `supportsArrayMutations: true`；最终复核认为 variant-field pattern 显示应 opt-in。
- 证据片段：

```ts
export function createItemFormProxy(
  parentForm: FormRuntime,
  itemFullPrefix: string,
  prefixPath: string,
  itemKind: ArrayItemKind,
): FormRuntime {
  return createProjectedInlineForm({
    parentForm,
    ownerRootPath: itemFullPrefix,
    prefixPath,
    scalarValueAlias: itemKind === 'scalar' ? 'value' : undefined,
    projectValues(state) {
```

## 最终驳回项

### [12-02] Deep parameterized region 缺 `$slot` 符号表的早期判断已被 live code 推翻

- 文件：`packages/flux-compiler/src/schema-compiler/node-compiler.ts:498-528`; `packages/flux-compiler/src/schema-compiler/regions.ts:101-106`; `packages/flux-compiler/src/schema-compiler/symbol-helpers.ts:151-171`
- 严重程度：无
- 当前行为：live code 已从 nested region extraction 传递 `regionMeta`，并在 `regionMeta.params` 存在时调用 `pushRegionParamSymbols()` 注入 `$slot` symbols。
- 风险：早期 Stage-1 记录的具体缺陷不成立；deep nested parameterized region 如 table cells 已有 compile-time `$slot` 支持。
- 建议：驳回该 finding；保留/扩展 regression tests，而不是作为 defect 跟踪。
- 误报排除：live path 并非缺 symbol-table propagation；已有 compiler tests 也覆盖 `$slot.record` 可接受。
- 最终复核结论：驳回。
- 修订标题/理由：最终复核明确 deep parameterized regions 已有 `$slot` symbol propagation；原 Stage-1 保留结论是误报。
- 证据片段：

```ts
symbolTable: regionMeta?.params?.length
  ? pushRegionParamSymbols(
      o?.symbolTable ?? symbolTable,
      regionMeta.params,
      `${path}.${key}:slot`,
    )
  : (o?.symbolTable ?? symbolTable),
```
