# 维度 13: 类型安全与动态边界

## 第 1 轮（初审）

### [维度13-01] `data-source.resultMapping` 被整体 cast 为 `CompiledRuntimeValue<Record<string,string>>`

- **文件**: `packages/flux-compiler/src/source-compiler.ts:125-136`
- **证据片段**:
  ```ts
  if (schema.resultMapping !== undefined) {
    compiled.resultMapping = compiler.compileValue(schema.resultMapping, {
      ...options,
      sourcePath: `${basePath}.resultMapping`,
    }) as unknown as CompiledRuntimeValue<Record<string, string>>;
  }
  ```
- **严重程度**: 初审 P1，复核驳回
- **分类**: 初审危险，复核驳回
- **现状**: 初审认为整体 compileValue + cast 可能导致 leaf expression 不求值。
- **真实风险**: 初审风险为 `{ rows: '${payload.items}' }` 可能发布字面字符串。
- **建议**: 初审建议逐字段 compile/evaluate。
- **为什么值得现在做**: 初审认为 api-data-source 当前 baseline 依赖 resultMapping。
- **误报排除**: 复核确认 live formula compiler 对对象编译递归处理 leaf expression，现有 tests 覆盖 resultMapping leaf 求值，风险与 live code 不符。
- **参考文档**: `docs/architecture/api-data-source.md`
- **复核状态**: 已驳回

### [维度13-02] `define*PageSchema` helper 用多重断言混合 opaque host config 与 BaseSchema

- **文件**: `packages/flow-designer-renderers/src/schemas.ts:23-29`; `packages/report-designer-renderers/src/types.ts:38-44`; `packages/word-editor-renderers/src/types.ts:36-42`; `packages/spreadsheet-renderers/src/types.ts:23-29`
- **证据片段**:

  ```ts
  export type DesignerPageSchema = BaseSchema & DesignerPageSchemaInput;

  export function defineDesignerPageSchema<T extends DesignerPageSchemaInput>(
    schema: T,
  ): DesignerPageSchema {
    return schema as unknown as DesignerPageSchema;
  }
  ```

- **严重程度**: P3
- **分类**: 可疑
- **现状**: 多个 domain host page authoring helper 通过 `as unknown as` 返回 `BaseSchema & *Input`。
- **真实风险**: 通用 schema tooling 可能误把 opaque host config 当普通 JSON schema 深处理；但当前未发现 runtime 错误。
- **建议**: 裁定 host page schema 的 opaque boundary，避免 helper 对外声称普通 `BaseSchema`。
- **为什么值得现在做**: 四个 domain host 包同型，统一裁定能降低后续工具误用。
- **误报排除**: 复核降为 P3；输入泛型仍约束 required fields，当前不是运行时 bug。
- **参考文档**: `docs/architecture/capability-projection-manifest.md`
- **复核状态**: 已降级

## 深挖第 2 轮追加

维度 13：未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度13-01]: 驳回。live compiler 和 tests 证明 leaf expression 被求值。
- [维度13-02]: 降级为 P3。类型卫生/opaque boundary 问题，当前无运行时错误证据。

## 子项复核结论

- [维度13-02]: 建议后续统一 typed builder/validation 模式，但不作为高优先级缺陷。

## 最终保留项

| 编号  | 严重程度 | 文件                                                    | 一句话摘要                                                                |
| ----- | -------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| 13-02 | P3       | `packages/flow-designer-renderers/src/schemas.ts:23-29` | domain page schema helper 用多重断言混合 opaque host config 与 BaseSchema |
