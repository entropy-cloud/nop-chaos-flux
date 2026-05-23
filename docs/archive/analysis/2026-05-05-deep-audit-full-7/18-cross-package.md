# 维度 18：跨包模式一致性

## 第1轮初审

### [维度18] `flux-code-editor` 仍绕过共享 `registerRendererDefinitions(...)` 注册约定

- **涉及包**: `@nop-chaos/flux-code-editor` vs `@nop-chaos/flux-renderers-form` / `@nop-chaos/spreadsheet-renderers`
- **严重程度**: P2
- **不一致类别**: 注册模式
- **统一建议**: 收敛到共享 `registerRendererDefinitions(...)`。

### [维度18] domain workbench 的本地化策略已出现分叉

- **涉及包**: `@nop-chaos/word-editor-renderers` / `@nop-chaos/spreadsheet-renderers` vs `@nop-chaos/report-designer-renderers` / `@nop-chaos/flow-designer-renderers`
- **严重程度**: P2
- **不一致类别**: 文本
- **统一建议**: 先统一 shell 级文本（toolbar title、placeholder、aria-label、empty/fallback）。

### [维度18] advanced/widget renderer 的默认文案也已分叉

- **涉及包**: `@nop-chaos/flux-code-editor` / `@nop-chaos/flux-renderers-form-advanced` vs `@nop-chaos/flux-renderers-form`
- **严重程度**: P2
- **不一致类别**: 文本
- **统一建议**: 将 renderer-owned 默认文案纳入 `flux.*` key。

### [维度18] domain workbench 的失败可观测性策略分叉过大

- **涉及包**: `@nop-chaos/report-designer-renderers` vs `@nop-chaos/flow-designer-renderers` / `@nop-chaos/word-editor-renderers`
- **严重程度**: P3
- **不一致类别**: 错误处理
- **统一建议**: 统一最低线，禁止静默吞错。

## 深挖第2轮追加

### [维度18] domain host renderer 的 namespace 注册写法再次分叉

- **涉及包**: `@nop-chaos/word-editor-renderers` vs `@nop-chaos/flow-designer-renderers` / `@nop-chaos/spreadsheet-renderers` / `@nop-chaos/report-designer-renderers`
- **严重程度**: P2
- **不一致类别**: hook
- **统一建议**: 全部收敛到共享 `useNamespaceRegistration(...)`。

### [维度18] `word-editor` 的输入/对话框默认文案硬编码范围比上一轮更广

- **涉及包**: `@nop-chaos/word-editor-renderers` vs `@nop-chaos/report-designer-renderers` / `@nop-chaos/flux-code-editor` / `@nop-chaos/flux-renderers-form`
- **严重程度**: P2
- **不一致类别**: 文本

### [维度18] advanced form widget 的可访问性/辅助默认文案也在继续分叉

- **涉及包**: `@nop-chaos/flux-renderers-form-advanced` vs `@nop-chaos/flux-renderers-form` / `@nop-chaos/flux-code-editor`
- **严重程度**: P2
- **不一致类别**: 文本

## 深挖第4轮追加

### [维度18] `flow-designer` 的 a11y/操作文案本地化也在持续偏离

- **涉及包**: `@nop-chaos/flow-designer-renderers` vs `@nop-chaos/report-designer-renderers` / `@nop-chaos/spreadsheet-renderers`
- **严重程度**: P2
- **不一致类别**: 文本

### [维度18] domain page 的 override-surface 建模已出现新的跨包分叉

- **涉及包**: `@nop-chaos/flow-designer-renderers` vs `@nop-chaos/report-designer-renderers` / `@nop-chaos/word-editor-renderers` / `@nop-chaos/spreadsheet-renderers`
- **严重程度**: P1
- **不一致类别**: 分层
- **现状**: `flow-designer` 已落地 `toolbar/inspector/dialogs` region 能力，但 `DesignerPageSchemaInput` 仍未显式声明这些入口。
- **统一建议**: 将这些 override surface 收回显式 schema 类型与 definition/doc。

## 深挖统计

- 第1轮发现数：4
- 第2轮新增：3
- 第3轮新增：0
- 第4轮新增：2

## 维度复核结论

- 初审与深挖共 9 项，独立复核后保留 7 项、降级 2 项。
- 复核后真正保留的主线集中在 i18n 文案分叉、失败可观测性最低线不一致，以及 flow-designer 的 override-surface schema 契约落后于 live region 能力。

## 子项复核结论

- `[维度18] flux-code-editor 仍绕过共享 registerRendererDefinitions(...) 注册约定`: 降级。当前仍是手写 `registry.register(...)`，但只有单个 definition，更像风格分叉。
- `[维度18] domain workbench 的本地化策略已出现分叉`: 保留。`word-editor` / `flow-designer` 仍有多处 shell 与操作文案硬编码，而 `report-designer` / `spreadsheet` 更依赖 `flux.*` key。
- `[维度18] advanced/widget renderer 的默认文案也已分叉`: 保留。`flux-code-editor` 与 `flux-renderers-form-advanced` 仍保留多处英文默认提示/校验文案。
- `[维度18] domain workbench 的失败可观测性策略分叉过大`: 保留。`report-designer` 仍有静默吞错，`flow-designer` / `word-editor` 更偏 `console.warn/error`，最低线不一致。
- `[维度18] domain host renderer 的 namespace 注册写法再次分叉`: 降级。实现方式分叉属实，但当前语义仍基本等价。
- `[维度18] word-editor 的输入/对话框默认文案硬编码范围比上一轮更广`: 保留。仍有 `Set Margins`、`Watermark text`、`Add Dataset`、`No description` 等硬编码默认文案。
- `[维度18] advanced form widget 的可访问性/辅助默认文案也在继续分叉`: 保留。`array-editor` / `key-value` 的 aria-label 与 required message 仍混有硬编码英文模板。
- `[维度18] flow-designer 的 a11y/操作文案本地化也在持续偏离`: 保留。仍可见 `Expand palette`、`Expand inspector`、`Create ${...}` 这类未进 `flux.*` 的默认文案。
- `[维度18] domain page 的 override-surface 建模已出现新的跨包分叉`: 保留。`designer-page` 的 renderer definition 已声明 `toolbar/inspector/dialogs` region，但 `DesignerPageSchemaInput` 仍未显式暴露这些入口。
