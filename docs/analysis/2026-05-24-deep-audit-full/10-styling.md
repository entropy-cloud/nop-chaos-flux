# 维度 10：样式系统合规性

## 第 1 轮（初审）

本轮已按要求读取共享前缀文档、维度 10 正文与 owner 文档，并 live code 复核 `pnpm check:audit-styling-suspects` 输出。以下为初审线索，尚未进入独立复核结论。

### [维度10-01] Spreadsheet inline editor/status 的 `data-slot` CSS 选择器缺少 spreadsheet 子树作用域

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:307-329`
- **证据片段**:

  ```css
  [data-slot='spreadsheet-cell-editor-input'] {
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  [data-slot='spreadsheet-cell-editor-input']:focus,
  .ss-cell-edit-input:focus {
    outline: none;
  }
  ```

- **严重程度**: P3
- **违规类别**: BEM / `[data-slot]` 作用域
- **现状**: `canvas-styles.css` 是 `@nop-chaos/spreadsheet-renderers` 的包级导出 CSS，但这组选择器直接以 `[data-slot='spreadsheet-*']` 命中，没有 `.nop-spreadsheet-page`、`[data-slot='report-designer-spreadsheet-canvas']` 或 `[data-slot='spreadsheet-grid']` 等 spreadsheet surface/canvas scope。
- **风险**: 该 stylesheet 一旦被 host 全局导入，会把 `spreadsheet-cell-editor-input` / `spreadsheet-edit-status` 这类 slot 名作为全局样式钩子处理，违背 spreadsheet canvas “自包含渲染子树”的 owner 文档边界；后续自定义 spreadsheet 外壳或嵌入式 toolbar 若复用这些 slot，可能在非预期 DOM 位置继承 canvas 内联编辑样式。
- **建议**: 将选择器锚定到 spreadsheet 子树，例如 `.nop-spreadsheet-page [data-slot='spreadsheet-grid'] [data-slot='spreadsheet-cell-editor-input']`，并补齐 report-designer canvas 挂载路径；或给 inline editor/status 外层提供稳定 scoped marker 后再选择。
- **为什么值得现在做**: 这是 package CSS 全局导入时的真实泄漏风险，修复可局部改 selector，不影响组件逻辑。
- **误报排除**: 不是仅凭 `bare-data-slot-selector` 命中报告。已对比同文件大量带 `.nop-spreadsheet-page` / `[data-slot='report-designer-spreadsheet-canvas']` 的候选；本组选择器确实缺少同类 scope。也不是 spreadsheet hybrid CSS 例外本身，问题在包级选择器作用域，而不是 `ss-*` / inline style 策略。
- **历史模式对应**: 包级 CSS 裸 data-slot selector 泄漏模式。
- **参考文档**: `docs/architecture/styling-system.md`; `docs/architecture/theme-compatibility.md`; `docs/architecture/report-designer/spreadsheet-canvas-css.md`
- **复核状态**: 未复核

### [维度10-02] Spreadsheet 默认 toolbar 位于 canvas hybrid 边界外，却保留硬编码浅色视觉

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:332-384`
- **证据片段**:
  ```css
  [data-slot='spreadsheet-default-toolbar'] [data-slot='spreadsheet-toolbar'] {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 8px;
    background: #f6f7fa;
    border-bottom: 1px solid rgb(226, 232, 240);
    min-height: 45px;
    flex-wrap: wrap;
  }
  ```
- **严重程度**: P2
- **违规类别**: 主题
- **现状**: `spreadsheet-default-toolbar` 是 Spreadsheet 默认外壳 toolbar，不是高密度 cell canvas；但它在 package CSS 中使用硬编码浅色背景、border、badge、active state 色值（如 `#f6f7fa`、`#cecece`、`rgb(219, 234, 254)`、`#e0e7ff`）。
- **风险**: `theme-compatibility.md` 要求 renderer/package-owned reusable visuals 通过稳定 class/slot + CSS variables 响应 host theme，而 spreadsheet owner 文档也把 outer shell 定义为 shadcn/ui + Tailwind 边界。该 toolbar 硬编码浅色 palette 会削弱 `.nop-theme-root` / host token override，暗色或品牌主题下容易形成局部不可主题化区域。
- **建议**: 将 toolbar 外壳视觉改为 `var(--nop-surface)`、`var(--nop-border)`、`var(--nop-body-copy)`、`var(--nop-accent)` 等 token；保留 layout 尺寸与交互状态即可。若某些色值是 Excel-like 产品默认，应先定义 package token fallback，再用变量读取。
- **为什么值得现在做**: 这是用户可见外壳而非高性能 canvas 内部，修复能提升主题兼容性且不涉及重构核心渲染。
- **误报排除**: 未把 canvas cell 的性能优先 hybrid CSS 机械判为问题；本条限定在 default toolbar 外壳，属于 owner 文档中“outer shell”区域，不享受 cell canvas 的 Tailwind/变量例外。
- **历史模式对应**: package-owned reusable visual 硬编码浅色 palette，未接入主题 token。
- **参考文档**: `docs/architecture/theme-compatibility.md`; `docs/architecture/styling-system.md`; `docs/architecture/report-designer/spreadsheet-canvas-css.md`
- **复核状态**: 未复核

## 按 renderer 分类的样式违规清单

- **Spreadsheet renderer**: `[维度10-01]` inline cell editor/status selector 缺少 spreadsheet 子树 scope；`[维度10-02]` default toolbar 外壳硬编码浅色视觉，主题变量接入不足。
- **Layout renderers（page/container/flex/form/fieldset）**: 初审未发现新的高价值违规。`nop-page`、`nop-container`、`nop-flex`、`nop-form`、`nop-fieldset` 的根 marker 与默认 spacing CSS 基本符合 owner doc。
- **Widget renderers（table/tree/crud/condition-builder/word-editor/flow-designer 等）**: 未机械报告内部 `flex/gap/padding`，因 widget renderer 可拥有完整内部视觉。零散内部样式未在本轮形成高价值、可行动缺陷。

## suspect 排除 / 保留

- **保留**: `packages/spreadsheet-renderers/src/canvas-styles.css:307-329` 裸 `[data-slot='spreadsheet-cell-editor-input']` / `[data-slot='spreadsheet-edit-status']` 缺少 spreadsheet scope。
- **排除**: 同文件多数 `[data-slot='report-designer-spreadsheet-canvas'] [data-slot='spreadsheet-grid'] ...` 虽被 scanner 命中，但 live code 已有 report-designer canvas scope。
- **排除**: `.nop-spreadsheet-page [data-slot='spreadsheet-grid'] ...` 已有 package/root marker scope。
- **排除**: `[data-slot='spreadsheet-default-toolbar'] [data-slot='...']` 不作为包级泄漏报告；但其中硬编码色值另按主题问题保留为 `[维度10-02]`。
- **排除**: `ss-*` cell/canvas classes 符合 spreadsheet hybrid CSS 策略，不按 Tailwind/classAlias 规则机械报告。

## 总结评估

本轮主要风险集中在 `@nop-chaos/spreadsheet-renderers` 的 package CSS：scanner 的 107 个 bare-data-slot suspects 大多是 spreadsheet scoped selector 的启发式噪音，但仍有少量真实 scope/theme residual。classAliases、stack/hstack、Tailwind `@source "../../../packages"`、BEM `__` 残留未发现新的高价值问题。

## 第 2 轮深挖方向

- 继续沿 `spreadsheet-renderers` 检查 `sheet-tab-bar` / toolbar CSS 是否还有 canvas hybrid 边界外的硬编码视觉。
- 对 `canvas-styles.css` 中所有未带 `.nop-spreadsheet-page` 或 `[data-slot='report-designer-spreadsheet-canvas']` 的选择器做分组复核：哪些是合法 `ss-*` namespace，哪些需要 scope。
- 抽查 host 入口是否总是显式导入 `@nop-chaos/spreadsheet-renderers/canvas-styles.css`，确认泄漏影响面。

## 深挖第 2 轮追加

### [维度10-03] Sheet tab bar 位于 canvas hybrid 边界外，却使用全局 `ss-*` namespace 和未 scoped selectors

- **文件+行号**: `packages/spreadsheet-renderers/src/canvas-styles.css:674-847`; `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx:99-166`
- **证据片段**:
  ```css
  .ss-sheet-bar {
    display: flex;
    align-items: stretch;
    height: 32px;
    border-top: 1px solid var(--border, #e2e8f0);
    background: var(--nop-surface, #ffffff);
    font-size: 12px;
    color: var(--nop-body-copy, #64748b);
  }
  ```
- **严重程度**: P2
- **现状**: `SheetTabBar` 是 spreadsheet workbook 外壳控件，不是高密度 cell/grid canvas；但其样式在 `canvas-styles.css` 中全部以裸 `.ss-sheet-*` 全局类发布，例如 `.ss-sheet-bar`、`.ss-sheet-tab`、`.ss-sheet-add`，没有锚定 `.nop-spreadsheet-page`、`[data-slot='report-designer-spreadsheet-canvas']` 或 dedicated sheet-tab root slot。
- **风险**: `ss-*` 在 owner 文档中是 spreadsheet canvas 内部 hybrid CSS namespace。把 sheet tab bar 外壳控件也放入裸 `.ss-*` 全局选择器，会扩大 canvas-only namespace 的语义边界；当 `@nop-chaos/spreadsheet-renderers/canvas-styles.css` 被 host side-effect 导入时，这些外壳样式会成为 package-global CSS hook，存在跨嵌入面泄漏和后续命名碰撞风险。
- **建议**: 给 sheet tab bar 增加稳定 root slot，例如 `data-slot="spreadsheet-sheet-tab-bar"`，并将 CSS 改为 scoped selector：`.nop-spreadsheet-page [data-slot='spreadsheet-sheet-tab-bar'] ...`，同时补齐 report-designer canvas 挂载路径。外壳样式可继续使用 CSS variables，但不应继续依赖裸 `ss-*` canvas namespace。
- **误报排除**: 本条不重复 spreadsheet inline editor/status scope，也不重复 default toolbar hardcoded colors。Sheet tab bar 已有部分 token 化颜色，问题不在具体色值，而在 outer shell 使用 canvas-only `ss-*` namespace 且 selector 未 scoped。
- **参考文档**: `docs/architecture/styling-system.md`; `docs/architecture/theme-compatibility.md`; `docs/architecture/report-designer/spreadsheet-canvas-css.md`
- **复核状态**: 未复核

### [维度10-04] Toolbar style swatch 样式使用裸 `.ss-style-swatch*`，把 toolbar 外壳视觉发布成全局 canvas namespace

- **文件+行号**: `packages/spreadsheet-renderers/src/canvas-styles.css:386-437`; `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-groups.tsx:144-186`
- **证据片段**:
  ```css
  .ss-style-swatch {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    min-height: 20px;
    border: 1px solid rgb(226, 232, 240);
  }
  ```
- **严重程度**: P3
- **现状**: `ss-style-swatch` / `ss-style-swatch-bg-*` / `ss-style-swatch-font-*` 是 default toolbar 中的格式预览按钮样式，不属于 spreadsheet grid/cell canvas；但 CSS 以裸 `.ss-style-swatch*` 类选择器发布，未锚定 `[data-slot='spreadsheet-default-toolbar']`、`.nop-spreadsheet-page` 或 `[data-slot='report-designer-spreadsheet-canvas']`。对应 JSX 在 toolbar group 中直接写入 `className="ss-style-swatch ss-style-swatch-bg-yellow"` 等类名。
- **风险**: 这会把 toolbar chrome 的 reusable visual 暴露为全局 `ss-*` canvas namespace，违背 `ss-*` 只服务 canvas hybrid CSS 的边界。由于 `canvas-styles.css` 是 package side-effect stylesheet，一旦 host 全局导入，任何同名 `.ss-style-swatch*` 类都会被 spreadsheet toolbar 样式命中，且未来修复 canvas namespace 时也更难区分 cell style class 与 toolbar presentation class。
- **建议**: 将 swatch 改成 toolbar-scoped slot/state selector，例如给元素加 `data-slot="spreadsheet-style-swatch"`、`data-swatch-bg="yellow"` / `data-swatch-font="red"`，CSS 写为 `[data-slot='spreadsheet-default-toolbar'] [data-slot='spreadsheet-style-swatch'] { ... }`。若暂时保留 class，也应至少加 toolbar/root scope，并避免裸 `.ss-*` selector。
- **误报排除**: 本条不把 swatch 的黄色、绿色、蓝色、红色等格式示例色机械判为主题违规；这些色值可代表用户可选单元格格式。问题限定在 toolbar 外壳视觉 selector 未 scoped，且使用 canvas-only `ss-*` namespace。
- **参考文档**: `docs/architecture/styling-system.md`; `docs/architecture/theme-compatibility.md`; `docs/architecture/report-designer/spreadsheet-canvas-css.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度10-05] Flow Designer 在 `.fd-theme-root` 本地重声明 `--fd-*` 默认值，阻断祖先主题作用域覆盖

- **文件+行号**: `packages/flow-designer-renderers/src/designer-theme.css:1-24`; `packages/flow-designer-renderers/src/designer-page-body.tsx:430-433`
- **证据片段**:
  ```css
  :where(.fd-theme-root, .nop-designer) {
    --fd-page-bg: linear-gradient(
      135deg,
      rgba(167, 243, 208, 0.15) 0%,
      rgba(196, 181, 253, 0.12) 50%,
      rgba(153, 246, 228, 0.1) 100%
    );
    --fd-panel-bg: rgba(255, 255, 255, 0.4);
    --fd-panel-accent: hsl(var(--primary));
  ```
- **严重程度**: P2
- **现状**: Flow Designer 根节点会挂载 `fd-theme-root`，但包级 CSS 又直接在 `.fd-theme-root` / `.nop-designer` 本元素上声明大量 `--fd-*` 变量。文档允许 host 在祖先 scope（如 `.host-flow-shell`）覆盖 `--fd-*`，但子元素本地变量声明会优先于继承值。
- **风险**: 外部 host 通过祖先容器设置 `--fd-panel-bg`、`--fd-canvas-bg` 等主题变量时不会生效，必须知道内部 `.fd-theme-root` 并写更具体选择器覆盖，破坏 theme-compatibility 的“任意祖先 scope 可覆盖”契约；暗色/品牌主题下 Flow Designer 容易固定在包内浅色 glass 默认值。
- **建议**: 将 package 默认值改为 fallback 读取模式，例如在实际使用处 `var(--fd-panel-bg, var(--nop-surface))`，或把默认 token 放到可被 host 覆盖的更低层/主题 token 文件中；避免在 `.fd-theme-root` 本地无条件重声明 host 预期可继承覆盖的变量。
- **误报排除**: 这不重复现有 spreadsheet CSS scope/theme 条目；问题发生在 Flow Designer token 作用域。也不是反对包提供默认主题，而是当前默认值声明位置使祖先 host override 失效，与 `theme-compatibility.md` 明确的本地挂载容器覆盖策略冲突。
- **参考文档**: `docs/architecture/theme-compatibility.md`; `docs/architecture/styling-system.md`
- **复核状态**: 未复核

### [维度10-06] Flow Designer palette 图标外观由 node type id 硬编码 CSS 决定，未消费 `appearance` / token 主题契约

- **文件+行号**: `packages/flow-designer-renderers/src/designer-palette.tsx:9-35,154-158`; `packages/flow-designer-renderers/src/designer-theme.css:48-79`
- **证据片段**:
  ```ts
  const PALETTE_APPEARANCE_BY_ID: Record<string, string> = {
    start: 'fd-palette-appearance-start',
    end: 'fd-palette-appearance-end',
    task: 'fd-palette-appearance-task',
  };
  ```
  ```css
  .fd-palette-appearance-start {
    background: linear-gradient(135deg, #22c55e, #15803d);
  }
  ```
- **严重程度**: P2
- **现状**: Palette 图标 class 由 `nodeType.id` 映射到固定 `fd-palette-appearance-*`，CSS 中再用硬编码渐变色渲染。`NodeTypeAppearance` 已有 `borderColor` 等 config-driven 外观字段，但 palette 图标未从 `nodeTypes[].appearance` 或 `--fd-*` token 派生。
- **风险**: 同一个 node type 在 canvas/node body 中可通过 `appearance` 表达颜色，但 palette 中仍按内置 id 表固定显示；自定义节点或品牌主题无法一致控制 palette 视觉，后续开发会继续扩展硬编码 id → class → 颜色表，形成不可主题化的外观分叉。
- **建议**: Palette 图标优先消费 `nodeType.appearance` 中的语义颜色/类名，或通过 `data-type` + CSS variable fallback（如 `--fd-node-accent`）统一到 config/token 层；保留内置类型默认色时也应以 token fallback 形式提供，而不是直接写死 id class 和 hex gradient。
- **误报排除**: 这不是要求 widget 内部完全无样式；palette 是 Flow Designer package-owned reusable chrome，文档明确 node/edge appearance 与 `fd-theme-root` 变量是当前样式入口。该问题也不重复已有 spreadsheet `ss-*` namespace 条目。
- **参考文档**: `docs/components/designer-page/design.md`; `docs/architecture/theme-compatibility.md`; `docs/architecture/styling-system.md`
- **复核状态**: 未复核

### [维度10-07] `code-editor` 包级 chrome token 在组件根本地固定浅色默认，不能随 `.nop-theme-root` 自动继承 host 主题

- **文件+行号**: `packages/flux-code-editor/src/code-editor-styles.css:1-26`; `packages/flux-code-editor/src/code-editor-renderer.tsx:64-65`
- **证据片段**:
  ```css
  .nop-code-editor {
    --nop-code-editor-toolbar-bg: rgba(0, 0, 0, 0.03);
    --nop-code-editor-toolbar-border: rgba(0, 0, 0, 0.06);
    --nop-code-editor-toolbar-button-fg: #999;
    --nop-code-editor-toolbar-button-hover-bg: rgba(0, 0, 0, 0.06);
  }
  ```
  ```ts
  const editorTheme = (props.props.editorTheme as 'light' | 'dark') ?? 'light';
  ```
- **严重程度**: P2
- **现状**: `code-editor` 的 toolbar/header/variable-panel/result chrome 默认变量直接声明在 `.nop-code-editor` 根上，且 renderer 默认 `editorTheme` 为 `light`。这些变量不是从 `--nop-*` / `--background` / `--foreground` 读取，也不会随 `.nop-theme-root` 暗色或品牌主题自动变化。
- **风险**: 作为字段级可复用 renderer，`code-editor` 在 host 暗色主题中若 schema 未显式写 `editorTheme: 'dark'`，组件 chrome 仍使用浅色固定 token；host 在祖先主题容器上设置项目 token 也无法影响 `.nop-code-editor` 本地变量默认值，导致编辑器外壳与周边 FieldFrame/UI 主题割裂。
- **建议**: 将 light/dark 默认 chrome token 改为从共享语义 token 派生，例如 `--nop-code-editor-toolbar-bg: color-mix(... var(--nop-surface / --background) ...)`；`editorTheme` 可继续控制 CodeMirror theme，但包级 chrome 应默认响应 host CSS variables，必要时用显式 prop 作为覆盖。
- **误报排除**: 这不重复维度12中 `code-editor` FieldFrame/className 归属问题；本条只关注 package-owned chrome 的主题继承。也不是否定 schema 显式 `editorTheme`，问题是默认路径未接入 CSS-variable theme contract。
- **参考文档**: `docs/components/code-editor/design.md`; `docs/architecture/theme-compatibility.md`
- **复核状态**: 未复核

### [维度10-08] Nop Debugger 运行时注入 `.nop-theme-root` token 默认值，可能覆盖 host 同名主题变量

- **文件+行号**: `packages/nop-debugger/src/panel/styles-css.ts:3-23`; `packages/nop-debugger/src/panel/styles.ts:12-17`
- **证据片段**:
  ```ts
  export const DEBUGGER_STYLES = `
  .nop-theme-root {
    --nop-debugger-bg:
      linear-gradient(180deg, rgba(16, 24, 34, 0.96), rgba(10, 18, 27, 0.98)),
      radial-gradient(circle at top right, rgba(240, 183, 79, 0.16), transparent 42%);
  ```
  ```ts
  style.textContent = DEBUGGER_STYLES;
  document.head.appendChild(style);
  ```
- **严重程度**: P2
- **现状**: Debugger package 在启用时向 `document.head` 追加 style，并在 `.nop-theme-root` 上写入大量 `--nop-debugger-*` 默认值。该注入发生在运行时，顺序通常晚于 host/app CSS。
- **风险**: 如果 host 已在 `.nop-theme-root` 上定义 debugger 主题变量，运行时追加的同 specificity 规则会因后插入而覆盖 host 值；这与 “debugger surfaces must stay inside the same token model” 和 host 可 CSS-only 覆盖的契约冲突，导致调试面板在品牌/暗色主题中不可预测地回退到包内深色默认。
- **建议**: 不要运行时覆盖 `.nop-theme-root` 同名 token。改为在 debugger 根 `.nop-debugger` 使用 `var(--nop-debugger-bg, <fallback>)` fallback，或将默认 token 放入静态可排序的 package CSS 入口；host override 应能通过祖先或同根 token 声明稳定生效。
- **误报排除**: 这不是报告 debugger 自有视觉或固定定位本身；问题在运行时注入的 `.nop-theme-root` token 默认值会反向覆盖 host token。也不重复 spreadsheet package CSS selector scope 问题。
- **参考文档**: `docs/architecture/theme-compatibility.md`; `docs/architecture/debugger-runtime.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度10-09] Word Editor 包级 CSS 在 `.nop-theme-root` 上重声明共享 `--nop-*` token，且把 HSL 分量当作颜色使用

- **文件+行号**: `packages/word-editor-renderers/src/styles.css:1-15`; `packages/word-editor-renderers/src/index.ts:1`
- **证据片段**:
  ```css
  .nop-theme-root {
    --nop-app-bg: var(--background, #fff);
    --nop-app-text: var(--foreground, #0f172a);
    --nop-accent: hsl(var(--primary, 217 89% 53%));
    --nop-text-strong: color-mix(in srgb, var(--nop-app-text) 88%, #000 12%);
    --nop-body-copy: color-mix(in srgb, var(--nop-app-text) 72%, #fff 28%);
    --nop-surface-soft: color-mix(in srgb, var(--card, #fff) 92%, transparent);
    --nop-border: hsl(var(--border, 214 32% 91%));
  }
  ```
- **严重程度**: P2
- **现状**: `@nop-chaos/word-editor-renderers` 入口 side-effect 导入 `./styles.css`，该 CSS 直接写 `.nop-theme-root { --nop-* }`。这些 token 是共享项目 token 名称，不是 word-editor 私有 namespace；同时 `--background` / `--foreground` / `--card` 在当前 token 系统中是 HSL 分量，如 `40 30% 98%`，但这里直接作为颜色值传给 `--nop-app-bg`、`--nop-app-text` 和 `color-mix()`。
- **风险**: host 或 playground 已在祖先 `.nop-theme-root` 上定义 `--nop-app-bg` / `--nop-body-copy` 等共享 token 时，word-editor 包 CSS 可能以后加载顺序覆盖同 specificity 的 host 值；standalone 场景若只存在 `--background` 这类 HSL 分量，`bg-[var(--nop-app-bg)]` 会得到非法颜色值，导致 Word Editor 外壳背景/文字 token 失效；共享 token 被 domain package 重声明，扩大了 word-editor 对全局主题面的影响范围。
- **建议**: 将默认值收敛到 `.nop-word-editor-page` 或专属 token，如 `--nop-word-editor-*`；共享 token 只读取不重声明。颜色派生应使用 `hsl(var(--background))` / `hsl(var(--foreground))`，或 `var(--nop-app-bg, hsl(var(--background)))` fallback 模式，确保 host 祖先覆盖稳定生效。
- **误报排除**: 这不重复 spreadsheet、flow、code-editor、debugger 已报问题；问题发生在 word-editor package。也不是反对 word-editor 提供 standalone 默认主题，而是当前默认值挂在共享 `.nop-theme-root` 且使用共享 `--nop-*` 名称，会覆盖 host token，并且 HSL 分量用法本身不符合 CSS color 语义。
- **参考文档**: `docs/architecture/theme-compatibility.md`; `docs/architecture/styling-system.md`; `docs/components/word-editor-page/design.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度10-10] `@nop-chaos/flux/style.css` 仍组合未收口的 canonical CSS，facade 隔离根无法阻止 `.nop-*` 全局命中

- **文件+行号**: `packages/flux-bundle/src/style.css:1-11`; `packages/flux-react/src/default-spacing.css:1-34`; `packages/flux-renderers-form/src/form-renderers.css:1-18`
- **证据片段**:

  ```css
  @import '@nop-chaos/flux-react/default-spacing.css';
  @import '@nop-chaos/flux-renderers-form/form-renderers.css';

  .nop-flux-root {
    display: contents;
  }
  ```

  ```css
  @layer base {
    .nop-flex {
      display: flex;
    }

    .nop-page {
  ```

  ```css
  .nop-form [data-slot='select-wrapper'] {
    display: grid;
    gap: 0.5rem;
  }
  ```

- **严重程度**: P2
- **现状**: `theme-compatibility.md` 明确要求 `@nop-chaos/flux/style.css` 的 facade-owned selectors rooted at `.nop-flux-root`，但 facade CSS 只是 side-effect import canonical package CSS；这些被导入规则仍以 `.nop-flex`、`.nop-page`、`.nop-form`、`.nop-field` 等全局 marker 生效。`style.css` 自身只有 `.nop-flux-root` 和 `.nop-flux-root .nop-node-error` 两条 scoped 规则，不能给 import 进来的选择器补作用域。
- **风险**: 普通 host 按文档只导入 `@nop-chaos/flux/style.css` 后，页面上任何非 facade 子树但同名 `.nop-form` / `.nop-field` / `.nop-page` marker 都会被 Flux 默认间距与表单 renderer chrome 命中；这违背 facade CSS isolation boundary，尤其在 AMIS/legacy shell 或多个低代码渲染器并存时，会出现跨树样式污染。
- **建议**: 为 facade 产物提供真正 scoped CSS：要么生成 `.nop-flux-root .nop-*` / `.nop-flux-root [data-slot=...]` 版本；要么让 canonical CSS 本身以可配置 root/scope 输出；至少不要把未 scoped package CSS 直接作为 host-facing facade stylesheet 暴露。保留内部包直接导入 canonical CSS 的能力时，应在 public facade 入口与 internal CSS 入口之间区分。
- **误报排除**: 这不是重复 spreadsheet/flow/code-editor/debugger/word-editor 条目；问题发生在 `@nop-chaos/flux` facade CSS boundary。也不是把 layout renderer 的默认 spacing 本身判错，问题在 host-facing facade 宣称 `.nop-flux-root` 隔离，但实际组合的导入规则未被该 root 约束。
- **参考文档**: `docs/architecture/theme-compatibility.md`; `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/styling-system.md`
- **复核状态**: 未复核

### [维度10-11] Dialog/Drawer overlay 的主题化只存在于 playground 全局裸 `data-slot` 选择器，UI 包与 facade 消费者拿不到共享 token 契约

- **文件+行号**: `apps/playground/src/styles.css:162-169`; `packages/ui/src/components/ui/dialog.tsx:72-85`; `packages/ui/src/components/ui/alert-dialog.tsx:19-28`
- **证据片段**:

  ```css
  [data-slot='dialog-overlay'] {
    background-color: var(--nop-dialog-backdrop);
    backdrop-filter: blur(2px);
  }

  [data-slot='drawer-overlay'] {
    background-color: rgba(0, 0, 0, 0.6);
  ```

  ```tsx
  <DialogPrimitive.Backdrop
    data-slot="dialog-overlay"
    className={cn(
      'isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs ...',
  ```

  ```tsx
  <AlertDialogPrimitive.Backdrop
    data-slot="alert-dialog-overlay"
    className={cn(
      'fixed inset-0 isolate z-50 bg-black/10 duration-100 ...',
  ```

- **严重程度**: P2
- **现状**: `--nop-dialog-backdrop` 被文档列为共享 token，但实际覆盖 dialog/drawer overlay 的规则在 playground 私有 `styles.css` 中，并且是裸 `[data-slot='dialog-overlay']` / `[data-slot='drawer-overlay']` 全局 selector。`@nop-chaos/ui` 的 Dialog/Drawer/AlertDialog overlay 自身仍写 `bg-black/10`，其中 AlertDialog 甚至没有对应 playground token 覆盖规则。
- **风险**: package/facade 消费者只导入 `@nop-chaos/ui/base.css` 或 `@nop-chaos/flux/style.css` 时，不会获得 `--nop-dialog-backdrop` 的 overlay 视觉契约；主 dialog、drawer、alert-dialog 的遮罩表现会分裂。另一方面，playground 私有裸 `data-slot` 规则会全局命中任意同名 slot，不受 `.nop-theme-root`、`.nop-flux-root` 或 UI 组件根约束，容易污染 host 中其他 Base UI/shadcn 同 slot 组件。
- **建议**: 将 overlay token 消费移动到 `@nop-chaos/ui` 公共样式或组件 class 中，例如 `bg-[var(--nop-dialog-backdrop,hsl(.../...))]`，并覆盖 Dialog/Drawer/AlertDialog 的同类 overlay；若保留 CSS selector，应锚定 `.nop-theme-root` 或组件 root/portal slot，避免 playground 私有裸 `data-slot` 规则作为事实主题层。
- **误报排除**: 这不是重复 debugger 的运行时注入 token 问题，也不是 playground demo shell 的普通页面样式；Dialog/Drawer/AlertDialog 是 `@nop-chaos/ui` 公共组件，且 `theme-compatibility.md` 明确把 dialogs 纳入共享 token model。裸 selector 证据来自 playground 私有样式，而 package 代码证明确实没有等价 token 消费。
- **参考文档**: `docs/architecture/theme-compatibility.md`; `docs/architecture/styling-system.md`
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度10-12] Theme tokens 的 `--sidebar*` 根默认依赖未定义 HSL 分量，导致 public sidebar utility 在无 `data-theme/data-mode` 时失效

- **文件+行号**: `packages/theme-tokens/src/styles.css:38-45`; `packages/tailwind-preset/src/index.ts:38-46`; `docs/architecture/styling-system.md:157-162`
- **证据片段**:
  ```css
  --sidebar: hsl(var(--card));
  --sidebar-foreground: hsl(var(--foreground));
  --sidebar-primary: hsl(var(--primary));
  --sidebar-primary-foreground: hsl(var(--primary-foreground));
  --sidebar-accent: hsl(var(--accent));
  --sidebar-accent-foreground: hsl(var(--accent-foreground));
  --sidebar-border: hsl(var(--border));
  --sidebar-ring: hsl(var(--ring));
  ```
- **严重程度**: P2
- **现状**: `theme-tokens` 的根 `:root` 只给 `--sidebar*` 提供 `hsl(var(--card))` 等转接值，但 `--card`、`--foreground`、`--primary`、`--border` 等 HSL 分量只在 `:root[data-theme][data-mode]` 主题变体中定义。与此同时，`tailwind-preset` 将 `bg-sidebar`、`text-sidebar-foreground` 等 public utility 直接映射到这些 `--sidebar*` token，文档也明确要求这些默认值由 public `theme-tokens` stylesheet 提供。
- **风险**: 消费者只导入 `@nop-chaos/theme-tokens/styles.css` 和 Tailwind preset，但没有在 document root 设置 `data-theme/data-mode` 时，`--sidebar*` 会展开成 `hsl(var(--card))` 这类无效颜色。结果是 shared sidebar utility 的背景、文字、边框、ring 在非 playground/非完整主题环境中失效；这违背“backing CSS variables must exist in the public theme-tokens stylesheet on the supported path”的跨包默认契约。
- **建议**: 在 `:root` 中为 `--card`、`--foreground`、`--primary`、`--primary-foreground`、`--accent`、`--accent-foreground`、`--border`、`--ring` 提供 unconditional light fallback；或把 `--sidebar*` 改为带 fallback 的完整颜色表达式，例如 `--sidebar: hsl(var(--card, 0 0% 100%));`。同步补强 `packages/theme-tokens/src/styles.test.ts`，验证 `--sidebar*` 在无主题属性时不是依赖未定义变量的无效颜色。
- **误报排除**: 这不是重复已报的 Word Editor `.nop-theme-root` 重声明、code-editor chrome、dialog overlay、facade CSS 或 spreadsheet 条目。也不是旧的 `--destructive` 缺失问题：当前 `--destructive` 已在根块定义；本条聚焦文档明确列为 baseline 的 `--sidebar*` public utility backing token 在默认路径下仍缺少有效 fallback。
- **参考文档**: `docs/architecture/styling-system.md`; `docs/architecture/theme-compatibility.md`
- **复核状态**: 未复核

## 深挖第 7 轮追加

### [维度10-13] Tailwind preset 的 destructive utility 仍绑定旧 `--danger`/`--primary-foreground`，绕过 public `--destructive*` token

- **文件+行号**: `packages/tailwind-preset/src/index.ts:48-51`; `packages/theme-tokens/src/styles.css:46-47`; `packages/tailwind-preset/src/index.test.ts:34-37`
- **证据片段**:
  ```ts
  destructive: {
    DEFAULT: 'hsl(var(--danger))',
    foreground: 'hsl(var(--primary-foreground))',
  },
  ```
  ```css
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  ```
  ```ts
  expect(destructive).toMatchObject({
    DEFAULT: 'hsl(var(--danger))',
    foreground: 'hsl(var(--primary-foreground))',
  });
  ```
- **严重程度**: P2
- **现状**: `theme-tokens` 已公开定义 `--destructive` / `--destructive-foreground`，但 `tailwind-preset` 的 `text-destructive`、`bg-destructive`、`ring-destructive` 等 utility 仍解析到旧的 `--danger`，前景色则复用 `--primary-foreground`。测试还锁定了这个旧映射。
- **风险**: host 或 theme package 若按当前 public token 契约覆盖 `--destructive` / `--destructive-foreground`，Tailwind utility 不会响应；而 UI 组件大量使用 `aria-invalid:border-destructive`、`bg-destructive/10`、`text-destructive` 等类，会继续读取 `--danger`。这会造成“public token 已定义但实际 utility 不消费”的主题分叉，尤其在品牌主题下 destructive/error 色无法通过 documented token 统一覆盖。
- **建议**: 将 preset 改为 `destructive.DEFAULT = 'hsl(var(--destructive))'`、`foreground = 'hsl(var(--destructive-foreground))'`，并更新 `packages/tailwind-preset/src/index.test.ts`；若需要兼容旧 `--danger`，应在 `theme-tokens` 中让 `--danger` 作为别名或 fallback，而不是让 public utility 绕过 `--destructive*`。
- **误报排除**: 这不是重复已报 theme tokens sidebar 问题；本条不涉及 `--sidebar*`。也不是旧的“`--destructive` 缺失”问题：当前 `theme-tokens` 已定义 `--destructive*`，问题在 `tailwind-preset` 仍未消费它，且测试明确锁住旧契约。
- **参考文档**: `docs/architecture/styling-system.md`; `docs/architecture/theme-compatibility.md`
- **复核状态**: 未复核

## 深挖第 8 轮追加

### [维度10-14] Flow Designer 分支聚焦态直接使用 `var(--primary)`，在 HSL 分量 token 体系下会生成无效颜色

- **文件+行号**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:145-146`; `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx:78-81`; `packages/flow-designer-renderers/src/dingflow/ding-flow-edge.tsx:22-25`; `packages/theme-tokens/src/styles.css:50-52`
- **证据片段**:

  ```tsx
  if (data.__fdBranchFocused) {
    s.boxShadow = '0 0 0 3px color-mix(in oklab, var(--primary) 22%, transparent)';
  }

  stroke: edgeData?.__fdBranchFocused
    ? 'var(--primary)'
    : (appearance?.stroke ?? 'var(--fd-edge-stroke)'),
  ```

  ```tsx
  stroke: edgeData.__fdBranchFocused
    ? 'var(--primary)'
    : (appearance?.stroke ?? CONNECTOR_COLOR),
  ```

  ```css
  :root[data-theme='classic'][data-mode='light'] {
    --primary: 217 89% 53%;
  ```

- **严重程度**: P2
- **现状**: Flow Designer 普通节点 accent fallback 已使用 `hsl(var(--primary))`，普通 edge fallback 也走 `--fd-edge-stroke`；但分支聚焦态绕过这些路径，直接把 `var(--primary)` 放进 `stroke` 和 `color-mix()`。当前 public theme token 中 `--primary` 是 HSL 分量，不是完整 CSS color。
- **风险**: 在默认 `@nop-chaos/theme-tokens` 路径下，分支聚焦 edge 的 SVG stroke 会解析成裸 `217 89% 53%`，属于无效颜色；node 聚焦 ring 的 `color-mix(... var(--primary) ...)` 也会无效。结果是 Flow Designer 的 branch-focused 高亮在标准主题下可能不显示或回退为浏览器默认表现，且只在分支聚焦交互中暴露，容易被普通视觉检查遗漏。
- **建议**: 将聚焦态统一改为完整颜色表达式或 Flow token，例如 `hsl(var(--primary))`、`var(--fd-edge-stroke)`，或新增 `--fd-branch-focus` / `--fd-branch-focus-ring` 并在 `designer-theme.css` 中以 `hsl(var(--primary))` fallback 派生。
- **误报排除**: 这不重复已报的 Flow Designer `.fd-theme-root` 本地重声明问题，也不重复 palette hardcoded appearance。普通 fallback token 路径基本正确；问题限定在 `__fdBranchFocused` 分支直接使用裸 HSL 分量 token。
- **参考文档**: `docs/architecture/theme-compatibility.md`; `docs/architecture/styling-system.md`; `docs/architecture/flow-designer/config-schema.md`
- **复核状态**: 已复核，live code 与 theme token 形态一致。

## 深挖第 9 轮追加

### [维度10-15] `Toaster` 将 Sonner 颜色变量绑定到裸 HSL 分量 token，toast 背景/文字/边框可能解析为无效颜色

- **文件+行号**: `packages/ui/src/components/ui/sonner.tsx:22-29`; `apps/playground/src/styles.css:60-61`; `packages/theme-tokens/src/styles.css:1-48`
- **证据片段**:
  ```tsx
  style={
    {
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
    } as React.CSSProperties
  }
  ```
  ```css
  --popover: 30 20% 98%;
  --popover-foreground: 25 15% 35%;
  ```
  ```css
  :root {
    color-scheme: light;
    --radius-sm: 8px;
    ...
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
  }
  ```
- **严重程度**: P2
- **现状**: `@nop-chaos/ui` 的公共 `Toaster` 直接把 Sonner 的 `--normal-bg` / `--normal-text` / `--normal-border` 设置为 `var(--popover)`、`var(--popover-foreground)`、`var(--border)`。但当前主题体系中这些 token 是 HSL 分量，需通过 `hsl(var(...))` 才是完整 CSS color；并且 public `theme-tokens` 根默认块也没有 unconditional `--popover` / `--popover-foreground`。
- **风险**: toast 是公共 UI 反馈面，若 host 使用现有 HSL 分量 token，Sonner 内部消费 `--normal-bg` 等变量时会拿到裸 `30 20% 98%` / `214 32% 91%` 这类无效颜色，导致 toast 背景、文字或边框失效。若 host 只导入 public `theme-tokens` 根默认路径，`--popover` 还可能完全未定义，进一步破坏独立消费路径。
- **建议**: 将 Sonner 变量改为完整颜色表达式并提供 fallback，例如 `'--normal-bg': 'hsl(var(--popover, var(--card, 0 0% 100%)))'`、`'--normal-text': 'hsl(var(--popover-foreground, var(--card-foreground, 222 84% 5%)))'`、`'--normal-border': 'hsl(var(--border, 214 32% 91%))'`。同时在 `theme-tokens` 根默认块补齐 `--popover` / `--popover-foreground` 或明确别名到 `--card*`。
- **误报排除**: 不重复 Flow branch focus 的 `var(--primary)` 已报问题；本条发生在 `@nop-chaos/ui` 公共 Toaster。也不是 widget 内部合理硬编码视觉，问题是公共组件把 Sonner 期望的完整颜色变量绑定到项目 HSL 分量 token，且 public token 默认路径缺口会直接影响 host 消费。
- **参考文档**: `docs/architecture/theme-compatibility.md`; `docs/architecture/styling-system.md`
- **复核状态**: 已复核，live code 与当前 theme token 形态一致。

## 深挖第 10 轮追加

### [维度10-16] `@nop-chaos/ui/base.css` 公共入口依赖未定义基础 HSL token，独立消费时 body/全局 border 主题失效

- **文件+行号**: `packages/ui/src/styles/base.css:4-18`; `packages/theme-tokens/src/styles.css:1-48`
- **证据片段**:

  ```css
  @layer base {
    * {
      border-color: hsl(var(--border));
    }

    body {
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
    }
  }
  ```

- **严重程度**: P2
- **现状**: `@nop-chaos/ui/base.css` 是公共导出入口，但直接消费 `--border`、`--background`、`--foreground`。`theme-tokens` 的无条件 `:root` 默认块只定义 radius、shadow、space、chart、sidebar/destructive 等，基础 HSL 分量主要在 `:root[data-theme][data-mode]` 中定义。
- **风险**: host 只按公共路径导入 `@nop-chaos/theme-tokens/styles.css` + `@nop-chaos/ui/base.css`，但未设置 `data-theme/data-mode` 或未像 playground 一样额外补 `:root` token 时，`hsl(var(--background))` 等会成为无效颜色，导致 body 背景/文字和全局 border baseline 失效。
- **建议**: 在 `theme-tokens` 的无条件 `:root` 中补齐 `--background`、`--foreground`、`--border` 等基础 token，或在 `ui/base.css` 使用带 fallback 的表达式，例如 `hsl(var(--background, 0 0% 100%))`。
- **误报排除**: 不重复已报 `--sidebar*` 默认缺失；本条聚焦 `@nop-chaos/ui/base.css` 公共 base 层直接影响 body 与全局 border。也不涉及 Toaster/Sonner。
- **参考文档**: `docs/architecture/theme-compatibility.md`; `docs/architecture/styling-system.md`
- **复核状态**: 已复核，live code 与 public package exports 一致。

### [维度10-17] Tailwind preset 的 `popover` utility 仍映射到 `--card*`，公共浮层组件无法响应 `--popover*` 主题 token

- **文件+行号**: `packages/tailwind-preset/src/index.ts:30-37`; `packages/ui/src/components/ui/popover.tsx:32-36`
- **证据片段**:
  ```ts
  popover: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))',
  },
  ```
  ```tsx
  className={cn(
    'z-50 ... rounded-lg bg-popover ... text-popover-foreground ...',
    className,
  )}
  ```
- **严重程度**: P2
- **现状**: `@nop-chaos/ui` 的 Popover/Dialog/Select/DropdownMenu 等大量公共浮层使用 `bg-popover`、`text-popover-foreground`；但 `@nop-chaos/tailwind-preset` 把 popover utility 映射到 `--card` / `--card-foreground`，而不是 `--popover` / `--popover-foreground`。
- **风险**: host 即使按 popover 语义覆盖 `--popover*`，使用 preset 编译的公共 UI 浮层也不会响应，导致 card 与 popover 主题通道分裂；品牌/暗色主题中浮层无法独立于 card surface 调整。
- **建议**: 将 preset 改为 `popover.DEFAULT = 'hsl(var(--popover))'`、`foreground = 'hsl(var(--popover-foreground))'`，并在 `theme-tokens` 公共默认路径补齐 `--popover*` fallback。同步更新 preset 测试。
- **误报排除**: 不重复 Toaster/Sonner HSL token 问题；本条不涉及 Sonner，而是 Tailwind utility 映射使所有 `bg-popover` 公共浮层绕过 popover token。
- **参考文档**: `docs/architecture/theme-compatibility.md`; `docs/architecture/styling-system.md`
- **复核状态**: 已复核，live code 中公共 UI 浮层确实广泛依赖 `bg-popover` / `text-popover-foreground`。

## 深挖第 11 轮追加

### [维度10-18] Nop Debugger 运行时注入的 `.ndbg-*` 内部/修饰符选择器未锚定 `.nop-debugger` 根

- **文件+行号**: `packages/nop-debugger/src/panel/styles-css.ts:131-155`; `packages/nop-debugger/src/panel/node-tab.tsx:64-73`
- **证据片段**:

  ```css
  .ndbg-overview,
  .ndbg-list {
    display: grid;
    gap: 10px;
    overflow: auto;
  }

  .ndbg-row {
    display: flex;
    gap: 8px;
  }

  .ndbg-row--tight {
    gap: 4px;
  }
  ```

- **严重程度**: P3
- **现状**: Debugger stylesheet 通过运行时 `<style>` 注入到 `document.head`，但大量内部结构/状态样式直接发布为裸 `.ndbg-*` / `.ndbg-*--modifier` 选择器；组件 JSX 也直接使用 `className="ndbg-row ndbg-row--between ndbg-row--center"`。这些规则没有锚定 `.nop-debugger` 根，也没有用 `data-slot` 表达内部区域、用 `data-*` 表达状态/变体。
- **风险**: 虽然 `ndbg` 前缀降低了碰撞概率，但运行时全局注入会让这些内部 chrome 类成为 document-global CSS API。任意 host 页面或调试集成若出现同名类，会被 debugger 内部布局/间距命中；同时 BEM-like modifier 继续扩大 package 私有 class namespace，偏离项目“内部区域用 data-slot、状态用 data-_ / aria-_”的统一选择器契约。
- **建议**: 将内部选择器至少锚定到 `.nop-debugger`，例如 `.nop-debugger [data-slot='debugger-row'][data-align='center']`；逐步将 `.ndbg-row--center`、`.ndbg-list--virtual`、`.ndbg-metric-card--spaced` 等 modifier 类迁移为 `data-*` 状态/变体，内部区域迁移为稳定 `data-slot`。保留 `.nop-debugger` 作为唯一 root marker。
- **误报排除**: 不重复已报 `[维度10-08]`，该条关注 `.nop-theme-root` token 默认值被运行时注入覆盖；本条关注的是同一个注入 stylesheet 中的全局 selector scope 与 BEM-like class namespace。也不是否定 debugger 自有视觉，只是指出内部选择器未受 `.nop-debugger` 根约束。
- **参考文档**: `docs/architecture/renderer-markers-and-selectors.md`; `docs/architecture/styling-system.md`; `docs/architecture/theme-compatibility.md`
- **复核状态**: 已复核，live code 显示 stylesheet 运行时注入且 `.ndbg-*` 规则未统一锚定 `.nop-debugger`。

## 深挖第 12 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度10-01]`: 保留（P3）。live `canvas-styles.css` 仍存在裸 `[data-slot='spreadsheet-cell-editor-input']` / `[data-slot='spreadsheet-edit-status']`，未锚定 `.nop-spreadsheet-page` 或 report-designer canvas scope。
- `[维度10-02]`: 保留（P2）。live toolbar CSS 仍在 `[data-slot='spreadsheet-default-toolbar']` 下使用 `#f6f7fa`、`#cecece`、`rgb(219, 234, 254)` 等浅色硬编码，且 owner docs 将 toolbar 归为外壳而非 canvas hybrid。
- `[维度10-03]`: 保留（P2）。live `SheetTabBar` 仍直接输出 `ss-sheet-*` 类，CSS 仍为裸 `.ss-sheet-*` selector，未受 spreadsheet/page/canvas 根约束。
- `[维度10-04]`: 保留（P3）。live toolbar groups 仍写入 `ss-style-swatch*` 类，CSS 仍以裸 `.ss-style-swatch*` 发布，问题是 toolbar 外壳 selector scope/namespace 泄漏。
- `[维度10-05]`: 保留（P2）。live `designer-theme.css` 仍在 `.fd-theme-root` / `.nop-designer` 本地声明 `--fd-*` 默认值，而组件根确实挂载 `fd-theme-root`，祖先继承覆盖会被本地声明截断。
- `[维度10-06]`: 保留（P2）。live palette 仍用 `PALETTE_APPEARANCE_BY_ID` 将 node type id 映射到固定 class，CSS 中对应 `fd-palette-appearance-*` 仍为硬编码 hex 渐变，未消费 `appearance`。
- `[维度10-07]`: 保留（P2）。live `.nop-code-editor` 根仍本地固定大量浅色 `--nop-code-editor-*` 默认值，renderer 默认 `editorTheme` 仍为 `'light'`，不能自动继承 host token。
- `[维度10-08]`: 保留（P2）。live debugger 仍运行时 append style，且注入规则在 `.nop-theme-root` 上写入 `--nop-debugger-*` 默认值，存在后插入覆盖同 specificity host token 的证据。
- `[维度10-09]`: 保留（P2）。live word-editor 入口仍 side-effect 导入 CSS，CSS 仍在 `.nop-theme-root` 重声明共享 `--nop-*`，且 `--nop-app-bg: var(--background)` 会把 HSL 分量当完整颜色传播。
- `[维度10-10]`: 保留（P2）。live `@nop-chaos/flux/style.css` 仍直接 import 未 scoped 的 `default-spacing.css` / `form-renderers.css`，其中 `.nop-flex`、`.nop-page`、`.nop-form` 等规则不受 `.nop-flux-root` 限制。
- `[维度10-11]`: 保留（P2）。live UI Dialog/Drawer/AlertDialog overlay 仍内置 `bg-black/10`，token 覆盖只在 playground 裸 `[data-slot='dialog-overlay']` / `[data-slot='drawer-overlay']` 中存在，公共包无等价契约。
- `[维度10-12]`: 保留（P2）。live `theme-tokens` 根块仍只定义 `--sidebar*: hsl(var(--card/...))` 转接值，而基础 HSL token 仍主要在 `:root[data-theme][data-mode]` 中定义。
- `[维度10-13]`: 保留（P2）。live Tailwind preset 仍将 destructive 映射到 `hsl(var(--danger))` / `hsl(var(--primary-foreground))`，测试也锁定旧映射，而 theme-tokens 已定义 `--destructive*`。
- `[维度10-14]`: 保留（P2）。live Flow Designer branch-focused node/edge 仍直接使用 `var(--primary)` 进入 `stroke` 和 `color-mix()`，而 theme token 中 `--primary` 是 HSL 分量。
- `[维度10-15]`: 保留（P2）。live Toaster 仍把 Sonner `--normal-bg/text/border` 绑定到裸 `var(--popover)` / `var(--border)`，与当前 HSL 分量 token 形态不匹配。
- `[维度10-16]`: 保留（P2）。live `@nop-chaos/ui/base.css` 仍直接使用 `hsl(var(--border/background/foreground))`，而 public theme-tokens 根默认块未无条件补齐这些基础 token。
- `[维度10-17]`: 保留（P2）。live Tailwind preset 仍将 `popover` utility 映射到 `--card*`，而 UI Popover 等公共浮层确实使用 `bg-popover` / `text-popover-foreground`。
- `[维度10-18]`: 保留（P3）。live debugger 注入 CSS 仍大量使用裸 `.ndbg-*` / `.ndbg-*--modifier` selector，未统一锚定 `.nop-debugger` 根，且与 marker/state 文档的 data-slot/data-\* 契约不一致。

## 子项复核建议

无。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                                                                                                                                           | 摘要                                                                                                       |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 维度10-01 | P3       | `packages/spreadsheet-renderers/src/canvas-styles.css`                                                                                                                                                                                             | Spreadsheet inline editor/status 裸 `data-slot` selector 未锚定 spreadsheet/report-designer canvas scope。 |
| 维度10-02 | P2       | `packages/spreadsheet-renderers/src/canvas-styles.css`                                                                                                                                                                                             | Spreadsheet default toolbar 外壳仍使用硬编码浅色 palette。                                                 |
| 维度10-03 | P2       | `packages/spreadsheet-renderers/src/canvas-styles.css`; `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx`                                                                                                                                     | Sheet tab bar 仍输出裸 `ss-sheet-*` selector/class，未受 spreadsheet 根约束。                              |
| 维度10-04 | P3       | `packages/spreadsheet-renderers/src/canvas-styles.css`; `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-groups.tsx`                                                                                                                | Toolbar style swatch 仍以裸 `.ss-style-swatch*` 发布，存在外壳 selector scope/namespace 泄漏。             |
| 维度10-05 | P2       | `packages/flow-designer-renderers/src/designer-theme.css`; `packages/flow-designer-renderers/src/designer-page-body.tsx`                                                                                                                           | Flow Designer 在 `.fd-theme-root` / `.nop-designer` 本地声明 `--fd-*` 默认值，截断祖先主题覆盖。           |
| 维度10-06 | P2       | `packages/flow-designer-renderers/src/designer-palette.tsx`; `packages/flow-designer-renderers/src/designer-theme.css`                                                                                                                             | Flow Designer palette 图标仍按 node type id 映射固定 class/hex 渐变，未消费 `appearance`。                 |
| 维度10-07 | P2       | `packages/flux-code-editor/src/code-editor-styles.css`; `packages/flux-code-editor/src/code-editor-renderer.tsx`                                                                                                                                   | `code-editor` 根本地固定浅色 chrome token，默认不能自动继承 host token。                                   |
| 维度10-08 | P2       | `packages/nop-debugger/src/panel/styles-css.ts`; `packages/nop-debugger/src/panel/styles.ts`                                                                                                                                                       | Nop Debugger 运行时注入 `.nop-theme-root` token 默认值，可能后插入覆盖 host token。                        |
| 维度10-09 | P2       | `packages/word-editor-renderers/src/styles.css`; `packages/word-editor-renderers/src/index.ts`                                                                                                                                                     | Word Editor 包级 CSS 在 `.nop-theme-root` 重声明共享 `--nop-*`，且把 HSL 分量当完整颜色传播。              |
| 维度10-10 | P2       | `packages/flux-bundle/src/style.css`; `packages/flux-react/src/default-spacing.css`; `packages/flux-renderers-form/src/form-renderers.css`                                                                                                         | `@nop-chaos/flux/style.css` 直接 import 未 scoped canonical CSS，`.nop-flux-root` 不能隔离全局 marker。    |
| 维度10-11 | P2       | `apps/playground/src/styles.css`; `packages/ui/src/components/ui/dialog.tsx`; `packages/ui/src/components/ui/alert-dialog.tsx`                                                                                                                     | Dialog/Drawer/AlertDialog overlay token 契约只在 playground 裸 selector 中存在，公共 UI 包无等价消费。     |
| 维度10-12 | P2       | `packages/theme-tokens/src/styles.css`; `packages/tailwind-preset/src/index.ts`                                                                                                                                                                    | `--sidebar*` 根默认依赖未定义 HSL 分量，public sidebar utility 在无主题属性时可能失效。                    |
| 维度10-13 | P2       | `packages/tailwind-preset/src/index.ts`; `packages/theme-tokens/src/styles.css`; `packages/tailwind-preset/src/index.test.ts`                                                                                                                      | Tailwind preset destructive utility 仍绑定旧 `--danger` / `--primary-foreground`，绕过 `--destructive*`。  |
| 维度10-14 | P2       | `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx`; `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx`; `packages/flow-designer-renderers/src/dingflow/ding-flow-edge.tsx` | Flow Designer branch-focused node/edge 直接使用裸 `var(--primary)`，与 HSL 分量 token 形态不匹配。         |
| 维度10-15 | P2       | `packages/ui/src/components/ui/sonner.tsx`                                                                                                                                                                                                         | `Toaster` 将 Sonner 颜色变量绑定到裸 HSL 分量 token，toast 颜色可能无效。                                  |
| 维度10-16 | P2       | `packages/ui/src/styles/base.css`; `packages/theme-tokens/src/styles.css`                                                                                                                                                                          | `@nop-chaos/ui/base.css` 公共入口直接消费基础 HSL token，但 public theme-tokens 根默认未无条件补齐。       |
| 维度10-17 | P2       | `packages/tailwind-preset/src/index.ts`; `packages/ui/src/components/ui/popover.tsx`                                                                                                                                                               | Tailwind preset `popover` utility 仍映射到 `--card*`，公共浮层无法响应 `--popover*` token。                |
| 维度10-18 | P3       | `packages/nop-debugger/src/panel/styles-css.ts`; `packages/nop-debugger/src/panel/node-tab.tsx`                                                                                                                                                    | Nop Debugger 注入 CSS 仍大量使用裸 `.ndbg-*` / modifier selector，未统一锚定 `.nop-debugger` 根。          |
