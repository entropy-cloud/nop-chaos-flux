# 维度 12：表单字段与 Slot 建模

## 第 1 轮（初审）

### [维度12-01] `value-or-region` 与 `allowSource` 的组合契约在 live compiler 中不可兑现，因为 `{ type: 'source' }` 会先被判成 schema input

- **文件**: `packages/flux-core/src/types/schema.ts:70-76,184-186`, `packages/flux-core/src/utils/schema.ts:12-14`, `packages/flux-compiler/src/schema-compiler/node-compiler.ts:174-206,302-307`, `packages/flux-compiler/src/schema-compiler/shape-validation.ts:551-564`, `docs/architecture/field-metadata-slot-modeling.md:128-143,195-197`
- **证据片段**:
  ```ts
  export interface SchemaFieldRule {
    key: string;
    kind: SchemaFieldKind;
    allowSource?: boolean;
    sourceStateKey?: string;
  }
  ```
  ```ts
  export interface SourceSchema extends SourceActionSchema {
    type: 'source';
  }
  ```
  ```ts
  if (rule.kind === 'region' || (rule.kind === 'value-or-region' && isSchemaInput(value))) {
    ...
    continue;
  }
  ```
- **严重程度**: P2
- **契约条款**: field metadata 应拥有字段解释权；若文档或类型允许 `allowSource`，compiler 必须能在 value channel 中兑现 `type: 'source'` carrier 语义。
- **现状**: `SchemaFieldRule` 类型和 architecture doc 都把 `allowSource` 建模成字段级通用能力，但 `node-compiler` 对 `value-or-region` 的判定顺序是先 `isSchemaInput(value)`；而 `{ type: 'source' }` 天然满足 `isSchemaInput`。
- **风险**: 一旦 renderer 把某字段声明为 `kind: 'value-or-region' + allowSource: true`，作者写入的 source carrier 会被当成 region 递归编译或校验，而不是运行时 source 值通道。
- **建议**: 二选一明确收敛：要么在类型、文档、校验器中显式禁止 `value-or-region + allowSource`，要么在 compiler 和 validation 中把 `type: 'source'` 识别放在 `isSchemaInput` region 分类之前。
- **误报排除**: 不是“当前还没有 renderer 这样写所以不算问题”；问题在于公共字段契约已经宣称可扩展，但 live classifier 会稳定把该组合导向错误语义。
- **复核状态**: 未复核

### [维度12-02] `FieldCompileContext.compileValue()` 的类型允许传入 `symbolTable`，但实现强制覆盖为外层 `symbolTable`

- **文件**: `packages/flux-core/src/types/schema.ts:107-116`, `packages/flux-compiler/src/schema-compiler/node-compiler.ts:210-239`, `docs/architecture/field-metadata-slot-modeling.md:442-465`
- **证据片段**:
  ```ts
  export interface FieldCompileContext {
    ...
    compileValue: <T = unknown>(
      input: T,
      sourcePath?: string,
      options?: Omit<ExpressionCompileOptions, 'sourcePath'>,
    ) => CompiledRuntimeValue<T>;
  }
  ```
  ```ts
  compileValue: <T = unknown>(
    input: T,
    sourcePathOverride?: string,
    compileValueOptions?: Omit<ExpressionCompileOptions, 'sourcePath'>,
  ) =>
    expressionCompiler.compileValue(input, {
      ...compileValueOptions,
      symbolTable,
      sourcePath: sourcePathOverride ?? `${path}.${key}`,
    }),
  ```
- **严重程度**: P2
- **契约条款**: `FieldCompileContext` 是 renderer-owned custom compile 的核心扩展点；其公开选项必须与真实实现一致，不能在签名允许 override、实现里又静默丢弃。
- **现状**: `compileValue()` 的类型通过 `Omit<ExpressionCompileOptions, 'sourcePath'>` 公开了 `symbolTable`，但实际实现无论调用方传什么都会被闭包里的外层 `symbolTable` 覆盖；同一个 context 里的 `compileSchema()` 却正确尊重 `compileOptions?.symbolTable`。
- **风险**: renderer 自定义 field compiler 无法为局部子树注入不同符号表、局部 import 或 slot param 扩展；调用方不会收到任何类型或运行时告警。
- **建议**: 要么让 `compileValue` 真正尊重 `compileValueOptions?.symbolTable`，要么收窄类型，移除 `symbolTable` 可传性，避免制造假能力。
- **误报排除**: 不是文档表述偏差；TS 类型、architecture doc、以及同一上下文中的 `compileSchema()` 行为都表明这是实际 API/实现失配。
- **复核状态**: 未复核

## 维度复核结论

- [维度12-01]: 保留为 P2。
- [维度12-02]: 保留为 P2。

## 子项复核结论

- 无需额外子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                  | 一句话摘要                                                                                            |
| ----- | -------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 12-01 | P2       | `packages/flux-compiler/src/schema-compiler/node-compiler.ts:174-206` | `value-or-region + allowSource` 在 live compiler 中不可兑现，`type: 'source'` 会先被判成 schema input |
| 12-02 | P2       | `packages/flux-compiler/src/schema-compiler/node-compiler.ts:214-228` | `FieldCompileContext.compileValue()` 类型允许传 `symbolTable`，实现却强制覆盖掉调用方选项             |
