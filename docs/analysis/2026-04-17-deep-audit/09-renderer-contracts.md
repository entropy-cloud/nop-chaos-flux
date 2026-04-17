# 09 渲染器契约合规性

- Task ID: `ses_268f5ada6ffeRRI3Twt0r9zM7a`
- Source prompt: `docs/skills/deep-audit-prompts.md`

# 维度09审计结论：渲染器契约合规性

## 按渲染器合规评分

### flux-renderers-basic
| 渲染器 | 评分 |
|---|---|
| page | C |
| container | A |
| fragment | A |
| loop | C |
| recurse | C |
| flex | A |
| text | A |
| button | A |
| icon | A |
| badge | A |
| scope-debug | A |
| dynamic-renderer | A |
| reaction | A |
| dialog | A |
| drawer | A |
| tabs | A |

### flux-renderers-form
| 渲染器 | 评分 |
|---|---|
| form | A |
| input-text / input-email / input-password | A |
| select | C |
| textarea | A |
| checkbox | C |
| switch | C |
| radio-group | C |
| checkbox-group | C |

### flux-renderers-data
| 渲染器 | 评分 |
|---|---|
| table | D |
| data-source | A |
| chart | A |
| tree | C |

### flux-renderers-form-advanced
| 渲染器 | 评分 |
|---|---|
| input-tree | C |
| tree-select | C |
| tag-list | C |
| key-value | D |
| array-editor | D |
| condition-builder | D |
| object-field | A |
| array-field | A |
| variant-field | C |
| detail-field | C |
| detail-view | C |

## 代表性违规项

### [维度09] 渲染器名: page-renderer
- **合规评分**: C
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\page.tsx:13-17`
  - **严重程度**: P1
  - **契约条款**: 渲染路径必须通过标准响应式 hooks 读取运行时数据；不得在渲染路径中直接使用 `scope.get(...)`
  - **现状**: `PageRenderer` 通过 `props.node.scope.get('refreshTick')` 生成 `summary`，属于 imperative read，不走 `useScopeSelector`
  - **建议**: 改为用 `useScopeSelector` 订阅 `refreshTick`，避免非响应式读取和潜在的重渲染遗漏
  - **参考文档**: `docs/architecture/renderer-runtime.md`

### [维度09] 渲染器名: loop-renderer
- **合规评分**: C
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\loop.tsx:22-38`
  - **严重程度**: P2
  - **契约条款**: 不应在渲染器内部引入 ad-hoc React context；共享运行时能力应通过标准 hooks 或显式 render handle 传递
  - **现状**: `LoopRenderer` 通过 `StructuralLoopContext.Provider` 注入自定义上下文，形成包内私有的 ambient contract
  - **建议**: 将循环递归所需的上下文收敛到显式 region bindings / instancePath，或提升为 `flux-react` 标准 hook/上下文能力
  - **参考文档**: `docs/architecture/renderer-runtime.md`

### [维度09] 渲染器名: recurse-renderer
- **合规评分**: C
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\recurse.tsx:20-39`
  - **严重程度**: P2
  - **契约条款**: 不应在渲染器内部引入 ad-hoc React context；共享运行时能力应通过标准 hooks 或显式 render handle 传递
  - **现状**: `RecurseRenderer` 依赖并继续传播 `StructuralLoopContext`，使递归协议建立在包内私有 context 之上
  - **建议**: 改为显式传递循环/递归绑定，避免私有 React context 成为渲染器契约的一部分
  - **参考文档**: `docs/architecture/renderer-runtime.md`

### [维度09] 渲染器名: table-renderer
- **合规评分**: D
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer.tsx:145-150,192-240,300-325,390-401,499-500`
  - **严重程度**: P1
  - **契约条款**: 渲染器只应发出 marker class，不得在渲染器代码中注入隐式布局/视觉样式
  - **现状**: `TableRenderer` 在渲染器层大量硬编码 `flex`、`gap-*`、`overflow-*`、`rounded`、`hover:*`、`text-muted-*`、`absolute inset-0` 等布局与视觉类，已经超出 marker/结构职责
  - **建议**: root 保留 `nop-table`；内部结构以 `data-slot` 为主；布局与视觉默认收敛到 `@nop-chaos/ui` 表格组件或 schema 显式样式
  - **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`

### [维度09] 渲染器名: tree-renderer
- **合规评分**: C
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\tree-renderer.tsx:73-109`
  - **严重程度**: P2
  - **契约条款**: 渲染器只应发出 marker class，不得在渲染器代码中注入隐式布局/视觉样式
  - **现状**: 节点行直接硬编码 `flex items-start gap-2`、`paddingInlineStart`、`hover:bg-muted`、`rounded-md px-2 py-1.5` 等布局/视觉规则
  - **建议**: 将节点结构暴露为 `data-slot`，把缩进、间距、hover、按钮视觉等转移到 UI 层或 schema 样式
  - **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`

### [维度09] 渲染器名: tree-select-renderer
- **合规评分**: C
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tree-controls.tsx:194-212`
  - **严重程度**: P2
  - **契约条款**: 交互元素应使用 `@nop-chaos/ui` 组件；不得用原生/伪原生交互节点替代
  - **现状**: 清空操作使用了 `span` + `role="button"` + `tabIndex={0}` 伪造按钮，而不是 UI 组件
  - **建议**: 改为 `Button variant="ghost" size="icon">` 或等价 UI 组件
  - **参考文档**: `docs/architecture/styling-system.md`

### [维度09] 渲染器名: tag-list-renderer
- **合规评分**: C
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tag-list.tsx:15-24`
  - **严重程度**: P1
  - **契约条款**: 复杂字段值应从 form store / 响应式 hooks 读取，不应通过 imperative `scope.get(...)` 派生当前值
  - **现状**: 选中值通过 `readCheckboxGroupValue(scope, name)` 读取，而不是使用已由 `useFormFieldController` 提供的响应式值
  - **建议**: 直接从订阅态字段值派生 tags 选中状态，避免非响应式读取和 form/scope 双来源偏移
  - **参考文档**: `docs/architecture/renderer-runtime.md`

### [维度09] 渲染器名: array-editor-renderer
- **合规评分**: D
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\array-editor.tsx:143-202`
  - **严重程度**: P1
  - **契约条款**: 复杂字段不得维护与 form store 并存的本地值状态；字段值必须以 store 为单一事实来源
  - **现状**: `items` 通过 `useState` 持有本地副本，再与 form/scope 双向同步，形成双状态模型
  - **建议**: 移除本地值镜像，改为完全从 `useCurrentFormState` / `useScopeSelector` 派生；仅保留纯 UI 瞬时状态
  - **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/form-validation.md`

### [维度09] 渲染器名: key-value-renderer
- **合规评分**: D
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\key-value.tsx:208-274`
  - **严重程度**: P1
  - **契约条款**: 复杂字段不得维护与 form store 并存的本地值状态；字段值必须以 store 为单一事实来源
  - **现状**: `pairs` 通过 `useState` 维护本地副本，再与 form/scope 双向同步
  - **建议**: 以 form store 为唯一值源，移除本地镜像状态与额外同步逻辑
  - **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/form-validation.md`

### [维度09] 渲染器名: condition-builder-renderer
- **合规评分**: D
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\condition-builder\ConditionBuilder.tsx:55-100`
  - **严重程度**: P1
  - **契约条款**: 复杂字段不得维护与 form store 并存的本地值状态；字段值必须以 store 为单一事实来源
  - **现状**: `localValue` 使用 `useState` 保存条件树本地副本，再与 form/scope 同步
  - **建议**: 收敛到 store 单源，renderer 仅消费订阅值；必要的编辑会话状态应与字段值状态分离
  - **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/form-validation.md`

### [维度09] 渲染器名: variant-field-renderer
- **合规评分**: C
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx:85-95,127-165`
  - **严重程度**: P2
  - **契约条款**: 复杂字段的关键状态不应由 renderer 本地 `useState` 持有；应由 runtime/store 或可重算规则统一拥有
  - **现状**: `userSelectedKey` / `detectedKey` 为本地状态，直接决定活跃 variant 与子树渲染
  - **建议**: 将 active variant 收敛为可持久化的 store/runtime 状态，或严格由当前值 + 检测规则纯推导
  - **参考文档**: `docs/architecture/renderer-runtime.md`

### [维度09] 渲染器名: detail-field-renderer
- **合规评分**: C
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:57-60,73-163`
  - **严重程度**: P2
  - **契约条款**: 复杂字段不应在 renderer 内维护独立 owner 状态；surface/draft/pending 等状态应由 runtime/owner 边界统一拥有
  - **现状**: `open`、`draftForm`、`confirming`、`draftError` 全部由 renderer 本地 `useState` 管理
  - **建议**: 将 surface 打开态、草稿 runtime、确认中状态收敛到 runtime/owner 层，通过 hooks 消费
  - **参考文档**: `docs/architecture/renderer-runtime.md`

### [维度09] 渲染器名: detail-view-renderer
- **合规评分**: C
- **违规项**:
  - **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx:57-60,81-227`
  - **严重程度**: P2
  - **契约条款**: 复杂字段不应在 renderer 内维护独立 owner 状态；surface/draft/pending 等状态应由 runtime/owner 边界统一拥有
  - **现状**: `open`、`draftForm`、`confirming`、`draftError` 由 renderer 本地状态管理，并承担提交/回写流程编排
  - **建议**: 将 detail-view 的 surface/draft owner 迁移到 runtime/owner 层，renderer 只负责消费状态与渲染
  - **参考文档**: `docs/architecture/renderer-runtime.md`

## 无问题渲染器

- `container-renderer`
- `fragment-renderer`
- `flex-renderer`
- `text-renderer`
- `button-renderer`
- `icon-renderer`
- `badge-renderer`
- `scope-debug-renderer`
- `dynamic-renderer`
- `reaction-renderer`
- `dialog-renderer`
- `drawer-renderer`
- `tabs-renderer`
- `form-renderer`
- `input-text-renderer / input-email-renderer / input-password-renderer`
- `textarea-renderer`
- `data-source-renderer`
- `chart-renderer`
- `object-field-renderer`
- `array-field-renderer`
