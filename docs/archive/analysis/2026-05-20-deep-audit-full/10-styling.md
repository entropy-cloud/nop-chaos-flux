# 维度 10: 样式系统合规性

## 第 1 轮（初审）

### [维度10-01] Spreadsheet package CSS 的裸 `[data-slot]` 选择器作为公开样式入口全局泄漏

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:24-40`
- **行号范围**: `packages/spreadsheet-renderers/src/canvas-styles.css:24-40`; 相关公开装配见 `packages/spreadsheet-renderers/src/renderers.tsx:1`, `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:2`, `apps/playground/src/pages/report-designer-demo.tsx:2`
- **证据片段**:
  ```css
  [data-slot='spreadsheet-grid'] {
    flex: 1;
    min-height: 0;
    overflow: auto;
    border: 1px solid var(--nop-border, rgb(215, 224, 238));
    border-radius: 14px;
    background: linear-gradient(
      180deg,
      var(--nop-background, rgb(255, 255, 255)) 0%,
  ```
- **严重程度**: P2
- **违规类别**: BEM/data-slot / theme isolation / spreadsheet
- **现状**: `canvas-styles.css` 通过 package side-effect import 进入主路径，但文件内 50+ 条 package CSS 直接以裸 `[data-slot='spreadsheet-*']` 作为顶层选择器；`pnpm check:audit-styling-suspects` 已将其列为 `bare-data-slot-selector` 候选。
- **风险**: `data-slot` 是全仓共享结构标记协议，不是 spreadsheet package 的全局命名空间；任何宿主或其他 package 只要复用 `data-slot="spreadsheet-grid"` / `spreadsheet-toolbar` 等名称，即会被 spreadsheet package 的边框、布局、背景、阴影和交互样式影响。该 CSS 又被 `@nop-chaos/spreadsheet-renderers` 主渲染器和 report designer canvas 路径导入，泄漏面不是测试或 demo 私有路径。
- **建议**: 为 spreadsheet canvas 引入明确包级 scope，例如 `.nop-spreadsheet-page [data-slot='spreadsheet-grid']` 或 `.ss-grid-shell [data-slot='...']`，并保证 `SpreadsheetPageRenderer` / default host 在根节点稳定发出该 scope；保留 `ss-*` cell hot-path 策略，但把 shell/header/toolbar 的 `data-slot` 样式约束在该 subtree 内。
- **为什么值得现在做**: 当前基线是 v1 / 无兼容负担，且 owner doc 明确说 spreadsheet canvas 是“自包含渲染子树”，现在收窄 scope 可一次性防止 package CSS 变成事实上的全局 data-slot 约定，避免后续 host 集成时被迫兼容裸选择器。
- **误报排除**: 这不是“工具命中裸 `[data-slot]` 就报告”。spreadsheet canvas CSS 的 `ss-*` cell 类、raw table、inline style 和 data-state 热路径均按 owner doc 克制处理；问题只针对 package stylesheet 中未挂 package/root scope 的 bare data-slot selectors。`docs/architecture/report-designer/spreadsheet-canvas-css.md` 允许 `package-owned data-slot="spreadsheet-*"` selectors，但同时要求“只在 spreadsheet canvas surface 内部使用，不会泄漏到外壳”，裸顶层选择器没有证明这个隔离边界。
- **历史模式对应**: 对应 `docs/references/audit-tooling.md` 的 `bare-data-slot-selector` suspect 复核；同时命中 calibration pattern 8（widget-like renderer / host surface style 需强证据），本条以公开 CSS import + 裸顶层 selector + owner doc 自包含边界三者作为强证据。
- **参考文档**: `docs/references/audit-tooling.md:57`; `docs/architecture/styling-system.md:649-698`; `docs/architecture/report-designer/spreadsheet-canvas-css.md:199-204`; `docs/architecture/theme-compatibility.md:55-69`; `docs/architecture/renderer-markers-and-selectors.md:71-76`
- **复核状态**: 未复核

### [维度10-02] Spreadsheet toolbar/overlay 外壳样式被塞入 canvas-styles，越过 canvas-only CSS 边界

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:248-299`
- **行号范围**: `packages/spreadsheet-renderers/src/canvas-styles.css:248-299`; 相关 JSX 见 `packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx:9-19`
- **证据片段**:
  ```css
  [data-slot='spreadsheet-toolbar'] {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 8px;
    background: #f6f7fa;
    border-bottom: 1px solid rgb(226, 232, 240);
    min-height: 45px;
  ```
- **严重程度**: P2
- **违规类别**: spreadsheet / theme / data-slot
- **现状**: owner doc 把 spreadsheet canvas 的特殊 CSS 例外限定为 grid/cells/row-col headers/selection 等高性能 canvas 子树；但 `canvas-styles.css` 还承担 toolbar、toolbar group、separator、status、find/replace panel、cell editor、comment editor、sheet tab bar 等外壳 UI 样式，并且多处使用硬编码颜色。
- **风险**: 外壳层按 owner doc 应继续使用 shadcn/ui + Tailwind/token 模型；把 toolbar/panel chrome 放进 canvas-only stylesheet 会扩大 `ss-*` / bare data-slot 例外范围，使普通 UI chrome 继承 canvas 性能例外，后续会难以判断哪些样式必须 theme-compatible、哪些可按 cell hot-path 特例处理。
- **建议**: 将非 cell/grid hot-path 的 toolbar、find/replace、cell editor、comment editor、sheet tab bar 样式拆到明确的 spreadsheet shell stylesheet，并挂 `.nop-spreadsheet-page` 或等价 package root；优先使用 `@nop-chaos/ui` 组件 className 与 CSS variables/Tailwind semantic tokens，保留 `canvas-styles.css` 只处理 `ss-cell`、grid table shell、headers、selection/fill/frozen geometry 等 owner doc 认可的 canvas 核心。
- **为什么值得现在做**: 当前同一个 CSS 文件已成为所有 spreadsheet renderers 的 side-effect import；若继续把 shell chrome 混入 canvas 例外，后续 theme/token 审计会无法区分性能必要硬编码与普通 UI 可主题化样式。
- **误报排除**: 本条不否定 spreadsheet canvas CSS 特殊规则，也不要求把 cell 样式改成 Tailwind；它只指出 toolbar/panel/sheet tab 属于 owner doc 架构图中的 “Outer shell (toolbar, sidebar, inspector, dialogs) shadcn/ui + Tailwind”，不应借 canvas CSS 例外处理。
- **历史模式对应**: 对应 calibration pattern 8 的“host surfaces often legitimately own implementation styles”提高举证门槛；本条之所以保留，是因为 owner doc 明确区分 outer shell 与 canvas，而证据代码把 outer shell chrome 放入 canvas-only CSS 文件。
- **参考文档**: `docs/architecture/styling-system.md:673-682`; `docs/architecture/report-designer/spreadsheet-canvas-css.md:25-40`; `docs/architecture/report-designer/spreadsheet-canvas-css.md:199-204`; `docs/architecture/theme-compatibility.md:206-242`
- **复核状态**: 未复核

### [维度10-03] Report field panel package CSS 裸 `[data-slot]` selectors 未以 root marker 约束

- **文件**: `packages/report-designer-renderers/src/report-field-panel.css:1-18`
- **行号范围**: `packages/report-designer-renderers/src/report-field-panel.css:1-84`; 相关 root marker 见 `packages/report-designer-renderers/src/report-field-panel.tsx:79-83`
- **证据片段**:

  ```css
  [data-slot='report-field-panel-shell'] {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  [data-slot='report-field-panel-stack'] {
  ```

- **严重程度**: P3
- **违规类别**: BEM/data-slot / marker
- **现状**: `ReportFieldPanel` 根节点已经发出 `nop-report-field-panel` marker，但 stylesheet 没有利用该 root marker 约束选择器，而是直接以裸 `[data-slot='report-field-panel-*']` 定义布局、边框、背景和 hover 样式；主 agent baseline 中该文件 1-80 行为主要 suspect。
- **风险**: 当前 slot 名带 `report-field-panel-*` 前缀，实际碰撞概率较低；但 package CSS 已从 `src/index.ts` side-effect import 进入公开主路径，裸选择器仍把内部 slot 名提升成全局 CSS 约定，削弱 `data-slot` 作为结构标记而非全局样式命名空间的边界。
- **建议**: 将选择器改为 `.nop-report-field-panel[data-slot='report-field-panel-shell']`、`.nop-report-field-panel [data-slot='report-field-panel-item']` 等 root-scoped 形式；保持现有 visual output 和 data-slot 名称不变，只收窄 CSS 作用域。
- **为什么值得现在做**: 修复是局部机械收窄，风险低；并且该文件已经是自动化 suspect 的集中来源，收口后可以减少后续审计噪音，并把 package CSS 与 `theme-compatibility.md` 的 facade/root scoping 方向对齐。
- **误报排除**: owner doc 明确记录 report-field-panel package-owned styling “via stable data-slot markers”，因此本条不主张迁回 playground，也不否定这些 package-owned styles；问题仅在于已有 `.nop-report-field-panel` root marker 未参与 selector scope，导致裸 data-slot 可全局匹配。
- **历史模式对应**: 对应 `bare-data-slot-selector` suspect；同时按用户要求对裸 `[data-slot]` 候选证明泄漏，本条证据是 package public side-effect CSS + root marker 存在但未使用，而不是仅凭 selector 形态。
- **参考文档**: `docs/references/audit-tooling.md:57`; `docs/architecture/theme-compatibility.md:55-69,253-258`; `docs/architecture/renderer-markers-and-selectors.md:52-76`; `docs/architecture/styling-system.md:398-406`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度10-04] Flow Designer 的 config-level `classAliases` 会覆盖宿主/page 级别名继承

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-xyflow-canvas\designer-xyflow-node.tsx:201-206`
- **行号范围**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:201-206,232-244`; 相关实现见 `packages/flux-core/src/class-aliases.ts:34-42`、`packages/flux-react/src/node-renderer-resolved.tsx:134-150`
- **证据片段**:
  ```tsx
  <ClassAliasesContext.Provider value={config.classAliases}>
    <RenderNodes
      input={nodeType.body}
      options={{ bindings: nodeRenderData, scopeKey: `node:${props.id}`, pathSuffix: 'node' }}
    />
  </ClassAliasesContext.Provider>
  ```
- **严重程度**: P2
- **违规类别**: classAlias
- **现状**: 普通 Flux 渲染链会通过 `mergeClassAliases(parentClassAliases, nodeClassAliases)` 保留父级别名并允许子级覆盖；但 Flow Designer 节点 body / quickActions 手工包了一层 `ClassAliasesContext.Provider value={config.classAliases}`，直接替换当前 context，没有合并外层 page/schema 已建立的 `classAliases`。
- **风险**: 宿主在 page 或外层 schema 定义的通用别名进入 designer node body 后会失效；同时 `DesignerConfig.classAliases` 变成孤立命名空间，破坏文档承诺的 “page level aliases available to all children / child overrides parent” 继承模型。该路径渲染 node body 和 quickActions，属于 Flow Designer 的主要可配置 schema 插槽。
- **建议**: 在 `designer-xyflow-node.tsx` 读取当前 `ClassAliasesContext`，使用 `mergeClassAliases(parentAliases, config.classAliases)` 后再提供给 node body / quickActions；或复用 flux-react 已有 provider 构建路径，确保 config-level aliases 只是子级覆盖而不是替换外层作用域。
- **为什么值得现在做**: Flow Designer 当前仍在形成可配置 designer schema 的主路径契约，修复点集中且不改变既有 class 名输出；现在收敛可避免后续宿主把别名失效误判为 Tailwind 扫描、主题或 schema 写法问题。
- **误报排除**: 这不是要求 Flow Designer 不能拥有自己的设计器别名；`DesignerConfig.classAliases` 是合理的领域级别名入口。问题仅在于当前实现覆盖而非合并，和 `flux-core` 已有 `mergeClassAliases` 继承语义不一致。
- **历史模式对应**: 对应 `docs/references/deep-audit-calibration-patterns.md` pattern 10（跨包一致性想法需证明真实契约影响）。本条保留的原因是 `classAliases` 继承是样式系统文档明确契约，且 live `RenderNodes` 插槽会实际消费该 context，不只是实现风格差异。
- **参考文档**: `docs/architecture/styling-system.md:340-366`; `docs/architecture/styling-system.md:368-374`; `packages/flux-core/src/class-aliases.ts:34-42`; `packages/flux-react/src/node-renderer-resolved.tsx:134-150`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度10-05] Flow Designer 仍保留 `themeStyles` 原始 CSS 注入，绕过 classAliases 与 CSS 变量主题契约

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page-body.tsx:334-340`
- **行号范围**: `packages/flow-designer-renderers/src/designer-page-body.tsx:334-340`; 相关公开类型见 `packages/flow-designer-core/src/types.ts:80-84,272-275`
- **证据片段**:
  ```tsx
  return (
    <DesignerContext.Provider value={ctxValue}>
      <div ref={rootRef} className="contents">
        {config.themeStyles && <style>{config.themeStyles}</style>}
        <WorkbenchShell
          className={cn('nop-designer fd-theme-root text-foreground', props.meta.className)}
          data-testid={props.meta.testid || undefined}
  ```
- **严重程度**: P2
- **违规类别**: 主题 / classAlias / Tailwind
- **现状**: `DesignerConfig.themeStyles?: string` 仍是 `flow-designer-core` 的公开配置字段，并在 Flow Designer 主渲染路径中直接渲染为 `<style>`；这让配置可以注入任意原始 CSS，而不是通过 `className`、`classAliases`、`config.nodeTypes[].appearance` 或 `.fd-theme-root` / `--fd-*` 变量参与样式系统。
- **风险**: 原始 CSS 字符串没有自动 scope 到 `.nop-designer` / `.fd-theme-root`，也不受 Tailwind content scan、classAliases 继承、token fallback 或 selector protocol 约束；宿主 schema 一旦使用该入口，可能覆盖全页 `[data-slot]`、`.nop-*` 或第三方节点样式，形成难以复核的隐式主题层，并把 Flow Designer 的视觉契约从“CSS 变量 + stable classes”退回到运行时 CSS 注入。
- **建议**: 在 v1 基线下移除公开 `themeStyles` 主路径，或至少将其降级为明确受限的 scoped stylesheet 能力：自动包裹/校验 `.nop-designer` 或 `.fd-theme-root` 前缀、禁止裸全局选择器，并优先把节点/边语义视觉迁入 `classAliases`、`appearance` 字段和 `--fd-*` token；同步删除 `DesignerConfig` / `NormalizedDesignerConfig` 中的裸字符串入口。
- **误报排除**: 这不是把 schema 显式样式能力误判为违规；`className`、`classAliases` 和 `appearance` 仍是合理的显式样式入口。问题在于 `themeStyles` 是未限定作用域的原始 CSS 注入，绕过了当前 styling-system 文档列出的三种 authoring modes 和 theme-compatibility 的 CSS-variable contract。`docs/components/designer-canvas/design.md` 虽仍提到 `themeStyles`，但更高优先级的 `docs/architecture/styling-system.md` / `theme-compatibility.md` 不把原始 style 注入列为当前主题机制，且归档计划也说明该 escape hatch 不应作为最终样式方向。
- **参考文档**: `docs/architecture/styling-system.md:186-194`; `docs/architecture/styling-system.md:340-374`; `docs/architecture/theme-compatibility.md:20-31`; `docs/architecture/theme-compatibility.md:222-242`; `docs/archive/plans/16-flow-designer-style-json-driven-migration-plan.md:7-19`
- **复核状态**: 未复核

## 深挖第 4 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度10-01]: 保留 (P2)。`packages/spreadsheet-renderers/src/canvas-styles.css:24-247` 仍以裸 `[data-slot='spreadsheet-*']` 顶层选择器公开 spreadsheet grid/header/editor/status 样式，没有 package/root scope 约束。
- [维度10-02]: 保留 (P2)。同一 `canvas-styles.css:248+` 仍把 toolbar/status/find-replace 等外壳 chrome 放进 canvas-only stylesheet，并继续使用多处硬编码颜色，未与 canvas hot-path 样式边界分离。
- [维度10-03]: 保留 (P3)。`packages/report-designer-renderers/src/report-field-panel.css:1-84` 仍全部使用裸 `[data-slot='report-field-panel-*']` 选择器，虽然 slot 前缀碰撞风险较低，但 live CSS 作用域仍未利用现有 root marker 收窄。
- [维度10-04]: 保留 (P2)。`packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:201-206,232-244` 仍直接 `ClassAliasesContext.Provider value={config.classAliases}`，未与外层 page/schema aliases 合并，和 `mergeClassAliases` 继承契约不一致。
- [维度10-05]: 保留 (P2)。`packages/flow-designer-renderers/src/designer-page-body.tsx:334-338` 仍在主路径直接渲染 `config.themeStyles` 到 `<style>`，公开 raw CSS 注入入口依旧绕过 classAliases / CSS 变量主题契约。

## 子项复核结论

- [维度10-01]: 成立 (P2)。Spreadsheet canvas styles 仍缺 root/package scope。
- [维度10-02]: 成立 (P2)。canvas-only stylesheet 仍混入外壳 chrome 与硬编码颜色。
- [维度10-03]: 降级保留 (P3)。Report field panel CSS scope 问题存在，但碰撞风险较低。
- [维度10-04]: 成立 (P2)。Flow Designer classAliases 继承契约仍未合并。
- [维度10-05]: 成立 (P2)。themeStyles raw CSS 注入仍绕过主题契约。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                                   | 一句话摘要                                                              |
| ----- | -------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 10-01 | P2       | `packages/spreadsheet-renderers/src/canvas-styles.css:24-247`                                          | spreadsheet canvas 样式仍以裸 slot 选择器公开                           |
| 10-02 | P2       | `packages/spreadsheet-renderers/src/canvas-styles.css:248+`                                            | canvas-only stylesheet 仍混入 toolbar/status/find-replace 等外壳 chrome |
| 10-03 | P3       | `packages/report-designer-renderers/src/report-field-panel.css:1-84`                                   | report field panel CSS 仍未利用 root marker 收窄作用域                  |
| 10-04 | P2       | `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:201-206,232-244` | Flow Designer classAliases 仍未与外层 aliases 合并                      |
| 10-05 | P2       | `packages/flow-designer-renderers/src/designer-page-body.tsx:334-338`                                  | Flow Designer 仍直接渲染 `themeStyles` raw CSS                          |
