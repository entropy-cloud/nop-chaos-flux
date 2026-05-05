# 维度 13：类型安全与动态边界

## 初审

- 初审提出 3 条：condition-builder `any`、code-editor `any`、KeyboardEvent 伪装成 MouseEvent。

## 维度复核

- 保留：事件类型伪装。
- 降级：condition-builder 与 code-editor 的公开 `any` 收口问题。

## 最终结论

### [维度13] 键盘激活路径把 `KeyboardEvent` 伪装成 `MouseEvent`

- **文件**: `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx:77-88`, `packages/flux-code-editor/src/code-editor-renderer/toolbar-button.tsx:37-42`
- **证据片段**:
  ```ts
  onClick?.(e as unknown as React.MouseEvent<HTMLSpanElement>);
  ```
- **严重程度**: P2
- **现状**: 键盘触发时仍把真实 `KeyboardEvent` 强断言成 `MouseEvent` 传给外部 handler。
- **风险**: 消费方读取鼠标字段时会遇到运行时契约失真。
- **建议**: 改为 `onActivate` 或联合事件类型，不要伪造 `MouseEvent`。
- **参考文档**: `docs/skills/react19-best-practices-review.md`
- **复核状态**: `维度复核通过`

### [维度13] `condition-builder` 的 `fields/operators` 公开类型仍过宽

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/types.ts:141-156`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:51-55`
- **证据片段**:
  ```ts
  fields?: any[];
  operators?: any;
  ```
- **严重程度**: P3
- **现状**: 同文件已有精确类型，运行时也按精确类型消费，但公开 schema 字段仍保留 `any`。
- **风险**: 降低 authoring 与 IDE 提示质量，但仍位于低代码 schema 动态边界。
- **建议**: 后续若收口类型面，可改成“宽输入 + 窄归一化”双层类型。
- **参考文档**: `docs/components/condition-builder/design.md`
- **复核状态**: `已降级`

### [维度13] `code-editor` 的 `expressionConfig/sqlConfig` 仍对外暴露 `any`

- **文件**: `packages/flux-code-editor/src/types.ts:145-154`, `packages/flux-code-editor/src/code-editor-renderer.tsx:60-72`
- **证据片段**:
  ```ts
  expressionConfig?: any;
  sqlConfig?: any;
  ```
- **严重程度**: P3
- **现状**: 包内已有精确接口，但公开 schema 字段仍用 `any`。
- **风险**: 主要是公开类型可读性弱化，当前证据不足以升级为运行时高风险缺陷。
- **建议**: 结合 `BaseSchema` 兼容性做专项类型收敛。
- **参考文档**: `docs/components/code-editor/design.md`
- **复核状态**: `已降级`
