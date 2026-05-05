# 维度 10：样式系统合规性

## 第1轮初审

### [维度10] Playground Flow Designer 仍保留 BEM 选择器主路径

- **文件**: `apps/playground/src/flow-designer-nodes.css:13-18`
- **严重程度**: P2
- **违规类别**: BEM
- **现状**: live playground 节点样式仍以 `__` / `--` 选择器作为内部区域与状态表达主路径。
- **建议**: 迁移到 `data-slot` / `data-*` 或 marker root + classAliases。

### [维度10] Playground Flow Designer live schema 仍把 BEM class 当作作者可用样式接口

- **文件**: `apps/playground/src/schemas/dingtalk-workflow-tree-schema.json:109-115`
- **严重程度**: P2
- **违规类别**: BEM
- **现状**: live schema 直接暴露 `nop-dt-node__*` 作为 `className`。
- **建议**: 改为 marker root + utility/classAliases。

### [维度10] DingFlow/Flow Designer 多处共享视觉仍以内联颜色/hex fallback 实现

- **文件**: `packages/flow-designer-renderers/src/dingflow/dingflow-theme.ts:17-23`, `packages/flow-designer-renderers/src/designer-node-appearance.ts:22-38`
- **严重程度**: P2/P3
- **违规类别**: 主题
- **现状**: 边标签背景/边框、节点 fallback palette 仍在 TS 内硬编码。
- **建议**: 收敛为 token 或 package CSS class。

## 深挖第2轮追加

### [维度10] NodeErrorBoundary 把稳定错误壳层视觉样式固化在 inline style

- **文件**: `packages/flux-react/src/node-error-boundary.tsx:47-58`
- **严重程度**: P2
- **违规类别**: 主题
- **建议**: 将稳定视觉迁移到 package CSS / token class。

### [维度10] CodeMirror 默认主题把稳定边框/焦点/禁用背景写在 JS 主题对象中

- **文件**: `packages/flux-code-editor/src/extensions/base.ts:30-45`
- **严重程度**: P2
- **违规类别**: 主题
- **建议**: 仅保留 CodeMirror 必需的最小动态片段，其余迁移到统一 theme contract。

### [维度10] Flow Designer inspector / add-node menu 继续用 inline style 生成共享视觉

- **文件**: `packages/flow-designer-renderers/src/designer-inspector.tsx:51-56`, `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx:44-47`
- **严重程度**: P2/P3
- **违规类别**: 主题
- **建议**: 将 accent 派生与固定尺寸背景收敛到 CSS variable / package CSS。

## 深挖第4轮追加

### [维度10] Flow Designer palette 外观类仍在 package CSS 中硬编码整组渐变色

- **文件**: `packages/flow-designer-renderers/src/designer-theme.css:48-79`
- **严重程度**: P2
- **违规类别**: 主题
- **建议**: 将默认渐变色映射到 token / config-driven variable。

### [维度10] `fd-palette-item` 稳定视觉大量散落在 JSX utility 串

- **文件**: `packages/flow-designer-renderers/src/designer-palette.tsx:123-126`
- **严重程度**: P3
- **违规类别**: 间距 / 共享壳层默认视觉分散
- **建议**: 将稳定 chrome 更多下沉到 package CSS / token。

### [维度10] flux-react / table sticky / debugger 多处错误消费 HSL token 或绕开 token 层

- **文件**: `packages/flux-react/src/default-spacing.css:112-126`, `packages/flux-renderers-data/src/table-renderer/fixed-columns.ts:39-44`, `packages/nop-debugger/src/panel/styles-css.ts:281-326`
- **严重程度**: P2/P3
- **违规类别**: 主题
- **现状**: `--foreground` / `--background` 被当作完整颜色值使用；debugger overlay/json 语法色仍直接写死。
- **建议**: 改为 `hsl(var(--token))` 或引入 `--nop-debugger-*` token。

## 深挖统计

- 第1轮发现数：4
- 第2轮新增：4
- 第3轮新增：0
- 第4轮新增：4

## 维度复核结论

- 初审与深挖共 9 项，独立复核后保留 3 项、降级 4 项、驳回 2 项。
- 复核后高置信问题主要收敛到两类：playground 仍把 BEM 作为外部样式接口，以及部分 live CSS/TS 仍错误消费 HSL token。

## 子项复核结论

- `[维度10] Playground Flow Designer 仍保留 BEM 选择器主路径`: 保留。仍以 `__`/`--` 作为内部区域与状态主选择器，和文档要求冲突。
- `[维度10] Playground Flow Designer live schema 仍把 BEM class 当作作者可用样式接口`: 保留。live schema 直接暴露 BEM 类，等于把已弃用的内部命名约定变成外部接口。
- `[维度10] DingFlow/Flow Designer 多处共享视觉仍以内联颜色/hex fallback 实现`: 降级。硬编码 fallback 色板确实削弱主题化，但其中一部分更像组件默认语义配色。
- `[维度10] NodeErrorBoundary 把稳定错误壳层视觉样式固化在 inline style`: 降级。这是 fallback UI 的局部问题，影响面较小。
- `[维度10] CodeMirror 默认主题把稳定边框/焦点/禁用背景写在 JS 主题对象中`: 驳回。CodeMirror 主题对象本来就是其官方样式承载方式，且该包属于自带完整内部样式的 widget renderer。
- `[维度10] Flow Designer inspector / add-node menu 继续用 inline style 生成共享视觉`: 降级。混有必要的动态定位/动态颜色与少量固定视觉，值得收敛但不构成高置信硬违规。
- `[维度10] Flow Designer palette 外观类仍在 package CSS 中硬编码整组渐变色`: 降级。package CSS 中保留默认渐变主题可接受，只是 token 化程度不够。
- `[维度10] fd-palette-item 稳定视觉大量散落在 JSX utility 串`: 驳回。widget renderer 在 JSX 中直接携带内部 utility 样式是允许的。
- `[维度10] flux-react / table sticky / debugger 多处错误消费 HSL token 或绕开 token 层`: 保留。`var(--foreground)` / `var(--background)` 被直接当颜色值使用，且 debugger 也存在硬编码色。
