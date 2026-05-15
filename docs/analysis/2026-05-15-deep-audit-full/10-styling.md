# 维度 10：样式系统合规性

## 第 1 轮（初审）

### [维度10-01] `default-spacing.css` 的裸 `[data-slot]` 选择器会真实改写 `@nop-chaos/ui` 同名 slot，发生跨包样式泄漏

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\src\default-spacing.css`
  - `C:\can\nop\nop-chaos-flux\packages\ui\src\components\ui\tabs.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\ui\src\components\ui\field.tsx`
- **证据片段**:

  ```css
  [data-slot='tabs-content'] {
    display: block;
  }

  [data-slot='field-label'] {
    ...
  }
  ```

- **严重程度**: P1
- **违规类别**: BEM / data-slot 作用域泄漏
- **现状**: `default-spacing.css` 直接写裸选择器 `[data-slot='tabs-content']`、`[data-slot='field-label']`、`[data-slot='field-description']`、`[data-slot='field-error']`；`@nop-chaos/ui` 也会发出这些同名 slot。
- **建议**: 给 Flux 默认间距规则补 renderer root 或 facade root 作用域，不要让 package 级 CSS 跨包命中公共 UI slot 名。
- **为什么值得现在做**: 一旦消费者加载 `@nop-chaos/flux-react/default-spacing.css`，普通 UI Tabs/Field 也会被 Flux 默认样式改写。
- **误报排除**: 这不是工具噪音；已确认同名 slot 在 `@nop-chaos/ui` live path 中存在并可被命中。
- **历史模式对应**: 对应 `bare-data-slot-selector` suspect 的真实泄漏案例。
- **参考文档**: `docs/architecture/styling-system.md`、`docs/architecture/theme-compatibility.md`、`docs/references/audit-tooling.md`
- **复核状态**: 未复核

### [维度10-02] `@nop-chaos/flux/style.css` 仍暴露失效 BEM selector，和 live DOM contract 不一致

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-bundle\src\style.css`
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-error-boundary.tsx`
- **证据片段**:
  ```css
  .nop-node-error__message { ... }
  .nop-node-error__retry { ... }
  ```
- **严重程度**: P2
- **违规类别**: BEM / public CSS contract drift
- **现状**: facade CSS 仍使用 `.nop-node-error__message`、`.nop-node-error__retry`，但 live DOM 已改成 `data-slot="node-error-message"`、`data-slot="node-error-retry"`。
- **建议**: 删除失效 BEM 选择器或改成与当前 slot/marker 契约一致的选择器。
- **为什么值得现在做**: `@nop-chaos/flux/style.css` 是 public facade 样式导出，当前协议已经失效且误导消费者。
- **误报排除**: 这不是历史遗留但无害的注释；它仍在公共导出面中暴露错误协议。
- **历史模式对应**: 对应 public CSS contract 与 live DOM 漂移。
- **参考文档**: `docs/architecture/styling-system.md`、`docs/architecture/renderer-markers-and-selectors.md`
- **复核状态**: 未复核

### [维度10-03] spreadsheet canvas 的 package-owned 视觉 chrome 大量硬编码颜色，未满足 theme compatibility 的 CSS 变量边界

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\canvas-styles.css`
- **证据片段**:
  ```css
  background: rgb(...);
  border-color: #...;
  background-image: linear-gradient(...);
  ```
- **严重程度**: P2
- **违规类别**: 主题独立性
- **现状**: grid shell、header chrome、active/filtered 状态、resize handle、toolbar/popup chrome 等仍大量直接写死 `rgb(...)`、hex、gradient。
- **建议**: 把 package-owned visual token 化为 CSS variables 或宿主可覆盖语义色，保留 widget 自有样式但收敛颜色来源。
- **为什么值得现在做**: 宿主当前无法通过 token/root override 稳定接管这部分视觉，theme compatibility 边界不完整。
- **误报排除**: 这不是误报 widget renderer 的合法自有样式；允许自有样式不等于允许无 token 的颜色硬编码。
- **历史模式对应**: 对应 package-owned widget visual token 化不完整。
- **参考文档**: `docs/architecture/theme-compatibility.md`、`docs/architecture/styling-system.md`
- **复核状态**: 未复核

## 初审排除项

- `packages/report-designer-renderers/src/report-field-panel.css`：slot 名是 namespaced `report-field-panel-*`，当前未见跨包同名命中，按 live baseline 不保留为泄漏。
- `packages/spreadsheet-renderers/src/canvas-styles.css` 中 bare `data-slot="spreadsheet-*"`：当前只在 spreadsheet grid subtree 发出，不保留为 bare-slot 泄漏，但其主题独立性问题另行保留。
- `default-spacing.css` 中 `schema-root-fallback-message`、`node-error-message`、`node-error-retry`：slot 名唯一，当前仅在 `flux-react` 内部使用。
- classAliases、layout renderer 间距/布局硬编码、ThemeProvider、Tailwind 覆盖层次：本轮未见新的 live contract 违约。

## 维度复核结论

- [维度10-01]：保留 (P1)。裸 `data-slot` 选择器会命中 `@nop-chaos/ui` 同名 slot，真实跨包泄漏成立。
- [维度10-02]：保留 (P2)。facade public CSS 仍暴露失效 BEM selector，和 live DOM contract 不一致。
- [维度10-03]：降级为 P2。应收窄为 toolbar/editor/shell chrome 的 token 化缺口，高密度 canvas 内核颜色不应一揽子判违规。

## 子项复核结论

- [维度10-01]：成立。当前 root scope 不足以阻止跨包命中公共 UI slot。
- [维度10-03]：降级。保留 toolbar/editor/shell chrome token 化问题，撤销对高密度 canvas 内核颜色的一揽子指控。

## 最终保留项

| 编号  | 严重程度 | 文件                                          | 一句话摘要                                              |
| ----- | -------- | --------------------------------------------- | ------------------------------------------------------- |
| 10-01 | P1       | `packages/flux-react/src/default-spacing.css` | 裸 `data-slot` 选择器跨包命中 `@nop-chaos/ui` 同名 slot |
| 10-02 | P2       | `packages/flux-bundle/src/style.css`          | public facade CSS 仍暴露失效 BEM selector               |
